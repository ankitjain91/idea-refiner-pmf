import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    console.log('Analyzing Twitter/X data for:', query);
    
    // Generate Twitter analytics using Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `Generate Twitter/X buzz analytics as JSON:
            {
              "mentions": 100-50000,
              "sentiment": {
                "positive": 30-70,
                "neutral": 20-40,
                "negative": 10-30
              },
              "reach": 10000-5000000,
              "influencers": ["@influencer1", "@influencer2", ...],
              "trendingHashtags": ["#hashtag1", "#hashtag2", ...],
              "engagementRate": 1-10,
              "insights": ["insight1", "insight2", ...]
            }`
          },
          {
            role: 'user',
            content: `Generate Twitter/X analytics for: "${query}"`
          }
        ],
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await response.json();
    
    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      console.error('Invalid Groq response:', aiData);
      throw new Error('Invalid response from Groq');
    }
    
    const twitterData = JSON.parse(aiData.choices[0].message.content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: twitterData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in twitter-search function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});