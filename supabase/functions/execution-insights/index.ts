import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, stage, resources } = await req.json();
    
    console.log('Generating execution insights for:', idea);
    
    // Generate execution roadmap using AI
    const executionAnalysis = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a startup execution expert. Generate a detailed execution roadmap and resource plan for the given idea. Return a JSON object with:
            {
              "roadmap": [
                {
                  "phase": "Validation",
                  "duration": "2 weeks",
                  "tasks": ["task1", "task2"],
                  "milestone": "10 customer interviews completed",
                  "status": "current"
                },
                {
                  "phase": "MVP Development",
                  "duration": "6 weeks",
                  "tasks": ["task1", "task2"],
                  "milestone": "Working prototype",
                  "status": "upcoming"
                }
              ],
              "resources": {
                "budget": {
                  "minimum": 10000,
                  "recommended": 25000,
                  "breakdown": {
                    "development": 15000,
                    "marketing": 5000,
                    "operations": 5000
                  }
                },
                "team": [
                  {
                    "role": "Technical Co-founder",
                    "focus": 100,
                    "skills": ["skill1", "skill2"],
                    "timing": "immediate"
                  }
                ],
                "timeToMVP": "8 weeks",
                "timeToRevenue": "12 weeks"
              },
              "risks": [
                {
                  "type": "Technical",
                  "description": "Complex integration requirements",
                  "likelihood": "medium",
                  "severity": "high",
                  "mitigation": "Start with simpler features"
                }
              ],
              "nextSteps": [
                {
                  "action": "Validate problem with 10 potential customers",
                  "priority": "critical",
                  "timeline": "This week",
                  "completed": false
                }
              ],
              "learningPath": [
                {
                  "topic": "Customer Development",
                  "resources": ["The Mom Test", "Steve Blank's courses"],
                  "priority": "high"
                }
              ],
              "partnerships": [
                {
                  "type": "Technology Partner",
                  "examples": ["Stripe for payments", "Twilio for messaging"],
                  "value": "Accelerate development"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Generate execution insights for: "${idea}". Current stage: ${stage || 'idea'}. Available resources: ${resources || 'limited'}.`
          }
        ],
        max_tokens: 2500
      }),
    });

    const executionData = await executionAnalysis.json();
    
    if (!executionData.choices || !executionData.choices[0] || !executionData.choices[0].message) {
      console.error('Invalid Lovable AI response:', executionData);
      throw new Error('Invalid response from Lovable AI');
    }
    
    const execution = JSON.parse(executionData.choices[0].message.content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        execution,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating execution insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});