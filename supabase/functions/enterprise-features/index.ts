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
    const { action, data } = await req.json();

    let prompt = '';
    
    switch(action) {
      case 'session_management':
        prompt = `Design an enterprise-grade session management system for a product-market fit analysis tool.
        Current features: ${JSON.stringify(data.features)}
        
        Provide a JSON response with:
        {
          "sessionFeatures": [
            {
              "name": "Feature name",
              "description": "What it does",
              "tier": "free|basic|pro|enterprise",
              "implementation": "How to implement"
            }
          ],
          "navigationStructure": {
            "sidebar": ["List of sidebar items"],
            "quickAccess": ["Quick access items"],
            "breadcrumbs": true/false
          },
          "dataRetention": {
            "free": "retention policy",
            "paid": "retention policy"
          },
          "enterpriseFeatures": ["List of enterprise-specific features"]
        }`;
        break;
        
      case 'value_gating':
        prompt = `Determine which insights should be free vs paid in a market analysis tool.
        User's idea: ${data.idea}
        All features: ${JSON.stringify(data.allFeatures)}
        
        Return JSON:
        {
          "freeInsights": [
            {
              "feature": "name",
              "reason": "why it's free",
              "value": "low|medium"
            }
          ],
          "basicInsights": [
            {
              "feature": "name", 
              "reason": "why basic tier",
              "value": "medium|high",
              "teaser": "What to show free users"
            }
          ],
          "premiumInsights": [
            {
              "feature": "name",
              "reason": "why premium",
              "value": "high|critical",
              "roi": "Expected ROI for user"
            }
          ]
        }`;
        break;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are an enterprise software architect specializing in SaaS pricing and feature gating strategies.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500
      }),
    });

    const result = await response.json();
    const content = result.choices[0].message.content;
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      parsedContent = { error: "Failed to parse response", raw: content };
    }

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in enterprise features:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});