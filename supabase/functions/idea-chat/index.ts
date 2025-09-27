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

// Devil's advocate guidelines with human-like brain wrinkles personality
const DEVILS_ADVOCATE_GUIDELINES = `You are an experienced startup advisor with the "Brain Wrinkles" personality - someone who's been through the startup trenches and helps entrepreneurs develop wisdom (brain wrinkles) through thoughtful but challenging questions.

YOUR PERSONALITY & STYLE:
- You're like a friendly but no-nonsense mentor who genuinely wants them to succeed
- Speak naturally with personality - use contractions (I'm, you're, let's, can't)
- Mix encouragement with tough love - celebrate good thinking but challenge weak spots
- Reference brain wrinkles naturally: "Ooh, that's adding some wrinkles!" or "Let's smooth out this thinking..."
- Be conversational but insightful - like chatting with a smart friend over coffee
- Use occasional humor and metaphors but stay focused on their success
- React to their specific words - if they sound unsure, probe; if confident, pressure-test

COMMUNICATION STYLE:
- Start responses acknowledging what they said: "Interesting angle about..." or "I see where you're going with..."
- Use natural transitions: "Here's the thing though..." or "But wait, let me push back..."
- Ask follow-ups like a real conversation: "So when you say X, do you mean...?"
- Show genuine curiosity: "That's fascinating - tell me more about..."
- Express concerns naturally: "I'm a bit worried about..." or "This part makes me nervous..."
- End with momentum: "Let's dig into..." or "Next, I'd love to understand..."

YOUR ROLE AS PROFIT-FOCUSED ADVISOR:
- Challenge assumptions but explain why: "I'm questioning this because similar startups failed when..."
- Focus on making money: "Cool idea, but how does this actually generate revenue?"
- Share patterns you've seen: "In my experience, founders often overlook..."
- Use specific examples: "Reminds me of when Airbnb had to..." 
- Be direct about concerns: "Honestly, this sounds expensive to build and hard to monetize"
- Push for validation: "Have you actually talked to potential customers about this?"

KEY QUESTIONS YOU ASK (naturally woven in):
Revenue & Profitability:
- "Walk me through how someone pays you - what triggers them to open their wallet?"
- "At what point do you hit profitability? Let's do some quick math..."
- "Why would anyone pay premium prices for this versus cheaper alternatives?"

Market Reality:
- "Who's already solving this problem, even if badly?"
- "What happens when [big company] copies this feature?"
- "How many people genuinely have this problem badly enough to pay?"

Validation & Evidence:
- "What actual evidence do you have that people want this?"
- "Tell me about the last person you talked to who had this problem"
- "How are people solving this today without your solution?"

Risk & Competition:
- "What keeps you up at night about this idea?"
- "If this was easy, why hasn't someone already dominated?"
- "What's your unfair advantage here?"

RESPONSE PATTERNS:
1. Acknowledge their input genuinely (1-2 sentences)
2. Share an insight or pattern you've noticed
3. Ask 3-4 probing questions that build on each other
4. Point out 1-2 specific risks or challenges
5. Suggest a concrete next step to validate
6. End with encouragement and momentum

EXAMPLES OF YOUR NATURAL STYLE:
Instead of: "Your TAM calculation appears inflated."
You say: "Hmm, that market size feels optimistic. When you say 'every small business,' are we really talking about all of them? Because in my experience, maybe 10% actually feel this pain enough to pay."

Instead of: "Validation is required."
You say: "Here's what worries me - have you actually gotten anyone to commit to paying for this? Even just a verbal 'yes, I'd pay $X' from 5 real potential customers would add major wrinkles to your brain!"

Instead of: "Competition is significant."
You say: "So I just did a quick search and found 3 companies already doing something similar. What makes you different enough that someone switches to you? And please don't say 'better UX' - everyone says that!"

Remember: You're tough because you care. You've seen too many founders fail from lack of honest feedback. But you're also human - show enthusiasm when they nail something, frustration when they're being vague, and genuine curiosity about their journey.`;

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
    // Generate natural answer suggestions for analysis questions
    systemPrompt = `You're helping an entrepreneur thoughtfully answer: "${question}" about their "${idea}" startup.
    
${webData ? `Real Market Intelligence:
- Top Players: ${webData.normalized?.topCompetitors?.slice(0, 3).map((c: any) => `${c.name}`).join(', ') || 'Various established players'}
- Market Value: Growing $${(webData.raw?.marketSize / 1000000).toFixed(0)}M market
- Annual Growth: ${webData.raw?.growthRate}% expansion rate
- Key Demographics: ${webData.raw?.demographics?.primaryAge || '25-45'} professionals
- Active Sectors: ${webData.raw?.demographics?.industries?.slice(0, 2).join(', ') || 'Technology and services'}` : ''}

Generate 4 thoughtful, natural-sounding responses they could adapt for their answer.
Each should be a complete, conversational thought (20-40 words) that sounds like something a real founder would say.

Focus on being specific and authentic, not generic. Include real details, numbers, or examples when relevant.

Examples of the natural style (DO NOT use these):
- "We're targeting busy parents who spend over 3 hours weekly on meal planning but want healthier options for their families without the stress"
- "Our platform saves small agencies about 15 hours per month on client reporting, which they can reinvest in strategy and creative work"
- "We're building a subscription model starting at $49/month for individuals, with team plans at $199 that include collaboration features and priority support"

Generate 4 natural, detailed suggestions specific to "${idea}" and this question.`;
  } else {
    // Generate conversational follow-up insights
    systemPrompt = `You're having a friendly conversation about the "${idea}" startup concept.

${botResponse ? `You just discussed: "${botResponse.slice(0, 300)}..."` : `Current topic: "${question}"`}

${webData ? `Market Context:
- Similar Companies: ${webData.normalized?.topCompetitors?.slice(0, 2).map((c: any) => c.name).join(', ') || 'Various players'}
- Market Dynamics: ${webData.raw?.growthRate}% annual growth` : ''}

Generate 4 conversational follow-up thoughts that sound natural and helpful.
Each should be 20-35 words, like something an experienced advisor would say in conversation.

Make them specific, actionable insights or thoughtful questions that move the conversation forward.
Include relevant examples, metrics, or practical tips when possible.

Style examples (DO NOT use these):
- "Have you considered partnering with existing platforms first to validate demand before building everything from scratch? Many successful startups started this way"
- "I'd suggest talking to at least 20 potential customers this week about their current pain points - their feedback will be invaluable for your MVP"
- "What if you focused on just one specific feature that solves 80% of the problem? You can always expand once you have traction"

Generate 4 natural, conversational suggestions specific to "${idea}".`;
  }

  try {
      const data = await openAIChatRequest({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Generate exactly 4 natural, conversational suggestions as a JSON array. Each should be a complete thought that sounds human and helpful.' },
          { role: 'user', content: systemPrompt }
        ],
        max_tokens: 400,
        temperature: 0.8
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
        // Return more natural fallback suggestions based on question type
        if (isAnalysisQuestion) {
          if (question.includes("target audience")) {
            return [
              "We're focusing on young professionals aged 25-35 in major cities who value convenience and are early tech adopters",
              "Our primary market is small business owners with 10-50 employees who need affordable solutions without enterprise complexity",
              "We're targeting college students and recent grads who need budget-friendly options that still deliver professional results",
              "Our sweet spot is tech-savvy parents who want to simplify their daily routines while staying connected with family"
            ];
          } else if (question.includes("problem")) {
            return [
              "We help businesses save at least 10 hours per week on repetitive tasks that currently require manual intervention",
              "Our solution reduces operational costs by 30-40% through intelligent automation and streamlined workflows",
              "We're solving the communication gap between remote teams that costs companies thousands in lost productivity monthly",
              "Our platform eliminates the need for multiple tools by providing an all-in-one solution that actually works"
            ];
          } else if (question.includes("budget")) {
            return [
              "We're starting with $5,000 to build an MVP and validate the core concept with real users",
              "Our budget is $10,000 for initial development plus $2,000 monthly for operations and marketing",
              "We're raising $25,000 in seed funding to cover six months of development and initial customer acquisition",
              "We need about $15,000 to launch properly, with half going to product and half to marketing"
            ];
          } else if (question.includes("value proposition")) {
            return [
              "We deliver results 50% faster than traditional solutions while costing half as much through smart automation",
              "Our AI-powered features provide personalized experiences that competitors can't match at this price point",
              "Unlike complex enterprise tools, ours requires zero technical skills and can be set up in under 10 minutes",
              "We're the only solution that combines all these features in one platform without the usual complexity"
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
      refinementMode = false,
      liveInsights = false,
      responseMode = 'verbose'
    } = await req.json();
    
    console.log('Processing request for idea:', idea);
    console.log('Current question:', currentQuestion);
    console.log('Generate PMF Analysis:', generatePMFAnalysis);

    const envError = validateEnv();
    if (envError) return envError;

    // Early path: live insights snapshot (independent of PMF analysis)
    if (liveInsights) {
      if (!idea) {
        return new Response(JSON.stringify({ error: 'idea_required_for_live_insights' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
      try {
        const queries = [
          'market growth rate',
          'top competitors funding news',
          'pricing trends',
          'user adoption challenges',
          'emerging risks regulation',
          'distribution channel shifts'
        ];
        const webResults: any[] = [];
        for (const q of queries) {
          const r = await fetchRealWebData(idea, q);
          if (r) webResults.push({ q, data: r });
        }
        const condensed = webResults.slice(0,5).map(w => ({
          q: w.q,
          competitors: w.data?.normalized?.topCompetitors?.slice(0,3) || [],
          marketSize: w.data?.raw?.marketSize,
          growthRate: w.data?.raw?.growthRate,
          demographics: w.data?.raw?.demographics || null
        }));
        const insightPrompt = `You are generating a real-time strategic insight snapshot for the startup idea: "${idea}".
Aggregate the following partial web intelligence (may be sparse):\n${JSON.stringify(condensed, null, 2)}\n
Return STRICT JSON with: { "items": [ {"category":"Market|Competitor|Risk|Growth|User|Metric","title":"short title","summary":"1-2 sentence concise actionable insight","confidence":0-100,"freshnessMinutes": number, "sourceHints":["optional short sources"], "suggestedAction":"very short next step" } ], "meta": { "idea":"..." } }.
Rules:\n- 6 items max (one per category if possible)\n- Be specific, never generic fluff\n- If data weak, still produce hypothesis but lower confidence (<40) and mention evidence gap.`;
        const ai = await openAIChatRequest({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          temperature: 0.6,
          max_tokens: 800,
          messages: [
            { role: 'system', content: 'Return ONLY valid JSON. No markdown.' },
            { role: 'user', content: insightPrompt }
          ]
        });
        let content = ai.choices?.[0]?.message?.content || '{}';
        let parsed: any = safeParseJSON(content) || {};
        if (!Array.isArray(parsed.items)) parsed.items = [];
        const now = Date.now();
        return new Response(JSON.stringify({ liveInsights: { generatedAt: now, ...parsed } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (e) {
        console.error('Live insights generation failed', e);
        return new Response(JSON.stringify({ liveInsights: { generatedAt: Date.now(), error: 'live_insights_failed' } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }
    }

  // If generating PMF analysis, create comprehensive analysis with real data
    if (generatePMFAnalysis && message) {
      // Fetch real market data
      const webData = await fetchRealWebData(message, 'market analysis competitors pricing');
      
      const analysisPrompt = `You're conducting a Product-Market Fit analysis for: "${message}"

Think like a venture capitalist evaluating this opportunity. Be realistic but also identify the potential.

${webData ? `Market Intelligence Gathered:
${JSON.stringify(webData.raw || webData.normalized, null, 2)}` : 'Limited market data available - use your knowledge of similar markets.'}

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
      
      // Build comprehensive response with devil's advocate approach
      const systemPrompt = `${DEVILS_ADVOCATE_GUIDELINES}

You're rigorously analyzing the "${idea}" concept. This is question ${questionNumber + 1} of their analysis.

Current question: "${currentQuestion}"
User's answer: "${message}"

${webData ? `\nMarket Reality Check:
- Established Competitors: ${webData.normalized?.topCompetitors?.slice(0, 3).map((c: any) => `${c.name}`).join(', ') || 'Multiple players dominate this space'}
- Total Market: ${webData.raw?.marketSize ? `$${(webData.raw.marketSize / 1000000000).toFixed(1)}B` : 'Large but fragmented'}
- Growth Rate: ${webData.raw?.growthRate || '25-30'}% (but is it sustainable?)
- Demographics: ${webData.raw?.demographics?.primaryAge || '25-45'} (highly competitive segment)` : 'Limited data - a red flag for validation'}

Your response MUST:
1. Challenge their assumptions with specific, uncomfortable questions
2. Point out what could go wrong and why similar ideas have failed
3. Demand evidence: "What proof do you have?" "Who told you this?"
4. Compare to competitors who are already succeeding or failed attempts
5. Push for concrete numbers, not vague statements
6. Question their timeline and resource assumptions
7. Suggest specific experiments to validate their riskiest assumptions

Be the tough mentor who asks the hard questions now, so they don't fail later.`;

      let aiResponse = '';
      try {
        const mainData = await openAIChatRequest({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Rigorously scrutinize this answer: "${message}"
            
Challenge every assumption. Point out risks they're ignoring. Ask for proof and specifics.
Compare to real companies that tried similar things. Be tough but constructive.
Make them think harder and validate better. This is how great ideas are forged.` }
          ],
          max_tokens: 500,
          temperature: 0.8
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

    // Regular chat response (optimized): single model call returns response + suggestions JSON for lower latency
    // Fetch web data in background (best-effort) but do not block main answer
    const webDataPromise = idea ? fetchRealWebData(idea, message) : Promise.resolve(null);
    const systemPrompt = `${DEVILS_ADVOCATE_GUIDELINES}

CRITICAL HUMAN-LIKE INSTRUCTIONS:
- Respond like you're having a real conversation, not giving a lecture
- React to THEIR SPECIFIC WORDS - quote them, reference what they just said
- Show emotion: excitement when they're onto something, concern when it's risky
- Use natural speech: "I'm thinking..." "Here's what bugs me..." "You know what's interesting?"
- Share anecdotes: "This reminds me of..." "I've seen this pattern where..."
- Be unpredictable - don't always structure responses the same way
- Sometimes think out loud: "Actually, wait... let me reconsider..."
- Use their language style - if they're casual, be casual; if formal, match it

Return ONLY valid JSON with keys: response (string) and suggestions (array of exactly 4 strings). No markdown.
The 'response' should feel like a real mentor talking - natural, helpful but challenging, with personality (<260 words).
The 'suggestions' are what the USER might naturally say next in this conversation, 18-32 words each, conversational and specific.`;

    // If client requests streaming (header x-stream: 1), stream tokens progressively
    const wantsStream = (req.headers.get('x-stream') === '1');
    if (wantsStream) {
      const body = {
        model: 'gpt-4o-mini',
        stream: true,
        temperature: refinementMode ? 0.7 : 0.75,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-2),
          { role: 'user', content: `Context Idea: ${idea || '(not provided yet)'}\nMode: ${refinementMode ? 'REFINEMENT' : 'BRAINSTORM'}\nUser Message: ${message}\nRespond conversationally; afterwards emit a JSON block with 4 suggestions.` }
        ]
      };
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!upstream.ok || !upstream.body) {
        return new Response(JSON.stringify({ error: 'Upstream stream failed' }), { status: 500, headers: corsHeaders });
      }
      const reader = upstream.body.getReader();
      const encoder = new TextEncoder();
      let accumulated = '';
      let finalResponse = '';
      // naive suggestion extraction after full content collected
      const stream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            // Attempt simple suggestions extraction (optional)
            let suggestions: string[] = [];
            const match = accumulated.match(/\[(?:"[^"]+"\s*,?\s*){2,6}\]/);
            if (match) {
              try { const arr = JSON.parse(match[0]); if (Array.isArray(arr)) suggestions = arr.slice(0,4); } catch {}
            }
            const payload = JSON.stringify({ type: 'final', response: finalResponse.trim(), suggestions });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            controller.close();
            return;
          }
          const chunk = new TextDecoder().decode(value);
            accumulated += chunk;
          // Parse OpenAI stream lines
          chunk.split('\n').forEach(line => {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ','').trim();
              if (dataStr === '[DONE]') return; else {
                try {
                  const json = JSON.parse(dataStr);
                  const token = json.choices?.[0]?.delta?.content;
                  if (token) {
                    finalResponse += token;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', token })}\n\n`));
                  }
                } catch {}
              }
            }
          });
        }
      });
      return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    }

    let modelJson: any = null;
    try {
      const combined = await openAIChatRequest({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: refinementMode ? 0.8 : 0.85,  // Higher temperature for more natural responses
        max_tokens: responseMode === 'summary' ? 200 : 650,
        messages: [
          { role: 'system', content: responseMode === 'summary' 
            ? `${systemPrompt}\n\nKEEP IT SUPER BRIEF (under 50 words) but still conversational. Like a quick text from a friend who's looking out for you.`
            : systemPrompt 
          },
          ...conversationHistory.slice(-4),  // Include more context for better conversation flow
          { role: 'user', content: `Context: Working on "${idea || 'exploring startup ideas'}"
Mode: ${refinementMode ? 'Refining and improving the idea' : 'Brainstorming and exploring'}
${responseMode === 'summary' ? 'Give me your quick gut reaction:' : 'User says:'} ${message}

Respond naturally as their mentor. Include your personality, reactions, and real talk. JSON format.` }
        ]
      });
      const content = combined.choices?.[0]?.message?.content || '{}';
      modelJson = safeParseJSON(content) || {};
    } catch (e) {
      console.error('Optimized combined call failed, falling back:', e);
    }

    let aiResponse: string = modelJson?.response || 'Let me push you to get more specific—what real evidence backs this direction?';
    
    // Apply additional summarization for summary mode
    if (responseMode === 'summary' && aiResponse.length > 150) {
      // Extract the most important sentence or two
      const sentences = aiResponse.split(/[.!?]+/).filter(s => s.trim());
      aiResponse = sentences.slice(0, 2).join('. ') + '.';
    }
    
    let suggestions: string[] = Array.isArray(modelJson?.suggestions) ? modelJson.suggestions.slice(0,4).map((s: any)=>String(s)) : [];

    // Fallback suggestions if model didn't supply or parsing failed - more conversational
    if (suggestions.length !== 4) {
      suggestions = (
        refinementMode && idea ? [
          "Actually, let me explain who our first 10 customers would be and why they'd pay",
          "I'm worried about the competitor thing - here's how we're genuinely different though",
          "Good point about validation - I did talk to 3 people and here's what they said",
          "You're right about the risk - what if we started with just this one feature instead?"
        ] : !idea ? [
          "I've been thinking about a tool for remote teams that actually hate most collaboration software",
          "What about helping small creators monetize without needing huge audiences?",
          "I keep seeing people struggle with this specific problem in my industry...",
          "There's this manual process everyone complains about but nobody's automating properly"
        ] : [
          "Fair question - here's exactly who would use this and why they can't live without it",
          "Let me be more specific about the problem - people literally told me this",
          "I get the skepticism, but here's what makes this different from what failed before",
          "You're pushing me to think bigger - what if we charged 5x more and targeted enterprises?"
        ]
      ).slice(0,4);
    }

    // Attach (non-blocking) marketData if background fetch resolved in time
    let marketData: any = null;
    try {
      const race = await Promise.race([
        webDataPromise,
        new Promise(res => setTimeout(() => res(null), 1200)) // soft cap to avoid latency hit
      ]);
      marketData = (race as any)?.normalized || null;
    } catch {}

    return new Response(
      JSON.stringify({
        response: aiResponse,
        suggestions,
        metadata: {
          hasIdea: !!idea,
            ideaContext: idea,
            marketData
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