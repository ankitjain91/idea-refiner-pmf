import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    if (!SERPER_API_KEY) {
      throw new Error('SERPER_API_KEY is not configured');
    }

    const { query, num = 10, geo = 'us' } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

    console.log('Serper search for:', query);

    // Call Serper.dev API
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: geo,
        num: num,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Serper API error:', error);
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Serper results to our standard format
    const results = {
      organic: data.organic || [],
      news: data.news || [],
      knowledgeGraph: data.knowledgeGraph || null,
      relatedSearches: data.relatedSearches || [],
      peopleAlsoAsk: data.peopleAlsoAsk || [],
      searchParameters: {
        query,
        geo,
        num,
        engine: 'serper'
      },
      credits: 1, // Each Serper search costs 1 credit
    };

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in serper-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});