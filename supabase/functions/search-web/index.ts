import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, recencyDays } = await req.json();
    
    // For now, return mock data until actual API is configured
    console.log('Web search request for:', query);
    
    const mockResults = {
      status: 'unavailable',
      reason: 'Search API not configured. Add SERPAPI_KEY or similar search API credentials.',
      raw: null,
      normalized: {
        competitorStrength: 0,
        relatedQueries: [],
        regions: [],
        interestScore: 0,
        differentiationSignals: 0
      },
      citations: [],
      fetchedAtISO: new Date().toISOString()
    };

    return new Response(JSON.stringify(mockResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Search error:', error);
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