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
const DEVILS_ADVOCATE_GUIDELINES = `You are a sharp, insightful startup advisor who acts as a devil's advocate to help entrepreneurs build stronger ideas through rigorous questioning and constructive challenges.

YOUR ROLE AS DEVIL'S ADVOCATE:
- Challenge assumptions with specific, data-driven questions
- Point out potential flaws and blind spots they haven't considered
- Ask "What evidence do you have that..." and "How do you know that..."
- Probe deeper: "But what if your biggest assumption is wrong?"
- Test resilience: "How would you survive if [major risk] happens?"
- Question market size: "Are there really enough people who'd pay for this?"
- Challenge differentiation: "Why wouldn't [big company] just copy this?"

COMMUNICATION APPROACH:
- Be direct but supportive - you're tough because you care
- Use real examples of similar startups that failed and why
- Reference actual market data and trends to back your challenges
- Ask uncomfortable questions that VCs will definitely ask later
- Push them to think 10x bigger AND more focused simultaneously
- Frame critiques as opportunities: "The risk here is X, but if you solve it..."

SCRUTINY STRUCTURE:
1. Acknowledge the kernel of potential (brief)
2. Challenge 3-4 core assumptions with specific questions
3. Point out 2-3 major risks or gaps they're overlooking
4. Question their evidence and validation methods
5. Push for specificity: numbers, timelines, concrete details
6. Suggest 2-3 experiments to test their riskiest assumptions
7. End with momentum: specific action items to strengthen the idea

EXAMPLES OF DEVIL'S ADVOCATE QUESTIONS:
- "You say businesses need this, but have you actually gotten anyone to commit to paying?"
- "This sounds expensive to build - how will you fund it before revenue?"
- "What happens when Amazon/Google/Microsoft enters this space?"
- "Your target market is huge - that usually means it's too vague. Who EXACTLY needs this most?"
- "Have you talked to 50+ potential customers? What did they actually say?"
- "What's your unfair advantage that others can't replicate?"
- "If this is such a problem, why hasn't anyone solved it well yet?"

Remember: Your tough questions help them build conviction and clarity. Be the skeptical investor they'll face later, but with genuine interest in helping them succeed.`;

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
      liveInsights = false
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

Return ONLY valid JSON with keys: response (string) and suggestions (array of exactly 4 strings). No markdown.
The 'response' should rigorously challenge assumptions, be concise (<260 words), and end with 1 motivating actionable sentence.
The 'suggestions' are natural first-person next replies the USER might choose, 18-32 words each, specific, no numbering.`;

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
        temperature: refinementMode ? 0.7 : 0.75,
        max_tokens: 650,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-2),
          { role: 'user', content: `Context Idea: ${idea || '(not provided yet)'}\nMode: ${refinementMode ? 'REFINEMENT' : 'BRAINSTORM'}\nUser Message: ${message}\nProvide JSON now.` }
        ]
      });
      const content = combined.choices?.[0]?.message?.content || '{}';
      modelJson = safeParseJSON(content) || {};
    } catch (e) {
      console.error('Optimized combined call failed, falling back:', e);
    }

    let aiResponse: string = modelJson?.response || 'Let me push you to get more specific—what real evidence backs this direction?';
    let suggestions: string[] = Array.isArray(modelJson?.suggestions) ? modelJson.suggestions.slice(0,4).map((s: any)=>String(s)) : [];

    // Fallback suggestions if model didn't supply or parsing failed
    if (suggestions.length !== 4) {
      suggestions = (
        refinementMode && idea ? [
          "We've narrowed scope but I can clarify who we serve first to stay focused",
          "Let me outline evidence I have (or lack) for the core pain assumption",
          "I want help stress-testing differentiation versus existing serious incumbents",
          "Can we design a smallest experiment to falsify the riskiest assumption quickly?"
        ] : !idea ? [
          "I'm exploring a niche productivity tool for remote engineers focusing on deep work blocks",
          "Maybe a lightweight AI assistant for indie founders tracking early user feedback",
          "Considering a marketplace for pre-vetted fractional RevOps experts for SaaS startups",
          "Thinking about a tool that converts messy founder notes into structured experiments"
        ] : [
          "Here's more detail on the specific user segment I'm targeting initially",
          "Let me gather concrete metrics or anecdotes instead of vague validation",
          "I should probably run 5 quick interviews—help me frame the key questions",
          "Let me explain the core value prop in one sharp sentence"
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