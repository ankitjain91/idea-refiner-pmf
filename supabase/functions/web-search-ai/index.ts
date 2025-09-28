import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { query, tileType, filters } = await req.json();
    
    console.log('Web search request:', { query, tileType, filters });

    // Return error - OpenAI functionality has been disabled
    return new Response(
      JSON.stringify({
        error: 'Service temporarily unavailable',
        message: 'Data fetching service is currently disabled'
      }), 
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in web-search-ai function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Service error',
        message: 'Unable to process request'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});