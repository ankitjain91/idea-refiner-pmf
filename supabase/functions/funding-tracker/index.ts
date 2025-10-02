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
    const { idea, sector } = await req.json()
    
    // Support both 'idea' and 'sector' parameters for backward compatibility
    const searchQuery = idea || sector

    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: 'Missing idea or sector parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Simulate funding activity tracking
    const fundingActivity = {
      deals: Math.floor(Math.random() * 20) + 5, // 5-25 deals
      totalAmount: `$${(Math.random() * 500 + 50).toFixed(1)}M`, // $50-550M
      lastDeal: `${Math.floor(Math.random() * 30) + 1} days ago`
    }

    return new Response(
      JSON.stringify({ success: true, data: fundingActivity }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Funding tracker error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to track funding activity' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})