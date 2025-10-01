import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, businessModel, targetMarket } = await req.json();
    
    console.log('Analyzing financials for:', idea);
    
    // Analyze financial metrics using AI
    const financialAnalysis = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a financial analyst specializing in startups. Analyze the financial potential and unit economics for the given idea. Return a JSON object with:
            {
              "marketSize": {
                "TAM": { "value": 5000000000, "label": "$5B", "description": "Total Addressable Market" },
                "SAM": { "value": 500000000, "label": "$500M", "description": "Serviceable Addressable Market" },
                "SOM": { "value": 50000000, "label": "$50M", "description": "Serviceable Obtainable Market" }
              },
              "unitEconomics": {
                "CAC": { "value": 150, "label": "$150", "trend": "decreasing" },
                "LTV": { "value": 1200, "label": "$1,200", "trend": "increasing" },
                "LTVtoCACRatio": 8,
                "paybackPeriod": "3 months",
                "grossMargin": 75
              },
              "recentFunding": [
                {
                  "company": "Similar Co",
                  "amount": "$25M",
                  "stage": "Series A",
                  "investors": ["VC1", "VC2"],
                  "date": "Jan 2024",
                  "valuation": "$150M"
                }
              ],
              "successStories": [
                {
                  "company": "Success Co",
                  "exit": "IPO",
                  "value": "$2B",
                  "timeline": "7 years",
                  "keyFactors": ["factor1", "factor2"]
                }
              ],
              "revenueProjections": {
                "year1": 500000,
                "year2": 2500000,
                "year3": 10000000,
                "growthRate": 400
              },
              "insights": ["insight1", "insight2"]
            }`
          },
          {
            role: 'user',
            content: `Analyze financials for: "${idea}". Business model: ${businessModel || 'SaaS'}. Target market: ${targetMarket || 'B2B'}.`
          }
        ],
        max_tokens: 2000
      }),
    });

    const financialData = await financialAnalysis.json();
    
    // Parse response, handling markdown code blocks
    let content = financialData.choices[0].message.content;
    
    // Remove markdown code blocks if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\s*/g, '');
    }
    
    // Trim whitespace
    content = content.trim();
    
    const financials = JSON.parse(content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        financials,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing financials:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});