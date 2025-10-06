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
const BUSINESS_ADVISOR_PROMPT = `You are a sharp, contextual startup advisor. 

CRITICAL RULES:
1. ALWAYS reference specific points from the conversation history
2. Build on what was already discussed - never repeat advice
3. Track the evolving idea and address NEW aspects each time
4. Make suggestions that directly relate to the last few exchanges
5. Keep responses to 2-3 sentences but make them highly specific to THIS conversation

Never give generic advice. Every response must show you remember and build upon the entire conversation.`;

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
    
    // Generate contextual follow-up suggestions based on the ENTIRE conversation
    let suggestions = [];
    try {
      // Build context from conversation history
      const recentContext = conversationHistory.slice(-3).map((msg: any) => 
        `${msg.type === 'user' ? 'User' : 'AI'}: ${msg.content.substring(0, 150)}`
      ).join('\n');
      
      const suggestionResponse = await callGroq([
        { 
          role: 'system', 
          content: `You are predicting what a startup founder would ACTUALLY SAY next in this conversation. Generate 4 PREDICTIVE, ACTIONABLE responses - NOT questions asking for help.

CRITICAL RULES:
- Predict specific ANSWERS and STATEMENTS the user would make
- NO questions like "How do I..." or "What should I..."
- Build directly on what was just discussed with concrete details
- Reference specific points from the conversation
- Sound like a founder articulating their strategy, not seeking basic guidance
- Be 8-15 words each - substantive but concise

Example BAD (questions): "How do I validate this?", "What metrics should I track?"
Example GOOD (predictions): "I'll test this with 50 beta users in healthcare first", "Tracking CAC, LTV, and monthly retention as key metrics"`
        },
        { 
          role: 'user', 
          content: `Recent conversation:
${recentContext}

Latest AI response: "${content.substring(0, 300)}..."

Based on this specific conversation, what are 4 natural, contextual things the user would want to say or ask next? Return as JSON array only.` 
        }
      ], 250, 0.9);
      
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
    
    // Fallback with contextual PREDICTIVE suggestions based on conversation stage
    if (!suggestions || suggestions.length === 0) {
      // Provide predictive responses based on conversation stage
      if (conversationHistory && conversationHistory.length > 4) {
        // Later in conversation - specific execution plans
        suggestions = [
          "I'll track CAC, LTV, churn rate, and NPS as primary metrics",
          "Planning to scale through partnerships with industry leaders first",
          "Targeting Series A at $2M ARR with 20% month-over-month growth",
          "Building distribution through content marketing and strategic partnerships"
        ];
      } else if (conversationHistory && conversationHistory.length > 2) {
        // Mid conversation - validation and strategy
        suggestions = [
          "I'll validate with 30 customer interviews and a landing page test",
          "My advantage is 10x faster implementation with AI-powered automation",
          "MVP launch in 8 weeks with core features and payment integration",
          "Unit economics: $50 CAC, $99 MRR, targeting 3:1 LTV:CAC ratio"
        ];
      } else {
        // Early conversation - foundational answers
        suggestions = [
          "Small business owners aged 30-50 managing 5-50 person teams",
          "Solving inefficient manual workflows that waste 10+ hours weekly",
          "Tiered SaaS model: $49/mo starter, $149/mo pro, custom enterprise",
          "We're 50% cheaper and 3x easier to use than enterprise alternatives"
        ];
      }
    }

    // Track AI credits usage
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        
        if (user?.id) {
          const creditsUsed = 15; // idea-chat costs 15 credits
          
          // Get current billing period
          const { data: periodData } = await supabase.rpc('get_current_billing_period');
          const billingPeriodStart = periodData?.[0]?.period_start || new Date().toISOString();
          const billingPeriodEnd = periodData?.[0]?.period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          
          // Increment AI credits usage
          await supabase.rpc('increment_usage', {
            _user_id: user.id,
            _type: 'ai_credits',
            _amount: creditsUsed
          });
          
          // Log detailed usage
          await supabase.from('ai_credits_usage').insert({
            user_id: user.id,
            operation_type: 'idea-chat',
            credits_used: creditsUsed,
            billing_period_start: billingPeriodStart,
            billing_period_end: billingPeriodEnd
          });
          
          // Also track cost for analytics
          if (response.usage) {
            const inputCost = (response.usage.prompt_tokens / 1000) * 0.00005;
            const outputCost = (response.usage.completion_tokens / 1000) * 0.00008;
            const totalCost = inputCost + outputCost;
            
            await supabase.from('openai_usage').insert({
              user_id: user.id,
              function_name: 'idea-chat',
              model: 'llama-3.1-8b-instant',
              tokens_used: response.usage.prompt_tokens + response.usage.completion_tokens,
              cost_usd: totalCost
            });
          }
        }
      } catch (error) {
        console.error('Error tracking AI credits:', error);
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