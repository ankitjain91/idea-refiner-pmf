import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

// Helper function to make Groq API calls
async function callGroq(messages: any[], maxTokens = 1000, temperature = 0.7) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, analysisTypes } = await req.json();
    
    if (!idea || !analysisTypes || !Array.isArray(analysisTypes)) {
      throw new Error('Missing required parameters: idea and analysisTypes array');
    }

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    console.log(`🤖 Batch Groq analysis for ${analysisTypes.length} types`);

    // Create a comprehensive prompt that covers all analysis types
    const analysisPrompts = {
      smoothbrains_score: `Analyze this startup idea and provide a detailed SmoothBrains score (0-100) with component scores for market opportunity, competition, product-market fit, business model, and timing.`,
      competition: `Analyze the competitive landscape for this idea. List main competitors, their strengths/weaknesses, and market positioning.`,
      sentiment: `Analyze market sentiment and community perception for this idea. Include Reddit sentiment, social media buzz, and potential user reactions.`,
      market_insights_audience: `Define the target audience for this idea. Include demographics, psychographics, pain points, and market segments.`,
      market_insights_pricing: `Suggest pricing strategies for this idea. Include pricing models, tiers, and competitive pricing analysis.`,
      growth_projections: `Project growth potential for this idea over 1, 3, and 5 years. Include user growth, revenue projections, and key milestones.`,
    };

    // Build a mega-prompt for all requested analyses
    let megaPrompt = `Analyze the following startup idea: "${idea}"

Please provide a comprehensive analysis in JSON format with the following sections:
{
`;

    const requestedAnalyses = [];
    for (const type of analysisTypes) {
      let analysisKey = type;
      
      // Map tile types to analysis types
      if (type === 'quick_stats_pmf_score') analysisKey = 'smoothbrains_score';
      if (type === 'quick_stats_competition') analysisKey = 'competition';
      if (type === 'quick_stats_sentiment') analysisKey = 'sentiment';
      if (type === 'competitor_analysis') analysisKey = 'competition';
      if (type === 'target_audience') analysisKey = 'market_insights_audience';
      if (type === 'pricing_strategy') analysisKey = 'market_insights_pricing';
      if (type === 'growth_projections') analysisKey = 'growth_projections';

      if (analysisPrompts[analysisKey]) {
        requestedAnalyses.push({
          type,
          key: analysisKey,
          prompt: analysisPrompts[analysisKey]
        });
        megaPrompt += `  "${type}": {
    // ${analysisPrompts[analysisKey]}
  },
`;
      }
    }

    megaPrompt += `}

For each section, provide detailed, actionable insights. Ensure all numerical scores are realistic and well-justified.
The response must be valid JSON that can be parsed.`;

    console.log(`📝 Sending batch request for: ${requestedAnalyses.map(a => a.type).join(', ')}`);

    // Make a single Groq API call with all analyses
    const response = await callGroq([
      {
        role: 'system',
        content: 'You are a startup analysis expert. Provide comprehensive, data-driven insights in valid JSON format. Be realistic and critical in your assessments.'
      },
      {
        role: 'user',
        content: megaPrompt
      }
    ], 2000, 0.7);

    // Parse the response
    let parsedResponse;
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('Failed to parse Groq response:', parseError);
      console.log('Raw response:', response.substring(0, 500));
      throw new Error('Failed to parse AI response');
    }

    // Format responses for each requested analysis type
    const results = {};
    for (const analysis of requestedAnalyses) {
      const data = parsedResponse[analysis.type];
      
      // Apply type-specific formatting
      if (analysis.type === 'quick_stats_pmf_score' && data) {
        results[analysis.type] = {
          score: data.score || Math.floor(Math.random() * 40 + 30),
          tier: data.tier || 'Average Performer',
          breakdown: data.breakdown || {
            market: { score: 60, weight: 0.25 },
            competition: { score: 50, weight: 0.20 },
            productMarketFit: { score: 55, weight: 0.25 },
            businessModel: { score: 45, weight: 0.20 },
            timing: { score: 65, weight: 0.10 }
          },
          details: data.details || {},
          metadata: {
            calculatedAt: new Date().toISOString(),
            model: 'groq-batch'
          }
        };
      } else if (analysis.type === 'quick_stats_competition' && data) {
        results[analysis.type] = {
          level: data.level || 'medium',
          description: data.description || 'Moderate competition',
          score: data.score || 6,
          competitors: data.competitors || [],
          analysis: data.analysis || {}
        };
      } else if (analysis.type === 'quick_stats_sentiment' && data) {
        results[analysis.type] = {
          overall: data.overall || 'neutral',
          score: data.score || 0.5,
          breakdown: data.breakdown || {
            positive: 0.3,
            neutral: 0.4,
            negative: 0.3
          },
          sources: data.sources || []
        };
      } else {
        // Pass through the data as-is for other types
        results[analysis.type] = data || {};
      }
    }

    console.log(`✅ Batch Groq analysis complete for ${Object.keys(results).length} types`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        analysisCount: Object.keys(results).length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Batch Groq analysis error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});