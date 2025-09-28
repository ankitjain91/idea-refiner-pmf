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
    const openAIUsageKey = Deno.env.get('OPENAI_USAGE_API_KEY');
    
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
    
    // First, test if the main API key is valid by making a simple request
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
    
    console.log('API key is valid');
    
    // If we have a separate usage key, try to fetch organization usage
    if (openAIUsageKey) {
      console.log('Attempting to fetch organization usage with separate usage key...');
      
      try {
        // Calculate date range for last 30 days
        const currentDate = new Date();
        const endDate = currentDate.toISOString().split('T')[0];
        const startDate = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        console.log(`Fetching usage from ${startDate} to ${endDate}`);
        
        // Try fetching usage from the usage endpoint
        const usageResponse = await fetch(
          `https://api.openai.com/v1/usage?date=${startDate}`,
          {
            headers: {
              'Authorization': `Bearer ${openAIUsageKey}`,
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          console.log('Successfully fetched usage data');
          
          // Calculate total cost from usage data
          let totalCost = 0;
          if (usageData && usageData.data) {
            usageData.data.forEach((day: any) => {
              if (day.costs) {
                totalCost += day.costs.reduce((sum: number, cost: any) => sum + (cost.amount || 0), 0);
              }
            });
          }
          
          return new Response(
            JSON.stringify({
              status: 'success',
              message: 'Successfully fetched OpenAI usage data',
              usage: {
                total_usage: totalCost * 100, // Convert to cents
                period: {
                  start: startDate,
                  end: endDate
                },
                data: usageData.data
              },
              keyInfo: {
                valid: true,
                keyPrefix: openAIApiKey.substring(0, 7) + '...',
                usageKeyPrefix: openAIUsageKey.substring(0, 7) + '...'
              }
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          const errorText = await usageResponse.text();
          console.error('Failed to fetch usage data:', errorText);
          
          // Try the organization billing endpoint as fallback
          const billingResponse = await fetch(
            'https://api.openai.com/v1/organization/usage',
            {
              headers: {
                'Authorization': `Bearer ${openAIUsageKey}`,
                'Content-Type': 'application/json',
              }
            }
          );
          
          if (billingResponse.ok) {
            const billingData = await billingResponse.json();
            console.log('Fetched billing data as fallback');
            
            return new Response(
              JSON.stringify({
                status: 'success',
                message: 'Fetched OpenAI billing data',
                usage: billingData,
                keyInfo: {
                  valid: true,
                  keyPrefix: openAIApiKey.substring(0, 7) + '...',
                  usageKeyPrefix: openAIUsageKey.substring(0, 7) + '...'
                }
              }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        }
      } catch (usageError) {
        console.error('Error fetching usage data:', usageError);
      }
    }
    
    // If no usage key or usage fetch failed, return standard response
    return new Response(
      JSON.stringify({
        status: 'api_key_valid',
        message: 'Your OpenAI API key is valid and working',
        billingNote: openAIUsageKey 
          ? 'Unable to fetch usage data with the provided usage key' 
          : 'Add OPENAI_USAGE_API_KEY to fetch organization usage data',
        recommendation: 'Track your usage through the OpenAI platform dashboard at https://platform.openai.com/usage',
        keyInfo: {
          valid: true,
          keyPrefix: openAIApiKey.substring(0, 7) + '...',
          hasUsageKey: !!openAIUsageKey
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