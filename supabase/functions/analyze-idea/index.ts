import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { idea, analysisId } = await req.json();
    console.log('Analyzing idea:', idea);

    // Comprehensive analysis using Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a world-class business analyst and VC partner. Analyze startup ideas comprehensively with real data.
            
            Return a JSON object with these sections:
            {
              "market_size": {
                "total_addressable_market": "string with $ value",
                "serviceable_addressable_market": "string with $ value",
                "serviceable_obtainable_market": "string with $ value",
                "growth_rate": "percentage",
                "key_trends": ["trend1", "trend2"],
                "data_sources": ["source1", "source2"]
              },
              "personas": [
                {
                  "name": "Persona Name",
                  "demographics": "description",
                  "pain_points": ["pain1", "pain2"],
                  "buying_behavior": "description",
                  "willingness_to_pay": "$ range"
                }
              ],
              "gtm_strategy": {
                "initial_channels": ["channel1", "channel2"],
                "customer_acquisition_cost": "$ estimate",
                "ltv_cac_ratio": "ratio",
                "go_to_market_timeline": "timeline",
                "key_experiments": ["experiment1", "experiment2"]
              },
              "competitors": [
                {
                  "name": "Company Name",
                  "valuation": "$ value",
                  "market_share": "percentage",
                  "strengths": ["strength1"],
                  "weaknesses": ["weakness1"],
                  "positioning": "description"
                }
              ],
              "benchmarks": {
                "industry_multiples": "revenue multiple",
                "typical_margins": "percentage",
                "growth_benchmarks": "percentage",
                "unit_economics": "description"
              },
              "profit_potential": 85,
              "marketing_channels": [
                {
                  "channel": "Channel Name",
                  "priority": "high/medium/low",
                  "estimated_cac": "$ value",
                  "expected_roi": "percentage",
                  "timeline": "timeframe",
                  "top_experiments": ["exp1", "exp2", "exp3"],
                  "budget_allocation": "percentage"
                }
              ],
              "focus_zones": [
                {
                  "area": "Product/Marketing/Pricing/Distribution",
                  "priorities": ["priority1", "priority2", "priority3"],
                  "estimated_roi": "percentage",
                  "difficulty": "low/medium/high",
                  "timeline": "timeframe"
                }
              ],
              "implementation_strategy": {
                "phase_1": {
                  "timeline": "0-3 months",
                  "milestones": ["milestone1", "milestone2"],
                  "budget_needed": "$ range",
                  "team_required": ["role1", "role2"]
                },
                "phase_2": {
                  "timeline": "3-6 months",
                  "milestones": ["milestone1", "milestone2"],
                  "budget_needed": "$ range",
                  "team_required": ["role1", "role2"]
                },
                "phase_3": {
                  "timeline": "6-12 months",
                  "milestones": ["milestone1", "milestone2"],
                  "budget_needed": "$ range",
                  "team_required": ["role1", "role2"]
                }
              }
            }`
          },
          { role: 'user', content: `Analyze this startup idea comprehensively: ${idea}` }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisResult = JSON.parse(data.choices[0].message.content);

    // Save or update analysis in database
    if (analysisId) {
      // Update existing analysis
      const { error: updateError } = await supabase
        .from('idea_analyses')
        .update({
          ...analysisResult,
          idea_text: idea,
          updated_at: new Date().toISOString(),
          last_refreshed_at: new Date().toISOString()
        })
        .eq('id', analysisId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating analysis:', updateError);
        throw updateError;
      }

      // Add real-time metric
      const { error: metricError } = await supabase
        .from('realtime_metrics')
        .insert({
          analysis_id: analysisId,
          metric_type: 'refresh',
          metric_value: { profit_potential: analysisResult.profit_potential }
        });

      if (metricError) {
        console.error('Error adding metric:', metricError);
      }
    } else {
      // Create new analysis
      const { data: newAnalysis, error: insertError } = await supabase
        .from('idea_analyses')
        .insert({
          user_id: user.id,
          idea_text: idea,
          ...analysisResult
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating analysis:', insertError);
        throw insertError;
      }

      analysisResult.id = newAnalysis.id;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in analyze-idea function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});