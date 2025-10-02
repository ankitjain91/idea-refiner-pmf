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

    // Simulate news analysis
    const newsActivity = {
      articles: Math.floor(Math.random() * 100) + 20, // 20-120 articles
      sentiment: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)]
    }

    return new Response(
      JSON.stringify({ success: true, data: newsActivity }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('News analysis error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze news activity' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})