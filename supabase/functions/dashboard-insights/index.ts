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
                content: `You are a product-market fit expert. Generate comprehensive, data-rich insights with detailed explanations.
                Return ONLY valid JSON matching this structure EXACTLY:
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
                      "contextualRelevance": "For your idea, market demand is strong due to growing trends"
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
                      "contextualRelevance": "Your product needs basic features to be viable"
                    },
                    "userEngagement": { 
                      "current": 65, 
                      "potential": 90, 
                      "label": "High potential",
                      "description": "Predicted user interest and engagement based on market signals",
                      "calculation": "Analyzed from similar product metrics, social media buzz, and community interest",
                      "dataSources": ["Reddit discussions", "Social media trends", "Community forums"],
                      "insights": ["Active community exists", "High interest in solution"],
                      "improvements": [
                        {
                          "action": "Build community before launch",
                          "impact": "High",
                          "effort": "Low",
                          "expectedResult": "25% boost in initial engagement"
                        }
                      ],
                      "contextualRelevance": "Target users are highly engaged and form tight communities"
                    },
                    "revenueViability": { 
                      "current": 55, 
                      "potential": 75, 
                      "label": "Needs validation",
                      "description": "How viable your monetization model is based on market conditions",
                      "calculation": "Based on competitor pricing, market willingness to pay, and revenue model analysis",
                      "dataSources": ["Competitor pricing", "Market surveys", "Industry reports"],
                      "insights": ["Business model proven", "Need to validate pricing"],
                      "improvements": [
                        {
                          "action": "Test pricing with surveys",
                          "impact": "Medium",
                          "effort": "Low",
                          "expectedResult": "20% clearer revenue path"
                        }
                      ],
                      "contextualRelevance": "Standard pricing models work well in your industry"
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
                      "title": "Launch MVP Waitlist",
                      "description": "Create a landing page with email capture to gauge initial interest",
                      "impact": "High",
                      "effort": "Low",
                      "specificSteps": ["Build landing page", "Set up email automation", "Create lead magnet"],
                      "sources": [{"name": "Growth Hacking Guide", "url": "https://example.com"}]
                    }
                  ],
                  "improvementsByTime": [
                    {
                      "timeframe": "This Week",
                      "improvements": [
                        {
                          "title": "Landing Page Optimization",
                          "description": "Optimize your landing page for conversions with A/B testing",
                          "expectedDelta": "+10%",
                          "confidence": "high",
                          "sources": [{"name": "CRO Best Practices", "url": "#"}]
                        },
                        {
                          "title": "Content Marketing Start",
                          "description": "Begin creating valuable content for your target audience",
                          "expectedDelta": "+5%",
                          "confidence": "medium",
                          "sources": [{"name": "Content Strategy Guide", "url": "#"}]
                        }
                      ],
                      "expectedImpact": "15% improvement in conversion",
                      "expectedResult": "50-100 new leads captured"
                    },
                    {
                      "timeframe": "Next Month",
                      "improvements": [
                        {
                          "title": "Social Media Presence",
                          "description": "Establish and grow presence on key social platforms",
                          "expectedDelta": "+15%",
                          "confidence": "high",
                          "sources": [{"name": "Social Media Strategy", "url": "#"}]
                        }
                      ],
                      "expectedImpact": "20% brand awareness increase",
                      "expectedResult": "500+ followers across platforms"
                    }
                  ],
                  "improvementsByCost": [
                    {
                      "budget": "Free",
                      "improvements": [
                        {
                          "title": "SEO Foundation",
                          "description": "Set up basic SEO optimization for your website",
                          "cost": "$0",
                          "roi": "500%",
                          "expectedRevenue": "$2K",
                          "sources": [{"name": "SEO Guide", "url": "#"}]
                        }
                      ],
                      "averageROI": "500%",
                      "revenueImpact": "$2K-5K"
                    },
                    {
                      "budget": "Low Budget ($100-500)",
                      "improvements": [
                        {
                          "title": "Paid Ads Testing",
                          "description": "Test Facebook and Google ads with small budget",
                          "cost": "$300",
                          "roi": "200%",
                          "expectedRevenue": "$900",
                          "sources": [{"name": "PPC Guide", "url": "#"}]
                        }
                      ],
                      "averageROI": "200%",
                      "revenueImpact": "$1K-3K"
                    }
                  ],
                  "competitors": [
                    {
                      "name": "Competitor A",
                      "marketShare": "25%",
                      "userBase": "50K users",
                      "description": "Market leader with strong brand recognition",
                      "pricing": "$99-299/mo",
                      "fundingRaised": "$10M Series A",
                      "targetMarket": "Enterprise customers",
                      "usp": "Advanced features and integrations",
                      "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
                      "weaknesses": ["Poor customer support", "High pricing"],
                      "marketGap": "SMB segment underserved",
                      "differentiationStrategy": "Focus on SMBs with better pricing",
                      "threatLevel": "High",
                      "sources": [{"name": "Competitor Analysis", "url": "#"}]
                    },
                    {
                      "name": "Competitor B",
                      "marketShare": "15%",
                      "userBase": "25K users",
                      "description": "Growing startup with innovative approach",
                      "pricing": "$49-149/mo",
                      "fundingRaised": "$3M Seed",
                      "targetMarket": "SMBs and startups",
                      "usp": "Easy to use interface",
                      "keyFeatures": ["Simple UI", "Quick setup", "Good support"],
                      "weaknesses": ["Limited features", "No enterprise support"],
                      "marketGap": "Mid-market opportunity",
                      "differentiationStrategy": "Bridge gap between simple and advanced",
                      "threatLevel": "Medium",
                      "sources": [{"name": "Market Research", "url": "#"}]
                    }
                  ],
                  "channels": {
                    "organic": [
                      {
                        "name": "Content Marketing",
                        "potential": "High",
                        "strategy": "Create valuable blog content and guides for your target audience",
                        "cost": "Time investment",
                        "timeToResults": "3-6 months",
                        "contentStrategy": "Educational content, how-to guides, industry insights",
                        "engagementTactics": "Comments, social sharing, email newsletter",
                        "growthHacks": "Guest posting, content partnerships",
                        "expectedReach": "10K-30K monthly visitors",
                        "conversionRate": "2-3%",
                        "sources": [{"name": "Content Marketing Playbook", "url": "#"}]
                      },
                      {
                        "name": "SEO",
                        "potential": "High",
                        "strategy": "Optimize for high-intent keywords in your niche",
                        "cost": "Free to start",
                        "timeToResults": "4-8 months",
                        "contentStrategy": "Keyword-optimized content, link building",
                        "engagementTactics": "Featured snippets, rich results",
                        "growthHacks": "Programmatic SEO, link exchanges",
                        "expectedReach": "20K-50K organic visits/month",
                        "conversionRate": "3-5%",
                        "sources": [{"name": "SEO Strategy Guide", "url": "#"}]
                      }
                    ],
                    "paid": [
                      {
                        "name": "Google Ads",
                        "effectiveness": "High",
                        "strategy": "Target high-intent keywords with search ads",
                        "cac": "$50-100",
                        "budget": "$1K-5K/mo",
                        "roas": "3x",
                        "targeting": "Keywords, demographics, in-market audiences",
                        "adFormats": "Search ads, display ads, YouTube ads",
                        "optimization": "Smart bidding, ad testing, landing page optimization",
                        "roi": "300%",
                        "ltvcac": "3:1",
                        "monthlyAcquisitions": "50-200",
                        "sources": [{"name": "Google Ads Guide", "url": "#"}]
                      },
                      {
                        "name": "Facebook Ads",
                        "effectiveness": "Medium",
                        "strategy": "Build awareness and retarget website visitors",
                        "cac": "$75-150",
                        "budget": "$500-3K/mo",
                        "roas": "2.5x",
                        "targeting": "Interests, lookalikes, custom audiences",
                        "adFormats": "Feed ads, stories, reels",
                        "optimization": "Creative testing, audience refinement",
                        "roi": "250%",
                        "ltvcac": "2.5:1",
                        "monthlyAcquisitions": "30-100",
                        "sources": [{"name": "Facebook Ads Playbook", "url": "#"}]
                      }
                    ]
                  },
                  "marketSize": {
                    "total": "$2B",
                    "growth": "15% YoY",
                    "tam": "$2B",
                    "sam": "$500M",
                    "som": "$50M",
                    "captureRate": "1-2%",
                    "revenueOpportunity": "$500K-1M ARR",
                    "trend": "Growing",
                    "sources": [{"name": "Industry Report 2024", "url": "#"}]
                  },
                  "realTimeMetrics": {
                    "searchVolume": {
                      "monthly": 50000,
                      "trend": "Increasing",
                      "relatedQueries": ["related term 1", "related term 2", "related term 3"]
                    }
                  },
                  "monetization": {
                    "revenue": {
                      "month1": "$10K",
                      "month6": "$100K",
                      "year1": "$1M"
                    }
                  }
                }`
              },
              {
                role: 'user',
                content: `Generate comprehensive PMF insights with REAL, DETAILED data for: ${idea}. 
                User context: ${JSON.stringify(userAnswers).slice(0, 500)}. 
                
                CRITICAL REQUIREMENTS:
                1. ALL arrays (competitors, channels, improvements, etc.) MUST have at least 2-3 items with rich details
                2. Use REAL competitor names, not generic "Competitor A/B" - research actual competitors in the space
                3. Provide SPECIFIC metrics, not placeholder values
                4. Include actionable, specific strategies for each channel
                5. Fill ALL sections with contextually relevant data
                6. Sources should reference real resources (even if URLs are placeholders)
                
                For scoreBreakdown metrics:
                - Make descriptions specific to their idea
                - Include real calculations and data points
                - Provide actionable improvements with measurable impact
                
                For competitors:
                - Use real company names in their space
                - Include actual funding amounts if known
                - Provide specific differentiation strategies
                
                For channels:
                - Include specific tactics and strategies
                - Provide realistic CAC and conversion rates
                - Include growth hacks and optimization tips
                
                For improvements:
                - Group by both timeframe AND cost
                - Include specific action items
                - Provide measurable expected outcomes
                
                Make everything highly specific to "${idea}", not generic templates.`
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