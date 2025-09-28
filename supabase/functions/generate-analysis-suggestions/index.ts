import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('generate-analysis-suggestions function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if OpenAI API key is configured
  if (!openAIApiKey) {
    console.error('OPENAI_API_KEY is not configured');
    return new Response(
      JSON.stringify({ 
        error: 'OpenAI API key not configured',
        suggestion: null 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const { question, field, conversationHistory, ideaText, previousAnswers } = await req.json();
    
    console.log('Generating suggestion for question:', field);
    console.log('OpenAI API key exists:', !!openAIApiKey);
    console.log('Conversation history length:', conversationHistory?.length || 0);

    // Build context from conversation history
    const contextMessages = conversationHistory?.slice(-10).map((msg: any) => 
      `${msg.role}: ${msg.content}`
    ).join('\n') || '';

    // Build previous answers context
    const answersContext = Object.entries(previousAnswers || {}).map(([key, value]) => 
      `${key}: ${value}`
    ).join('\n');

    const systemPrompt = `You are an expert startup advisor helping analyze a business idea. Based on the conversation history and context provided, generate a thoughtful, specific suggestion for answering the current question.

The startup idea: ${ideaText}

Previous conversation context:
${contextMessages}

Previous answers in this analysis:
${answersContext}

Provide a concise, actionable suggestion that:
1. Is specific to their idea
2. Uses insights from the conversation history
3. Is practical and realistic
4. Helps them think strategically

Keep the suggestion to 2-3 sentences maximum. Be specific, not generic.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a specific suggestion for answering this question: "${question}"` }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices[0].message.content;

    console.log('Generated suggestion:', suggestion);

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-analysis-suggestions function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestion: null 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});