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
    const { idea, category } = await req.json();
    
    console.log('[DASHBOARD-INSIGHTS] Fetching insights for:', idea, 'Category:', category);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let prompt = '';
    
    switch(category) {
      case 'market_analysis':
        prompt = `Analyze the market for "${idea}". Provide REAL, SPECIFIC data in JSON format:
{
  "marketSize": {
    "total": "[specific $ amount with year]",
    "growth": "[specific CAGR %]",
    "segments": [
      {
        "name": "[segment name]",
        "size": "[$ amount]",
        "growth": "[%]",
        "characteristics": "[key traits]"
      }
    ]
  },
  "competitors": [
    {
      "name": "[real company name]",
      "marketShare": "[%]",
      "valuation": "[$ amount]",
      "strengths": ["specific strength 1", "strength 2"],
      "weaknesses": ["specific weakness 1", "weakness 2"],
      "recentNews": "[latest development]"
    }
  ],
  "trends": [
    {
      "trend": "[specific trend]",
      "impact": "high/medium/low",
      "timeline": "[when it will peak]",
      "opportunity": "[how to leverage]"
    }
  ],
  "barriers": [
    {
      "barrier": "[specific barrier]",
      "difficulty": "high/medium/low",
      "solution": "[how to overcome]"
    }
  ],
  "regulations": [
    {
      "regulation": "[specific law/requirement]",
      "region": "[where it applies]",
      "impact": "[how it affects the business]"
    }
  ]
}`;
        break;

      case 'customer_insights':
        prompt = `Analyze the target customers for "${idea}". Provide REAL, SPECIFIC data in JSON format:
{
  "segments": [
    {
      "name": "[segment name]",
      "size": "[specific number of people]",
      "demographics": {
        "age": "[specific range]",
        "income": "[specific range]",
        "location": "[specific regions/cities]",
        "occupation": "[common jobs]"
      },
      "psychographics": {
        "values": ["value 1", "value 2"],
        "painPoints": ["specific pain 1", "pain 2", "pain 3"],
        "goals": ["goal 1", "goal 2"],
        "frustrations": ["frustration 1", "frustration 2"]
      },
      "behavior": {
        "buyingProcess": "[how they make decisions]",
        "priceWillingness": "[$ range they'll pay]",
        "channels": ["where they hang out online"],
        "influencers": ["who influences them"]
      }
    }
  ],
  "personas": [
    {
      "name": "[persona name]",
      "age": "[specific age]",
      "job": "[specific role]",
      "story": "[day in their life related to the problem]",
      "quote": "[what they'd say about their problem]",
      "techSavvy": "[1-10 scale]",
      "budget": "[$ amount]"
    }
  ],
  "insights": [
    {
      "insight": "[specific discovery]",
      "source": "[where this came from]",
      "confidence": "high/medium/low",
      "actionable": "[what to do with this]"
    }
  ]
}`;
        break;

      case 'pain_points':
        prompt = `Analyze the real pain points that "${idea}" solves. Provide SPECIFIC, DETAILED data in JSON format:
{
  "painPoints": [
    {
      "problem": "[specific problem statement]",
      "severity": "[1-10 scale]",
      "frequency": "[how often it occurs]",
      "currentSolutions": [
        {
          "solution": "[what people use now]",
          "satisfaction": "[1-10 scale]",
          "cost": "[$ amount]",
          "limitations": ["limitation 1", "limitation 2"]
        }
      ],
      "consequences": [
        {
          "consequence": "[what happens if not solved]",
          "cost": "[$ or time impact]",
          "likelihood": "high/medium/low"
        }
      ],
      "quotes": [
        "[actual quote someone might say about this problem]"
      ]
    }
  ],
  "rootCauses": [
    {
      "cause": "[underlying reason]",
      "explanation": "[why this happens]",
      "solvability": "easy/medium/hard",
      "approach": "[how to address it]"
    }
  ],
  "validationData": {
    "surveysNeeded": ["question to ask users"],
    "metricsToTrack": ["metric 1", "metric 2"],
    "successIndicators": ["indicator 1", "indicator 2"]
  }
}`;
        break;

      case 'monetization':
        prompt = `Analyze monetization strategies for "${idea}". Provide REAL, SPECIFIC data in JSON format:
{
  "pricingModels": [
    {
      "model": "[subscription/freemium/one-time/usage-based]",
      "price": "[specific $ amount]",
      "justification": "[why this price]",
      "competitors": [
        {
          "name": "[company]",
          "price": "[their price]",
          "features": ["what they offer"]
        }
      ],
      "projectedRevenue": {
        "month1": "[$ amount]",
        "month6": "[$ amount]",
        "year1": "[$ amount]"
      }
    }
  ],
  "revenueStreams": [
    {
      "stream": "[revenue source]",
      "percentage": "[% of total revenue]",
      "growth": "[growth potential]",
      "implementation": "[how to set it up]"
    }
  ],
  "unitEconomics": {
    "cac": "[$ customer acquisition cost]",
    "ltv": "[$ lifetime value]",
    "paybackPeriod": "[months]",
    "grossMargin": "[%]",
    "breakeven": "[number of customers needed]"
  },
  "financialProjections": {
    "year1": {
      "revenue": "[$ amount]",
      "costs": "[$ amount]",
      "profit": "[$ amount]",
      "customers": "[number]"
    },
    "year2": {
      "revenue": "[$ amount]",
      "costs": "[$ amount]",
      "profit": "[$ amount]",
      "customers": "[number]"
    }
  }
}`;
        break;

      case 'competitive_analysis':
        prompt = `Provide a detailed competitive analysis for "${idea}". Include REAL companies and data in JSON format:
{
  "directCompetitors": [
    {
      "name": "[real company name]",
      "website": "[actual URL]",
      "founded": "[year]",
      "funding": "[$ amount raised]",
      "employees": "[number]",
      "revenue": "[$ amount or range]",
      "users": "[number of users]",
      "features": {
        "core": ["feature 1", "feature 2"],
        "unique": ["their differentiator"],
        "missing": ["what they lack"]
      },
      "pricing": {
        "model": "[their pricing model]",
        "tiers": [
          {
            "name": "[tier name]",
            "price": "[$ amount]",
            "features": ["included features"]
          }
        ]
      },
      "strategy": "[their go-to-market strategy]",
      "weaknesses": ["weakness 1", "weakness 2"]
    }
  ],
  "indirectCompetitors": [
    {
      "name": "[company/solution]",
      "type": "[type of solution]",
      "threat": "high/medium/low",
      "explanation": "[why they're a threat]"
    }
  ],
  "competitiveAdvantages": [
    {
      "advantage": "[your unique advantage]",
      "sustainability": "high/medium/low",
      "implementation": "[how to build this]",
      "defense": "[how to protect it]"
    }
  ],
  "marketPositioning": {
    "strategy": "[how to position]",
    "messaging": "[key messages]",
    "differentiation": "[what makes you unique]",
    "targetNiche": "[specific niche to dominate first]"
  }
}`;
        break;

      case 'growth_strategy':
        prompt = `Create a detailed growth strategy for "${idea}". Provide ACTIONABLE, SPECIFIC tactics in JSON format:
{
  "acquisitionChannels": [
    {
      "channel": "[specific channel]",
      "cost": "[$ per acquisition]",
      "scalability": "high/medium/low",
      "timeline": "[when to start]",
      "tactics": [
        {
          "tactic": "[specific action]",
          "budget": "[$ needed]",
          "expectedResults": "[metrics]",
          "tools": ["tool 1", "tool 2"]
        }
      ]
    }
  ],
  "growthHacks": [
    {
      "hack": "[specific growth hack]",
      "difficulty": "easy/medium/hard",
      "impact": "high/medium/low",
      "implementation": "[step-by-step how to do it]",
      "examples": ["company that did this successfully"]
    }
  ],
  "viralFeatures": [
    {
      "feature": "[viral mechanism]",
      "viralCoefficient": "[expected K-factor]",
      "implementation": "[how to build it]",
      "triggers": ["what makes people share"]
    }
  ],
  "retentionStrategy": [
    {
      "tactic": "[retention tactic]",
      "impact": "[% improvement expected]",
      "implementation": "[how to do it]",
      "measurement": "[how to track success]"
    }
  ],
  "milestones": [
    {
      "milestone": "[specific goal]",
      "metric": "[number to hit]",
      "timeline": "[by when]",
      "requirements": ["what's needed to achieve"]
    }
  ]
}`;
        break;

      default:
        prompt = `Provide key insights about "${idea}" in JSON format with specific, actionable data.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a venture capital analyst and market researcher. Provide REAL, SPECIFIC, ACTIONABLE data based on actual market conditions, real companies, and factual information. Never use placeholder data. Include numbers, percentages, company names, and specific details. Return ONLY valid JSON.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3 // Lower temperature for more factual responses
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[DASHBOARD-INSIGHTS] OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to get insights');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    let insights;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      insights = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (parseError) {
      console.error('[DASHBOARD-INSIGHTS] Failed to parse insights:', parseError);
      insights = { error: 'Failed to parse insights', raw: content };
    }

    console.log('[DASHBOARD-INSIGHTS] Successfully generated insights for category:', category);

    return new Response(
      JSON.stringify({ 
        insights,
        category,
        idea,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DASHBOARD-INSIGHTS] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        insights: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});