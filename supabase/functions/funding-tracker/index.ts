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

    // Return error - needs real funding data API (Crunchbase, PitchBook, etc.)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Funding tracking requires API integration (Crunchbase, PitchBook)',
        data: {
          deals: 0,
          totalAmount: '$0',
          lastDeal: null
        }
      }),
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