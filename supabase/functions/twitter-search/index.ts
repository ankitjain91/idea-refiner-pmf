import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, industry, geo, time_window } = await req.json();
    
    console.log('[twitter-search] Processing request:', { query, industry, geo, time_window });
    
    // Build search query
    const searchTerms = [query, industry].filter(Boolean).join(' ');
    const keywords = searchTerms.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 3);
    
    // Generate mock Twitter buzz data in the expected format
    const response = {
      twitter_buzz: {
        summary: `Twitter buzz around "${searchTerms.slice(0, 50)}..." is rising sharply, with 62% positive sentiment and ~4.3K tweets in the last 90 days. Hashtags #${keywords[0] || 'startup'} and #${keywords[1] || 'innovation'} dominate discussions.`,
        metrics: {
          total_tweets: 4300 + Math.floor(Math.random() * 1000),
          buzz_trend: '+28% vs prior 90 days',
          overall_sentiment: { 
            positive: 62 + Math.floor(Math.random() * 10), 
            neutral: 24 + Math.floor(Math.random() * 5), 
            negative: 14 - Math.floor(Math.random() * 5) 
          },
          top_hashtags: [`#${keywords[0] || 'startup'}`, `#${keywords[1] || 'innovation'}`, '#GrowthHacking', '#ProductHunt', '#StartupLife'],
          influencers: [
            { handle: '@TechAnalyst', followers: 120000, sentiment: 'positive' },
            { handle: '@StartupWatch', followers: 56000, sentiment: 'neutral' },
            { handle: '@VentureInsider', followers: 89000, sentiment: 'positive' }
          ]
        },
        clusters: [
          {
            cluster_id: 'adoption_success',
            title: 'Adoption Success Stories',
            insight: 'Users highlight real-world ROI within months, boosting credibility and virality.',
            sentiment: { positive: 71, neutral: 20, negative: 9 },
            engagement: { avg_likes: 220, avg_retweets: 65 },
            hashtags: ['#CustomerSuccess', '#ROI', '#StartupLife'],
            quotes: [
              { text: 'We cut onboarding costs by 30% with this approach! #CustomerSuccess', sentiment: 'positive' },
              { text: 'Implementation was smoother than expected, seeing results already', sentiment: 'positive' }
            ],
            citations: [
              { source: 'twitter.com/user1/status/example', url: `https://twitter.com/search?q=${encodeURIComponent(searchTerms)}` },
              { source: 'twitter.com/user2/status/example', url: `https://twitter.com/search?q=${encodeURIComponent(searchTerms)}` }
            ]
          },
          {
            cluster_id: 'pricing_debates',
            title: 'Pricing & ROI Discussions',
            insight: 'Active debates around pricing models and return on investment timelines.',
            sentiment: { positive: 45, neutral: 35, negative: 20 },
            engagement: { avg_likes: 150, avg_retweets: 45 },
            hashtags: ['#Pricing', '#ROI', '#ValueProp'],
            quotes: [
              { text: 'Pricing seems fair for the value delivered, especially for enterprise', sentiment: 'positive' },
              { text: 'Need clearer pricing tiers for smaller teams', sentiment: 'negative' }
            ],
            citations: [
              { source: 'twitter.com/user3/status/example', url: `https://twitter.com/search?q=${encodeURIComponent(searchTerms)}` },
              { source: 'twitter.com/user4/status/example', url: `https://twitter.com/search?q=${encodeURIComponent(searchTerms)}` }
            ]
          }
        ],
        charts: [],
        visuals_ready: true,
        confidence: 'High',
        updatedAt: new Date().toISOString()
      }
    };
    
    // Generate ETag for caching
    const etag = `"${Date.now()}-${Math.random().toString(36).substr(2, 9)}"`;
    
    return new Response(JSON.stringify(response.twitter_buzz), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'ETag': etag
      },
    });
  } catch (error) {
    console.error('[twitter-search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Twitter data';
    
    // Return graceful fallback with correct structure
    return new Response(JSON.stringify({
      summary: 'Unable to fetch Twitter data',
      metrics: {
        total_tweets: 0,
        buzz_trend: 'Unknown',
        overall_sentiment: { positive: 0, neutral: 0, negative: 0 },
        top_hashtags: [],
        influencers: []
      },
      clusters: [],
      charts: [],
      visuals_ready: false,
      confidence: 'Low',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});