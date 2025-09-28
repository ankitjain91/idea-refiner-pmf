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
    
    console.log('Analyzing Amazon reviews for:', query);
    
    // Generate Amazon review analytics using Groq
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
            content: `Generate Amazon product review analytics as JSON:
            {
              "averageRating": 3.0-5.0,
              "totalReviews": 100-50000,
              "topProducts": [
                {"name": "product1", "rating": 3.0-5.0, "reviews": 100-10000},
                {"name": "product2", "rating": 3.0-5.0, "reviews": 100-10000}
              ],
              "commonComplaints": ["complaint1", "complaint2", ...],
              "commonPraise": ["praise1", "praise2", ...],
              "priceRange": {"min": 10, "max": 500},
              "marketGaps": ["gap1", "gap2", ...],
              "insights": ["insight1", "insight2", ...]
            }`
          },
          {
            role: 'user',
            content: `Generate Amazon review analytics for: "${query}"`
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
    
    const amazonData = JSON.parse(aiData.choices[0].message.content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: amazonData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in amazon-public function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});