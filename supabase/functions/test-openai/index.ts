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
    const openAIApiKey = Deno.env.get('OPENAI_SUPPORT_API_KEY');
    
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          status: 'missing_key'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Test the API key with a minimal request
    console.log('Testing OpenAI API key...');
    console.log('Key starts with:', openAIApiKey.substring(0, 7) + '...');
    
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      }
    });

    const responseText = await testResponse.text();
    console.log('API Response status:', testResponse.status);
    console.log('API Response:', responseText.substring(0, 200));

    if (!testResponse.ok) {
      let errorInfo: any = {
        status: testResponse.status,
        statusText: testResponse.statusText,
        error: 'API key test failed',
        details: '',
        solution: ''
      };

      try {
        const errorData = JSON.parse(responseText);
        errorInfo.details = errorData.error?.message || errorData.error?.type || 'Unknown error';
        
        if (errorData.error?.type === 'insufficient_quota') {
          errorInfo.error = 'OpenAI account has insufficient quota';
          errorInfo.solution = 'Please add credits to your OpenAI account at https://platform.openai.com/account/billing';
        } else if (testResponse.status === 401) {
          errorInfo.error = 'Invalid API key';
          errorInfo.solution = 'Please check your OpenAI API key is correct and has not been revoked';
        } else if (testResponse.status === 429) {
          errorInfo.error = 'Rate limit exceeded';
          errorInfo.solution = 'Too many requests. Please wait and try again.';
        }
      } catch (e) {
        errorInfo.details = responseText.substring(0, 200);
      }

      return new Response(
        JSON.stringify(errorInfo),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If successful, try a simple chat completion to verify full functionality
    const chatTestResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "test"' }],
        max_tokens: 5
      })
    });

    const chatResponseText = await chatTestResponse.text();
    console.log('Chat test status:', chatTestResponse.status);
    console.log('Chat test response:', chatResponseText.substring(0, 200));

    if (!chatTestResponse.ok) {
      let chatError: any = {
        status: chatTestResponse.status,
        statusText: chatTestResponse.statusText,
        error: 'Chat completion test failed',
        details: '',
        solution: ''
      };

      try {
        const errorData = JSON.parse(chatResponseText);
        chatError.details = errorData.error?.message || errorData.error?.type || 'Unknown error';
        
        if (errorData.error?.code === 'insufficient_quota' || errorData.error?.type === 'insufficient_quota') {
          chatError.error = 'OpenAI account has no credits';
          chatError.solution = 'Your API key is valid but your account needs credits. Add them at https://platform.openai.com/account/billing';
        }
      } catch (e) {
        chatError.details = chatResponseText.substring(0, 200);
      }

      return new Response(
        JSON.stringify(chatError),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the successful response
    const chatData = JSON.parse(chatResponseText);

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'OpenAI API key is valid and working',
        keyPrefix: openAIApiKey.substring(0, 7) + '...',
        modelAccess: true,
        chatResponse: chatData.choices?.[0]?.message?.content || 'Test successful',
        usage: chatData.usage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error testing OpenAI API:', error);
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