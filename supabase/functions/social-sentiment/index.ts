import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { idea } = await req.json()

    if (!idea) {
      return new Response(
        JSON.stringify({ error: 'Missing idea parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Simulate social sentiment analysis
    const socialSentiment = {
      score: Math.floor(Math.random() * 40) + 60, // 60-100% positive
      mentions: Math.floor(Math.random() * 1000) + 500, // 500-1500 mentions
    }

    const searchVolume = {
      volume: Math.floor(Math.random() * 50000) + 10000, // 10k-60k searches
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)]
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { socialSentiment, searchVolume }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Social sentiment error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze social sentiment' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})