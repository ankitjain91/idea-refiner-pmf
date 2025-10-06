import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentIdea, conversationHistory } = await req.json();
    
    if (!currentIdea) {
      return new Response(
        JSON.stringify({ error: 'Current idea is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build the refinement prompt
    const systemPrompt = `You are an expert startup advisor specializing in refining and crystallizing startup ideas.

Your task is to take an existing idea and the conversation history, then produce a MORE REFINED, CLEARER, and SPECIFIC version of the idea.

Rules for refinement:
1. Make the idea MORE SPECIFIC - add concrete details learned from the conversation
2. Include TARGET CUSTOMER clearly
3. Specify the CORE PROBLEM being solved
4. Define the WEDGE FEATURE or initial solution
5. Keep it CONCISE (2-4 sentences max)
6. Use ACTIVE, CLEAR language
7. Incorporate insights from the conversation to sharpen the idea

Return ONLY the refined idea text, nothing else.`;

    const userPrompt = `Current Idea:
"${currentIdea}"

Conversation History:
${conversationHistory.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')}

Based on the conversation above, refine this idea to be more specific, clear, and actionable. Focus on what was learned in the discussion.`;

    console.log('[RefineIdea] Calling Lovable AI to refine idea...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[RefineIdea] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const refinedIdea = data.choices[0].message.content.trim();

    console.log('[RefineIdea] Successfully refined idea');
    console.log('[RefineIdea] Original:', currentIdea.substring(0, 100));
    console.log('[RefineIdea] Refined:', refinedIdea.substring(0, 100));

    return new Response(
      JSON.stringify({ refinedIdea }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RefineIdea] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to refine idea' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
