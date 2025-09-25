import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[GENERATE-SUGGESTIONS] Function started');
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { question, ideaDescription, previousAnswers } = await req.json();
    
    console.log('[GENERATE-SUGGESTIONS] Generating suggestions for:', question);

    // Create a context-aware prompt
    const systemPrompt = `You are an expert startup advisor helping entrepreneurs validate their ideas through Product-Market Fit analysis. Generate concise, relevant answer options for the given question.`;
    
    const userPrompt = `
    Startup Idea: ${ideaDescription || 'Not provided yet'}
    
    Previous Answers:
    ${previousAnswers ? Object.entries(previousAnswers).map(([q, a]) => `${q}: ${a}`).join('\n') : 'None'}
    
    Current Question: ${question}
    
    Generate exactly 5 relevant, diverse answer suggestions for this question. Each suggestion should be:
    - Concise (2-10 words)
    - Specific and actionable
    - Relevant to the startup context
    - Different from each other to cover various perspectives
    
    Format your response as a JSON array of strings, ordered from most likely to least likely to be helpful.
    Example: ["First suggestion", "Second suggestion", "Third suggestion", "Fourth suggestion", "Fifth suggestion"]
    
    Only return the JSON array, no additional text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 150,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GENERATE-SUGGESTIONS] OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[GENERATE-SUGGESTIONS] Raw OpenAI response:', data);
    
    let suggestions = [];
    try {
      // Try to parse the content as JSON
      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      // Handle different response formats
      if (Array.isArray(parsed)) {
        suggestions = parsed;
      } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions;
      } else {
        // If it's an object with other structure, try to extract array
        const values = Object.values(parsed);
        if (values.length > 0 && Array.isArray(values[0])) {
          suggestions = values[0];
        }
      }
    } catch (parseError) {
      console.error('[GENERATE-SUGGESTIONS] Failed to parse suggestions:', parseError);
      // Fallback suggestions
      suggestions = [
        "Please provide more details",
        "I need to think about this",
        "Let me research this further",
        "This requires more analysis"
      ];
    }
    
    // Ensure we have exactly 4 suggestions (take top 4)
    suggestions = suggestions.slice(0, 4);
    
    console.log('[GENERATE-SUGGESTIONS] Final suggestions:', suggestions);

    return new Response(
      JSON.stringify({ suggestions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[GENERATE-SUGGESTIONS] Error:', error);
    
    // Return fallback suggestions on error
    return new Response(
      JSON.stringify({ 
        suggestions: [
          "Please provide more details",
          "I need to think about this", 
          "Let me research this further",
          "This requires more analysis"
        ],
        error: (error as Error).message 
      }),
      {
        status: 200, // Return 200 with fallback suggestions
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});