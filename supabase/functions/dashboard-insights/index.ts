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

    // Call OpenAI to get comprehensive dashboard insights with real data (with retries, no fallback)
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
              {
                role: 'system',
                content: `You are a product-market fit expert. Generate focused, actionable insights with detailed explanations.
                Return ONLY valid JSON matching this structure exactly:
                {
                  "pmfScore": 75,
                  "previousScore": 65,
                  "scoreBreakdown": {
                    "marketDemand": { 
                      "current": 70, 
                      "potential": 85, 
                      "label": "Growing market",
                      "description": "Market demand measures how many people actively need and search for your solution",
                      "calculation": "Based on search volume trends, competitor growth rates, and market research data",
                      "dataSources": ["Google Trends", "Market Research Reports", "Competitor Analysis"],
                      "insights": ["Growing 25% YoY", "High search volume for related terms"],
                      "improvements": [
                        {
                          "action": "Target specific niche first",
                          "impact": "High",
                          "effort": "Low",
                          "expectedResult": "15% increase in market fit"
                        }
                      ],
                      "contextualRelevance": "For your 3D printing marketplace, market demand is strong due to growing customization trends"
                    },
                    "productReadiness": { 
                      "current": 60, 
                      "potential": 80, 
                      "label": "MVP stage",
                      "description": "How complete and polished your product is compared to market expectations",
                      "calculation": "Evaluated based on feature completeness, UI/UX quality, and technical stability",
                      "dataSources": ["Feature comparison", "Industry standards", "User expectations"],
                      "insights": ["Core features defined", "Need UI improvements"],
                      "improvements": [
                        {
                          "action": "Build MVP with core features",
                          "impact": "High",
                          "effort": "Medium",
                          "expectedResult": "20% improvement in readiness"
                        }
                      ],
                      "contextualRelevance": "Your marketplace needs basic listing, payment, and 3D preview features to be viable"
                    },
                    "userEngagement": { 
                      "current": 65, 
                      "potential": 90, 
                      "label": "High potential",
                      "description": "Predicted user interest and engagement based on market signals",
                      "calculation": "Analyzed from similar product metrics, social media buzz, and community interest",
                      "dataSources": ["Reddit discussions", "Social media trends", "Community forums"],
                      "insights": ["Active community exists", "High interest in customization"],
                      "improvements": [
                        {
                          "action": "Build community before launch",
                          "impact": "High",
                          "effort": "Low",
                          "expectedResult": "25% boost in initial engagement"
                        }
                      ],
                      "contextualRelevance": "3D printing enthusiasts are highly engaged and form tight communities"
                    },
                    "revenueViability": { 
                      "current": 55, 
                      "potential": 75, 
                      "label": "Needs validation",
                      "description": "How viable your monetization model is based on market conditions",
                      "calculation": "Based on competitor pricing, market willingness to pay, and revenue model analysis",
                      "dataSources": ["Competitor pricing", "Market surveys", "Industry reports"],
                      "insights": ["Commission model proven", "Need to validate pricing"],
                      "improvements": [
                        {
                          "action": "Test pricing with surveys",
                          "impact": "Medium",
                          "effort": "Low",
                          "expectedResult": "20% clearer revenue path"
                        }
                      ],
                      "contextualRelevance": "Marketplace commission of 10-15% is standard in your industry"
                    }
                  },
                  "growthMetrics": {
                    "timeline": [
                      { "month": "Jan", "users": 100, "revenue": 1000, "engagement": 45 },
                      { "month": "Feb", "users": 250, "revenue": 2500, "engagement": 52 },
                      { "month": "Mar", "users": 500, "revenue": 5000, "engagement": 58 }
                    ]
                  },
                  "competitorComparison": [
                    { "name": "Market Share", "metric": "Market Share", "yours": 5, "theirs": 25, "unit": "%" },
                    { "name": "Pricing", "metric": "Price Point", "yours": 99, "theirs": 149, "unit": "$" }
                  ],
                  "quickWins": [
                    {
                      "title": "Quick Win Title",
                      "description": "Brief description",
                      "impact": "High",
                      "effort": "Low",
                      "specificSteps": ["Step 1", "Step 2"],
                      "sources": [{"name": "Source", "url": "https://example.com"}]
                    }
                  ],
                  "competitors": [],
                  "channels": {"organic": [], "paid": []},
                  "marketSize": {"total": "$2B", "growth": "15% YoY", "sources": []},
                  "realTimeMetrics": {"searchVolume": {"monthly": 50000, "trend": "Increasing", "relatedQueries": ["query1"]}},
                  "monetization": {"revenue": {"month1": "$10K", "month6": "$100K", "year1": "$1M"}}
                }`
              },
              {
                role: 'user',
                content: `Generate comprehensive PMF insights with detailed explanations for: ${idea}. 
                User context: ${JSON.stringify(userAnswers).slice(0, 500)}. 
                
                For EACH metric in scoreBreakdown, provide:
                1. Detailed description of what the metric means
                2. How it's calculated specifically for this idea
                3. Data sources used
                4. Key insights specific to this idea
                5. Actionable improvements with expected results
                6. Contextual relevance explaining why this matters for their specific idea
                
                Make everything highly specific to their idea, not generic. Use real competitor names, real data points, and contextual explanations.`
              }
            ]
          })
        });

        if (!response.ok) {
          console.error('OpenAI API error:', response.status, response.statusText);
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content: string | undefined = data.choices[0]?.message?.content?.trim();
        if (!content) throw new Error('No content in OpenAI response');

        // Parse the JSON response
        let insights: any;
        try {
          insights = JSON.parse(content);
        } catch (parseError) {
          console.error(`[DASHBOARD-INSIGHTS] Failed to parse JSON on attempt ${attempt}, trying extraction`, parseError);
          const codeBlockMatch = content.match(/```json?\s*([\s\S]*?)```/);
          const bracketMatch = content.match(/\{[\s\S]*\}/);
          const candidate = codeBlockMatch ? codeBlockMatch[1] : bracketMatch ? bracketMatch[0] : null;
          if (!candidate) throw new Error('No valid JSON found in response');
          insights = JSON.parse(candidate);
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
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        lastError = err;
        console.error(`[DASHBOARD-INSIGHTS] Attempt ${attempt} failed:`, err);
        if (attempt < 3) {
          // Reduced retry delay for faster responses
          const delay = 200 * attempt;
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
      }
    }

    // After retries, bubble up error to outer catch
    throw lastError instanceof Error ? lastError : new Error('Unknown error while generating insights');
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