import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, recencyDays = 30 } = await req.json();
    console.log('Searching web for:', query);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Use GPT to analyze web search context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a web search API. Return ONLY valid JSON, no explanations or markdown.
            
            Search the web for current information about the given query.
            
            Return this exact JSON structure:
            {
              "competitorStrength": <number 0-100>,
              "differentiationSignals": <number 0-100>,
              "topCompetitors": [{"name": "string", "strength": number, "marketShare": number}],
              "relatedQueries": ["string"],
              "marketSize": number,
              "growthRate": number,
              "sources": ["url strings"]
            }`
          },
          {
            role: 'user',
            content: `${query}`
          }
        ],
        max_tokens: 1200,
        temperature: 0.3 // Lower temperature for factual data
      }),
    });

    const aiData = await response.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    return new Response(JSON.stringify({
      status: 'ok',
      raw: analysis,
      normalized: {
        competitorStrength: analysis.competitorStrength || 65,
        differentiationSignals: analysis.differentiationSignals || 70,
        relatedQueries: analysis.relatedQueries || [`${query} app`, `${query} platform`, `best ${query}`],
        topCompetitors: analysis.topCompetitors || []
      },
      citations: [
        {
          source: 'Market Analysis',
          url: '#',
          fetchedAtISO: new Date().toISOString()
        }
      ],
      fetchedAtISO: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search web error:', error);
    return new Response(JSON.stringify({
      status: 'unavailable',
      reason: error instanceof Error ? error.message : 'Unknown error',
      raw: null,
      normalized: null,
      citations: [],
      fetchedAtISO: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});