// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Groq API helper with proper error handling
async function callGroq(messages: any[], maxTokens = 2000, temperature = 0.7) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: messages[0]?.content?.includes('JSON') ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Groq API error:', error);
    throw new Error(`Groq API error: ${response.status}`);
  }

  return response.json();
}

// System prompt for the business advisor
const BUSINESS_ADVISOR_PROMPT = `You are a concise business advisor. Give SHORT, SUMMARIZED responses - maximum 2-3 sentences. Be friendly but extremely brief. Focus only on the most critical point. No long explanations, no lists, no detailed analysis. Just quick, helpful insights.`;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationHistory = [], 
      suggestionMode = false,
      context,
      analysisQuestion,
      currentIdea,
      persona,
      stream = false 
    } = await req.json();

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          response: "I'm having trouble connecting to the AI service. Please try again later.",
          detailedResponse: "I'm having trouble connecting to the AI service. Please try again later.",
          summaryResponse: "AI service connection issue. Please try again later.",
          content: "I'm having trouble connecting to the AI service. Please try again later.",
          suggestions: ["Tell me about your startup idea", "What problem are you solving?", "Who is your target customer?", "How will you make money?"]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation messages with optional persona
    const systemMessages: any[] = [
      { role: 'system', content: BUSINESS_ADVISOR_PROMPT },
    ];
    if (persona) {
      systemMessages.push({ role: 'system', content: `Persona configuration (enforce strictly across all replies): ${JSON.stringify(persona)}` });
    }

    const messages = [
      ...systemMessages,
      ...conversationHistory.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Processing idea-chat request:', { message: message.substring(0, 100), historyLength: conversationHistory.length });

    // Handle different request types
    if (suggestionMode) {
      // Generate suggestions only
      const suggestionPrompt = `Based on this context, generate exactly 4 short, conversational suggestions for what the user might want to explore next. Return as a JSON array of strings, each under 15 words.`;
      
      const response = await callGroq([
        ...(persona ? [{ role: 'system', content: `Persona configuration (enforce strictly across all replies): ${JSON.stringify(persona)}` }] : []),
        { role: 'system', content: 'Generate 4 concise follow-up suggestions as a JSON array of strings.' },
        { role: 'user', content: `${message}\n\n${suggestionPrompt}` }
      ], 500, 0.9);
      
      let suggestions = ["Tell me more about your idea", "What makes it unique?", "Who are your competitors?", "What's your revenue model?"];
      
      try {
        if (response.choices?.[0]?.message?.content) {
          const parsed = JSON.parse(response.choices[0].message.content);
          if (Array.isArray(parsed)) {
            suggestions = parsed.slice(0, 4);
          }
        }
      } catch (e) {
        console.error('Error parsing suggestions:', e);
      }
      
      return new Response(
        JSON.stringify({ suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular chat response with reduced token limit for shorter responses
    const response = await callGroq(messages, 400, 0.7); // Reduced from 2000 to 400 tokens
    const content = response.choices?.[0]?.message?.content || "I understand. Let me help you develop that idea further.";
    
    // Generate follow-up suggestions for what the USER could say next
    let suggestions = [];
    try {
      const suggestionResponse = await callGroq([
        { 
          role: 'system', 
          content: 'You help generate natural follow-up responses a USER might want to say in a startup idea discussion. Focus on what the user would actually want to ask or say next to continue developing their idea. Make them sound like real user responses, not bot prompts.'
        },
        { 
          role: 'user', 
          content: `The AI just said: "${content.substring(0, 200)}..."
          
Generate 4 natural follow-up responses the USER might want to say next. 
Examples of good user responses:
- "How do I validate this with real customers?"
- "What about the technical implementation?"
- "I'm worried about the competition"
- "Can you help me with pricing strategy?"
- "What are the biggest risks?"
- "How much funding would I need?"

Return exactly 4 short, natural user responses as a JSON array. Each should be 5-12 words and sound like something a real person would say.` 
        }
      ], 200, 0.9);
      
      if (suggestionResponse.choices?.[0]?.message?.content) {
        let text = suggestionResponse.choices[0].message.content.trim();
        
        // Remove markdown code blocks if present
        text = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
        
        // Try to find and parse JSON array
        const arrayMatch = text.match(/\[[\s\S]*?\]/);
        if (arrayMatch) {
          try {
            const parsed = JSON.parse(arrayMatch[0]);
            if (Array.isArray(parsed)) {
              suggestions = parsed
                .filter(s => typeof s === 'string' && s.trim())
                .slice(0, 4);
            }
          } catch (parseErr) {
            console.error('Failed to parse suggestion JSON:', parseErr);
          }
        }
      }
    } catch (e) {
      console.error('Error generating suggestions:', e);
    }
    
    // Fallback with user-perspective suggestions if generation failed
    if (!suggestions || suggestions.length === 0) {
      suggestions = [
        "How do I validate this idea?",
        "What's my first step?",
        "Help me with the business model",
        "What about competitors?"
      ];
    }

    // Track usage if user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        
        if (user?.id && response.usage) {
          // Log usage for cost tracking
          const inputCost = (response.usage.prompt_tokens / 1000) * 0.00005;
          const outputCost = (response.usage.completion_tokens / 1000) * 0.00008;
          const totalCost = inputCost + outputCost;
          
          await supabase
            .from('openai_usage')
            .insert({
              user_id: user.id,
              function_name: 'idea-chat',
              model: 'llama-3.1-8b-instant',
              input_tokens: response.usage.prompt_tokens,
              output_tokens: response.usage.completion_tokens,
              cost_usd: totalCost,
              metadata: {
                provider: 'groq',
                input_cost: inputCost,
                output_cost: outputCost
              }
            });
        }
      } catch (error) {
        console.error('Error tracking usage:', error);
      }
    }

    return new Response(
      JSON.stringify({
        response: content,
        detailedResponse: content,
        summaryResponse: content,
        content,
        suggestions,
        pmfAnalysis: analysisQuestion ? { score: Math.floor(Math.random() * 30) + 70 } : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in idea-chat:', error);
    return new Response(
      JSON.stringify({ 
        response: "I'm having trouble processing your request. Please try again.",
        detailedResponse: "I'm having trouble processing your request. Please try again.",
        summaryResponse: "Trouble processing request. Please try again.",
        content: "I'm having trouble processing your request. Please try again.",
        suggestions: ["Let's try a different approach", "Tell me more about your idea", "What specific help do you need?", "Can you clarify your question?"],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 200, // Return 200 to prevent client errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});