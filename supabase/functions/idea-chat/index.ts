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

    // Generate contextually relevant suggestions based on the conversation
    let suggestions: string[] = [];
    const lowerResponse = aiResponse.toLowerCase();
    const lowerMessage = message.toLowerCase();
    
    // Check if idea was rejected - provide real startup idea examples
    if (lowerResponse.includes('❌') || lowerResponse.includes('real startup') || lowerResponse.includes('need a real')) {
      suggestions = [
        "A mobile app that helps people find parking spots",
        "Platform connecting freelancers with local businesses", 
        "AI tool that summarizes long documents",
        "Subscription box for eco-friendly products"
      ];
    } 
    // Target demographic questions
    else if (lowerResponse.includes('who') || lowerResponse.includes('target') || lowerResponse.includes('audience') || lowerResponse.includes('demographic')) {
      suggestions = [
        "Tech-savvy millennials in urban areas",
        "Small business owners with 1-10 employees",
        "Parents with school-age children",
        "Remote workers and digital nomads"
      ];
    } 
    // Solution/implementation questions
    else if (lowerResponse.includes('how') || lowerResponse.includes('solution') || lowerResponse.includes('build') || lowerResponse.includes('implement')) {
      suggestions = [
        "Mobile app with AI recommendations",
        "Web platform with real-time matching",
        "Chrome extension for seamless integration",
        "API-first approach for developers"
      ];
    } 
    // Monetization questions
    else if (lowerResponse.includes('monetiz') || lowerResponse.includes('pricing') || lowerResponse.includes('revenue') || lowerResponse.includes('charge')) {
      suggestions = [
        "$19/month for individuals",
        "Freemium model with paid pro features",
        "15% commission on transactions",
        "$99 one-time purchase"
      ];
    } 
    // Competition questions
    else if (lowerResponse.includes('compet') || lowerResponse.includes('different') || lowerResponse.includes('unique') || lowerResponse.includes('stand out')) {
      suggestions = [
        "We focus on a niche they ignore",
        "Our solution is 10x faster",
        "We have better pricing and support",
        "First to integrate with key platforms"
      ];
    } 
    // Go-to-market questions
    else if (lowerResponse.includes('market') || lowerResponse.includes('customer') || lowerResponse.includes('launch') || lowerResponse.includes('growth')) {
      suggestions = [
        "Launch on Product Hunt and Reddit",
        "Partner with industry influencers",
        "Cold outreach to target companies",
        "Content marketing and SEO strategy"
      ];
    } 
    // PMF analysis readiness
    else if (lowerResponse.includes('pmf') || lowerResponse.includes('score') || lowerResponse.includes('ready') || lowerResponse.includes('enough')) {
      suggestions = [
        "Yes, calculate my PMF score!",
        "Tell me more about my target market",
        "I need help with monetization",
        "What about competition?"
      ];
    }
    // Default helpful suggestions if no specific context
    else {
      // Provide general next steps based on what hasn't been discussed
      if (!conversationHistory.some((m: any) => m.content.toLowerCase().includes('target') || m.content.toLowerCase().includes('audience'))) {
        suggestions.push("Help me define my target audience");
      }
      if (!conversationHistory.some((m: any) => m.content.toLowerCase().includes('monetiz') || m.content.toLowerCase().includes('pricing'))) {
        suggestions.push("Let's discuss pricing strategy");
      }
      if (!conversationHistory.some((m: any) => m.content.toLowerCase().includes('compet'))) {
        suggestions.push("Analyze my competition");
      }
      suggestions.push("Calculate my PMF score");
      
      // Limit to 4 suggestions
      suggestions = suggestions.slice(0, 4);
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