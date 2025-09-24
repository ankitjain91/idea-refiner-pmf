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

    // Construct messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: `You are a PMF (Product-Market Fit) advisor helping entrepreneurs refine their startup ideas. 
        Your goal is to ask targeted questions to understand:
        1. The target demographic
        2. The solution approach and uniqueness
        3. The monetization strategy
        4. The competitive landscape
        5. The go-to-market strategy
        
        Be conversational, encouraging, and use emojis. Keep responses concise and focused.
        After gathering enough information, offer to calculate a PMF score.
        Always provide 2-4 relevant suggestion buttons to guide the conversation.`
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
    const aiResponse = data.choices[0].message.content;

    // Generate suggestions based on the conversation stage
    let suggestions: string[] = [];
    const lowerResponse = aiResponse.toLowerCase();
    
    if (lowerResponse.includes('demographic') || lowerResponse.includes('who')) {
      suggestions = ["Young professionals aged 25-35", "Small business owners", "Students and educators", "Parents with young children"];
    } else if (lowerResponse.includes('solution') || lowerResponse.includes('how')) {
      suggestions = ["AI-powered automation", "Marketplace connecting users", "Educational platform", "Mobile-first solution"];
    } else if (lowerResponse.includes('monetiz') || lowerResponse.includes('pricing')) {
      suggestions = ["$9.99/month subscription", "Freemium with premium features", "One-time purchase", "Transaction-based fees"];
    } else if (lowerResponse.includes('compet')) {
      suggestions = ["No direct competitors yet", "Better UX and simpler onboarding", "50% more affordable", "Unique features they don't have"];
    } else if (lowerResponse.includes('market') || lowerResponse.includes('customer')) {
      suggestions = ["Social media marketing", "Content marketing & SEO", "Direct B2B sales", "Product Hunt launch"];
    } else if (lowerResponse.includes('pmf') || lowerResponse.includes('score') || lowerResponse.includes('analysis')) {
      suggestions = ["Yes, show me the PMF analysis!", "Let me add more details first"];
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