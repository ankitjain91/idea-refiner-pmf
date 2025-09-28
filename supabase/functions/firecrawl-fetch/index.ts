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
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is not configured');
    }

    const { urls, formats = ['markdown'], maxChars = 800 } = await req.json();
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('URLs array is required');
    }

    // Limit to 5 URLs max
    const urlsToFetch = urls.slice(0, 5);
    console.log('Firecrawl fetching:', urlsToFetch.length, 'URLs');

    const fetchedContent = [];
    
    for (const url of urlsToFetch) {
      try {
        // Call Firecrawl API for each URL
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats,
            onlyMainContent: true,
          }),
        });

        if (!response.ok) {
          console.error(`Firecrawl error for ${url}:`, response.status);
          continue;
        }

        const data = await response.json();
        
        // Extract and trim content
        let content = data.data?.markdown || data.data?.content || '';
        if (content.length > maxChars) {
          content = content.substring(0, maxChars) + '...';
        }

        fetchedContent.push({
          url,
          title: data.data?.metadata?.title || '',
          description: data.data?.metadata?.description || '',
          content,
          metadata: {
            author: data.data?.metadata?.author,
            publishedTime: data.data?.metadata?.publishedTime,
            modifiedTime: data.data?.metadata?.modifiedTime,
          }
        });
      } catch (err) {
        console.error(`Error fetching ${url}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: fetchedContent.length,
        requested: urlsToFetch.length,
        credits: fetchedContent.length, // 1 credit per successful fetch
        data: fetchedContent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in firecrawl-fetch:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});