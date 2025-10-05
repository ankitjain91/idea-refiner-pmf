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
  const redditData = reddit?.data || reddit || {};
  const twitterData = twitter?.data || twitter || {};
  const youtubeData = youtube?.data || youtube || {};
  const newsData = news?.data || news || {};

  // Extract keywords
  const keywords = new Set<string>();
  if (redditData.themes) redditData.themes.forEach((t: string) => keywords.add(t));
  if (twitterData.top_hashtags) twitterData.top_hashtags.forEach((h: string) => keywords.add(h.replace('#', '')));

  // Build thematic clusters from real data
  const clusters = [];

  // Reddit cluster
  if (redditData.totalPosts > 0) {
    clusters.push({
      theme: 'Community Discussion & Feedback',
      insight: `${redditData.totalPosts} Reddit discussions analyzed with ${redditData.positive}% positive sentiment`,
      sentiment: {
        positive: redditData.positive || 0,
        neutral: redditData.neutral || 0,
        negative: redditData.negative || 0
      },
      quotes: redditData.samplePosts?.slice(0, 3).map((p: any) => ({
        text: p.excerpt || p.body?.substring(0, 150) || p.title,
        sentiment: p.sentiment || 'neutral',
        source: 'reddit'
      })) || [],
      citations: redditData.samplePosts?.slice(0, 2).map((p: any) => ({
        source: `r/${p.subreddit}`,
        url: p.permalink || '#',
        title: p.title
      })) || []
    });
  }

  // Twitter cluster
  if (twitterData.total_tweets > 0) {
    clusters.push({
      theme: 'Social Media Buzz & Trends',
      insight: `${twitterData.total_tweets} tweets analyzed with ${twitterData.top_hashtags?.length || 0} trending hashtags`,
      sentiment: {
        positive: twitterData.positive || 0,
        neutral: twitterData.neutral || 0,
        negative: twitterData.negative || 0
      },
      quotes: twitterData.sample_tweets?.slice(0, 3).map((t: any) => ({
        text: t.text?.substring(0, 150) || '',
        sentiment: t.sentiment || 'neutral',
        source: 'twitter'
      })) || [],
      citations: twitterData.sample_tweets?.slice(0, 2).map((t: any) => ({
        source: 'Twitter',
        url: `https://twitter.com/i/web/status/${t.id}`,
        title: `Tweet by @${t.author_username}`
      })) || []
    });
  }

  // YouTube cluster
  if (youtubeData.youtube_insights?.length > 0) {
    const videos = youtubeData.youtube_insights;
    const avgRelevance = youtubeData.summary?.avg_relevance || 50;
    clusters.push({
      theme: 'Video Content & Engagement',
      insight: `${videos.length} videos analyzed with average relevance of ${Math.round(avgRelevance)}%`,
      sentiment: {
        positive: Math.round(videos.filter((v: any) => v.relevance > 60).length / videos.length * 100),
        neutral: Math.round(videos.filter((v: any) => v.relevance >= 40 && v.relevance <= 60).length / videos.length * 100),
        negative: Math.round(videos.filter((v: any) => v.relevance < 40).length / videos.length * 100)
      },
      quotes: videos.slice(0, 3).map((v: any) => ({
        text: v.title,
        sentiment: v.relevance > 60 ? 'positive' : v.relevance < 40 ? 'negative' : 'neutral',
        source: 'youtube'
      })),
      citations: videos.slice(0, 2).map((v: any) => ({
        source: 'YouTube',
        url: `https://youtube.com/watch?v=${v.video_id}`,
        title: v.title
      }))
    });
  }

  // News cluster
  if (newsData.articles?.length > 0) {
    const articles = newsData.articles;
    clusters.push({
      theme: 'News Coverage & Media Analysis',
      insight: `${articles.length} news articles analyzed from various sources`,
      sentiment: {
        positive: Math.round(articles.filter((a: any) => (a.sentiment_score || 0) > 0.2).length / articles.length * 100),
        neutral: Math.round(articles.filter((a: any) => Math.abs(a.sentiment_score || 0) <= 0.2).length / articles.length * 100),
        negative: Math.round(articles.filter((a: any) => (a.sentiment_score || 0) < -0.2).length / articles.length * 100)
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

  // Extract positive drivers and concerns
  const positiveDrivers: string[] = [];
  const concerns: string[] = [];

  if (redditData.themes) positiveDrivers.push(...redditData.themes.slice(0, 2));
  if (redditData.painPoints) concerns.push(...redditData.painPoints.slice(0, 2));
  if (twitterData.top_hashtags) positiveDrivers.push(...twitterData.top_hashtags.slice(0, 2));

  const metrics = {
    overall_distribution: overallDistribution,
    engagement_weighted_distribution: overallDistribution,
    top_positive_drivers: positiveDrivers.slice(0, 4),
    top_negative_concerns: concerns.slice(0, 4),
    source_breakdown: {
      reddit: redditData.totalPosts || 0,
      twitter: twitterData.total_tweets || 0,
      youtube: youtubeData.youtube_insights?.length || 0,
      news: newsData.articles?.length || 0
    },
    trend_delta: `${overallDistribution.positive > 50 ? '+' : ''}${overallDistribution.positive - 50}% vs neutral`
  };

  const totalMentions = (redditData.totalPosts || 0) + (twitterData.total_tweets || 0) + 
                       (youtubeData.youtube_insights?.length || 0) + (newsData.articles?.length || 0);

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
