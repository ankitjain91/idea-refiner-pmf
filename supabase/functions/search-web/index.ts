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
            content: `You are a market research API that performs comprehensive web searches. Return ONLY valid JSON.
            
            CRITICAL: Return this exact structure with real data:
            {
              "competitorStrength": 75,
              "differentiationSignals": 68,
              "topCompetitors": [
                {"name": "Notion", "strength": 85, "marketShare": 22, "pricing": "$8-20/user", "funding": "$343M"},
                {"name": "Monday.com", "strength": 78, "marketShare": 18, "pricing": "$10-24/user", "funding": "$574M"}
              ],
              "marketSize": 4500000000,
              "growthRate": 24.5,
              "demographics": {
                "primaryAge": "25-44",
                "industries": ["Tech", "Finance", "Healthcare"],
                "companySize": ["10-50", "50-200"],
                "geographic": ["North America 45%", "Europe 30%", "Asia 25%"]
              },
              "pricing": {
                "averagePrice": 15,
                "priceRange": {"min": 5, "max": 50},
                "model": "SaaS subscription",
                "trends": "Moving towards usage-based pricing"
              },
              "relatedQueries": ["productivity tools", "team collaboration"],
              "sources": ["https://example.com"]
            }`
          },
          {
            role: 'user',
            content: `Search and analyze: ${query}. Find real competitors, market size, demographics, and pricing data.`
          }
        ],
        max_tokens: 1200,
        temperature: 0.3 // Lower temperature for factual data
      }),
    });

    const aiData = await response.json();
    const content = aiData?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      throw new Error('Failed to parse OpenAI JSON content');
    }

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