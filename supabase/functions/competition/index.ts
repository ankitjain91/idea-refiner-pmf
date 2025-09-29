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
    const { idea, industry } = await req.json();
    
    console.log('[competition] Analyzing competition for:', idea);
    
    // Search for competitors using Serper API
    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    const competitors: Array<{name: string, type: string}> = [];
    let competitionLevel = 'Medium';
    
    if (SERPER_API_KEY) {
      try {
        // Search for competitors
        const query = `${idea} alternatives competitors pricing`;
        
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: query,
            num: 10,
          }),
        });
        
        const data = await response.json();
        
        if (data.organic_results) {
          // Extract competitor names from titles and snippets
          const competitorNames = new Set<string>();
          const pricingInfo = [];
          
          for (const result of data.organic_results) {
            // Look for competitor names in titles
            if (result.title?.includes('vs') || result.title?.includes('alternative')) {
              const matches = result.title.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)?\b/g);
              if (matches) {
                matches.forEach((name: string) => competitorNames.add(name));
              }
            }
            
            // Extract pricing if mentioned
            const pricePattern = /\$\d+(?:\.\d+)?(?:\/month|\/year|\/user)?/gi;
            const prices = result.snippet?.match(pricePattern);
            if (prices) {
              pricingInfo.push(...prices);
            }
          }
          
          // Convert to array
          competitorNames.forEach((name: string) => {
            if (name && name.length > 3) {
              competitors.push({ name, type: 'Direct' });
            }
          });
        }
      } catch (err) {
        console.error('[competition] Search error:', err);
      }
    }
    
    // Use Groq to analyze competition level
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    
    if (groqApiKey && competitors.length > 0) {
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
                content: 'Analyze competition level. Respond with ONLY a JSON object: {"level": "Low"|"Medium"|"High", "summary": "one sentence"}'
              },
              {
                role: 'user',
                content: `${competitors.length} competitors found for ${idea}. 
                Top competitors: ${competitors.slice(0, 5).map(c => c.name).join(', ')}
                
                Guidelines:
                - 0-2 competitors = Low
                - 3-5 competitors = Medium  
                - 6+ competitors = High`
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
            competitionLevel = result.level || 'Medium';
          } catch (e) {
            console.error('[competition] Failed to parse Groq response:', e);
          }
        }
      } catch (err) {
        console.error('[competition] Groq API error:', err);
      }
    } else {
      // Fallback logic
      if (competitors.length <= 2) competitionLevel = 'Low';
      else if (competitors.length <= 5) competitionLevel = 'Medium';
      else competitionLevel = 'High';
    }
    
    // Add some default competitors if none found
    if (competitors.length === 0) {
      competitors.push(
        { name: 'Custom Solutions', type: 'Indirect' },
        { name: 'Manual Processes', type: 'Alternative' }
      );
    }
    
    const response = {
      updatedAt: new Date().toISOString(),
      level: competitionLevel,
      competitors: competitors.slice(0, 5),
      metrics: {
        total: competitors.length,
        direct: competitors.filter(c => c.type === 'Direct').length,
        indirect: competitors.filter(c => c.type === 'Indirect').length
      },
      insights: [
        competitionLevel === 'High' ? 'Saturated market - focus on differentiation' :
        competitionLevel === 'Low' ? 'Blue ocean opportunity - move fast' :
        'Growing market with room for innovation'
      ],
      confidence: 0.6
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[competition] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});