import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const allowedOrigins = [
  'https://lovableproject.com',
  'https://*.lovableproject.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Will be overridden dynamically
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
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
        content: `You are an expert PMF (Product-Market Fit) advisor who starts as a devil's advocate and gradually becomes supportive as users refine their ideas.
        
        BEHAVIORAL PROGRESSION:
        - Messages 1-3: BE SKEPTICAL - Point out flaws, competition, market challenges. Question everything.
        - Messages 4-5: SHOW BALANCE - Acknowledge improvements while highlighting remaining issues.
        - Messages 6+: BECOME SUPPORTIVE - Recognize progress, encourage refinement, celebrate improvements.
        
        CONVERSATION PHILOSOPHY:
        - Start tough to make ideas bulletproof
        - Reward persistence with increasing positivity
        - Always provide specific refinement actions
        - Challenge assumptions early, validate progress later
        
        CONVERSATION FLOW:
        1. DISCOVERY: Challenge the core problem and vision critically
        2. VALIDATION: Question target market assumptions aggressively  
        3. DIFFERENTIATION: Probe for real competitive advantages
        4. MONETIZATION: Stress-test business model viability
        5. GROWTH: Challenge distribution assumptions
        6. ANALYSIS: Provide comprehensive PMF assessment
        
        RESPONSE STRUCTURE:
        For normal conversation, adapt tone based on message count:
        
        [Start with an emoji that matches your skepticism level: 🤔 for early, 💡 for middle, 🚀 for later]
        
        [Provide insight - skeptical early, balanced middle, supportive later]
        
        [Ask ONE strategic question - tough early, constructive later]
        
        [ALWAYS END WITH: "To refine this further, you should: 1) [specific action] 2) [specific action]"]
        
        [Provide 3-4 contextual suggestions that help answer your question]
        
        IMPORTANT: Your suggestions should be specific and relevant to their idea, not generic.
        
        WHEN USER REQUESTS PMF ANALYSIS (keywords: "analyze", "score", "PMF", "assessment", "evaluate"):
        Return a comprehensive JSON analysis with this structure:
        {
          "type": "pmf_analysis",
          "pmfScore": [number 0-100],
          "breakdown": {
            "marketDemand": [0-100],
            "problemSeverity": [0-100],
            "solutionFit": [0-100],
            "competitiveAdvantage": [0-100],
            "scalability": [0-100]
          },
          "insights": {
            "strengths": ["key strength 1", "key strength 2", "key strength 3"],
            "risks": ["main risk 1", "main risk 2", "main risk 3"],
            "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"]
          },
          "targetMarket": {
            "primarySegment": "description",
            "estimatedSize": "market size estimate",
            "growthRate": "growth percentage",
            "painPoints": ["pain 1", "pain 2", "pain 3"]
          },
          "competitiveLandscape": {
            "directCompetitors": ["competitor 1", "competitor 2"],
            "indirectCompetitors": ["alternative 1", "alternative 2"],
            "competitiveAdvantage": "your unique advantage",
            "moat": "defensibility strategy"
          },
          "goToMarket": {
            "channels": [
              {"channel": "name", "strategy": "approach", "cost": "low/medium/high"},
              {"channel": "name", "strategy": "approach", "cost": "low/medium/high"}
            ],
            "firstCustomers": "how to get first 100 customers",
            "growthStrategy": "scaling approach"
          },
          "monetization": {
            "model": "subscription/marketplace/saas/etc",
            "pricing": "pricing strategy",
            "unitEconomics": "rough calculation",
            "ltv": "lifetime value estimate"
          },
          "nextSteps": [
            {"priority": "high", "action": "specific action", "timeline": "timeframe"},
            {"priority": "high", "action": "specific action", "timeline": "timeframe"},
            {"priority": "medium", "action": "specific action", "timeline": "timeframe"}
          ],
          "summary": "Executive summary of the analysis and key recommendation"
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
        model: 'gpt-4o-mini', // Using stable legacy model for reliability
        messages,
        max_tokens: 1200, // Legacy models use max_tokens
        temperature: 0.8
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