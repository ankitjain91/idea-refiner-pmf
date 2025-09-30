import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, idea, metadata } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompts: Record<string, string> = {
      market: `Analyze market opportunity for: "${idea}". 
        Data: ${JSON.stringify(data)}
        Provide actionable insights on market size, growth potential, and entry strategies.`,
      
      competition: `Analyze competitive landscape for: "${idea}".
        Competitors: ${JSON.stringify(data)}
        Identify differentiation opportunities, competitive advantages, and positioning strategies.`,
      
      sentiment: `Analyze market sentiment for: "${idea}".
        Sentiment data: ${JSON.stringify(data)}
        Identify perception trends, concerns, and opportunities to improve reception.`,
      
      pmf: `Analyze product-market fit for: "${idea}".
        Metrics: ${JSON.stringify(data)}
        Evaluate fit strength, gaps, and provide specific improvement recommendations.`,
      
      strategy: `Generate strategic insights for: "${idea}".
        Context: ${JSON.stringify(data)}
        Provide growth strategies, resource allocation, and tactical recommendations.`,
      
      risk: `Assess risks for: "${idea}".
        Data: ${JSON.stringify(data)}
        Identify key risks, impact assessment, and mitigation strategies.`
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert business analyst providing actionable insights.
              Return a JSON object with this structure:
              {
                "title": "Brief title",
                "summary": "Executive summary (2-3 sentences)",
                "details": ["Key finding 1", "Key finding 2", ...],
                "recommendations": ["Action 1", "Action 2", ...],
                "confidence": "high" | "medium" | "low",
                "dataPoints": [{"label": "Metric", "value": "123"}],
                "nextSteps": ["Step 1", "Step 2", ...]
              }`
          },
          {
            role: 'user',
            content: prompts[type] || prompts.market
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add funds.');
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    // Try to parse as JSON, fallback to structured response
    let insight;
    try {
      insight = JSON.parse(content);
    } catch {
      // Create structured response from text
      insight = {
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Analysis`,
        summary: content.split('\n')[0] || 'Analysis complete.',
        details: content.split('\n').slice(1, 4).filter(Boolean),
        recommendations: ['Review findings', 'Plan next steps', 'Monitor progress'],
        confidence: 'medium',
        nextSteps: ['Gather more data', 'Validate assumptions']
      };
    }

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});