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
    const { idea, currentData, focusArea } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const focusPrompts: Record<string, string> = {
      growth: 'Focus on user acquisition, retention, and scaling strategies',
      validation: 'Focus on hypothesis testing, user feedback, and product-market fit validation',
      monetization: 'Focus on revenue models, pricing strategies, and value capture',
      marketing: 'Focus on channels, messaging, positioning, and customer acquisition'
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: `You are a startup advisor providing specific, actionable recommendations.
              ${focusPrompts[focusArea]}
              Return a JSON array of 4-6 recommendations.
              Each should be specific, actionable, and directly applicable.
              Format: ["Recommendation 1", "Recommendation 2", ...]`
          },
          {
            role: 'user',
            content: `Generate ${focusArea} recommendations for: "${idea}"
              Current metrics/data: ${JSON.stringify(currentData)}
              Provide specific, actionable next steps.`
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    let recommendations;
    try {
      recommendations = JSON.parse(content);
      if (!Array.isArray(recommendations)) {
        throw new Error('Invalid format');
      }
    } catch {
      // Extract recommendations from text
      recommendations = content
        .split('\n')
        .filter((line: string) => line.trim().length > 10)
        .slice(0, 5)
        .map((line: string) => line.replace(/^[-•*\d.]\s*/, '').trim());
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating recommendations:', error);
    
    // Fallback recommendations
    const fallbacks: Record<string, string[]> = {
      growth: [
        'Launch referral program with incentives',
        'Optimize onboarding for activation',
        'Implement content marketing strategy',
        'Build strategic partnerships'
      ],
      validation: [
        'Conduct 20 customer interviews this week',
        'Set up analytics tracking for key metrics',
        'Run A/B tests on core features',
        'Create feedback collection system'
      ],
      monetization: [
        'Test pricing with 10 potential customers',
        'Create value-based pricing tiers',
        'Implement free trial with conversion tracking',
        'Add premium features based on user requests'
      ],
      marketing: [
        'Define ideal customer profile',
        'Create compelling value proposition',
        'Build email nurture sequence',
        'Leverage social proof and testimonials'
      ]
    };

    return new Response(
      JSON.stringify({ 
        recommendations: fallbacks[req.body?.focusArea] || fallbacks.growth 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});