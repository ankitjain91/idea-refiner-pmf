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
    const { idea, userAnswers } = await req.json();

    if (!idea) {
      throw new Error('Idea is required');
    }

    // Call OpenAI to get comprehensive dashboard insights with real data
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: `You are a product-market fit analysis expert. Analyze the given idea and user answers to provide comprehensive, data-driven insights. 
            
            IMPORTANT: All data must be real, specific, and actionable. No generic or placeholder information.
            Research and provide actual market data, real competitors, specific improvements, and genuine metrics.
            Include source URLs for all data points.`
          },
          {
            role: 'user',
            content: `Analyze this product idea and provide comprehensive dashboard data:

Idea: ${idea}

User Answers:
${JSON.stringify(userAnswers, null, 2)}

Provide a comprehensive JSON response with the following structure:
{
  "pmfScore": number (0-100, calculated based on real market factors),
  "marketSize": {
    "total": string (e.g., "$5.2B"),
    "growth": string (e.g., "22% CAGR"),
    "sources": [{ "name": string, "url": string }]
  },
  "competitors": [
    {
      "name": string,
      "description": string,
      "marketShare": string,
      "strengths": [string],
      "weaknesses": [string],
      "pricing": string,
      "fundingRaised": string,
      "website": string,
      "sources": [{ "name": string, "url": string }]
    }
  ],
  "targetAudience": {
    "segments": [
      {
        "name": string,
        "size": string,
        "characteristics": [string],
        "painPoints": [string],
        "willingness": string
      }
    ],
    "sources": [{ "name": string, "url": string }]
  },
  "quickWins": [
    {
      "title": string,
      "description": string,
      "impact": "high" | "medium" | "low",
      "effort": "high" | "medium" | "low",
      "timeframe": string,
      "specificSteps": [string],
      "expectedOutcome": string,
      "metrics": string,
      "sources": [{ "name": string, "url": string }]
    }
  ],
  "improvementsByTime": [
    {
      "timeframe": "1 week" | "2 weeks" | "1 month" | "3 months",
      "improvements": [
        {
          "title": string,
          "description": string,
          "steps": [string],
          "expectedImpact": string,
          "sources": [{ "name": string, "url": string }]
        }
      ]
    }
  ],
  "improvementsByCost": [
    {
      "budget": "$0-100" | "$100-500" | "$500-2000" | "$2000+",
      "improvements": [
        {
          "title": string,
          "cost": string,
          "description": string,
          "roi": string,
          "implementation": [string],
          "sources": [{ "name": string, "url": string }]
        }
      ]
    }
  ],
  "channels": {
    "organic": [
      {
        "name": string,
        "potential": "high" | "medium" | "low",
        "strategy": string,
        "examples": [string],
        "sources": [{ "name": string, "url": string }]
      }
    ],
    "paid": [
      {
        "name": string,
        "cac": string,
        "effectiveness": "high" | "medium" | "low",
        "budget": string,
        "strategy": string,
        "sources": [{ "name": string, "url": string }]
      }
    ]
  },
  "features": {
    "mvp": [
      {
        "name": string,
        "description": string,
        "priority": "critical" | "high" | "medium",
        "effort": string,
        "rationale": string
      }
    ],
    "future": [
      {
        "name": string,
        "description": string,
        "timeline": string,
        "dependency": string
      }
    ]
  },
  "monetization": {
    "models": [
      {
        "type": string,
        "pricing": string,
        "projection": string,
        "benchmarks": string,
        "sources": [{ "name": string, "url": string }]
      }
    ],
    "revenue": {
      "month1": string,
      "month6": string,
      "year1": string,
      "assumptions": [string]
    }
  },
  "risks": [
    {
      "type": string,
      "description": string,
      "likelihood": "high" | "medium" | "low",
      "impact": "high" | "medium" | "low",
      "mitigation": string,
      "sources": [{ "name": string, "url": string }]
    }
  ],
  "realTimeMetrics": {
    "searchVolume": {
      "monthly": number,
      "trend": "rising" | "stable" | "declining",
      "relatedQueries": [string],
      "sources": [{ "name": string, "url": string }]
    },
    "socialSignals": {
      "mentions": number,
      "sentiment": "positive" | "neutral" | "negative",
      "platforms": [
        {
          "name": string,
          "engagement": string,
          "trending": boolean
        }
      ],
      "sources": [{ "name": string, "url": string }]
    }
  },
  "actionPlan": {
    "immediate": [
      {
        "action": string,
        "outcome": string,
        "deadline": string
      }
    ],
    "shortTerm": [
      {
        "action": string,
        "outcome": string,
        "deadline": string
      }
    ],
    "longTerm": [
      {
        "action": string,
        "outcome": string,
        "deadline": string
      }
    ]
  }
}

CRITICAL: 
- All competitors must be real companies with actual data
- All market sizes must be based on real research
- All improvements must be specific and actionable
- Include real source URLs that users can verify
- Calculate PM-Fit score based on actual market signals
- Provide specific metrics and KPIs, not generic advice`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let insights;
    try {
      // Clean the response if needed
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      insights = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Failed to parse AI insights');
    }

    console.log('[DASHBOARD-INSIGHTS] Generated comprehensive insights:', {
      pmfScore: insights.pmfScore,
      competitorsCount: insights.competitors?.length,
      quickWinsCount: insights.quickWins?.length,
      hasRealData: !!insights.marketSize?.sources?.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in dashboard-insights function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});