import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, conversationHistory } = await req.json();

    // Construct messages for OpenAI with enhanced validation
    const messages = [
      {
        role: 'system',
        content: `You are a PMF (Product-Market Fit) advisor helping entrepreneurs refine REAL startup ideas. 
        
        CRITICAL VALIDATION RULES:
        1. You MUST REJECT ideas that are:
           - Nonsense, random text, or gibberish (e.g., "asdfasdf", "test test test")
           - Not business-related (e.g., "I like pizza", "hello world")
           - Too vague or incomplete (e.g., "make money", "be successful")
           - Jokes or memes
        
        2. For REJECTED ideas, respond with:
           "❌ I need a real startup or business idea to help you. Please describe a specific product, service, or solution that solves a problem for a target audience."
        
        3. For VALID startup ideas, help refine them by asking about:
           - Target demographic and market size
           - Solution approach and technical implementation
           - Monetization strategy and pricing
           - Competitive landscape and differentiation
           - Go-to-market strategy and customer acquisition
        
        4. Response format - YOU MUST FOLLOW THIS EXACTLY:
           - First, provide your conversational response (be encouraging for valid ideas, use emojis 👋 🎯 🚀 💰 🎉, keep it under 100 words)
           - Then add a line break
           - Then add "SUGGESTIONS:" on its own line
           - Then provide exactly 3-4 suggestion options, one per line, that the user can click to continue the conversation
           - Make suggestions contextual and actionable based on what you just asked
        
        5. Example response format:
           "Great idea! 🚀 To better understand your market, who specifically would use this product? Are you targeting consumers or businesses?
           
           SUGGESTIONS:
           Tech-savvy millennials in urban areas
           Small business owners with 1-10 employees
           Parents with school-age children
           Remote workers and digital nomads"
        
        6. After gathering enough information about a VALID idea, offer to calculate a PMF score.
        
        Remember: Only engage with legitimate business/startup concepts. Filter out everything else.`
      },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      
      // Check for quota exceeded error
      if (error.error?.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your OpenAI account billing at https://platform.openai.com/account/billing');
      }
      
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const fullResponse = data.choices[0].message.content;
    
    // Parse the response to extract main message and suggestions
    let aiResponse = fullResponse;
    let suggestions: string[] = [];
    
    // Check if response contains SUGGESTIONS section
    if (fullResponse.includes('SUGGESTIONS:')) {
      const parts = fullResponse.split('SUGGESTIONS:');
      aiResponse = parts[0].trim();
      
      // Parse suggestions from the second part
      const suggestionText = parts[1].trim();
      suggestions = suggestionText
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .slice(0, 4); // Limit to 4 suggestions
    } else {
      // Fallback: If AI didn't format suggestions properly, provide defaults
      console.log('AI response did not include proper SUGGESTIONS format');
      const lowerResponse = fullResponse.toLowerCase();
      
      if (lowerResponse.includes('❌') || lowerResponse.includes('real startup')) {
        suggestions = [
          "A mobile app that helps people find parking spots",
          "Platform connecting freelancers with local businesses",
          "AI tool that summarizes long documents"
        ];
      } else {
        suggestions = [
          "Tell me more about this",
          "Calculate my PMF score",
          "Help me with pricing strategy",
          "What about competition?"
        ];
      }
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        suggestions 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in idea-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: "I apologize, but I encountered an issue. Please try again.",
        suggestions: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});