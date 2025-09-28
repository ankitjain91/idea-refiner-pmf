// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userMessage, currentIdea, conversationHistory, currentWrinklePoints } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const evaluationPrompt = `You are a brain wrinkle evaluator. Evaluate the QUALITY of the USER'S MESSAGE, not the bot's response.

CONTEXT:
- User currently has ${currentWrinklePoints} wrinkle points
- User's current idea: "${currentIdea || 'Not yet defined'}"
- User's message to evaluate: "${userMessage}"
- Recent conversation: ${JSON.stringify(conversationHistory)}

EVALUATE THE USER'S INPUT BASED ON:
1. Specificity - Did they provide concrete details, numbers, examples?
2. Strategic thinking - Did they show business acumen, market understanding?
3. Evidence/validation - Did they mention research, testing, customer feedback?
4. Depth of refinement - How much did they improve or elaborate on the idea?
5. Problem-solving - Did they address challenges or opportunities?

SCORING RULES (based on USER'S input quality):
- Exceptional insights with data/evidence: +3.0 to +5.0 points
- Strong strategic thinking with specifics: +2.0 to +3.0 points
- Good elaboration and refinement: +1.0 to +2.0 points
- Basic contribution: +0.5 to +1.0 points
- Minimal input but trying: +0.1 to +0.5 points
- Even for off-topic: +0.1 points minimum (encouraging engagement)

ALWAYS return positive points (minimum 0.1). Use decimals for nuance.

Return ONLY a JSON object like this:
{
  "pointChange": 1.5,
  "explanation": "Good market validation insight - shows deeper understanding of customer needs"
}

BE STRICT. Higher point totals should get fewer points for the same quality of thinking.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use gpt-4o-mini for wrinkle points evaluation (cost-efficient)
        messages: [
          {
            role: 'system',
            content: evaluationPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response and ensure positive points
    let evaluation;
    try {
      evaluation = JSON.parse(content);
      // Ensure points are always positive
      if (evaluation.pointChange <= 0) {
        evaluation.pointChange = 0.1;
      }
    } catch (parseError) {
      // Fallback if JSON parsing fails - always positive
      evaluation = {
        pointChange: (Math.random() * 0.9) + 0.1, // 0.1 to 1.0
        explanation: 'Making progress with your idea!'
      };
    }

    return new Response(
      JSON.stringify(evaluation),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error evaluating wrinkle points:', error);
    
    // Fallback evaluation - always positive
    const fallbackEvaluation = {
      pointChange: (Math.random() * 0.9) + 0.1, // 0.1 to 1.0
      explanation: 'Brain processing your idea refinement!'
    };

    return new Response(
      JSON.stringify(fallbackEvaluation),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});