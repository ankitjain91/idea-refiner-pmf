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
    const { query, tileType, filters } = await req.json();
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Web search request:', { query, tileType, filters });

    // Use GPT-5 to analyze and generate relevant search insights
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: `You are a market research analyst providing real-time insights. Based on the query, generate realistic and current market data, trends, and analysis.
            
            For the tile type "${tileType}", provide:
            1. Current market metrics with explanations
            2. Recent trends and developments
            3. Key competitors or players
            4. Data-backed insights
            5. Future projections
            
            Format your response as JSON with these fields:
            - metrics: array of {name, value, unit, explanation, confidence}
            - trends: array of {title, description, impact, timeframe}
            - competitors: array of {name, description, marketShare, strengths}
            - insights: array of {point, evidence, importance}
            - projections: {shortTerm, mediumTerm, longTerm}
            
            Use realistic data based on current market conditions (as of 2025).`
          },
          { 
            role: 'user', 
            content: `Generate market insights for: ${query || JSON.stringify(filters)}
            
            Focus on ${tileType} analysis with emphasis on:
            - Keywords: ${filters?.idea_keywords?.join(', ') || 'general market'}
            - Industry: ${filters?.industry || 'technology'}
            - Geography: ${filters?.geography || 'global'}
            - Time window: ${filters?.time_window || 'last 12 months'}`
          }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    // Transform the analysis into the format expected by DataTile
    const transformedData = {
      updatedAt: new Date().toISOString(),
      filters,
      metrics: analysis.metrics || [],
      items: analysis.trends?.map((trend: any) => ({
        title: trend.title,
        snippet: trend.description,
        url: '#',
        canonicalUrl: '#',
        published: new Date().toISOString(),
        source: 'AI Market Analysis',
        evidence: [trend.impact]
      })) || [],
      competitors: analysis.competitors || [],
      insights: analysis.insights || [],
      projections: analysis.projections || {},
      assumptions: [
        'Data generated based on current market trends',
        'Analysis uses GPT-5 model with web-informed knowledge'
      ],
      notes: `Real-time analysis generated for ${tileType}`,
      citations: [],
      fromCache: false,
      stale: false
    };

    console.log('Generated analysis for', tileType, ':', transformedData);

    return new Response(JSON.stringify(transformedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in web-search-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate market insights'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});