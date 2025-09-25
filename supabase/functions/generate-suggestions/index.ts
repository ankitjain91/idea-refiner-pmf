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
    const systemPrompt = `You are an expert startup advisor helping entrepreneurs validate their ideas through Product-Market Fit analysis. Generate specific, contextual answer suggestions based on the user's startup idea.`;
    
    const userPrompt = `
Startup Idea: "${ideaDescription || 'Not provided yet'}"

Previous context from conversation:
${previousAnswers ? Object.entries(previousAnswers).map(([q, a]) => `${q}: ${a}`).join('\n') : 'None'}

Current Question: "${question}"

Generate exactly 4 specific, realistic answer suggestions for this question that are:
1. Directly relevant to the startup idea: "${ideaDescription}"
2. Concrete and specific (not generic)
3. Diverse to cover different strategic approaches
4. Actionable and clear (2-15 words each)

For example, if the idea is "Cash flow tracking for freelancers" and the question is "Who is your target audience?", good suggestions would be:
- "Freelance designers and developers earning $50K-150K annually"
- "Solo consultants struggling with irregular income"
- "Creative professionals transitioning from full-time employment"
- "Digital nomads managing multiple client projects"

Return a JSON array of exactly 4 strings:
["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"]`;

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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GENERATE-SUGGESTIONS] OpenAI API error:', errorText);
      console.error('[GENERATE-SUGGESTIONS] Status:', response.status);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[GENERATE-SUGGESTIONS] OpenAI response:', JSON.stringify(data, null, 2));
    
    let suggestions = [];
    try {
      // Parse the content as JSON
      const content = data.choices[0].message.content;
      
      // Handle empty content
      if (!content || content.trim() === '') {
        throw new Error('Empty response from OpenAI');
      }
      
      // Try to parse as JSON array directly
      suggestions = JSON.parse(content);
      
      // Validate it's an array
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }
      
      // Take only the first 4 suggestions
      suggestions = suggestions.slice(0, 4);
      
    } catch (parseError) {
      console.error('[GENERATE-SUGGESTIONS] Failed to parse suggestions:', parseError);
      // Return context-aware fallback suggestions based on the question
      if (question.toLowerCase().includes('target audience')) {
        suggestions = [
          "Tech-savvy millennials in urban areas",
          "Small business owners seeking efficiency",
          "Parents looking for family solutions",
          "Students and young professionals"
        ];
      } else if (question.toLowerCase().includes('problem')) {
        suggestions = [
          "Saves time on repetitive tasks",
          "Reduces costs and overhead",
          "Improves team collaboration",
          "Provides better data insights"
        ];
      } else {
        suggestions = [
          "Please provide more details",
          "I need to think about this",
          "Let me research this further",
          "This requires more analysis"
        ];
      }
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