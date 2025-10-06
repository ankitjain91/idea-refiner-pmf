import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, detailed = false } = await req.json();

    if (!idea) {
      throw new Error('No idea provided');
    }

    console.log('[Unified Sentiment] Analyzing:', idea.substring(0, 100));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Call all real data sources in parallel
    console.log('[Unified Sentiment] Fetching from Reddit, Twitter, YouTube, News...');
    const [redditRes, twitterRes, youtubeRes, newsRes] = await Promise.all([
      fetch(`${supabaseUrl}/functions/v1/reddit-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ idea, timeWindow: 'week' })
      }).catch(err => { console.error('[Unified] Reddit error:', err); return null; }),

      fetch(`${supabaseUrl}/functions/v1/twitter-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ idea, time_window: 'week' })
      }).catch(err => { console.error('[Unified] Twitter error:', err); return null; }),

      fetch(`${supabaseUrl}/functions/v1/youtube-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ idea_text: idea, time_window: 'week' })
      }).catch(err => { console.error('[Unified] YouTube error:', err); return null; }),

      fetch(`${supabaseUrl}/functions/v1/gdelt-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ idea })
      }).catch(err => { console.error('[Unified] News error:', err); return null; })
    ]);

    // Parse all responses
    const [reddit, twitter, youtube, news] = await Promise.all([
      redditRes?.json().catch(() => null),
      twitterRes?.json().catch(() => null),
      youtubeRes?.json().catch(() => null),
      newsRes?.json().catch(() => null)
    ]);

    console.log('[Unified] Data:', { reddit: !!reddit, twitter: !!twitter, youtube: !!youtube, news: !!news });

    const sentimentData = aggregateRealSentiment(idea, reddit, twitter, youtube, news);

    return new Response(
      JSON.stringify({ sentiment: sentimentData }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache-Status': 'MISS'
        }
      }
    );
  } catch (error) {
    console.error('[Unified Sentiment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

function aggregateRealSentiment(idea: string, reddit: any, twitter: any, youtube: any, news: any) {
  // Normalize inputs from various functions
  const redditRaw = reddit?.data || reddit || {};
  const twitterBuzz = twitter?.twitter_buzz || twitter?.data?.twitter_buzz || null;
  const youtubeRaw = youtube?.data || youtube || {};
  const newsRaw = news?.data || news || {};

  // Reddit normalized metrics
  const redditMetrics = {
    totalPosts: redditRaw.totalPosts ?? redditRaw.metrics?.totalPosts ?? 0,
    positive: redditRaw.positive ?? redditRaw.sentiment?.positive ?? 0,
    neutral: redditRaw.neutral ?? redditRaw.sentiment?.neutral ?? 0,
    negative: redditRaw.negative ?? redditRaw.sentiment?.negative ?? 0,
    themes: redditRaw.themes || [],
    painPoints: redditRaw.painPoints || [],
    samplePosts: redditRaw.samplePosts || redditRaw.posts || []
  } as any;

  // Twitter normalized metrics
  const twitterMetrics = {
    total_tweets: twitterBuzz?.metrics?.total_tweets ?? 0,
    overall_sentiment: twitterBuzz?.metrics?.overall_sentiment ?? { positive: 0, neutral: 0, negative: 0 },
    top_hashtags: twitterBuzz?.metrics?.top_hashtags ?? [],
    sample_tweets: twitterBuzz?.raw_tweets ?? twitterBuzz?.sample_tweets ?? []
  } as any;

  // YouTube normalized metrics
  const videos = youtubeRaw.youtube_insights || [];
  const avgRelevance = youtubeRaw.summary?.avg_relevance ?? 0;
  const ytCount = videos.length || 0;
  const ytPos = ytCount ? Math.round((videos.filter((v: any) => (v.relevance ?? 0) > 0.6).length / ytCount) * 100) : 0;
  const ytNeu = ytCount ? Math.round((videos.filter((v: any) => (v.relevance ?? 0) >= 0.4 && (v.relevance ?? 0) <= 0.6).length / ytCount) * 100) : 0;
  const ytNeg = ytCount ? Math.max(0, 100 - ytPos - ytNeu) : 0;

  // News normalized metrics
  const articles = newsRaw.articles || [];
  const artCount = articles.length || 0;
  const newsPos = artCount ? Math.round((articles.filter((a: any) => (a.sentiment_score || 0) > 0.2).length / artCount) * 100) : 0;
  const newsNeu = artCount ? Math.round((articles.filter((a: any) => Math.abs(a.sentiment_score || 0) <= 0.2).length / artCount) * 100) : 0;
  const newsNeg = artCount ? Math.max(0, 100 - newsPos - newsNeu) : 0;

  // Extract keywords
  const keywords = new Set<string>();
  if (redditMetrics.themes) redditMetrics.themes.forEach((t: string) => keywords.add(t));
  if (twitterMetrics.top_hashtags) twitterMetrics.top_hashtags.forEach((h: string) => keywords.add(h.replace('#', '')));

  // Build thematic clusters from real data
  const clusters: any[] = [];

  // Reddit cluster
  if (redditMetrics.totalPosts > 0) {
    clusters.push({
      theme: 'Community Discussion & Feedback',
      insight: `${redditMetrics.totalPosts} Reddit discussions analyzed with ${redditMetrics.positive}% positive sentiment`,
      sentiment: {
        positive: redditMetrics.positive || 0,
        neutral: redditMetrics.neutral || 0,
        negative: redditMetrics.negative || 0
      },
      quotes: redditMetrics.samplePosts?.slice(0, 3).map((p: any) => ({
        text: p.excerpt || p.body?.substring(0, 150) || p.title,
        sentiment: p.sentiment || 'neutral',
        source: 'reddit'
      })) || [],
      citations: redditMetrics.samplePosts?.slice(0, 2).map((p: any) => ({
        source: p.subreddit ? `r/${p.subreddit}` : 'Reddit',
        url: p.permalink || '#',
        title: p.title
      })) || []
    });
  }

  // Twitter cluster
  if ((twitterMetrics.total_tweets || 0) > 0) {
    clusters.push({
      theme: 'Social Media Buzz & Trends',
      insight: `${twitterMetrics.total_tweets} tweets analyzed with ${twitterMetrics.top_hashtags?.length || 0} trending hashtags`,
      sentiment: {
        positive: twitterMetrics.overall_sentiment?.positive || 0,
        neutral: twitterMetrics.overall_sentiment?.neutral || 0,
        negative: twitterMetrics.overall_sentiment?.negative || 0
      },
      quotes: twitterMetrics.sample_tweets?.slice(0, 3).map((t: any) => ({
        text: t.text?.substring(0, 150) || '',
        sentiment: (twitterMetrics.overall_sentiment?.positive || 0) > (twitterMetrics.overall_sentiment?.negative || 0) ? 'positive' : 'neutral',
        source: 'twitter'
      })) || [],
      citations: twitterMetrics.sample_tweets?.slice(0, 2).map((t: any) => ({
        source: 'Twitter',
        url: `https://twitter.com/i/web/status/${t.id}`,
        title: `Tweet ${t.id}`
      })) || []
    });
  }

  // YouTube cluster
  if (ytCount > 0) {
    clusters.push({
      theme: 'Video Content & Engagement',
      insight: `${ytCount} videos analyzed with average relevance of ${Math.round(avgRelevance * 100)}%`,
      sentiment: {
        positive: ytPos,
        neutral: ytNeu,
        negative: ytNeg
      },
      quotes: videos.slice(0, 3).map((v: any) => ({
        text: v.title,
        sentiment: (v.relevance ?? 0) > 0.6 ? 'positive' : (v.relevance ?? 0) < 0.4 ? 'negative' : 'neutral',
        source: 'youtube'
      })),
      citations: videos.slice(0, 2).map((v: any) => ({
        source: 'YouTube',
        url: v.url || (v.videoId ? `https://youtu.be/${v.videoId}` : '#'),
        title: v.title
      }))
    });
  }

  // News cluster
  if (artCount > 0) {
    clusters.push({
      theme: 'News Coverage & Media Analysis',
      insight: `${artCount} news articles analyzed from various sources`,
      sentiment: {
        positive: newsPos,
        neutral: newsNeu,
        negative: newsNeg
      },
      quotes: articles.slice(0, 3).map((a: any) => ({
        text: a.title,
        sentiment: (a.sentiment_score || 0) > 0.2 ? 'positive' : (a.sentiment_score || 0) < -0.2 ? 'negative' : 'neutral',
        source: 'news'
      })),
      citations: articles.slice(0, 2).map((a: any) => ({
        source: a.source?.name || 'News',
        url: a.url || '#',
        title: a.title
      }))
    });
  }

  // Calculate overall metrics
  let totalPositive = 0, totalNeutral = 0, totalNegative = 0, totalVolume = 0;
  clusters.forEach(c => {
    const weight = c.sentiment.positive + c.sentiment.neutral + c.sentiment.negative;
    if (weight > 0) {
      totalPositive += c.sentiment.positive;
      totalNeutral += c.sentiment.neutral;
      totalNegative += c.sentiment.negative;
      totalVolume += 1;
    }
  });

  const overallDistribution = totalVolume > 0 ? {
    positive: Math.round(totalPositive / totalVolume),
    neutral: Math.round(totalNeutral / totalVolume),
    negative: Math.round(totalNegative / totalVolume)
  } : { positive: 0, neutral: 0, negative: 0 };

  // Positive drivers and concerns
  const positiveDrivers: string[] = [];
  const concerns: string[] = [];
  if (redditMetrics.themes) positiveDrivers.push(...redditMetrics.themes.slice(0, 2));
  if (redditMetrics.painPoints) concerns.push(...redditMetrics.painPoints.slice(0, 2));
  if (twitterMetrics.top_hashtags) positiveDrivers.push(...twitterMetrics.top_hashtags.slice(0, 2));

  const metrics = {
    overall_distribution: overallDistribution,
    engagement_weighted_distribution: overallDistribution,
    top_positive_drivers: positiveDrivers.slice(0, 4),
    top_negative_concerns: concerns.slice(0, 4),
    source_breakdown: {
      reddit: { positive: redditMetrics.positive || 0, neutral: redditMetrics.neutral || 0, negative: redditMetrics.negative || 0 },
      twitter: twitterMetrics.overall_sentiment || { positive: 0, neutral: 0, negative: 0 },
      youtube: { positive: ytPos, neutral: ytNeu, negative: ytNeg },
      news: { positive: newsPos, neutral: newsNeu, negative: newsNeg }
    },
    trend_delta: `${overallDistribution.positive > 50 ? '+' : ''}${overallDistribution.positive - 50}% vs neutral`
  } as any;

  const totalMentions = (redditMetrics.totalPosts || 0) + (twitterMetrics.total_tweets || 0) + ytCount + artCount;

  const summary = totalMentions > 0
    ? `Analyzed ${totalMentions} mentions across ${clusters.length} platforms. Sentiment is ${
        overallDistribution.positive > 60 ? 'predominantly positive' :
        overallDistribution.positive > 40 ? 'moderately positive' :
        overallDistribution.negative > 40 ? 'concerning' : 'mixed'
      }. ${clusters.length > 0 ? `Key focus: ${clusters[0].theme.toLowerCase()}.` : ''}`
    : 'Limited data available for this idea.';

  const confidence = Math.min(0.95, 0.3 + (clusters.length * 0.15) + (Math.min(totalMentions, 200) / 400));

  return {
    summary,
    metrics,
    clusters,
    trend_data: [],
    word_clouds: {
      positive: positiveDrivers.slice(0, 8).map(w => ({ text: w, value: 50 + Math.random() * 50 })),
      negative: concerns.slice(0, 8).map(w => ({ text: w, value: 50 + Math.random() * 50 }))
    },
    charts: [
      {
        type: 'donut',
        title: 'Overall Sentiment Distribution',
        series: [
          { name: 'Positive', value: overallDistribution.positive },
          { name: 'Neutral', value: overallDistribution.neutral },
          { name: 'Negative', value: overallDistribution.negative }
        ]
      }
    ],
    visuals_ready: true,
    confidence
  };
}
