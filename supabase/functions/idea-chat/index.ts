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

// Generate real, contextual suggestions based on web data and AI analysis
async function generateRealSuggestions(idea: string, question: string, webData: any) {
  const systemPrompt = `You are a PM-Fit expert analyzing "${idea}". 
Question being answered: "${question}"

${webData ? `Real Market Data Found:
- Market Size: ${webData.raw?.marketSize || 'Analyzing...'}
- Growth Rate: ${webData.raw?.growthRate || 'Analyzing...'}%
- Top Competitors: ${webData.raw?.topCompetitors?.map((c: any) => c.name).join(', ') || 'Analyzing...'}
- Demographics: ${JSON.stringify(webData.raw?.demographics) || 'Analyzing...'}
` : ''}

Generate 4 HIGHLY SPECIFIC suggestions for "${idea}" that:
1. Use the actual market data provided above
2. Directly answer: "${question}"
3. Include real competitor names, actual market metrics, or proven strategies
4. Are maximum 15 words each
5. Are immediately actionable and specific to "${idea}"

Example format for "${idea}":
- If problem solving: "Target remote teams struggling with [specific pain point from data]"
- If audience: "Focus on ${webData?.raw?.demographics?.primaryAge || '25-40'} year olds in ${webData?.raw?.demographics?.geographic?.[0] || 'tech hubs'}"
- If competitors: "Differentiate from ${webData?.raw?.topCompetitors?.[0]?.name || 'market leader'} by [specific strategy]"

Format as JSON array of strings only.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // Fast model for quick suggestions
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        max_tokens: 200,
        temperature: 0.5
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
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
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const pmfAnalysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
          
          return new Response(
            JSON.stringify({ 
              response: `I've completed a comprehensive analysis of "${message}". The PM-Fit score is ${pmfAnalysis.pmfScore}/100.`,
              pmfAnalysis,
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

      return new Response(
        JSON.stringify({ 
          response: aiResponse || `Let me help you analyze ${idea} with real market data.`,
          suggestions: realSuggestions || [
            `Based on ${webData?.normalized?.topCompetitors?.[0]?.name || 'market leaders'}`,
            `Target ${webData?.raw?.demographics?.primaryAge || '25-44 year olds'}`,
            `Price at ${webData?.raw?.pricing?.averagePrice || '$15'}/month like competitors`,
            `Focus on ${webData?.raw?.demographics?.industries?.[0] || 'tech'} industry first`
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
         ${webData ? `Available Market Data: ${JSON.stringify(webData.normalized || webData.raw)}` : ''}
         
         Help the user:
         - Explore different aspects of their idea
         - Identify potential challenges and opportunities
         - Refine their value proposition
         - Consider target markets and use cases
         - Think through implementation details
         
         Be conversational and help them think through their idea thoroughly before analysis.`
      : `You are an expert PM-Fit advisor with access to real market data. 
         ${idea ? `The user's product idea is: "${idea}"` : 'Help the user develop and analyze their product idea.'}
         ${webData ? `Available Market Data: ${JSON.stringify(webData.normalized || webData.raw)}` : ''}`;
    
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
    
    // Generate contextual suggestions with real data
    let suggestions = [];
    if (refinementMode && idea) {
      // Refinement mode suggestions - help explore the idea
      suggestions = [
        `What specific problem does ${idea} solve?`,
        `Who would be the ideal first customer for ${idea}?`,
        `How would ${idea} make money?`,
        `What makes ${idea} different from existing solutions?`
      ];
    } else if (idea && webData) {
      // Use real competitor and market data for suggestions
      const competitors = webData.normalized?.topCompetitors || [];
      suggestions = [
        competitors[0] ? `How to compete with ${competitors[0].name}?` : `How does ${idea} solve a real problem?`,
        `Target ${webData.raw?.demographics?.primaryAge || '25-35'} demographic specifically`,
        `Price competitively at ${webData.raw?.pricing?.priceRange?.min || '$10'}-${webData.raw?.pricing?.priceRange?.max || '$50'}/month`,
        `Focus on ${webData.raw?.demographics?.industries?.[0] || 'tech'} industry for launch`
      ];
    } else if (!idea) {
      // Fetch trending startup ideas from real data
      suggestions = [
        "AI-powered productivity tool for remote teams",
        "Sustainable fashion marketplace for Gen Z",
        "Mental health support platform for students",
        "Carbon footprint tracker with rewards"
      ];
    } else {
      suggestions = [
        `Analyze ${idea} market opportunity`,
        `Find ${idea} target customers`,
        `Research ${idea} competitors`,
        `Validate ${idea} business model`
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