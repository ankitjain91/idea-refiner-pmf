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
        content: `You are a PMF (Product-Market Fit) advisor helping entrepreneurs refine startup ideas. 
        
        IMPORTANT: Check if this is a NEW conversation or ONGOING:
        - If the user provides a startup idea (describing a product/service), validate it
        - If the user is ANSWERING your question, continue the conversation naturally
        
        For NEW IDEAS, validate:
        - Reject only if: nonsense text, gibberish, not business-related, too vague
        - Accept if: describes a product, service, or solution
        
        For ONGOING CONVERSATIONS:
        - The user is likely answering YOUR previous question
        - Continue refining their idea by exploring:
          * Target demographic and market size
          * Solution approach and technical implementation  
          * Monetization strategy and pricing
          * Competitive landscape and differentiation
          * Go-to-market strategy
        
        RESPONSE FORMAT (MANDATORY):
        [Your conversational response - be encouraging, use emojis 🚀 💡 🎯, max 100 words]
        
        SUGGESTIONS:
        [Exactly 3-4 contextual options the user can click, one per line]
        
        Example for demographic question:
        "Excellent choice! 🎯 Small business owners are a great target market with clear pain points. How would you monetize this service? Would you charge a subscription, transaction fee, or freemium model?
        
        SUGGESTIONS:
        Monthly subscription ($29-99/month)
        10% transaction fee per booking
        Freemium with paid premium features
        One-time setup fee plus monthly maintenance"
        
        Example for new idea validation:
        "Great idea! 🚀 Connecting elderly people with volunteers addresses a real need. Who would be your primary user - the elderly themselves or their family members who arrange help?
        
        SUGGESTIONS:
        Elderly people directly using the app
        Adult children managing care for parents
        Both elderly and family members
        Senior living communities as organizations"`
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