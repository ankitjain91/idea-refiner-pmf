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
    const { tileType, tileData, ideaContext } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }

    // Create a comprehensive prompt for analysis
    const systemPrompt = `You are a strategic business analyst. Analyze the data for a startup idea and provide actionable insights.
    
    CRITICAL: Your response must be valid JSON with this exact structure:
    {
      "keyInsights": [
        {
          "type": "opportunity|risk|strength|weakness",
          "title": "Insight title",
          "description": "Detailed explanation",
          "impact": "high|medium|low",
          "confidence": 80
        }
      ],
      "strategicRecommendations": [
        "Specific, actionable recommendation 1",
        "Specific, actionable recommendation 2"
      ],
      "marketInterpretation": "What this data means for the startup's potential (2-3 sentences)",
      "competitivePosition": "How the startup should position itself based on this data",
      "criticalSuccessFactors": [
        "Factor 1 for success",
        "Factor 2 for success"
      ],
      "nextSteps": [
        {
          "action": "Specific action to take",
          "priority": "high|medium|low",
          "timeline": "immediate|short-term|long-term"
        }
      ],
      "pmfSignals": {
        "positive": ["Signal 1", "Signal 2"],
        "negative": ["Challenge 1", "Challenge 2"],
        "overallAssessment": "Strong|Moderate|Weak PMF potential because..."
      }
    }`;

    const userPrompt = `
    Startup Idea: ${ideaContext}
    
    Analyzing ${tileType} data:
    ${JSON.stringify(tileData, null, 2)}
    
    Provide deep strategic analysis of what this data means for the startup's potential.
    Focus on actionable insights and specific recommendations.
    Be realistic but constructive.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to analyze tile data' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});