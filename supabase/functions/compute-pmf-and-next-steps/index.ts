import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
}

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface PMFRequest {
  idea_id: string
  idea_text: string
  user_context?: any
  force_recalculate?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { idea_id, idea_text, user_context, force_recalculate = false }: PMFRequest = await req.json()
    
    if (!idea_id || !idea_text) {
      throw new Error('Missing required fields: idea_id and idea_text')
    }

    console.log('[compute_pmf_and_next_steps] Processing:', { idea_id, idea_text: idea_text.substring(0, 50) })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get existing scores if not forcing recalculation
    if (!force_recalculate) {
      const { data: existingScore } = await supabase
        .from('idea_scores')
        .select('*')
        .eq('idea_id', idea_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // If score is less than 1 hour old, return cached version
      if (existingScore && new Date(existingScore.created_at).getTime() > Date.now() - 3600000) {
        console.log('[compute_pmf_and_next_steps] Using cached score')
        
        // Still get fresh actions
        const { data: actions } = await supabase
          .from('actions')
          .select('*')
          .eq('idea_id', idea_id)
          .eq('status', 'pending')
          .order('priority', { ascending: true })
          .limit(3)

        return new Response(JSON.stringify({
          success: true,
          pmf_score: existingScore.pmf_score,
          score_breakdown: existingScore.score_breakdown,
          actions: actions || [],
          from_cache: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Get live context data
    const { data: liveContext } = await supabase
      .from('idea_live_context')
      .select('*')
      .eq('idea_id', idea_id)
      .gt('expires_at', new Date().toISOString())

    // Get existing feedback for context
    const { data: feedback } = await supabase
      .from('idea_feedback')
      .select('*')
      .eq('idea_id', idea_id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Build comprehensive context for AI analysis
    const analysisContext = {
      idea: idea_text,
      live_context: liveContext?.reduce((acc, ctx) => {
        acc[ctx.context_type] = ctx.data
        return acc
      }, {} as any) || {},
      feedback: feedback || [],
      user_context: user_context || {}
    }

    console.log('[compute_pmf_and_next_steps] Context built, calling AI')

    // Use AI to compute PMF score and generate actions
    const aiResult = await computePMFWithAI(analysisContext)

    // Store the PMF score
    const { data: scoreRecord, error: scoreError } = await supabase
      .from('idea_scores')
      .insert({
        idea_id,
        pmf_score: aiResult.pmf_score,
        score_breakdown: aiResult.score_breakdown,
        market_size_score: aiResult.score_breakdown.market_size || 0,
        competition_score: aiResult.score_breakdown.competition || 0,
        execution_score: aiResult.score_breakdown.execution || 0,
        timing_score: aiResult.score_breakdown.timing || 0,
        team_score: aiResult.score_breakdown.team || 0,
        ai_confidence: aiResult.confidence,
        data_sources: aiResult.data_sources || []
      })
      .select()
      .single()

    if (scoreError) {
      console.error('Error storing PMF score:', scoreError)
    }

    // Clear old pending actions and insert new ones
    await supabase
      .from('actions')
      .delete()
      .eq('idea_id', idea_id)
      .eq('status', 'pending')

    const actionInserts = aiResult.next_steps.map((action: any, index: number) => ({
      idea_id,
      title: action.title,
      description: action.description,
      priority: action.priority || (index + 1),
      category: action.category || 'general',
      estimated_effort: action.estimated_effort || 'medium',
      ai_confidence: action.confidence || 0.8,
      due_date: action.due_date ? new Date(action.due_date).toISOString() : null,
      metadata: {
        reasoning: action.reasoning,
        success_metrics: action.success_metrics
      }
    }))

    const { data: newActions, error: actionsError } = await supabase
      .from('actions')
      .insert(actionInserts)
      .select()

    if (actionsError) {
      console.error('Error storing actions:', actionsError)
    }

    console.log('[compute_pmf_and_next_steps] PMF computed successfully:', aiResult.pmf_score)

    return new Response(JSON.stringify({
      success: true,
      pmf_score: aiResult.pmf_score,
      score_breakdown: aiResult.score_breakdown,
      confidence: aiResult.confidence,
      actions: newActions || [],
      reasoning: aiResult.reasoning,
      from_cache: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[compute_pmf_and_next_steps] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function computePMFWithAI(context: any) {
  const prompt = `
  Analyze the following startup idea and provide a comprehensive Product-Market Fit (PMF) score and actionable next steps.

  IDEA: ${context.idea}

  MARKET CONTEXT: ${JSON.stringify(context.live_context.market || {})}
  COMPETITIVE LANDSCAPE: ${JSON.stringify(context.live_context.competitor || {})}
  SENTIMENT DATA: ${JSON.stringify(context.live_context.sentiment || {})}
  TRENDS: ${JSON.stringify(context.live_context.trends || {})}
  USER FEEDBACK: ${JSON.stringify(context.feedback)}
  
  Provide your analysis in this exact JSON format:
  {
    "pmf_score": 75,
    "confidence": 0.85,
    "score_breakdown": {
      "market_size": 85,
      "competition": 65,
      "execution": 80,
      "timing": 90,
      "team": 70,
      "product_uniqueness": 75,
      "customer_validation": 60
    },
    "reasoning": "Detailed explanation of the PMF score",
    "strengths": ["List of key strengths"],
    "weaknesses": ["List of key weaknesses"],
    "next_steps": [
      {
        "title": "Conduct Customer Interviews",
        "description": "Interview 20 potential customers to validate core assumptions",
        "priority": 1,
        "category": "market_research",
        "estimated_effort": "medium",
        "confidence": 0.9,
        "due_date": "2024-11-15",
        "reasoning": "Why this action is critical now",
        "success_metrics": ["Metric 1", "Metric 2"]
      }
    ],
    "data_sources": ["source1", "source2"]
  }

  SCORING CRITERIA:
  - Market Size (0-100): Size and accessibility of target market
  - Competition (0-100): Competitive advantage and differentiation  
  - Execution (0-100): Team's ability to execute based on available data
  - Timing (0-100): Market timing and readiness
  - Team (0-100): Team composition and experience (if known)
  - Product Uniqueness (0-100): How differentiated the solution is
  - Customer Validation (0-100): Evidence of customer demand

  PMF Score = weighted average with market_size and customer_validation having highest weight.
  
  Focus on the top 3 most critical next steps. Be specific and actionable.
  `

  try {
    // Use Groq API for AI computation
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured')
    }
    
    const result = await callGroqAPI(prompt)
    if (result) return result
    
    throw new Error('Failed to get response from Groq API')
  } catch (error) {
    console.error('AI computation failed:', error)
    // Return fallback score
    return {
      pmf_score: 50,
      confidence: 0.3,
      score_breakdown: {
        market_size: 50,
        competition: 50,
        execution: 50,
        timing: 50,
        team: 50,
        product_uniqueness: 50,
        customer_validation: 50
      },
      reasoning: "AI analysis unavailable. Manual assessment needed.",
      strengths: ["Fallback analysis - requires manual review"],
      weaknesses: ["AI services unavailable"],
      next_steps: [
        {
          title: "Manual PMF Assessment",
          description: "Conduct manual Product-Market Fit analysis",
          priority: 1,
          category: "analysis",
          estimated_effort: "high",
          confidence: 0.5,
          reasoning: "AI analysis failed, manual review required"
        }
      ],
      data_sources: []
    }
  }
}

async function callGroqAPI(prompt: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a senior startup advisor and business analyst. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    })
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content returned from Groq')
  }

  return JSON.parse(content)
}