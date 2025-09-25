import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { q, timeframe, max } = await req.json();
    
    console.log('YouTube search for:', q);
    
    const mockResults = {
      status: 'unavailable',
      reason: 'YouTube API not configured. Add YT_API_KEY.',
      raw: null,
      normalized: {
        volume: 0
      },
      citations: [],
      fetchedAtISO: new Date().toISOString()
    };

    return new Response(JSON.stringify(mockResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('YouTube error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'unavailable',
        reason: error instanceof Error ? error.message : 'Unknown error',
        raw: null,
        normalized: null,
        citations: [],
        fetchedAtISO: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});