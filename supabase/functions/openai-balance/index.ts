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

    // Fetch usage for current billing cycle
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    console.log('Fetching OpenAI usage from', formatDate(startDate), 'to', formatDate(endDate));
    
    // Fetch usage data from OpenAI
    const usageResponse = await fetch(
      `https://api.openai.com/v1/usage?date=${formatDate(startDate)}`,
      {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!usageResponse.ok) {
      const errorText = await usageResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Try alternative endpoint for usage
      const billingResponse = await fetch(
        'https://api.openai.com/v1/dashboard/billing/usage',
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!billingResponse.ok) {
        return new Response(
          JSON.stringify({ 
            error: 'Unable to fetch OpenAI billing data',
            details: 'The OpenAI billing API may have changed or your API key might not have billing permissions'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const billingData = await billingResponse.json();
      return new Response(
        JSON.stringify({
          usage: billingData,
          note: 'Fetched from billing endpoint'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const usageData = await usageResponse.json();
    
    // Also try to fetch subscription/credit information
    const subscriptionResponse = await fetch(
      'https://api.openai.com/v1/dashboard/billing/subscription',
      {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    let subscriptionData = null;
    if (subscriptionResponse.ok) {
      subscriptionData = await subscriptionResponse.json();
    }

    return new Response(
      JSON.stringify({
        usage: usageData,
        subscription: subscriptionData,
        currentMonth: {
          start: formatDate(startDate),
          end: formatDate(endDate)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching OpenAI balance:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});