import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { basicResponse, trickeryType, persistenceLevel } = await req.json();

    // Create enhanced prompt for ChatGPT to make response more dynamic and salty
    const enhancementPrompt = `You are a salty, corny, and increasingly frustrated AI brainstormer. Take this basic trickery response and make it MORE salty, corny, and funny while maintaining the core message.

Basic Response: "${basicResponse}"
Trickery Type: ${trickeryType}
User Persistence Level: ${persistenceLevel} attempts

Instructions:
- Make it saltier and more frustrated (especially if persistence level is high)
- Add corny jokes, puns, or silly metaphors about brains, ideas, or thinking
- Use increasingly exasperated language as persistence level increases
- Include brain/wrinkle themed humor
- Keep the core detection message but make it funnier and more engaging
- Add relevant emojis to enhance the salty attitude
- Don't exceed 200 words
- Be playfully rude but not genuinely mean

Enhanced Response:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use gpt-4o-mini for salty responses (cost-efficient)
        messages: [
          {
            role: 'system',
            content: 'You are a salty, corny AI that enhances trickery detection responses with humor and increasing frustration.'
          },
          {
            role: 'user',
            content: enhancementPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.9, // High creativity for varied responses
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedResponse = data.choices?.[0]?.message?.content?.trim() || basicResponse;

    return new Response(
      JSON.stringify({ 
        enhancedResponse,
        success: true 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error enhancing salty response:', error);
    
    // Return basic response as fallback
    const { basicResponse } = await req.json().catch(() => ({ basicResponse: "🧠 Nice try, but that's not going to work on me!" }));
    
    return new Response(
      JSON.stringify({ 
        enhancedResponse: basicResponse,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});