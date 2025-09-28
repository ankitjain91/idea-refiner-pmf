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
    const { idea, analysisType, includeWebSearch, returnSources } = await req.json();

    if (!idea) {
      throw new Error('Idea is required');
    }

    console.log(`[DASHBOARD-REALTIME] Analyzing ${analysisType} for idea: ${idea.substring(0, 50)}...`);

    // Define prompts for different analysis types
    const prompts: Record<string, string> = {
      market: `Analyze the market for this startup idea: "${idea}". 
        Search for real-time market data, trends, and statistics.
        Provide:
        1. Total addressable market size with specific numbers
        2. Current growth rate with percentage
        3. Key market opportunities
        4. Emerging trends
        5. Data sources used
        Format as JSON with fields: marketSize, growthRate, opportunities, trends, sources`,
      
      competition: `Analyze competitors for this startup idea: "${idea}".
        Search for actual competing companies and products.
        Provide:
        1. Top 3-5 direct competitors with names
        2. Their market share percentages
        3. Strengths and weaknesses
        4. Your competitive advantages
        5. Data sources
        Format as JSON with fields: competitors, competitiveAdvantage, sources`,
      
      metrics: `Calculate key business metrics for: "${idea}".
        Search for industry benchmarks and standards.
        Provide:
        1. Customer Acquisition Cost (CAC) estimate
        2. Customer Lifetime Value (CLV) estimate
        3. Expected burn rate
        4. Break-even timeline
        5. Profitability metrics
        6. Industry benchmarks used
        Format as JSON with fields: customerAcquisitionCost, lifetimeValue, burnRate, breakEven, profitability, sources`,
      
      realtime: `Get real-time market signals for: "${idea}".
        Search for current news, trends, and activity.
        Provide:
        1. Latest industry news
        2. Current market sentiment
        3. Active user predictions
        4. Revenue predictions
        5. Growth indicators
        6. News sources
        Format as JSON with fields: news, sentiment, predictions, indicators, sources`,
      
      channels: `Analyze marketing channels for: "${idea}".
        Search for effective marketing strategies in this industry.
        Provide:
        1. Top 5 marketing channels with ROI
        2. Campaign ideas
        3. Cost estimates
        4. Success metrics
        5. Case studies or examples
        Format as JSON with fields: channels, topChannels, campaignIdeas, costs, sources`,
        
      validation: `Validate data completeness for: "${idea}".
        Check what information is still needed.
        Provide:
        1. Data completeness percentage
        2. Missing critical information
        3. Suggested next steps
        Format as JSON with fields: dataCompleteness, missingFields, suggestions`
    };

    const selectedPrompt = prompts[analysisType as string] || prompts.market;

    // Make API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use gpt-4o-mini for dashboard insights (cost-efficient)
        messages: [
          { 
            role: 'system', 
            content: `You are a startup analyst with expertise in market research. 
              Always provide specific numbers, percentages, and actual company names when possible.
              Include realistic data estimates based on industry standards.
              Format all responses as valid JSON.
              Use your knowledge of current market trends and industry benchmarks.
              For profitability insights, explain how each metric directly impacts revenue and costs.`
          },
          { 
            role: 'user', 
            content: selectedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    const data = await response.json();
    console.log('[DASHBOARD-REALTIME] OpenAI response:', data);

    let insights: any = {};
    let sources: string[] = [];
    
    try {
      // Parse the response content as JSON
      const content = data.choices[0].message.content;
      insights = JSON.parse(content);
      
      // Extract sources if present
      if (insights.sources) {
        sources = Array.isArray(insights.sources) ? insights.sources : [insights.sources];
      }
      
      // Add profitability insights for metrics
      if (analysisType === 'metrics' && insights.customerAcquisitionCost) {
        insights.profitabilityInsights = {
          customerAcquisitionCost: {
            role: "CAC directly impacts profitability by determining the upfront investment needed per customer. Lower CAC means faster path to profitability.",
            tips: [
              "Optimize marketing channels for lower cost",
              "Implement referral programs",
              "Focus on organic growth strategies"
            ]
          },
          lifetimeValue: {
            role: "CLV determines total revenue potential per customer. Higher CLV relative to CAC indicates strong unit economics.",
            tips: [
              "Increase retention through engagement",
              "Upsell premium features",
              "Reduce churn with better onboarding"
            ]
          },
          burnRate: {
            role: "Burn rate determines runway and time to profitability. Lower burn extends runway and reduces funding needs.",
            tips: [
              "Automate repetitive processes",
              "Negotiate better vendor terms",
              "Focus on revenue-generating activities"
            ]
          }
        };
      }
    } catch (parseError) {
      console.error('[DASHBOARD-REALTIME] Error parsing response:', parseError);
      // Fallback to text content
      insights = {
        content: data.choices[0].message.content,
        error: 'Could not parse structured data'
      };
    }

    // Include primary source in response
    const primarySource = sources[0] || 'AI Analysis with industry benchmarks';

    return new Response(
      JSON.stringify({ 
        insights,
        sources: returnSources ? sources : undefined,
        primarySource,
        analysisType,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('[DASHBOARD-REALTIME] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        insights: null 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});