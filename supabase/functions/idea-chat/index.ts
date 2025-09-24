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
    
    // Log the conversation for debugging
    console.log('Incoming message:', message);
    console.log('Conversation history length:', conversationHistory?.length || 0);
    if (conversationHistory?.length > 0) {
      console.log('Last AI message:', conversationHistory[conversationHistory.length - 1]?.content?.substring(0, 100));
    }

    // Construct messages for OpenAI with enhanced validation
    const messages = [
      {
        role: 'system',
        content: `You are a PMF (Product-Market Fit) advisor helping entrepreneurs refine startup ideas. 
        
        CRITICAL CONTEXT AWARENESS:
        - Check the conversation history to understand if this is a NEW idea or an ANSWER to your question
        - If you previously asked a question, the user is likely ANSWERING it
        - NEVER reject valid answers to your own questions
        
        FOR NEW STARTUP IDEAS:
        - Accept: Any description of a product, service, app, platform, or business solution
        - Reject ONLY: Random text, gibberish, non-business content, or extremely vague statements
        
        FOR ONGOING CONVERSATIONS:
        - Accept ALL responses as valid answers
        - Continue the conversation naturally
        - Guide them through: demographics, solution, monetization, competition, go-to-market
        
        WHEN USER REQUESTS PMF ANALYSIS (keywords: "PMF", "score", "analyze", "calculate"):
        Return a SPECIAL JSON response with this EXACT structure:
        {
          "type": "pmf_analysis",
          "pmfScore": [60-95],
          "demographics": {
            "targetAge": "18-35" | "25-45" | "35-55" | "45-65" | "All ages",
            "incomeRange": "$30k-60k" | "$60k-100k" | "$100k-200k" | "$200k+",
            "interests": ["3-5 relevant interests"],
            "marketSize": "estimate like $2.5B or 10M users",
            "competition": "Low" | "Medium" | "High"
          },
          "features": [
            {"name": "Feature 1", "checked": true/false, "priority": "high"},
            {"name": "Feature 2", "checked": true/false, "priority": "medium"},
            {"name": "Feature 3", "checked": true/false, "priority": "low"},
            {"name": "Feature 4", "checked": true/false, "priority": "high"},
            {"name": "Feature 5", "checked": true/false, "priority": "medium"}
          ],
          "refinements": [
            {"type": "pricing", "title": "Pricing Strategy", "description": "Specific advice", "impact": 5-15},
            {"type": "target", "title": "Target Market", "description": "Specific advice", "impact": 5-15},
            {"type": "feature", "title": "Core Feature", "description": "Specific advice", "impact": 5-15}
          ],
          "actionTips": [
            "Specific action item 1",
            "Specific action item 2",
            "Specific action item 3"
          ],
          "summary": "Brief encouraging summary of the analysis"
        }
        
        FOR NORMAL CONVERSATION:
        [Your response - encouraging, use emojis 🚀💡🎯💰, max 100 words]
        
        SUGGESTIONS:
        [Exactly 3-4 clickable options, one per line, contextual to your question]`
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
        max_tokens: 800, // Increased for PMF analysis responses
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
    
    console.log('Full AI response:', fullResponse);
    
    // Check if this is a PMF analysis JSON response
    let isPMFAnalysis = false;
    let pmfData = null;
    
    try {
      // Try to parse as JSON (for PMF analysis)
      const parsed = JSON.parse(fullResponse);
      if (parsed.type === 'pmf_analysis') {
        isPMFAnalysis = true;
        pmfData = parsed;
        console.log('PMF Analysis detected:', pmfData);
      }
    } catch (e) {
      // Not JSON, process as regular conversation
    }
    
    if (isPMFAnalysis && pmfData) {
      // Return PMF analysis data
      return new Response(
        JSON.stringify({ 
          response: pmfData.summary || "Here's your comprehensive PMF analysis!",
          suggestions: ["Start implementing these changes", "Share with co-founders", "Create action plan", "Save this analysis"],
          pmfAnalysis: pmfData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Parse regular conversation response
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