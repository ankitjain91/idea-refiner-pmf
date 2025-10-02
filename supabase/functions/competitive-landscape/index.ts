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

    // Simulate competitive landscape analysis
    const competitiveAnalysis = {
      topCompetitors: [
        { name: `${idea} Leader Corp`, marketShare: 25, valuation: '$1.2B', fundingStage: 'Series C' },
        { name: `${idea} Pro Solutions`, marketShare: 18, valuation: '$800M', fundingStage: 'Series B' },
        { name: `Next-Gen ${idea}`, marketShare: 15, valuation: '$500M', fundingStage: 'Series A' }
      ],
      marketConcentration: ['fragmented', 'consolidated'][Math.floor(Math.random() * 2)],
      barrierToEntry: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    }

    return new Response(
      JSON.stringify({ success: true, data: competitiveAnalysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Competitive landscape error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze competitive landscape' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})