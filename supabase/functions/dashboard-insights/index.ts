import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { idea, context, analysisType } = await req.json();

    console.log('Analyzing dashboard insights for:', idea);

    // Generate dynamic insights based on analysis type
    const systemPrompt = `You are a startup analytics engine providing real-time business intelligence. Generate detailed, data-driven insights with specific metrics and actionable recommendations.`;

    const analysisPrompts = {
      market: `Analyze the market opportunity for: ${idea}
        Return JSON with:
        - marketSize: total addressable market in USD
        - growthRate: annual percentage
        - segments: array of market segments with sizes
        - trends: current market trends
        - opportunities: specific opportunities with potential revenue`,
      
      competition: `Analyze competitive landscape for: ${idea}
        Return JSON with:
        - competitors: array with name, marketShare, strengths, weaknesses, funding
        - competitiveAdvantage: unique differentiators
        - marketGaps: unserved needs
        - threatLevel: 1-100 score
        - recommendations: specific competitive strategies`,
      
      metrics: `Generate key performance metrics for: ${idea}
        Return JSON with:
        - pmfScore: product-market fit score 1-100
        - customerAcquisitionCost: estimated CAC
        - lifetimeValue: estimated LTV
        - burnRate: monthly burn estimate
        - runway: months of runway
        - conversionRate: expected conversion %
        - churnRate: expected monthly churn %`,
      
      channels: `Analyze marketing channels for: ${idea}
        Return JSON with:
        - channels: array with channel, roi, cost, timeline, strategy
        - topChannels: top 3 recommended channels
        - budget: recommended monthly budget
        - campaignIdeas: specific campaign concepts`,
      
      realtime: `Generate real-time business metrics for: ${idea}
        Return JSON with:
        - activeUsers: current active users (simulate realistic number)
        - dailyRevenue: today's revenue
        - conversionEvents: recent conversions array
        - engagement: engagement metrics
        - alerts: any critical alerts
        - predictions: next 24hr predictions`
    };

    const prompt = analysisPrompts[analysisType as keyof typeof analysisPrompts] || analysisPrompts.metrics;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    let insights = {};

    try {
      insights = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse insights:', e);
      insights = { error: 'Failed to generate insights' };
    }

    // Store insights in database for historical tracking
    if (context?.userId) {
      await supabase
        .from('realtime_metrics')
        .insert({
          analysis_id: context.analysisId || crypto.randomUUID(),
          metric_type: analysisType,
          metric_value: insights,
          timestamp: new Date().toISOString()
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      insights,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dashboard-insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An error occurred',
      insights: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});