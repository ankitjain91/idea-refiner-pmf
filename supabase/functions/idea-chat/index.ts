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
           Then provide suggestions for real startup categories.
        
        3. For VALID startup ideas, help refine them by asking about:
           - Target demographic and market size
           - Solution approach and technical implementation
           - Monetization strategy and pricing
           - Competitive landscape and differentiation
           - Go-to-market strategy and customer acquisition
        
        4. Response format:
           - Be conversational and encouraging for valid ideas
           - Use relevant emojis (👋 🎯 🚀 💰 🎉)
           - Keep responses concise (under 100 words)
           - Always suggest 2-4 relevant next steps
        
        5. After gathering enough information about a VALID idea, offer to calculate a PMF score.
        
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
    const aiResponse = data.choices[0].message.content;

    // Generate suggestions based on the conversation stage
    let suggestions: string[] = [];
    const lowerResponse = aiResponse.toLowerCase();
    
    // Check if idea was rejected
    if (lowerResponse.includes('❌') || lowerResponse.includes('real startup') || lowerResponse.includes('need a real')) {
      suggestions = [
        "AI-powered marketplace for services",
        "SaaS tool for remote teams", 
        "Educational platform for skills",
        "Healthcare solution for patients"
      ];
    } else if (lowerResponse.includes('demographic') || lowerResponse.includes('who')) {
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