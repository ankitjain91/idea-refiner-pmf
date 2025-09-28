import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, industry } = await req.json();
    
    console.log('Analyzing competitors for:', idea);
    
    // Analyze competitors using AI
    const competitorAnalysis = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a competitive intelligence expert. Analyze the competitive landscape for the given idea. Return a JSON object with:
            {
              "topCompetitors": [
                {
                  "name": "Company Name",
                  "logo": "https://logo.url",
                  "description": "brief description",
                  "fundingStage": "Series A/B/C/IPO",
                  "fundingAmount": "$XX M",
                  "userBase": "XX K/M users",
                  "valuation": "$XX M/B",
                  "strengths": ["strength1", "strength2"],
                  "weaknesses": ["weakness1", "weakness2"],
                  "tractionScore": 85
                }
              ],
              "marketLeader": {
                "name": "Leader Name",
                "marketShare": 35,
                "keyAdvantage": "description"
              },
              "emergingPlayers": ["Player1", "Player2"],
              "competitiveDynamics": {
                "marketConcentration": "high/medium/low",
                "entryBarriers": ["barrier1", "barrier2"],
                "differentiationOpportunities": ["opportunity1", "opportunity2"]
              },
              "insights": ["insight1", "insight2"]
            }`
          },
          {
            role: 'user',
            content: `Analyze competitors for: "${idea}" in the ${industry || 'general'} industry.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    const competitorData = await competitorAnalysis.json();
    const competitors = JSON.parse(competitorData.choices[0].message.content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        competitors,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing competitors:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});