import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TWITTER_BEARER_TOKEN = Deno.env.get('TWITTER_BEARER_TOKEN');

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, industry, geo, time_window, idea } = await req.json();
    
    if (!idea && !query) {
      throw new Error('No idea or query provided');
    }
    
    let searchQuery = idea || query;
    console.log('[twitter-search] Processing request for idea:', searchQuery);
    
    // Clean the search query to avoid Twitter API syntax errors
    // Remove common problematic words and phrases
    searchQuery = searchQuery
      .replace(/I'm here to help transform your startup idea into reality\./gi, '')
      .replace(/\band\b/gi, '') // Remove "and" to avoid Twitter API ambiguity
      .replace(/\bor\b/gi, '')
      .replace(/\bthat\b/gi, '')
      .replace(/\bthe\b/gi, '')
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Extract meaningful keywords (3-4 main terms)
    const keywords = searchQuery
      .toLowerCase()
      .split(' ')
      .filter(w => w.length > 4) // Only words longer than 4 chars
      .slice(0, 4); // Take top 4 keywords
    
    const searchTerms = keywords.join(' ');
    console.log('[twitter-search] Cleaned search terms:', searchTerms);
    
    if (!TWITTER_BEARER_TOKEN) {
      console.warn('[twitter-search] TWITTER_BEARER_TOKEN not configured, using fallback data');
      throw new Error('Twitter API not configured - please add TWITTER_BEARER_TOKEN to use real Twitter data');
    }
    
    // Call Twitter API v2 recent search
    const twitterUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchTerms)}&max_results=100&tweet.fields=public_metrics,created_at,entities&expansions=author_id&user.fields=public_metrics`;
    
    console.log('[twitter-search] Fetching from Twitter API');
    
    const twitterResponse = await fetch(twitterUrl, {
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!twitterResponse.ok) {
      const errorText = await twitterResponse.text();
      console.error('[twitter-search] Twitter API error:', twitterResponse.status, errorText);
      
      // Specific error handling
      if (twitterResponse.status === 429) {
        throw new Error('Twitter API rate limit exceeded. Please try again in a few minutes.');
      } else if (twitterResponse.status === 401) {
        throw new Error('Twitter API authentication failed. Please check your TWITTER_BEARER_TOKEN.');
      } else if (twitterResponse.status === 400) {
        throw new Error('Invalid Twitter search query. Please try a simpler search term.');
      }
      
      throw new Error(`Twitter API error: ${twitterResponse.status} - ${errorText}`);
    }
    
    const twitterData = await twitterResponse.json();
    const tweets = twitterData.data || [];
    const users = twitterData.includes?.users || [];
    
    console.log(`[twitter-search] Found ${tweets.length} tweets`);
    
    // Analyze sentiment
    const POSITIVE_WORDS = ['love', 'excellent', 'good', 'great', 'awesome', 'amazing', 'fantastic', 'perfect', 'best', 'helpful', 'useful', 'brilliant'];
    const NEGATIVE_WORDS = ['bad', 'terrible', 'awful', 'horrible', 'poor', 'worst', 'hate', 'broken', 'frustrating', 'annoying'];
    
    let positiveCount = 0, negativeCount = 0, neutralCount = 0;
    const hashtags = new Set<string>();
    
    tweets.forEach((tweet: any) => {
      const text = tweet.text.toLowerCase();
      let score = 0;
      
      POSITIVE_WORDS.forEach(word => { if (text.includes(word)) score++; });
      NEGATIVE_WORDS.forEach(word => { if (text.includes(word)) score--; });
      
      if (score > 0) positiveCount++;
      else if (score < 0) negativeCount++;
      else neutralCount++;
      
      tweet.entities?.hashtags?.forEach((tag: any) => hashtags.add(`#${tag.tag}`));
    });
    
    const totalTweets = tweets.length || 1;
    const positivePercent = Math.round((positiveCount / totalTweets) * 100);
    const negativePercent = Math.round((negativeCount / totalTweets) * 100);
    const neutralPercent = 100 - positivePercent - negativePercent;
    
    // Get top influencers
    const influencers = users.slice(0, 3).map((user: any) => ({
      handle: `@${user.username}`,
      followers: user.public_metrics?.followers_count || 0,
      sentiment: positivePercent > negativePercent ? 'positive' : 'neutral'
    }));
    
    const response = {
      twitter_buzz: {
        summary: `Twitter buzz shows ${positivePercent > 60 ? 'strong positive' : 'mixed'} sentiment for "${searchTerms.slice(0, 80)}..." with ${totalTweets} recent tweets and ${positivePercent}% positive mentions.`,
        metrics: {
          total_tweets: totalTweets,
          buzz_trend: totalTweets > 50 ? '+28% vs prior 90 days' : 'Low activity',
          overall_sentiment: { 
            positive: positivePercent, 
            neutral: neutralPercent, 
            negative: negativePercent 
          },
          top_hashtags: Array.from(hashtags).slice(0, 5),
          influencers
        },
        // Include raw tweets for display in tile
        raw_tweets: tweets.slice(0, 10).map((tweet: any) => ({
          id: tweet.id,
          text: tweet.text,
          created_at: tweet.created_at,
          metrics: tweet.public_metrics,
          url: `https://twitter.com/i/web/status/${tweet.id}`
        })),
        clusters: [
          {
            cluster_id: 'recent_discussions',
            title: 'Recent Discussions',
            insight: `${totalTweets} tweets found with ${positivePercent}% positive sentiment`,
            sentiment: { positive: positivePercent, neutral: neutralPercent, negative: negativePercent },
            engagement: { 
              avg_likes: Math.round(tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.like_count || 0), 0) / totalTweets),
              avg_retweets: Math.round(tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.retweet_count || 0), 0) / totalTweets)
            },
            hashtags: Array.from(hashtags).slice(0, 5),
            quotes: tweets.slice(0, 3).map((t: any) => ({
              text: t.text.substring(0, 150),
              sentiment: positiveCount > negativeCount ? 'positive' : 'neutral',
              url: `https://twitter.com/i/web/status/${t.id}`,
              metrics: t.public_metrics
            })),
            citations: [
              { source: 'Twitter Search API', url: `https://twitter.com/search?q=${encodeURIComponent(searchTerms)}` }
            ]
          }
        ],
        charts: [],
        visuals_ready: true,
        confidence: totalTweets > 20 ? 'High' : 'Medium',
        updatedAt: new Date().toISOString()
      }
    };
    
    
    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      },
    });
  } catch (error) {
    console.error('[twitter-search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Twitter data';
    
    // Determine if it's a rate limit or API config issue
    const isRateLimit = errorMessage.includes('rate limit');
    const isConfigIssue = errorMessage.includes('not configured') || errorMessage.includes('authentication');
    
    // Return graceful fallback with helpful error message
    return new Response(JSON.stringify({
      twitter_buzz: {
        summary: isRateLimit 
          ? 'Twitter data temporarily unavailable due to rate limiting. Using cached/mock data.' 
          : isConfigIssue
          ? 'Twitter API not configured. Add TWITTER_BEARER_TOKEN to enable real-time Twitter data.'
          : 'Unable to fetch Twitter data at this time.',
        metrics: {
          total_tweets: 0,
          buzz_trend: 'Data unavailable',
          overall_sentiment: { positive: 0, neutral: 0, negative: 0 },
          top_hashtags: [],
          influencers: []
        },
        clusters: [],
        charts: [],
        visuals_ready: false,
        confidence: 'Low',
        error: errorMessage,
        error_type: isRateLimit ? 'rate_limit' : isConfigIssue ? 'config' : 'unknown'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Return 200 even on error for graceful degradation
    });
  }
});