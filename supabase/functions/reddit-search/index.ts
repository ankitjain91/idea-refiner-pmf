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
    const { query, subreddits, sort } = await req.json();
    
    console.log('Reddit search for:', query);
    
    const mockResults = {
      status: 'unavailable',
      reason: 'Reddit API not configured. Add REDDIT_TOKEN.',
      raw: null,
      normalized: {
        painDensity: 0,
        topPainPhrases: [],
        painMentions: 0
      },
      citations: [],
      fetchedAtISO: new Date().toISOString()
    };

    return new Response(JSON.stringify(mockResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Reddit error:', error);
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