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
    const { idea, userAnswers, currentTier } = await req.json();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a subscription benefits advisor for a product-market fit analysis tool. 
            Based on the user's idea and their answers, suggest specific premium features that would help them succeed.
            Be specific about HOW each feature would help their particular business idea.
            Current tier: ${currentTier}
            
            Format your response as a JSON object with these fields:
            {
              "personalizedBenefits": [
                {
                  "feature": "Feature name",
                  "howItHelps": "Specific explanation of how this helps their idea",
                  "tier": "basic|pro|enterprise",
                  "impact": "high|medium|low"
                }
              ],
              "recommendedTier": "basic|pro|enterprise",
              "urgentNeeds": ["List of their most critical needs"],
              "potentialRevenue": "Estimate of additional revenue with premium features",
              "timeToROI": "Estimated time to see return on investment"
            }`
          },
          {
            role: 'user',
            content: `My idea: ${idea}
            
            My answers to questions:
            ${JSON.stringify(userAnswers, null, 2)}
            
            What premium features would specifically help me succeed with this idea?`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let benefits;
    try {
      benefits = JSON.parse(content);
    } catch (e) {
      // Fallback if GPT doesn't return valid JSON
      benefits = {
        personalizedBenefits: [
          {
            feature: "AI Market Analysis",
            howItHelps: "Get real-time competitive insights for your specific market",
            tier: "pro",
            impact: "high"
          },
          {
            feature: "Customer Discovery Tools",
            howItHelps: "Find and connect with your target audience automatically",
            tier: "basic",
            impact: "high"
          }
        ],
        recommendedTier: "pro",
        urgentNeeds: ["Market validation", "Customer insights"],
        potentialRevenue: "$10K-50K additional revenue in first 6 months",
        timeToROI: "2-3 months"
      };
    }

    return new Response(JSON.stringify(benefits), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating subscription benefits:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        personalizedBenefits: [],
        recommendedTier: "pro"
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});