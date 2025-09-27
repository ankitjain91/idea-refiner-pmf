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
    const { userMessage, botResponse, conversationHistory, currentWrinklePoints } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const evaluationPrompt = `You are a brain wrinkle evaluator for an idea brainstorming session. Your job is to evaluate how many wrinkle points this conversation turn deserves.

CONTEXT:
- User currently has ${currentWrinklePoints} wrinkle points
- User message: "${userMessage}"
- Bot response: "${botResponse}"
- Recent conversation: ${JSON.stringify(conversationHistory)}

SCORING RULES:
- Points get HARDER to earn as the total increases (diminishing returns)
- Early ideas (0-10 points): Easy to get 3-8 points for any decent thinking
- Developing ideas (11-50 points): Need good insights, 2-6 points typically
- Mature ideas (51-100 points): Only exceptional refinements get 3-5 points
- Advanced ideas (100+ points): Very rare to get more than 2-3 points
- The higher the current points, the more demanding you become

POINT VALUES:
- Exceptional breakthrough thinking: +5 to +8 points (very rare at high levels)
- Good refinement/insight: +2 to +5 points (gets harder as points increase)
- Basic progress: +1 to +3 points (diminishes significantly at high levels)
- Vague/unclear response: -1 to -3 points
- Going backwards/confusion: -3 to -5 points

Return ONLY a JSON object like this:
{
  "pointChange": 3,
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
        model: 'gpt-4',
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

    // Parse the JSON response
    let evaluation;
    try {
      evaluation = JSON.parse(content);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      evaluation = {
        pointChange: Math.floor(Math.random() * 3) + 1,
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
    
    // Fallback evaluation
    const fallbackEvaluation = {
      pointChange: Math.floor(Math.random() * 3) + 1,
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