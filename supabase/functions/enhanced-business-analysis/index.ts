import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  idea: string;
  marketData?: any;
  trendsData?: any;
  analysisType: 'profitability' | 'market_opportunity' | 'competitive_advantage' | 'execution_strategy';
}

interface BusinessInsight {
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  actionable_steps: string[];
  profit_potential: number; // 1-10 scale
  confidence_score: number; // 0-1
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, marketData, trendsData, analysisType }: AnalysisRequest = await req.json();
    
    if (!idea) {
      throw new Error('Idea is required for analysis');
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Construct comprehensive analysis prompt
    const systemPrompt = `You are a business profitability analyst specializing in startup viability assessment. 
    Analyze the given business idea and provide detailed, actionable insights focused on profitability and market opportunity.
    
    Consider:
    - Revenue potential and monetization strategies
    - Market size and customer acquisition costs
    - Competitive landscape and differentiation
    - Execution complexity and resource requirements
    - Risk factors and mitigation strategies
    - Timeline to profitability
    
    Be specific, data-driven, and focus on actionable insights that directly impact business success.`;

    let userPrompt = '';
    
    switch (analysisType) {
      case 'profitability':
        userPrompt = `Analyze the profitability potential of this business idea: "${idea}"
        
        Focus on:
        1. Revenue model analysis and optimization
        2. Cost structure breakdown and optimization opportunities
        3. Unit economics and scalability factors
        4. Break-even analysis and timeline to profitability
        5. Pricing strategy recommendations
        
        ${marketData ? `Market data available: ${JSON.stringify(marketData).slice(0, 1000)}` : ''}
        ${trendsData ? `Trends data available: ${JSON.stringify(trendsData).slice(0, 1000)}` : ''}`;
        break;
        
      case 'market_opportunity':
        userPrompt = `Analyze the market opportunity for this business idea: "${idea}"
        
        Focus on:
        1. Total addressable market (TAM) estimation
        2. Market growth trends and future projections
        3. Customer segmentation and target market analysis
        4. Market entry barriers and opportunities
        5. Geographic expansion potential
        
        ${marketData ? `Market data: ${JSON.stringify(marketData).slice(0, 1000)}` : ''}
        ${trendsData ? `Trends data: ${JSON.stringify(trendsData).slice(0, 1000)}` : ''}`;
        break;
        
      case 'competitive_advantage':
        userPrompt = `Analyze competitive positioning for this business idea: "${idea}"
        
        Focus on:
        1. Competitive landscape mapping
        2. Unique value proposition analysis
        3. Barriers to entry and defensibility
        4. Competitive advantages and moats
        5. Market positioning strategy
        
        ${marketData ? `Market data: ${JSON.stringify(marketData).slice(0, 1000)}` : ''}`;
        break;
        
      case 'execution_strategy':
        userPrompt = `Develop execution strategy for this business idea: "${idea}"
        
        Focus on:
        1. Go-to-market strategy and launch plan
        2. Resource requirements and team building
        3. Technology and infrastructure needs
        4. Funding requirements and stages
        5. Key milestones and success metrics
        
        ${marketData ? `Market data: ${JSON.stringify(marketData).slice(0, 1000)}` : ''}
        ${trendsData ? `Trends data: ${JSON.stringify(trendsData).slice(0, 1000)}` : ''}`;
        break;
    }

    // Call Groq AI
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_business_insights",
              description: "Generate structured business insights with profitability focus",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                        timeframe: { type: "string" },
                        actionable_steps: {
                          type: "array",
                          items: { type: "string" }
                        },
                        profit_potential: { type: "number", minimum: 1, maximum: 10 },
                        confidence_score: { type: "number", minimum: 0, maximum: 1 }
                      },
                      required: ["category", "title", "description", "impact", "timeframe", "actionable_steps", "profit_potential", "confidence_score"],
                      additionalProperties: false
                    }
                  },
                  overall_assessment: {
                    type: "object",
                    properties: {
                      profitability_score: { type: "number", minimum: 1, maximum: 10 },
                      market_opportunity_score: { type: "number", minimum: 1, maximum: 10 },
                      execution_difficulty: { type: "number", minimum: 1, maximum: 10 },
                      recommendation: { type: "string" },
                      key_success_factors: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["profitability_score", "market_opportunity_score", "execution_difficulty", "recommendation", "key_success_factors"],
                    additionalProperties: false
                  }
                },
                required: ["insights", "overall_assessment"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_business_insights" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    
    if (!aiResponse.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      throw new Error("Invalid AI response format");
    }

    const analysisResult = JSON.parse(aiResponse.choices[0].message.tool_calls[0].function.arguments);
    
    // Store analysis in database for caching
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase
      .from('dashboard_data')
      .upsert({
        user_id: 'system', // For now, using system cache
        tile_type: `business_analysis_${analysisType}`,
        data: {
          idea,
          analysisType,
          result: analysisResult,
          generated_at: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }, {
        onConflict: 'user_id,tile_type'
      });

    return new Response(JSON.stringify({
      success: true,
      analysisType,
      insights: analysisResult.insights,
      overall_assessment: analysisResult.overall_assessment,
      metadata: {
        generated_at: new Date().toISOString(),
        model_used: "google/gemini-2.5-flash"
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Enhanced business analysis error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});