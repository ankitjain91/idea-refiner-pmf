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

    // Simulate market intelligence analysis
    const marketIntelligence = {
      keyTrends: [
        `AI integration in ${idea} market`,
        `Increased demand for automation`,
        `Remote-first solution adoption`,
        `Sustainability focus driving change`
      ],
      disruptors: [
        `Machine learning advancements`,
        `New regulatory frameworks`,
        `Changing consumer behavior`
      ],
      marketMaturity: Math.random() > 0.5 ? 'growth' : 'mature',
      technologyAdoption: Math.floor(Math.random() * 40) + 60, // 60-100%
      regulatoryRisk: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    }

    return new Response(
      JSON.stringify({ success: true, data: marketIntelligence }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Market intelligence error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze market intelligence' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})