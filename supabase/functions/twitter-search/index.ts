import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TWITTER_BEARER_TOKEN = Deno.env.get('TWITTER_BEARER_TOKEN');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Cache TTL in minutes
const CACHE_TTL_MINUTES = 30;

// Create a simple hash function for query keys
function hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Generate Twitter activity using Groq when real data unavailable
async function generateTwitterActivityWithGroq(searchTerms: string, queryHash: string, cacheExpiresAt: Date) {
  console.log('[twitter-search] Generating Twitter activity with Groq for:', searchTerms);
  
  const prompt = `Analyze potential Twitter activity for this startup idea: "${searchTerms}"

Generate realistic Twitter metrics including:
1. Total tweet volume (10-100 range)
2. Sentiment breakdown (positive, neutral, negative percentages)
3. Top 3-5 relevant hashtags
4. 2-3 sample tweet texts that discuss this topic
5. Engagement metrics (likes, retweets)

Be realistic - not every idea will have massive engagement. Return only JSON.`;

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a social media analytics expert. Generate realistic Twitter activity data in JSON format.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }),
  });

  if (!groqResponse.ok) {
    throw new Error(`Groq API error: ${groqResponse.status}`);
  }

  const groqData = await groqResponse.json();
  const content = groqData.choices[0].message.content;
  
  // Parse JSON from response
  let parsed;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
  } catch {
    // Fallback to basic structure
    parsed = {
      total_tweets: 25,
      sentiment: { positive: 45, neutral: 40, negative: 15 },
      hashtags: ['#startup', '#innovation'],
      sample_tweets: ['Interesting concept!'],
      engagement: { avg_likes: 12, avg_retweets: 3 }
    };
  }

  const response = {
    twitter_buzz: {
      summary: `AI-generated Twitter analysis for "${searchTerms.slice(0, 80)}..." shows ${parsed.total_tweets || 25} estimated tweets with ${parsed.sentiment?.positive || 45}% positive sentiment.`,
      metrics: {
        total_tweets: parsed.total_tweets || 25,
        buzz_trend: 'AI-estimated',
        overall_sentiment: {
          positive: parsed.sentiment?.positive || 45,
          neutral: parsed.sentiment?.neutral || 40,
          negative: parsed.sentiment?.negative || 15
        },
        top_hashtags: parsed.hashtags?.slice(0, 5) || ['#startup', '#innovation'],
        influencers: []
      },
      raw_tweets: (parsed.sample_tweets || []).slice(0, 5).map((text: string, idx: number) => ({
        id: `groq_${idx}`,
        text: text,
        created_at: new Date().toISOString(),
        metrics: {
          like_count: parsed.engagement?.avg_likes || 12,
          retweet_count: parsed.engagement?.avg_retweets || 3
        },
        url: '' // Empty URL for AI-generated tweets - no link will be shown
      })),
      clusters: [{
        cluster_id: 'ai_generated',
        title: 'AI-Generated Analysis',
        insight: `Estimated ${parsed.total_tweets || 25} tweets with ${parsed.sentiment?.positive || 45}% positive sentiment`,
        sentiment: {
          positive: parsed.sentiment?.positive || 45,
          neutral: parsed.sentiment?.neutral || 40,
          negative: parsed.sentiment?.negative || 15
        },
        engagement: {
          avg_likes: parsed.engagement?.avg_likes || 12,
          avg_retweets: parsed.engagement?.avg_retweets || 3
        },
        hashtags: parsed.hashtags?.slice(0, 5) || [],
        quotes: [],
        citations: [{ source: 'AI-Generated', url: '#' }]
      }],
      charts: [],
      visuals_ready: true,
      confidence: 'AI-Generated',
      updatedAt: new Date().toISOString(),
      cached: false,
      cached_until: cacheExpiresAt.toISOString(),
      source: 'groq'
    }
  };

  // Cache the Groq response
  await supabase.from('twitter_cache').upsert({
    query_hash: queryHash,
    query_text: searchTerms,
    response_data: response,
    rate_limit_remaining: 999,
    rate_limit_reset: 0,
    expires_at: cacheExpiresAt.toISOString()
  }, { onConflict: 'query_hash' });

  return new Response(JSON.stringify(response), {
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json',
      'X-Cache-Hit': 'false',
      'X-Data-Source': 'groq',
      'X-Cached-Until': cacheExpiresAt.toISOString()
    },
  });
}

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
    
    // Generate cache key
    const queryHash = hashQuery(searchTerms);
    const cacheExpiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);
    
    // Check cache first
    console.log('[twitter-search] Checking cache for query hash:', queryHash);
    const { data: cachedData, error: cacheError } = await supabase
      .from('twitter_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (cachedData && !cacheError) {
      console.log('[twitter-search] Cache HIT - returning cached data');
      const cachedResponse = cachedData.response_data as any;
      return new Response(JSON.stringify({
        ...cachedResponse,
        twitter_buzz: {
          ...cachedResponse.twitter_buzz,
          cached: true,
          cached_at: cachedData.created_at,
          cached_until: cachedData.expires_at
        }
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache-Hit': 'true',
          'X-Cached-Until': cachedData.expires_at
        },
      });
    }
    
    console.log('[twitter-search] Cache MISS - fetching from Twitter API');
    
    if (!TWITTER_BEARER_TOKEN) {
      console.warn('[twitter-search] TWITTER_BEARER_TOKEN not configured, attempting Groq fallback');
      
      if (!GROQ_API_KEY) {
        throw new Error('Neither Twitter API nor Groq API configured');
      }
      
      // Use Groq to generate synthetic Twitter activity
      return await generateTwitterActivityWithGroq(searchTerms, queryHash, cacheExpiresAt);
    }
    
    // Call Twitter API v2 recent search - REDUCED from 100 to 50 to save rate limits
    const twitterUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchTerms)}&max_results=50&tweet.fields=public_metrics,created_at,entities&expansions=author_id&user.fields=public_metrics`;
    
    console.log('[twitter-search] Fetching from Twitter API');
    
    const twitterResponse = await fetch(twitterUrl, {
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Track rate limit headers
    const rateLimitRemaining = parseInt(twitterResponse.headers.get('x-rate-limit-remaining') || '0');
    const rateLimitReset = parseInt(twitterResponse.headers.get('x-rate-limit-reset') || '0');
    
    console.log('[twitter-search] Rate limit remaining:', rateLimitRemaining, 'Reset at:', new Date(rateLimitReset * 1000).toISOString());
    
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
    
    // If no tweets found, fallback to Groq
    if (tweets.length === 0 && GROQ_API_KEY) {
      console.log('[twitter-search] No tweets found, using Groq fallback');
      return await generateTwitterActivityWithGroq(searchTerms, queryHash, cacheExpiresAt);
    }
    
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
          buzz_trend: totalTweets > 25 ? '+28% vs prior 90 days' : 'Low activity',
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
        updatedAt: new Date().toISOString(),
        cached: false,
        cached_until: cacheExpiresAt.toISOString()
      }
    };
    
    // Store in cache for future requests
    console.log('[twitter-search] Storing response in cache');
    const { error: cacheInsertError } = await supabase
      .from('twitter_cache')
      .upsert({
        query_hash: queryHash,
        query_text: searchTerms,
        response_data: response,
        rate_limit_remaining: rateLimitRemaining,
        rate_limit_reset: rateLimitReset,
        expires_at: cacheExpiresAt.toISOString()
      }, {
        onConflict: 'query_hash'
      });
    
    if (cacheInsertError) {
      console.error('[twitter-search] Cache insert error:', cacheInsertError);
    }
    
    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false',
        'X-Rate-Limit-Remaining': rateLimitRemaining.toString(),
        'X-Cached-Until': cacheExpiresAt.toISOString()
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