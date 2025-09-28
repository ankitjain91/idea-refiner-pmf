import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_DASHBOARD_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, keywords } = await req.json();
    
    console.log('Fetching market trends for:', idea);
    
    // Analyze market trends and search volume using AI
    const trendAnalysis = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a market research expert. Analyze search trends and market interest for the given idea. Return a JSON object with:
            {
              "searchVolume": {
                "trend": "growing/stable/declining",
                "monthlyVolume": number,
                "growthRate": number,
                "seasonality": string
              },
              "relatedKeywords": ["keyword1", "keyword2", ...],
              "trendData": [
                {"month": "Jan 2024", "value": 75},
                {"month": "Feb 2024", "value": 82},
                ...
              ],
              "socialMentions": {
                "reddit": number,
                "twitter": number,
                "tiktok": number
              },
              "competitorKeywords": ["competitor1", "competitor2", ...],
              "marketSentiment": "positive/neutral/negative",
              "insights": ["insight1", "insight2", ...]
            }`
          },
          {
            role: 'user',
            content: `Analyze market trends for: "${idea}". Keywords: ${keywords?.join(', ') || 'auto-detect'}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    const trendData = await trendAnalysis.json();
    
    if (!trendData.choices || !trendData.choices[0] || !trendData.choices[0].message) {
      console.error('Invalid OpenAI response:', trendData);
      throw new Error('Invalid response from OpenAI');
    }
    
    const trends = JSON.parse(trendData.choices[0].message.content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        trends,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching market trends:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});