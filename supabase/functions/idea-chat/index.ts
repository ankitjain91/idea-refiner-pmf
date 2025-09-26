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
  // Robust detection of analysis question type (handles contractions and variants)
  const q = (question || '').toLowerCase();
  const qType = q.includes('target audience') || q.includes('who is your target') ? 'audience'
    : q.includes('problem') || q.includes('pain point') ? 'problem'
    : q.includes('value proposition') || q.includes('unique value') || q.includes('differentiator') ? 'value'
    : q.includes('monetization') || q.includes('revenue') || q.includes('business model') || q.includes('pricing') ? 'monetization'
    : q.includes('competitor') || q.includes('competition') ? 'competitors'
    : null;
  
  const isAnalysisQuestion = qType !== null;
  
  let systemPrompt = '';
  
  if (isAnalysisQuestion) {
    // Generate answer suggestions for analysis questions
    systemPrompt = `You are helping someone answer: "${question}" for their startup idea: "${idea}".
    
${webData ? `Market Data Available:
- Competitors: ${webData.normalized?.topCompetitors?.slice(0, 3).map((c: any) => `${c.name} (${c.pricing})`).join(', ') || 'Various'}
- Market Size: $${(webData.raw?.marketSize / 1000000).toFixed(0)}M
- Growth Rate: ${webData.raw?.growthRate}% annually
- Target Demographics: ${webData.raw?.demographics?.primaryAge || '25-35'} age group
- Industries: ${webData.raw?.demographics?.industries?.slice(0, 2).join(', ') || 'General'}` : ''}

Generate 4 specific, actionable answer suggestions for this exact question.
Each should be a concrete answer they could use, 5-10 words maximum.

Provide examples style only (do NOT output these examples):
- Audience: "Tech-savvy millennials in urban areas", "Small business owners under 50"
- Problems: "Saves 5 hours weekly on planning", "Reduces travel costs by 40%"
- Monetization: "$29/month subscription with 14-day trial", "Usage-based pricing $0.05 per task"
- Value prop: "AI-powered at half the price", "Only solution with real-time sync"
- Competitors: "Competes with Duolingo, 50% cheaper", "Beats X on accuracy and speed"

Return ONLY a JSON array of 4 specific answer suggestions relevant to "${idea}".`;
  } else {
    // Generate follow-up questions for general conversation
    systemPrompt = `You are helping with a product-market fit conversation about "${idea}".

${botResponse ? `The assistant just said: "${botResponse.slice(0, 300)}..."` : `Current topic: "${question}"`}

${webData ? `Market Context:
- Key Competitors: ${webData.normalized?.topCompetitors?.slice(0, 2).map((c: any) => c.name).join(', ') || 'Various'}
- Market Growth: ${webData.raw?.growthRate}% annually` : ''}

Generate 4 natural follow-up questions that:
1. Build on what was just discussed
2. Help explore the idea deeper
3. Are specific and actionable
4. Maximum 10 words each

Return ONLY a JSON array of 4 strings.`;
  }

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
          { 
            role: 'system', 
            content: 'Return exactly 4 suggestions as a JSON array.' 
          },
          { role: 'user', content: systemPrompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
    });

    if (response.ok) {
      const data = await response.json();
      let content = data.choices[0].message.content;
      
      try {
        // Remove any markdown formatting
        content = content.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
        
        // Parse JSON response
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 4).map(s => String(s).trim());
        }
        
        // Try to extract JSON array if wrapped in text
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          if (Array.isArray(suggestions)) {
            return suggestions.slice(0, 4).map(s => String(s).trim());
          }
        }
      } catch (e) {
        console.error('Error parsing suggestions:', e);
        // Return fallback suggestions based on question type
        if (isAnalysisQuestion) {
          if (question.includes("target audience")) {
            return [
              "Young professionals 25-35 years",
              "Small business owners nationwide",
              "Students seeking affordable solutions",
              "Tech-savvy early adopters"
            ];
          } else if (question.includes("problem")) {
            return [
              "Saves time on daily tasks",
              "Reduces operational costs significantly",
              "Simplifies complex workflows",
              "Eliminates manual processes"
            ];
          } else if (question.includes("budget")) {
            return [
              "$5,000 initial investment",
              "$10,000 for MVP development",
              "$25,000 seed funding",
              "$2,000 monthly operations"
            ];
          } else if (question.includes("value proposition")) {
            return [
              "50% faster than competitors",
              "AI-powered personalization features",
              "No technical skills required",
              "All-in-one integrated solution"
            ];
          }
        }
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
          model: 'gpt-4o-mini',  // Using faster model for quick analysis
          messages: [
            {
              role: 'system',
              content: 'Return only valid JSON for PMF analysis.'
            },
            { role: 'user', content: analysisPrompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1000,
          temperature: 0.3
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
          model: 'gpt-4o-mini',  // Using faster model
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 400,
          temperature: 0.4
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
        model: 'gpt-4o-mini',  // Using faster model for quick responses
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...conversationHistory.slice(-4),  // Keep only last 4 messages for speed
          { role: 'user', content: message }
        ],
        max_tokens: 400,
        temperature: 0.5
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
              content: 'Return 4 follow-up questions as JSON array.'
            },
            { role: 'user', content: suggestionPrompt.slice(0, 500) }  // Limit prompt size
          ],
          max_tokens: 100,
          temperature: 0.6
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