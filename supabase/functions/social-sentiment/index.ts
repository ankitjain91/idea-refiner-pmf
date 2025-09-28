import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_DASHBOARD_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, keywords } = await req.json();
    
    console.log('Analyzing social sentiment for:', idea);
    
    // Analyze social sentiment using AI
    const sentimentAnalysis = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a social media analyst. Analyze social sentiment and community engagement for the given idea. Return a JSON object with:
            {
              "sentiment": {
                "overall": "positive/neutral/negative",
                "score": 75,
                "breakdown": {
                  "positive": 60,
                  "neutral": 25,
                  "negative": 15
                }
              },
              "platforms": {
                "reddit": {
                  "mentions": 245,
                  "sentiment": "positive",
                  "topSubreddits": ["r/startups", "r/entrepreneur"],
                  "keyTopics": ["topic1", "topic2"]
                },
                "twitter": {
                  "mentions": 1250,
                  "sentiment": "neutral",
                  "engagement": 3500,
                  "influencers": ["@influencer1", "@influencer2"]
                },
                "tiktok": {
                  "views": 45000,
                  "sentiment": "positive",
                  "trending": true,
                  "hashtags": ["#hashtag1", "#hashtag2"]
                }
              },
              "communityInsights": [
                {
                  "insight": "Users are excited about...",
                  "source": "Reddit",
                  "engagement": "high"
                }
              ],
              "suggestedCommunities": [
                {
                  "name": "Indie Hackers",
                  "platform": "Forum",
                  "relevance": "high",
                  "memberCount": "500K"
                }
              ],
              "interestedInvestors": [
                {
                  "name": "Y Combinator",
                  "type": "Accelerator",
                  "focus": ["B2B SaaS", "AI"],
                  "likelihood": "medium"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Analyze social sentiment for: "${idea}". Keywords: ${keywords?.join(', ') || 'auto-detect'}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    const sentimentData = await sentimentAnalysis.json();
    const sentiment = JSON.parse(sentimentData.choices[0].message.content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentiment,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});