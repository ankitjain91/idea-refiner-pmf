import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { context } = await req.json();
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      // Return a fallback name if no API key
      const fallbackNames = ['Ideas', 'Strategy', 'Innovation', 'Planning', 'Concept', 'Vision', 'Growth', 'Analysis'];
      const randomName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
      return new Response(
        JSON.stringify({ name: randomName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a single-word topic name based on context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You generate a single descriptive word for an idea. Return ONLY one word, nothing else.' 
          },
          { 
            role: 'user', 
            content: `Give one word that describes the idea: ${context || 'startup brainstorming'}` 
          }
        ],
        max_tokens: 10,
        temperature: 0.9
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let sessionName = data.choices[0].message.content.trim();
    
    // Ensure it's a single word (remove any spaces or special characters)
    sessionName = sessionName.replace(/[^a-zA-Z]/g, '');
    
    // Fallback if the response is empty or too long
    if (!sessionName || sessionName.length > 15) {
      const fallbackNames = ['Ideas', 'Strategy', 'Innovation', 'Planning', 'Concept', 'Vision', 'Growth', 'Analysis'];
      sessionName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    }
    
    console.log('Generated session name:', sessionName);

    return new Response(
      JSON.stringify({ name: sessionName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-session-name function:', error);
    
    // Return a fallback name on error
    const fallbackNames = ['Ideas', 'Strategy', 'Innovation', 'Planning', 'Concept', 'Vision', 'Growth', 'Analysis'];
    const randomName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    
    return new Response(
      JSON.stringify({ name: randomName }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});