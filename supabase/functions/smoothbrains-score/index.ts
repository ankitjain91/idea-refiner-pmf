import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, marketSize, competition, sentiment } = await req.json();
    
    console.log('[smoothbrains-score] Calculating SmoothBrains score for:', idea);
    
    // Use Groq to calculate SmoothBrains Score based on inputs
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    let smoothBrainsScore = 50; // Default
    let rationale = "Moderate market fit potential";
    
    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
              {
                role: 'system',
                content: 'You are a market analyst. Calculate a SmoothBrains score (0-100%) based on market size, competition, and sentiment. Respond with ONLY a JSON object: {"score": number, "rationale": "one sentence explanation"}'
              },
              {
                role: 'user',
                content: `Calculate SmoothBrains score for: ${idea}
                Market Size: ${marketSize || 'Unknown'}
                Competition: ${competition || 'Medium'}
                Sentiment: ${sentiment || '50%'}
                
                Guidelines:
                - Large market + low competition + positive sentiment = 80-100%
                - Medium market + medium competition + mixed sentiment = 40-70%
                - Small market + high competition + negative sentiment = 0-40%`
              }
            ],
            temperature: 0.3,
            max_tokens: 100
          })
        });
        
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          try {
            const result = JSON.parse(data.choices[0].message.content);
            smoothBrainsScore = result.score || 50;
            rationale = result.rationale || "Calculated based on market signals";
          } catch (e) {
            console.error('[smoothbrains-score] Failed to parse Groq response:', e);
          }
        }
      } catch (err) {
        console.error('[smoothbrains-score] Groq API error:', err);
      }
    }
    
    // Adjust based on provided metrics if Groq fails
    if (!groqApiKey) {
      let score = 50;
      
      // Market size impact
      if (marketSize && marketSize.includes('B')) score += 15;
      else if (marketSize && marketSize.includes('M')) score += 5;
      
      // Competition impact
      if (competition === 'Low') score += 20;
      else if (competition === 'High') score -= 20;
      
      // Sentiment impact
      if (sentiment && parseInt(sentiment) > 70) score += 15;
      else if (sentiment && parseInt(sentiment) < 30) score -= 15;
      
      smoothBrainsScore = Math.max(0, Math.min(100, score));
      rationale = `Based on ${competition || 'medium'} competition and ${sentiment || 'mixed'} sentiment`;
    }
    
    const response = {
      updatedAt: new Date().toISOString(),
      score: smoothBrainsScore,
      rationale,
      factors: {
        marketSize: marketSize || 'Analyzing...',
        competition: competition || 'Medium',
        sentiment: sentiment || '50%'
      },
      confidence: 0.7,
      trend: smoothBrainsScore > 60 ? 'positive' : smoothBrainsScore > 40 ? 'neutral' : 'negative'
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[smoothbrains-score] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});