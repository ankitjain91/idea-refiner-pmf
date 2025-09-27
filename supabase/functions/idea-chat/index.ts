// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// NOTE: This edge function has been hardened for reliability: env validation, retry logic, timeouts, safer JSON parsing.

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// Centralized environment validation (pre-flight)
function validateEnv() {
  const missing: string[] = [];
  if (!openAIApiKey) missing.push('OPENAI_API_KEY');
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (missing.length) {
    return new Response(
      JSON.stringify({ error: `Missing environment variables: ${missing.join(', ')}`, code: 'CONFIG_MISSING' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  return null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Devil's advocate guidelines injected into system prompts to enforce constructive skepticism
const DEVILS_ADVOCATE_GUIDELINES = `You are a constructive but rigorous devil's advocate.
ALWAYS:
- Begin with a one-line viability snapshot: Viability: <early-unclear|moderate-potential|strong-signal> (confidence: %)
- Challenge unsubstantiated claims and vague phrasing (e.g. "revolutionary", "massive market", "people need"). Ask for specifics.
- Surface the top 2-3 critical risks (clearly labeled: Risks: ...).
- Require evidence: user segment clarity, acute quantified problem, measurable differentiation, realistic acquisition & monetization path.
- If missing core elements, push back and request them BEFORE offering praise.
- Only show optimism AFTER risks are addressed or sufficient specificity exists.
DO NOT:
- Blindly encourage.
- Accept generic answers without asking for numbers/examples.
ALSO PROVIDE:
- A next validation step framed as an experiment (label: Next Test) with success metric.
Tone: analytical, candid, concise, never rude, never dismissive—focused on truth-seeking.`;

// Generic timed fetch with abort (edge-safe)
async function timedFetch(resource: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 12000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // @ts-ignore signal attach
    const resp = await fetch(resource, { ...rest, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(t);
  }
}

async function openAIChatRequest(body: any, { retries = 2 }: { retries?: number } = {}) {
  let attempt = 0;
  let lastError: any = null;
  while (attempt <= retries) {
    try {
      const resp = await timedFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        timeoutMs: 18000
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `OpenAI HTTP ${resp.status}`);
      }
      return await resp.json();
    } catch (e) {
      lastError = e;
      attempt++;
      if (attempt > retries) break;
      // Exponential backoff
      await new Promise(r => setTimeout(r, 400 * attempt * attempt));
    }
  }
  throw lastError || new Error('Unknown OpenAI error');
}

function safeParseJSON<T = any>(text: string): T | null {
  try { return JSON.parse(text); } catch { return null; }
}

// Fetch real web data for suggestions (best-effort; never throws)
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
    
    const webSearchResponse = await timedFetch(`${SUPABASE_URL}/functions/v1/search-web`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery }),
      timeoutMs: 10000
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

// --- End helper section ---

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

Generate 4 helpful tips or insights that:
1. Build on what was just discussed
2. Provide actionable advice
3. Are specific and practical
4. Maximum 12 words each

Return ONLY a JSON array of 4 tip statements (not questions).`;
  }

  try {
      const data = await openAIChatRequest({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return exactly 4 suggestions as a JSON array.' },
          { role: 'user', content: systemPrompt }
        ],
        max_tokens: 120,
        temperature: 0.65
      });
      let content = data.choices?.[0]?.message?.content || '';
      
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
  } catch (error) {
    console.error('Error generating suggestions:', error);
  }
  return null;
}

// Entry HTTP handler
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

    const envError = validateEnv();
    if (envError) return envError;

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

      try {
        const analysisData = await openAIChatRequest({
          model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Return only valid JSON for PMF analysis.' },
              { role: 'user', content: analysisPrompt }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1100,
            temperature: 0.25
        }, { retries: 1 });
        const content = analysisData.choices?.[0]?.message?.content || '';
        
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
                `Research your target audience deeply`,
                `Focus on one specific problem first`,
                `Test pricing with early customers`,
                `Study your top 3 competitors closely`
              ]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (analysisErr) {
        console.error('Analysis generation error:', analysisErr);
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

      let aiResponse = '';
      try {
        const mainData = await openAIChatRequest({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 420,
          temperature: 0.4
        });
        aiResponse = mainData.choices?.[0]?.message?.content || '';
      } catch (e) {
        console.error('Primary analysis question OpenAI error:', e);
      }
      
      // Generate contextual suggestions based on the bot's response
      const contextualSuggestions = await generateRealSuggestions(idea, currentQuestion, webData, aiResponse);

      return new Response(
        JSON.stringify({ 
          response: aiResponse || `Let me help you analyze ${idea} with real market data.`,
          suggestions: contextualSuggestions || [
            `Focus on your most valuable use case`,
            `Identify your unique competitive edge`,
            `Start with one marketing channel`,
            `Build only essential features first`
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
      ? `${DEVILS_ADVOCATE_GUIDELINES}\nContext: Refinement mode for idea: "${idea}". Your role: stress-test assumptions, expose weak links, then guide improvement. Focus one core gap per reply if multiple are missing.`
      : `${DEVILS_ADVOCATE_GUIDELINES}\nContext: General exploration.${idea ? ` Idea: "${idea}".` : ''} Provide data-grounded pushback and require specificity before endorsing feasibility.`;
    
    let aiResponse = '';
    try {
      const data = await openAIChatRequest({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-3),
          { role: 'user', content: message }
        ],
        max_tokens: 320,
        temperature: 0.4
      });
      aiResponse = data.choices?.[0]?.message?.content || '';
    } catch (primaryErr) {
      console.error('Primary chat error:', primaryErr);
      aiResponse = 'Encountered a processing hiccup, but you can continue refining—provide more specifics and retry.';
    }
    
    // Generate contextual suggestions based on the AI response
    let suggestions = [];
    try {
      // Generate suggestions that are contextual helpful tips/information instead of questions
      const suggestionPrompt = `Based on this response: "${aiResponse.slice(0, 500)}..."
      
      Generate 4 short, helpful tips, insights, or actionable advice related to what was just discussed.
      These should be informational statements that provide value, NOT questions for the user to answer.
      Make them specific and practical.
      Return ONLY a JSON array of strings, no explanation.
      
      Example format: ["Consider validating with 10 target users first", "Freemium models work well for this market", "Focus on mobile-first experience", "Start with one core feature"]`;
      
      try {
        const suggestionData = await openAIChatRequest({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return 2 helpful tips/insights as JSON: {"suggestions": ["Tip1", "Tip2"]}' },
            { role: 'user', content: `Provide 2 helpful tips for: ${idea || message}`.slice(0, 200) }
          ],
          max_tokens: 60,
          temperature: 0.35,
          response_format: { type: 'json_object' }
        });
        const suggestionContent = suggestionData.choices?.[0]?.message?.content || '';
        const parsed = safeParseJSON(suggestionContent);
        if (parsed?.suggestions && Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions.slice(0,2).map((s: any) => String(s));
        }
      } catch (suggErr) {
        console.error('Suggestion generation failed:', suggErr);
      }
      
      // Fallback suggestions if generation fails
      if (suggestions.length === 0) {
        if (refinementMode && idea) {
          // Refinement mode fallbacks
          suggestions = [
            `Start by interviewing 5-10 potential users`,
            `Focus on one specific user segment first`,
            `Test your core assumption before building`,
            `Consider the simplest viable solution`
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
            `Research your market size and trends`,
            `Start with a simple MVP to test demand`,
            `Focus on solving one problem really well`,
            `Talk to potential customers early and often`
          ];
        }
      }
    } catch (suggestionError) {
      console.error('Error generating suggestions:', suggestionError);
      suggestions = [
        "Start by defining your core problem clearly",
        "Interview potential customers early",
        "Focus on one target segment initially",
        "Test your business model assumptions"
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