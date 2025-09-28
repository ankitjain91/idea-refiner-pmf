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
    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
    if (!TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    const { query, max_results = 10, search_depth = 'basic', include_domains = [], exclude_domains = [] } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

    console.log('Tavily search for:', query);

    // Call Tavily API
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results,
        search_depth, // 'basic' or 'advanced'
        include_answer: true,
        include_raw_content: false,
        include_images: false,
        include_domains,
        exclude_domains,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Tavily API error:', error);
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Tavily results to our standard format
    const results = {
      organic: data.results?.map((r: any) => ({
        title: r.title,
        snippet: r.content,
        link: r.url,
        score: r.score,
      })) || [],
      answer: data.answer || null,
      query: data.query,
      searchParameters: {
        query,
        max_results,
        search_depth,
        engine: 'tavily'
      },
      credits: search_depth === 'advanced' ? 2 : 1,
    };

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tavily-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});