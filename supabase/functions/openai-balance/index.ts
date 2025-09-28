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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Testing OpenAI API key validity...');
    
    // First, test if the API key is valid by making a simple request
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('OpenAI API key test failed:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid OpenAI API key',
          details: 'The API key appears to be invalid or revoked',
          keyStatus: 'invalid'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('API key is valid, attempting to fetch billing data...');
    
    // Note: OpenAI's billing/usage APIs are restricted and require special permissions
    // Most API keys don't have access to billing endpoints
    // The following endpoints are deprecated or restricted:
    // - /v1/usage
    // - /v1/dashboard/billing/usage
    // - /v1/dashboard/billing/subscription
    
    // Since billing APIs are restricted, we'll return a message about this limitation
    return new Response(
      JSON.stringify({
        status: 'api_key_valid',
        message: 'Your OpenAI API key is valid and working',
        billingNote: 'OpenAI billing/usage APIs require special permissions that are not available with standard API keys',
        recommendation: 'Track your usage through the OpenAI platform dashboard at https://platform.openai.com/usage',
        keyInfo: {
          valid: true,
          keyPrefix: openAIApiKey.substring(0, 7) + '...'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in openai-balance function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});