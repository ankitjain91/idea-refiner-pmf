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
    const { idea, context, analysisType, conversation } = await req.json();

    console.log('Analyzing dashboard insights for:', idea);
    console.log('Conversation context available:', conversation?.length || 0, 'messages');

    // Build comprehensive context from conversation
    let conversationContext = '';
    if (conversation && conversation.length > 0) {
      conversationContext = `
        Previous conversation context (${conversation.length} messages):
        ${conversation.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}
        
        Key insights from conversation:
        - User's refined idea: ${context?.refinedIdea || idea}
        - Target audience: ${context?.targetAudience || 'Not specified'}
        - Problem solving: ${context?.problemSolving || 'Not specified'}
        - Market gap: ${context?.marketGap || 'Not specified'}
        - Unique value: ${context?.uniqueValue || 'Not specified'}
        - Business model: ${context?.businessModel || 'Not specified'}
        - Revenue strategy: ${context?.revenueStrategy || 'Not specified'}
      `;
    }

    // Generate dynamic insights based on analysis type with full context
    const systemPrompt = `You are a startup analytics engine providing real-time business intelligence. 
    You have access to the full conversation history and context about the startup idea.
    Generate detailed, data-driven insights with specific metrics and actionable recommendations.
    Base your analysis on the conversation context provided, extracting relevant information about the user's idea, target market, and business model.`;

    const analysisPrompts = {
      validation: `Check if we have enough information to populate a comprehensive dashboard for: ${idea}
        ${conversationContext}
        
        Return JSON with:
        - hasMinimumData: boolean (true if we have enough data)
        - missingFields: array of missing critical information
        - suggestedQuestions: array of questions to ask user
        - dataCompleteness: percentage 0-100
        - readyForDashboard: boolean`,

      market: `Analyze the market opportunity for: ${idea}
        ${conversationContext}
        
        Return JSON with:
        - marketSize: total addressable market in USD
        - growthRate: annual percentage
        - segments: array of {name, size, growthRate, fit}
        - trends: current market trends
        - opportunities: array of {title, description, revenue, priority}
        - entryBarriers: key challenges to market entry`,
      
      competition: `Analyze competitive landscape for: ${idea}
        ${conversationContext}
        
        Return JSON with:
        - competitors: array with {name, marketShare, strengths, weaknesses, funding, threat}
        - competitiveAdvantage: array of unique differentiators
        - marketGaps: array of unserved needs
        - threatLevel: 1-100 score
        - recommendations: array of competitive strategies
        - positioning: how to position against competitors`,
      
      metrics: `Generate key performance metrics for: ${idea}
        ${conversationContext}
        
        Return JSON with:
        - pmfScore: product-market fit score 1-100 with reasoning
        - customerAcquisitionCost: estimated CAC with breakdown
        - lifetimeValue: estimated LTV with calculation
        - burnRate: monthly burn estimate
        - runway: months of runway
        - conversionRate: expected conversion % with funnel
        - churnRate: expected monthly churn %
        - unitEconomics: detailed unit economics`,
      
      channels: `Analyze marketing channels for: ${idea}
        ${conversationContext}
        
        Return JSON with:
        - channels: array with {channel, roi, cost, timeline, strategy, priority}
        - topChannels: top 3 recommended channels with reasoning
        - budget: recommended monthly budget breakdown
        - campaignIdeas: array of specific campaign concepts
        - contentStrategy: content marketing approach
        - growthHacks: innovative growth strategies`,
      
      realtime: `Generate real-time business metrics for: ${idea}
        ${conversationContext}
        
        Return JSON with:
        - activeUsers: current active users (realistic based on stage)
        - dailyRevenue: today's revenue estimate
        - conversionEvents: array of {type, time, value, user}
        - engagement: {dau, mau, retention, sessionLength}
        - alerts: array of critical business alerts
        - predictions: {next24hr, nextWeek, nextMonth}
        - healthScore: overall business health 1-100`,

      suggestions: `Generate actionable suggestions and next steps for: ${idea}
        ${conversationContext}
        
        Return JSON with:
        - immediateActions: array of {action, impact, effort, timeline}
        - metricsToWatch: array of {metric, target, current, importance}
        - experiments: array of {hypothesis, test, success_criteria}
        - milestonesNext30Days: array of key milestones
        - resourcesNeeded: array of {resource, purpose, cost}
        - risks: array of {risk, likelihood, impact, mitigation}`
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
    let insights: any = {};

    // Build safe defaults by analysis type
    const defaultInsights = (type: string) => {
      if (type === 'validation') {
        return {
          hasMinimumData: false,
          missingFields: ['targetAudience','problemSolving','businessModel','marketSize','uniqueValue','competitorAnalysis'],
          suggestedQuestions: [
            'Who is your target customer? Describe their demographics and pain points.',
            'What problem are you solving and how is it solved today?',
            'How will you make money? What pricing will you use?'
          ],
          dataCompleteness: 0,
          readyForDashboard: false
        };
      }
      return { note: 'No insights available from AI yet' };
    };

    try {
      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string') {
        insights = JSON.parse(content);
      } else {
        console.error('Failed to parse insights: missing content', data);
        insights = defaultInsights(analysisType);
      }
    } catch (e) {
      console.error('Failed to parse insights:', e);
      insights = defaultInsights(analysisType);
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