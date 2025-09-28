import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');
const serperApiKey = Deno.env.get('SERPER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    console.log('Fetching Google Trends for:', query);
    
    // Get real search data from Serper (includes trends)
    let searchData = null;
    if (serperApiKey) {
      try {
        const serperResponse = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: query,
            location: "United States",
            gl: "us",
            hl: "en",
            num: 20
          }),
        });
        searchData = await serperResponse.json();
      } catch (e) {
        console.error('Serper search failed:', e);
      }
    }
    
    // Analyze trends using Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `Analyze Google search trends data and return insights as JSON:
            {
              "trendScore": 0-100,
              "trending": "rising/stable/declining",
              "relatedQueries": ["query1", "query2", ...],
              "seasonality": "high/medium/low",
              "growthRate": percentage,
              "insights": ["insight1", "insight2", ...]
            }`
          },
          {
            role: 'user',
            content: `Analyze trends for: "${query}". ${searchData ? `Search context: ${JSON.stringify(searchData.searchParameters)}, Related searches: ${JSON.stringify(searchData.relatedSearches)}` : ''}`
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    
    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      console.error('Invalid Groq response:', aiData);
      throw new Error('Invalid response from Groq');
    }
    
    const trends = JSON.parse(aiData.choices[0].message.content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        trends,
        raw: searchData?.relatedSearches || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in google-trends function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});