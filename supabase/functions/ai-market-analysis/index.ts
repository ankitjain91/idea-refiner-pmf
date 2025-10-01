import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, analysisType, marketData, customPrompt } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!idea) {
      throw new Error('Idea is required for AI analysis');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'deep-insights':
        systemPrompt = `You are an expert market analyst with deep expertise in TAM/SAM/SOM analysis, market sizing methodologies, and strategic business planning. Provide comprehensive, actionable insights.`;
        userPrompt = `Analyze the market size data for this startup idea: "${idea}"

Current market data:
${JSON.stringify(marketData, null, 2)}

Please provide:
1. **Strategic Insights**: What does this market data reveal about the opportunity?
2. **Key Growth Drivers**: What factors will drive market expansion?
3. **Market Entry Strategy**: How should they approach this market?
4. **Risk Assessment**: What market risks should they be aware of?
5. **Competitive Positioning**: How can they capture market share effectively?
6. **Action Items**: 3-5 specific next steps based on this analysis

Provide detailed, actionable insights that a startup founder can implement.`;
        break;

      case 'competitive-landscape':
        systemPrompt = `You are a competitive intelligence expert specializing in market dynamics and competitive positioning. Focus on actionable competitive insights.`;
        userPrompt = `For the startup idea "${idea}" with market data:
${JSON.stringify(marketData, null, 2)}

Analyze the competitive landscape:
1. **Key Competitors**: Who are the main players in this market?
2. **Market Gaps**: What opportunities exist that competitors aren't addressing?
3. **Differentiation Opportunities**: How can this startup stand out?
4. **Competitive Threats**: What should they watch out for?
5. **Market Positioning**: Where should they position themselves?
6. **Go-to-Market Strategy**: How to compete effectively against established players?

Focus on practical, strategic recommendations.`;
        break;

      case 'growth-strategy':
        systemPrompt = `You are a growth strategy consultant with expertise in scaling startups and market expansion. Focus on actionable growth tactics.`;
        userPrompt = `For the startup idea "${idea}" with market data:
${JSON.stringify(marketData, null, 2)}

Develop a comprehensive growth strategy:
1. **Market Expansion**: How to grow within current markets and expand to new ones?
2. **Customer Acquisition**: What are the most effective channels for this market?
3. **Revenue Growth**: How to maximize revenue from the available market?
4. **Scaling Strategy**: How to scale operations as they capture market share?
5. **Partnership Opportunities**: What strategic partnerships could accelerate growth?
6. **Timeline & Milestones**: Key growth milestones and timeline expectations

Provide a detailed, actionable growth roadmap.`;
        break;

      case 'investment-analysis':
        systemPrompt = `You are an investment analyst and venture capital expert. Focus on investment potential and fundability of this opportunity.`;
        userPrompt = `Analyze the investment potential for "${idea}" with market data:
${JSON.stringify(marketData, null, 2)}

Provide investment analysis:
1. **Market Opportunity**: Why is this an attractive investment opportunity?
2. **Scalability**: How scalable is this business model in this market?
3. **Return Potential**: What kind of returns could investors expect?
4. **Investment Risks**: What risks should investors consider?
5. **Fundability**: How fundable is this opportunity at different stages?
6. **Valuation Drivers**: What factors will drive company valuation?
7. **Exit Strategy**: Potential exit opportunities and timeline

Frame this from both founder and investor perspectives.`;
        break;

      case 'custom':
        systemPrompt = `You are an expert business analyst and market research specialist. Provide detailed, data-driven insights based on the specific request.`;
        userPrompt = `For the startup idea "${idea}" with market data:
${JSON.stringify(marketData, null, 2)}

Custom analysis request: ${customPrompt}

Please provide detailed, actionable insights that address this specific request.`;
        break;

      default:
        throw new Error('Invalid analysis type');
    }

    console.log('Calling Lovable AI for market analysis...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted. Please add credits to your Lovable workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('AI analysis completed successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis,
      analysisType,
      idea,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-market-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});