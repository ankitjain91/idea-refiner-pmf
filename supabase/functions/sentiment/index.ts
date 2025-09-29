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
    const { idea } = await req.json();
    
    console.log('[sentiment] Analyzing sentiment for:', idea);
    
    // Collect sentiment from multiple sources
    const sentimentData = {
      positive: 0,
      neutral: 0,
      negative: 0,
      samples: [] as Array<{text: string, sentiment: string, source: string}>
    };
    
    // Try Reddit API for sentiment
    const redditClientId = Deno.env.get('REDDIT_CLIENT_ID');
    const redditClientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
    
    if (redditClientId && redditClientSecret) {
      try {
        // Get Reddit access token
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${redditClientId}:${redditClientSecret}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials'
        });
        
        const { access_token } = await tokenResponse.json();
        
        // Search for relevant posts
        const searchResponse = await fetch(
          `https://oauth.reddit.com/search.json?q=${encodeURIComponent(idea)}&limit=25&sort=relevance`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'User-Agent': 'web:smoothbrains:v1.0 (by /u/meltdown91)'
            }
          }
        );
        
        const searchData = await searchResponse.json();
        
        if (searchData.data?.children) {
          const posts = searchData.data.children;
          
          // Simple sentiment from upvote ratio
          posts.forEach((post: any) => {
            const ratio = post.data.upvote_ratio || 0.5;
            const text = post.data.title || '';
            
            if (ratio > 0.7) {
              sentimentData.positive++;
              if (sentimentData.samples.length < 2) {
                sentimentData.samples.push({ text, sentiment: 'positive', source: 'Reddit' });
              }
            } else if (ratio < 0.3) {
              sentimentData.negative++;
              if (sentimentData.samples.length < 4) {
                sentimentData.samples.push({ text, sentiment: 'negative', source: 'Reddit' });
              }
            } else {
              sentimentData.neutral++;
            }
          });
        }
      } catch (err) {
        console.error('[sentiment] Reddit API error:', err);
      }
    }
    
    // Use Groq for sentiment analysis if we have some data
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    let overallSentiment = 50; // Default neutral
    let pros = ['Innovative concept', 'Market potential'];
    let cons = ['Needs validation', 'Competition exists'];
    
    if (groqApiKey && sentimentData.samples.length > 0) {
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
                content: 'Analyze sentiment and extract pros/cons. Respond with ONLY a JSON object: {"sentiment": number (0-100), "pros": ["pro1", "pro2"], "cons": ["con1", "con2"]}'
              },
              {
                role: 'user',
                content: `Analyze sentiment for ${idea} based on:
                ${sentimentData.samples.map(s => `- ${s.text} (${s.sentiment})`).join('\n')}
                
                Positive mentions: ${sentimentData.positive}
                Neutral mentions: ${sentimentData.neutral}
                Negative mentions: ${sentimentData.negative}`
              }
            ],
            temperature: 0.3,
            max_tokens: 200
          })
        });
        
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          try {
            const result = JSON.parse(data.choices[0].message.content);
            overallSentiment = result.sentiment || 50;
            pros = result.pros || pros;
            cons = result.cons || cons;
          } catch (e) {
            console.error('[sentiment] Failed to parse Groq response:', e);
          }
        }
      } catch (err) {
        console.error('[sentiment] Groq API error:', err);
      }
    } else {
      // Calculate from raw data
      const total = sentimentData.positive + sentimentData.neutral + sentimentData.negative;
      if (total > 0) {
        overallSentiment = Math.round((sentimentData.positive / total) * 100);
      }
    }
    
    const response = {
      updatedAt: new Date().toISOString(),
      sentiment: overallSentiment,
      distribution: {
        positive: sentimentData.positive,
        neutral: sentimentData.neutral,
        negative: sentimentData.negative
      },
      pros: pros.slice(0, 2),
      cons: cons.slice(0, 2),
      samples: sentimentData.samples.slice(0, 4),
      confidence: 0.6
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[sentiment] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});