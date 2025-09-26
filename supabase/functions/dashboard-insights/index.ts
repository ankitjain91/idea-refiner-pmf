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
        model: 'gpt-4o-mini',
        max_tokens: 3000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a product-market fit expert. Provide specific, actionable insights with real data.
            Return a valid JSON object with this exact structure (no markdown, just JSON):
            {
              "pmfScore": number between 0-100,
              "marketSize": {
                "total": "string like $5.2B",
                "growth": "string like 22% CAGR",
                "sources": [{"name": "string", "url": "string"}]
              },
              "competitors": [
                {
                  "name": "string",
                  "description": "string",
                  "marketShare": "string",
                  "strengths": ["string"],
                  "weaknesses": ["string"],
                  "pricing": "string",
                  "fundingRaised": "string",
                  "website": "string",
                  "sources": [{"name": "string", "url": "string"}]
                }
              ],
              "quickWins": [
                {
                  "title": "string",
                  "description": "string",
                  "impact": "high" or "medium" or "low",
                  "effort": "high" or "medium" or "low",
                  "timeframe": "string",
                  "specificSteps": ["string"],
                  "expectedOutcome": "string",
                  "metrics": "string",
                  "sources": [{"name": "string", "url": "string"}]
                }
              ],
              "improvementsByTime": [
                {
                  "timeframe": "string",
                  "improvements": [
                    {
                      "title": "string",
                      "description": "string",
                      "steps": ["string"],
                      "expectedImpact": "string",
                      "sources": [{"name": "string", "url": "string"}]
                    }
                  ]
                }
              ],
              "improvementsByCost": [
                {
                  "budget": "string",
                  "improvements": [
                    {
                      "title": "string",
                      "cost": "string",
                      "description": "string",
                      "roi": "string",
                      "implementation": ["string"],
                      "sources": [{"name": "string", "url": "string"}]
                    }
                  ]
                }
              ],
              "channels": {
                "organic": [
                  {
                    "name": "string",
                    "potential": "high" or "medium" or "low",
                    "strategy": "string",
                    "examples": ["string"],
                    "sources": [{"name": "string", "url": "string"}]
                  }
                ],
                "paid": [
                  {
                    "name": "string",
                    "cac": "string",
                    "effectiveness": "high" or "medium" or "low",
                    "budget": "string",
                    "strategy": "string",
                    "sources": [{"name": "string", "url": "string"}]
                  }
                ]
              },
              "realTimeMetrics": {
                "searchVolume": {
                  "monthly": 50000,
                  "trend": "rising",
                  "relatedQueries": ["string"],
                  "sources": [{"name": "string", "url": "string"}]
                },
                "socialSignals": {
                  "mentions": 1000,
                  "sentiment": "positive",
                  "platforms": [
                    {
                      "name": "string",
                      "engagement": "string",
                      "trending": true
                    }
                  ],
                  "sources": [{"name": "string", "url": "string"}]
                }
              },
              "monetization": {
                "models": [
                  {
                    "type": "string",
                    "pricing": "string",
                    "projection": "string",
                    "benchmarks": "string",
                    "sources": [{"name": "string", "url": "string"}]
                  }
                ],
                "revenue": {
                  "month1": "$5K",
                  "month6": "$50K",
                  "year1": "$200K",
                  "assumptions": ["string"]
                }
              },
              "targetAudience": {
                "segments": [
                  {
                    "name": "string",
                    "size": "string",
                    "characteristics": ["string"],
                    "painPoints": ["string"],
                    "willingness": "string"
                  }
                ],
                "sources": [{"name": "string", "url": "string"}]
              },
              "risks": [
                {
                  "type": "string",
                  "description": "string",
                  "likelihood": "high" or "medium" or "low",
                  "impact": "high" or "medium" or "low",
                  "mitigation": "string",
                  "sources": [{"name": "string", "url": "string"}]
                }
              ],
              "features": {
                "mvp": [
                  {
                    "name": "string",
                    "description": "string",
                    "priority": "critical" or "high" or "medium",
                    "effort": "string",
                    "rationale": "string"
                  }
                ],
                "future": [
                  {
                    "name": "string",
                    "description": "string",
                    "timeline": "string",
                    "dependency": "string"
                  }
                ]
              },
              "actionPlan": {
                "immediate": [
                  {
                    "action": "string",
                    "outcome": "string",
                    "deadline": "string"
                  }
                ],
                "shortTerm": [
                  {
                    "action": "string",
                    "outcome": "string",
                    "deadline": "string"
                  }
                ],
                "longTerm": [
                  {
                    "action": "string",
                    "outcome": "string",
                    "deadline": "string"
                  }
                ]
              }
            }`
          },
          {
            role: 'user',
            content: `Analyze this idea and provide comprehensive insights:

Idea: ${idea}
User Answers: ${JSON.stringify(userAnswers, null, 2)}

Provide specific, real data with actual competitor names, market sizes, and actionable improvements. Include real source URLs.`
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.error('No content in OpenAI response');
      throw new Error('No content in OpenAI response');
    }
    
    // Parse the JSON response
    let insights;
    try {
      // Try to parse the content directly
      insights = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse JSON, attempting to extract:', parseError);
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          insights = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } catch (secondError) {
          console.error('Failed to parse extracted JSON:', secondError);
          throw new Error('Failed to parse AI insights');
        }
      } else {
        throw new Error('No valid JSON found in response');
      }
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