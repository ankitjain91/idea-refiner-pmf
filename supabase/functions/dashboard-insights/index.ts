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
            max_tokens: 3000,
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: `You are a product-market fit expert. Provide specific, actionable insights with real data.
                Return a valid JSON object with this exact structure (no markdown, just JSON). Do not include any commentary or code fences, only raw JSON.
                
                REQUIRED JSON STRUCTURE:
                {
                  "pmfScore": number (0-100),
                  "previousScore": number (0-100, estimate before improvements),
                  "scoreBreakdown": {
                    "marketDemand": { "current": number, "potential": number, "label": string },
                    "productReadiness": { "current": number, "potential": number, "label": string },
                    "userEngagement": { "current": number, "potential": number, "label": string },
                    "revenueViability": { "current": number, "potential": number, "label": string }
                  },
                  "growthMetrics": {
                    "timeline": [
                      { "month": string, "users": number, "revenue": number, "engagement": number }
                    ]
                  },
                  "competitorComparison": [
                    { "name": string, "metric": string, "yours": number, "theirs": number, "unit": string }
                  ],
                  "quickWins": [...existing structure...],
                  "improvementsByTime": [...existing structure...],
                  "improvementsByCost": [...existing structure...],
                  "competitors": [...existing structure...],
                  "channels": {...existing structure...},
                  "marketSize": {...existing structure...},
                  "realTimeMetrics": {...existing structure...},
                  "monetization": {...existing structure...}
                }`
              },
              {
                role: 'user',
                content: `Analyze this idea and provide comprehensive insights with real data, graphs, and metrics:\n\nIdea: ${idea}\nUser Answers: ${JSON.stringify(userAnswers, null, 2)}\n\nProvide specific, real data with actual competitor names, market sizes, growth projections, and actionable improvements. Include timeline data for graphs, competitor comparisons, and score breakdowns showing current vs potential after improvements. Use real companies and metrics.`
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
          const delay = 500 * Math.pow(2, attempt - 1);
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