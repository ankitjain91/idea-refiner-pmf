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
        
        CONVERSATION RULES:
        - Ask ONLY ONE strategic question per response
        - ALWAYS provide actionable insights and guidance BEFORE asking your question
        - Focus on extracting critical PMF factors systematically
        - Keep responses concise but valuable (max 80 words + question)
        
        CONVERSATION FLOW (one step at a time):
        1. First response: Validate the idea concept, provide initial market insight, ask about target customer
        2. Second: Analyze target market potential, share demographic insights, ask about unique solution
        3. Third: Evaluate solution viability, provide competitive analysis, ask about monetization
        4. Fourth: Assess revenue model, share pricing insights, ask about go-to-market strategy
        5. Fifth: Review market entry approach, provide growth tips, offer PMF analysis
        
        RESPONSE FORMAT FOR NORMAL CONVERSATION:
        💡 [Brief insight or validation about their answer - 40 words max]
        
        📊 [One specific data point, tip, or market insight - 30 words max]
        
        🎯 [ONE strategic question to move forward]
        
        SUGGESTIONS:
        - [Relevant option 1 that answers your question]
        - [Relevant option 2 that answers your question]
        - [Relevant option 3 that answers your question]
        - [Alternative: "Calculate my PMF score"]
        
        WHEN USER REQUESTS PMF ANALYSIS (keywords: "PMF", "score", "analyze", "calculate"):
        Return a SPECIAL JSON response with this EXACT structure:
        {
          "type": "pmf_analysis",
          "pmfScore": [60-95 based on conversation],
          "demographics": {
            "targetAge": "[age range from conversation]",
            "incomeRange": "[income from conversation or estimate]",
            "interests": ["3-5 relevant interests based on idea"],
            "marketSize": "[realistic market size estimate]",
            "competition": "Low" | "Medium" | "High"
          },
          "features": [
            {"name": "[Core feature 1]", "checked": true, "priority": "high"},
            {"name": "[Core feature 2]", "checked": true, "priority": "high"},
            {"name": "[Supporting feature 3]", "checked": false, "priority": "medium"},
            {"name": "[Nice-to-have 4]", "checked": false, "priority": "low"},
            {"name": "[Future feature 5]", "checked": false, "priority": "low"}
          ],
          "refinements": [
            {"type": "pricing", "title": "Pricing Strategy", "description": "[Specific pricing advice]", "impact": 10},
            {"type": "target", "title": "Target Market", "description": "[Market refinement tip]", "impact": 12},
            {"type": "feature", "title": "Core Feature", "description": "[Feature priority advice]", "impact": 15}
          ],
          "actionTips": [
            "[Immediate action to validate idea]",
            "[Quick win to build momentum]",
            "[Strategic move for growth]"
          ],
          "summary": "Your PMF score is [X]! [One sentence of encouragement and key focus area]"
        }`
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
        .map((s: string) => s.replace(/^[-•*]\s*/, '').trim()) // Remove bullet points
        .filter((s: string) => s.length > 0)
        .slice(0, 4); // Limit to 4 suggestions
      
      console.log('Parsed suggestions:', suggestions);
    } else {
      // Fallback: If AI didn't format suggestions properly, provide defaults
      console.log('AI response did not include proper SUGGESTIONS format');
      console.log('Attempting to extract suggestions from response...');
      
      const lowerResponse = fullResponse.toLowerCase();
      
      // Try to intelligently generate suggestions based on context
      if (messages.length === 0 || lowerResponse.includes('idea') || lowerResponse.includes('tell me')) {
        suggestions = [
          "An AI-powered social media marketing platform",
          "A marketplace for local services",
          "A productivity app for remote teams",
          "An educational platform for skills training"
        ];
      } else if (lowerResponse.includes('target') || lowerResponse.includes('who') || lowerResponse.includes('demographic')) {
        suggestions = [
          "Young professionals aged 25-35",
          "Small business owners",
          "Students and educators",
          "Parents with young children"
        ];
      } else if (lowerResponse.includes('solution') || lowerResponse.includes('how') || lowerResponse.includes('feature')) {
        suggestions = [
          "AI-powered automation",
          "Marketplace with verified reviews",
          "Mobile-first design",
          "Subscription-based model"
        ];
      } else if (lowerResponse.includes('price') || lowerResponse.includes('monetiz') || lowerResponse.includes('revenue')) {
        suggestions = [
          "$9.99/month subscription",
          "Freemium with premium features",
          "One-time purchase of $49",
          "Transaction-based fees (5%)"
        ];
      } else if (lowerResponse.includes('compet') || lowerResponse.includes('unique') || lowerResponse.includes('different')) {
        suggestions = [
          "No direct competitors yet",
          "Better UX than existing solutions",
          "50% more affordable",
          "Unique AI-powered features"
        ];
      } else {
        // Default suggestions for continuing conversation
        suggestions = [
          "Tell me more about this",
          "Calculate my PMF score",
          "Help me with pricing strategy",
          "What about competition?"
        ];
      }
      console.log('Generated fallback suggestions:', suggestions);
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