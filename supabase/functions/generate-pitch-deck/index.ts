import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
}

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface PitchDeckRequest {
  idea_id: string
  user_id: string
  template_type?: string
  custom_sections?: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { idea_id, user_id, template_type = 'standard', custom_sections }: PitchDeckRequest = await req.json()
    
    if (!idea_id || !user_id) {
      throw new Error('Missing required fields: idea_id and user_id')
    }

    console.log('[generate_pitch_deck] Processing:', { idea_id, template_type })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get idea details
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', idea_id)
      .eq('user_id', user_id)
      .single()

    if (ideaError || !idea) {
      throw new Error('Idea not found or access denied')
    }

    // Get latest PMF score and context
    const { data: latestScore } = await supabase
      .from('idea_scores')
      .select('*')
      .eq('idea_id', idea_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: liveContext } = await supabase
      .from('idea_live_context')
      .select('*')
      .eq('idea_id', idea_id)

    const { data: actions } = await supabase
      .from('actions')
      .select('*')
      .eq('idea_id', idea_id)
      .eq('status', 'pending')
      .order('priority', { ascending: true })

    // Build context for AI
    const deckContext = {
      idea: {
        title: idea.title,
        description: idea.description,
        category: idea.category,
        target_market: idea.target_market
      },
      pmf_data: latestScore || null,
      market_context: liveContext?.find(ctx => ctx.context_type === 'market')?.data || {},
      competitor_context: liveContext?.find(ctx => ctx.context_type === 'competitor')?.data || {},
      actions: actions || [],
      template_type,
      custom_sections: custom_sections || []
    }

    console.log('[generate_pitch_deck] Context built, generating slides')

    // Generate pitch deck with AI
    const pitchDeck = await generatePitchDeckWithAI(deckContext)

    // Store the pitch deck
    const { data: deckRecord, error: deckError } = await supabase
      .from('pitch_decks')
      .insert({
        idea_id,
        user_id,
        title: pitchDeck.title,
        slides: pitchDeck.slides,
        template_type,
        metadata: {
          generated_at: new Date().toISOString(),
          ai_model_used: pitchDeck.ai_model_used,
          slide_count: pitchDeck.slides.length
        }
      })
      .select()
      .single()

    if (deckError) {
      console.error('Error storing pitch deck:', deckError)
      throw new Error('Failed to store pitch deck')
    }

    console.log('[generate_pitch_deck] Pitch deck generated successfully')

    return new Response(JSON.stringify({
      success: true,
      pitch_deck: deckRecord,
      slides: pitchDeck.slides,
      export_options: ['pdf', 'pptx', 'html']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[generate_pitch_deck] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function generatePitchDeckWithAI(context: any) {
  const prompt = `
  Generate a comprehensive startup pitch deck for the following idea:

  IDEA: ${context.idea.title}
  DESCRIPTION: ${context.idea.description}
  CATEGORY: ${context.idea.category}
  TARGET MARKET: ${JSON.stringify(context.idea.target_market)}

  PMF SCORE DATA: ${JSON.stringify(context.pmf_data)}
  MARKET ANALYSIS: ${JSON.stringify(context.market_context)}
  COMPETITIVE LANDSCAPE: ${JSON.stringify(context.competitor_context)}
  NEXT STEPS: ${JSON.stringify(context.actions)}

  TEMPLATE TYPE: ${context.template_type}

  Generate a pitch deck with the following structure in JSON format:
  {
    "title": "Pitch Deck Title",
    "ai_model_used": "groq|openai",
    "slides": [
      {
        "slide_number": 1,
        "title": "Problem",
        "type": "title_content",
        "content": {
          "headline": "Main headline",
          "subtitle": "Supporting subtitle",
          "bullet_points": ["Point 1", "Point 2", "Point 3"],
          "visual_suggestion": "Description of recommended visual/chart",
          "speaker_notes": "What to say when presenting this slide"
        }
      }
    ]
  }

  REQUIRED SLIDES (in order):
  1. Cover/Title slide
  2. Problem statement
  3. Solution overview
  4. Market opportunity
  5. Business model
  6. Competitive advantage
  7. Traction/Validation
  8. Financial projections
  9. Team (if data available)
  10. Funding ask
  11. Next steps
  12. Thank you/Contact

  SLIDE TYPES:
  - "title_only": Just a title
  - "title_content": Title with bullet points and text
  - "title_visual": Title with visual suggestion
  - "comparison": Side-by-side comparison
  - "metrics": Numbers and charts
  - "timeline": Sequential steps

  Make the content compelling, data-driven where possible, and tailored to the specific idea.
  Use the PMF score and market data to inform projections and positioning.
  Keep bullet points concise (max 6 words each).
  Include specific speaker notes for each slide.
  `

  try {
    // Try Groq first
    if (GROQ_API_KEY) {
      try {
        const result = await callGroqAPI(prompt)
        if (result) {
          result.ai_model_used = 'groq'
          return result
        }
      } catch (groqError) {
        console.log('Groq failed, trying OpenAI:', groqError.message)
      }
    }

    // Fallback to OpenAI
    if (OPENAI_API_KEY) {
      const result = await callOpenAIAPI(prompt)
      result.ai_model_used = 'openai'
      return result
    }

    throw new Error('No AI APIs configured')
  } catch (error) {
    console.error('AI pitch deck generation failed:', error)
    // Return fallback deck
    return generateFallbackDeck(context)
  }
}

function generateFallbackDeck(context: any) {
  return {
    title: context.idea.title + " - Pitch Deck",
    ai_model_used: 'fallback',
    slides: [
      {
        slide_number: 1,
        title: context.idea.title,
        type: "title_only",
        content: {
          headline: context.idea.title,
          subtitle: "Transforming " + (context.idea.category || "the market"),
          speaker_notes: "Welcome to our pitch. Today we'll show you how " + context.idea.title + " will transform the market."
        }
      },
      {
        slide_number: 2,
        title: "The Problem",
        type: "title_content",
        content: {
          headline: "Current Market Challenge",
          bullet_points: [
            "Traditional solutions insufficient",
            "Market gaps exist",
            "Customer pain points"
          ],
          visual_suggestion: "Problem illustration or pain point diagram",
          speaker_notes: "The market currently faces significant challenges that our solution directly addresses."
        }
      },
      {
        slide_number: 3,
        title: "Our Solution",
        type: "title_content",
        content: {
          headline: context.idea.title,
          subtitle: context.idea.description.substring(0, 100) + "...",
          bullet_points: [
            "Innovative approach",
            "Scalable solution",
            "Market-proven concept"
          ],
          visual_suggestion: "Solution demo or product mockup",
          speaker_notes: "Our solution directly addresses these pain points with an innovative approach."
        }
      }
    ]
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
          content: 'You are an expert pitch deck consultant. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
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

async function callOpenAIAPI(prompt: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert pitch deck consultant. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content returned from OpenAI')
  }

  return JSON.parse(content)
}