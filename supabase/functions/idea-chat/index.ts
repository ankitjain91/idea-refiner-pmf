import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch real web data for suggestions
async function fetchRealWebData(idea: string, question: string) {
  try {
    // Call search-web function to get real market data
    const searchQuery = `${idea} ${question.includes('problem') ? 'problems pain points' : 
                        question.includes('audience') ? 'target market demographics' :
                        question.includes('value') ? 'unique value proposition benefits' :
                        question.includes('monetization') ? 'pricing business model revenue' :
                        question.includes('competitors') ? 'competitors alternatives market analysis' : 
                        'market analysis'}`;
    
    console.log('Fetching web data for:', searchQuery);
    
    const webSearchResponse = await fetch(`${SUPABASE_URL}/functions/v1/search-web`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery }),
    });

    if (webSearchResponse.ok) {
      const webData = await webSearchResponse.json();
      console.log('Web data received:', webData);
      return webData;
    }
  } catch (error) {
    console.error('Error fetching web data:', error);
  }
  return null;
}

// Generate real, contextual suggestions based on the bot's response
async function generateRealSuggestions(idea: string, question: string, webData: any, botResponse?: string) {
  const systemPrompt = `You are helping with a product-market fit conversation about "${idea}".

${botResponse ? `The assistant just said: "${botResponse.slice(0, 300)}..."` : `Current question: "${question}"`}

${webData ? `Market Data Available:
- Competitors: ${webData.normalized?.topCompetitors?.slice(0, 2).map((c: any) => c.name).join(', ') || 'Various'}
- Target Age: ${webData.raw?.demographics?.primaryAge || '25-35'}
- Industry: ${webData.raw?.demographics?.industries?.[0] || 'General'}` : ''}

Generate 4 natural follow-up questions or responses that:
1. Are directly relevant to what was just discussed
2. Help the user think deeper about their answer
3. Are conversational and specific
4. Maximum 12 words each

Return ONLY a JSON array of 4 strings.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Generate 4 contextual follow-up suggestions as a JSON array only.' },
          { role: 'user', content: systemPrompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        // Parse JSON response
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 4);
        }
        
        // Try to extract JSON array if wrapped in text
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          if (Array.isArray(suggestions)) {
            return suggestions.slice(0, 4);
          }
        }
      } catch (e) {
        console.error('Error parsing suggestions:', e);
      }
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationHistory = [], 
      idea = null,
      analysisContext = null,
      currentQuestion = null,
      questionNumber = null,
      generatePMFAnalysis = false,
      refinementMode = false
    } = await req.json();
    
    console.log('Processing request for idea:', idea);
    console.log('Current question:', currentQuestion);
    console.log('Generate PMF Analysis:', generatePMFAnalysis);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // If generating PMF analysis, create comprehensive analysis with real data
    if (generatePMFAnalysis && message) {
      // Fetch real market data
      const webData = await fetchRealWebData(message, 'market analysis competitors pricing');
      
      const analysisPrompt = `Analyze this startup idea for Product-Market Fit: "${message}"

${webData ? `Real Market Data: ${JSON.stringify(webData.raw || webData.normalized, null, 2)}` : ''}

Generate a comprehensive PMF analysis with REAL data in this exact JSON format:
{
  "pmfScore": [calculate 0-100 based on real market potential],
  "audience": {
    "primary": {
      "name": "[specific segment based on research]",
      "share": [0.0-1.0],
      "demographics": { 
        "ages": "[actual age range from data]", 
        "genderSplit": "[real ratio]", 
        "geos": ["actual top markets"],
        "income": "[income range]",
        "education": "[education level]"
      }
    }
  },
  "scoreBreakdown": {
    "demand": [0-100 based on search volume and trends],
    "painIntensity": [0-100 based on problem severity],
    "competitionGap": [0-100 based on market gaps],
    "differentiation": [0-100 based on unique value],
    "distribution": [0-100 based on go-to-market viability]
  },
  "competitors": [
    {
      "name": "[real competitor name]",
      "marketShare": [percentage],
      "funding": "[actual funding amount]",
      "strengths": ["actual strength 1", "actual strength 2"],
      "weaknesses": ["actual weakness 1", "actual weakness 2"]
    }
  ],
  "marketSize": {
    "current": "[actual market size in billions]",
    "growth": "[CAGR percentage]",
    "potential": "[TAM/SAM/SOM breakdown]"
  },
  "refinements": [
    {
      "title": "[specific actionable improvement]",
      "description": "[how to implement with metrics]",
      "impact": "high/medium/low",
      "effort": "low/medium/high"
    }
  ]
}`;

      const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',  // Using GPT-4o for faster detailed analysis
          messages: [
            {
              role: 'system',
              content: 'You are a venture capital analyst providing data-driven PMF analysis. Use real market data and return only valid JSON.'
            },
            { role: 'user', content: analysisPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.4
        }),
      });

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        const content = analysisData.choices[0].message.content;
        
        try {
          // Clean the content to extract JSON
          let cleanContent = content;
          
          // Try to find JSON object in the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanContent = jsonMatch[0];
          }
          
          // Parse the JSON
          const pmfAnalysis = JSON.parse(cleanContent);
          
          // Ensure required fields exist with defaults
          const validatedAnalysis = {
            pmfScore: pmfAnalysis.pmfScore || 0,
            audience: pmfAnalysis.audience || {},
            scoreBreakdown: pmfAnalysis.scoreBreakdown || {},
            competitors: pmfAnalysis.competitors || [],
            marketSize: pmfAnalysis.marketSize || {},
            refinements: pmfAnalysis.refinements || []
          };
          
          return new Response(
            JSON.stringify({ 
              response: `I've completed a comprehensive analysis of "${message}". The PM-Fit score is ${validatedAnalysis.pmfScore}/100.`,
              pmfAnalysis: validatedAnalysis,
              suggestions: [
                `View detailed market analysis`,
                `Explore competitor insights`,
                `Review improvement suggestions`,
                `Check target demographics`
              ]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (parseError) {
          console.error('Error parsing PMF analysis:', parseError);
          console.error('Raw content:', content);
          
          // Return a basic response if parsing fails
          return new Response(
            JSON.stringify({ 
              response: `I've analyzed "${message}". Let me help you refine your idea further.`,
              suggestions: [
                `Tell me more about your target audience`,
                `What problem does this solve?`,
                `How will you monetize this?`,
                `Who are your main competitors?`
              ]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // If this is an analysis question, provide real data-driven suggestions
    if (currentQuestion && questionNumber !== null && idea) {
      // Fetch real web data for context
      const webData = await fetchRealWebData(idea, currentQuestion);
      
      // Generate real suggestions based on web data
      const realSuggestions = await generateRealSuggestions(idea, currentQuestion, webData);
      
      // Build comprehensive response with real data
      const systemPrompt = `You are a PM-Fit expert analyzing "${idea}".
The user is answering: "${currentQuestion}"

${webData ? `Real Market Data Available:
- Competitors: ${JSON.stringify(webData.normalized?.topCompetitors || [])}
- Market Size: ${webData.raw?.marketSize || 'Unknown'}
- Growth Rate: ${webData.raw?.growthRate || 'Unknown'}%
- Demographics: ${JSON.stringify(webData.raw?.demographics || {})}
- Pricing: ${JSON.stringify(webData.raw?.pricing || {})}` : ''}

Previous context: ${JSON.stringify(analysisContext || {}, null, 2)}

Provide data-driven analysis specific to "${idea}" and this question. Include real metrics, competitor names, and market data where relevant.`;

      const mainResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',  // Using GPT-4o for faster responses
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 800,
          temperature: 0.5
        }),
      });

      let aiResponse = "";
      if (mainResponse.ok) {
        const mainData = await mainResponse.json();
        aiResponse = mainData.choices[0].message.content;
      }
      
      // Generate contextual suggestions based on the bot's response
      const contextualSuggestions = await generateRealSuggestions(idea, currentQuestion, webData, aiResponse);

      return new Response(
        JSON.stringify({ 
          response: aiResponse || `Let me help you analyze ${idea} with real market data.`,
          suggestions: contextualSuggestions || [
            `Tell me more about the specific use case`,
            `What's your unique advantage here?`,
            `How will you reach these customers?`,
            `What's the MVP feature set?`
          ],
          metadata: {
            questionContext: currentQuestion,
            ideaContext: idea,
            questionNumber,
            marketData: webData?.normalized || null
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular chat response with real data context
    const webData = idea ? await fetchRealWebData(idea, message) : null;
    
    // Adjust system prompt based on refinement mode
    const systemPrompt = refinementMode 
      ? `You are an expert PM-Fit advisor helping refine and explore a product idea. 
         The user's product idea is: "${idea}"
         
         Help the user explore and refine their idea by:
         - Asking clarifying questions about the concept
         - Identifying potential challenges and opportunities
         - Discussing target markets and use cases
         - Exploring technical feasibility
         - Considering business model options
         
         Be conversational, encouraging, and help them develop their idea thoroughly.
         Keep responses concise and focused on one aspect at a time.`
      : `You are an expert PM-Fit advisor with access to real market data. 
         ${idea ? `The user's product idea is: "${idea}"` : 'Help the user develop and analyze their product idea.'}
         Provide data-driven insights and actionable advice.`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Using GPT-4o for better quality responses
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        max_tokens: 800,
        temperature: 0.6
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Generate contextual suggestions based on the AI response
    let suggestions = [];
    try {
      // Generate suggestions that are contextual to the AI response
      const suggestionPrompt = `Based on this response: "${aiResponse.slice(0, 500)}..."
      
      Generate 4 short, contextual follow-up questions or prompts that the user might want to explore next.
      Make them specific to what was just discussed.
      Return ONLY a JSON array of strings, no explanation.
      
      Example format: ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3", "Follow-up question 4"]`;
      
      const suggestionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',  // Using mini model for quick suggestions
          messages: [
            {
              role: 'system',
              content: 'You generate contextual follow-up questions. Return only a JSON array of 4 strings.'
            },
            { role: 'user', content: suggestionPrompt }
          ],
          max_tokens: 200,
          temperature: 0.7
        }),
      });
      
      if (suggestionResponse.ok) {
        const suggestionData = await suggestionResponse.json();
        const suggestionContent = suggestionData.choices[0].message.content;
        
        try {
          // Parse the JSON array
          const parsed = JSON.parse(suggestionContent);
          if (Array.isArray(parsed)) {
            suggestions = parsed.slice(0, 4); // Ensure max 4 suggestions
          }
        } catch {
          console.log('Could not parse suggestions, using fallbacks');
        }
      }
      
      // Fallback suggestions if generation fails
      if (suggestions.length === 0) {
        if (refinementMode && idea) {
          // Refinement mode fallbacks
          suggestions = [
            `What specific problem does this solve?`,
            `Who would be the ideal first customer?`,
            `How would this generate revenue?`,
            `What makes this different from existing solutions?`
          ];
        } else if (!idea) {
          // Default suggestions for new users
          suggestions = [
            "AI-powered productivity tool for remote teams",
            "Sustainable fashion marketplace for Gen Z",
            "Mental health support platform for students",
            "Carbon footprint tracker with rewards"
          ];
        } else {
          // Generic fallbacks
          suggestions = [
            `Tell me more about the target market`,
            `What are the main challenges?`,
            `How will you validate this idea?`,
            `What's your competitive advantage?`
          ];
        }
      }
    } catch (suggestionError) {
      console.error('Error generating suggestions:', suggestionError);
      suggestions = [
        "Tell me more about your idea",
        "What problem are you solving?",
        "Who is your target customer?",
        "What's your business model?"
      ];
    }
    
    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        suggestions,
        metadata: {
          hasIdea: !!idea,
          ideaContext: idea,
          marketData: webData?.normalized || null
        }
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