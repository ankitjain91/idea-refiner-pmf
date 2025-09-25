import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], generatePMFAnalysis = false } = await req.json();
    
    console.log('Incoming message:', message);
    console.log('Generate PMF Analysis:', generatePMFAnalysis);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = [
      {
        role: 'system',
        content: `You are a PMF advisor with REAL web search capabilities.
        
        CRITICAL: Search the actual internet for REAL data about business ideas.
        
        ALWAYS SEARCH FOR:
        - Real companies (names, funding, valuations)
        - Actual market size from reports (with sources)
        - Current pricing from competitors
        - Real customer complaints from Reddit/forums
        - Actual search volume and trends
        - Recent news and industry reports
        
        When analyzing, return ONLY VERIFIED DATA from web searches.
        Include specific company names, exact statistics, and source URLs.
        
        For PMF Analysis, return JSON with type: 'pmf_analysis' containing real market data.
        
        NEVER make up data. ONLY use information found from web searches.`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: `${message}. Search the web for real data about this. Include actual companies, market statistics, and sources.`
      }
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
        max_tokens: 1200,
        temperature: 0.3 // Lower for factual data
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Try to parse as JSON for PMF analysis
    let isPMFAnalysis = false;
    let pmfData = null;
    
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.type === 'pmf_analysis') {
        isPMFAnalysis = true;
        pmfData = parsed;
      }
    } catch (e) {
      // Not JSON, regular response
    }
    
    if (isPMFAnalysis && pmfData) {
      return new Response(
        JSON.stringify({ 
          response: pmfData.summary || "Analysis complete with real market data!",
          pmfAnalysis: pmfData,
          suggestions: ["Review competitor analysis", "Validate market size", "Test pricing strategy", "Build MVP"]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract suggestions if present
    let suggestions = [];
    if (aiResponse.includes('SUGGESTIONS:')) {
      const parts = aiResponse.split('SUGGESTIONS:');
      const suggestionText = parts[1].trim();
      suggestions = suggestionText.split('\n')
        .filter((s: string) => s.trim())
        .map((s: string) => s.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 4);
    }
    
    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        suggestions: suggestions.length > 0 ? suggestions : [
          "Tell me more about your target market",
          "What's your pricing strategy?",
          "Who are your main competitors?",
          "What's your unique value proposition?"
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in idea-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: "I encountered an error. Please try again.",
        suggestions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});