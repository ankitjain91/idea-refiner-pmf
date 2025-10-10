import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
}

const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY')
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ContextRequest {
  idea_id: string
  idea_text: string
  category?: string
  force_refresh?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { idea_id, idea_text, category, force_refresh = false }: ContextRequest = await req.json()
    
    if (!idea_id || !idea_text) {
      throw new Error('Missing required fields: idea_id and idea_text')
    }

    console.log('[refresh_live_context] Processing:', { idea_id, idea_text: idea_text.substring(0, 50) })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check existing context if not forcing refresh
    if (!force_refresh) {
      const { data: existingContext } = await supabase
        .from('idea_live_context')
        .select('*')
        .eq('idea_id', idea_id)
        .gt('expires_at', new Date().toISOString())

      if (existingContext && existingContext.length > 0) {
        console.log('[refresh_live_context] Using cached context')
        return new Response(JSON.stringify({
          success: true,
          context: existingContext,
          from_cache: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Fetch market data using Serper
    const marketData = await fetchMarketContext(idea_text)
    
    // Fetch competitor data
    const competitorData = await fetchCompetitorContext(idea_text)
    
    // Fetch sentiment data
    const sentimentData = await fetchSentimentContext(idea_text)
    
    // Fetch trends data
    const trendsData = await fetchTrendsContext(idea_text)

    // Use Groq to analyze and structure the data
    const analysisPrompt = `
    Analyze the following market data for the idea: "${idea_text}"

    Market Data: ${JSON.stringify(marketData)}
    Competitor Data: ${JSON.stringify(competitorData)}
    Sentiment Data: ${JSON.stringify(sentimentData)}
    Trends Data: ${JSON.stringify(trendsData)}

    Provide a structured analysis in JSON format with:
    {
      "market_analysis": {
        "size_estimate": "string",
        "growth_rate": "string",
        "key_trends": ["string"],
        "opportunities": ["string"]
      },
      "competitive_landscape": {
        "main_competitors": ["string"],
        "competitive_advantage": "string",
        "market_positioning": "string"
      },
      "sentiment_analysis": {
        "overall_sentiment": "positive|neutral|negative",
        "confidence": 0.8,
        "key_insights": ["string"]
      },
      "trending_topics": ["string"],
      "risk_factors": ["string"],
      "recommendations": ["string"]
    }
    `

    const groqAnalysis = await callGroq(analysisPrompt)

    // Store the context data
    const contextEntries = [
      {
        idea_id,
        context_type: 'market',
        data: {
          analysis: groqAnalysis.market_analysis,
          raw_data: marketData,
          last_analyzed: new Date().toISOString()
        },
        confidence_score: 0.85,
        sources: marketData.sources || []
      },
      {
        idea_id,
        context_type: 'competitor',
        data: {
          analysis: groqAnalysis.competitive_landscape,
          raw_data: competitorData,
          last_analyzed: new Date().toISOString()
        },
        confidence_score: 0.80,
        sources: competitorData.sources || []
      },
      {
        idea_id,
        context_type: 'sentiment',
        data: {
          analysis: groqAnalysis.sentiment_analysis,
          raw_data: sentimentData,
          last_analyzed: new Date().toISOString()
        },
        confidence_score: groqAnalysis.sentiment_analysis?.confidence || 0.75,
        sources: sentimentData.sources || []
      },
      {
        idea_id,
        context_type: 'trends',
        data: {
          trending_topics: groqAnalysis.trending_topics,
          risk_factors: groqAnalysis.risk_factors,
          recommendations: groqAnalysis.recommendations,
          raw_data: trendsData,
          last_analyzed: new Date().toISOString()
        },
        confidence_score: 0.75,
        sources: trendsData.sources || []
      }
    ]

    // Upsert context data
    for (const entry of contextEntries) {
      await supabase
        .from('idea_live_context')
        .upsert(entry, { onConflict: 'idea_id,context_type' })
    }

    console.log('[refresh_live_context] Context updated successfully')

    return new Response(JSON.stringify({
      success: true,
      context: contextEntries,
      analysis: groqAnalysis,
      from_cache: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[refresh_live_context] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function fetchMarketContext(ideaText: string) {
  try {
    if (!SERPER_API_KEY) {
      return { 
        market_size: 'Data unavailable',
        sources: [],
        error: 'SERPER_API_KEY not configured'
      }
    }

    const searchQuery = `"${ideaText}" market size industry analysis`
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10
      })
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      market_size: data.organic?.[0]?.snippet || 'No market data found',
      search_results: data.organic?.slice(0, 5).map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link
      })) || [],
      sources: data.organic?.slice(0, 3).map((r: any) => r.link) || []
    }
  } catch (error) {
    console.error('Market context fetch error:', error)
    return {
      market_size: 'Error fetching market data',
      sources: [],
      error: error.message
    }
  }
}

async function fetchCompetitorContext(ideaText: string) {
  try {
    if (!SERPER_API_KEY) {
      return { 
        competitors: [],
        sources: [],
        error: 'SERPER_API_KEY not configured'
      }
    }

    const searchQuery = `"${ideaText}" competitors alternatives similar companies`
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10
      })
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      competitors: data.organic?.slice(0, 5).map((r: any) => r.title) || [],
      search_results: data.organic?.slice(0, 5).map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link
      })) || [],
      sources: data.organic?.slice(0, 3).map((r: any) => r.link) || []
    }
  } catch (error) {
    console.error('Competitor context fetch error:', error)
    return {
      competitors: [],
      sources: [],
      error: error.message
    }
  }
}

async function fetchSentimentContext(ideaText: string) {
  try {
    if (!SERPER_API_KEY) {
      return { 
        sentiment: 'neutral',
        sources: [],
        error: 'SERPER_API_KEY not configured'
      }
    }

    const searchQuery = `"${ideaText}" reviews opinions feedback reddit twitter`
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10
      })
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Simple sentiment analysis based on keywords
    const text = data.organic?.map((r: any) => r.snippet).join(' ') || ''
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best']
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'problem']
    
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (text.toLowerCase().match(new RegExp(word, 'g'))?.length || 0), 0)
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (text.toLowerCase().match(new RegExp(word, 'g'))?.length || 0), 0)
    
    let sentiment = 'neutral'
    if (positiveCount > negativeCount) sentiment = 'positive'
    else if (negativeCount > positiveCount) sentiment = 'negative'
    
    return {
      sentiment,
      positive_mentions: positiveCount,
      negative_mentions: negativeCount,
      search_results: data.organic?.slice(0, 5).map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link
      })) || [],
      sources: data.organic?.slice(0, 3).map((r: any) => r.link) || []
    }
  } catch (error) {
    console.error('Sentiment context fetch error:', error)
    return {
      sentiment: 'neutral',
      sources: [],
      error: error.message
    }
  }
}

async function fetchTrendsContext(ideaText: string) {
  try {
    if (!SERPER_API_KEY) {
      return { 
        trends: [],
        sources: [],
        error: 'SERPER_API_KEY not configured'
      }
    }

    const searchQuery = `"${ideaText}" trends 2024 future predictions growth`
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10
      })
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      trends: data.organic?.slice(0, 5).map((r: any) => r.title) || [],
      search_results: data.organic?.slice(0, 5).map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link
      })) || [],
      sources: data.organic?.slice(0, 3).map((r: any) => r.link) || []
    }
  } catch (error) {
    console.error('Trends context fetch error:', error)
    return {
      trends: [],
      sources: [],
      error: error.message
    }
  }
}

async function callGroq(prompt: string) {
  try {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured')
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst AI. Always respond with valid JSON only, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
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

    try {
      return JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse Groq response as JSON:', content)
      return {
        market_analysis: { size_estimate: "Unknown", growth_rate: "Unknown", key_trends: [], opportunities: [] },
        competitive_landscape: { main_competitors: [], competitive_advantage: "Unknown", market_positioning: "Unknown" },
        sentiment_analysis: { overall_sentiment: "neutral", confidence: 0.5, key_insights: [] },
        trending_topics: [],
        risk_factors: [],
        recommendations: []
      }
    }
  } catch (error) {
    console.error('Groq API error:', error)
    return {
      market_analysis: { size_estimate: "Error", growth_rate: "Error", key_trends: [], opportunities: [] },
      competitive_landscape: { main_competitors: [], competitive_advantage: "Error", market_positioning: "Error" },
      sentiment_analysis: { overall_sentiment: "neutral", confidence: 0.1, key_insights: [] },
      trending_topics: [],
      risk_factors: ["API Error: " + error.message],
      recommendations: []
    }
  }
}