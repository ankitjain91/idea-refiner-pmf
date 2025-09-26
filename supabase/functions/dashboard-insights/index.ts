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
                content: `You are a product-market fit expert. Generate focused, actionable insights.
                Return ONLY valid JSON matching this structure exactly:
                {
                  "pmfScore": 75,
                  "previousScore": 65,
                  "scoreBreakdown": {
                    "marketDemand": { "current": 70, "potential": 85, "label": "Growing market" },
                    "productReadiness": { "current": 60, "potential": 80, "label": "MVP stage" },
                    "userEngagement": { "current": 65, "potential": 90, "label": "High potential" },
                    "revenueViability": { "current": 55, "potential": 75, "label": "Needs validation" }
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
                content: `Generate PMF insights for: ${idea}. Context: ${JSON.stringify(userAnswers).slice(0, 500)}. Be specific with real competitor names and data.`
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