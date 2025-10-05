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
    
    if (!idea) {
      throw new Error('Idea is required');
    }

    console.log('[News Analysis] Fetching real news for:', idea);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Call GDELT news API for real news data
    const newsRes = await fetch(`${supabaseUrl}/functions/v1/gdelt-news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ idea, limit: 50 })
    });

    if (!newsRes.ok) {
      console.error('[News Analysis] GDELT request failed:', newsRes.status);
      throw new Error('Failed to fetch news data');
    }

    const newsData = await newsRes.json();
    const articles = newsData?.data?.articles || newsData?.articles || [];
    
    console.log('[News Analysis] Retrieved', articles.length, 'real articles');

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          news_trends: [],
          total_articles: 0,
          overall_sentiment: { positive: 0, neutral: 0, negative: 0 },
          message: 'No recent news articles found for this idea'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform real articles into trend format
    const newsAnalysis = transformRealNewsToTrends(idea, articles);

    return new Response(
      JSON.stringify({
        success: true,
        ...newsAnalysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[News Analysis] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        news_trends: [],
        total_articles: 0,
        overall_sentiment: null
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function transformRealNewsToTrends(idea: string, articles: any[]) {
  // Group articles by theme/topic
  const themes = new Map<string, any[]>();
  
  articles.forEach(article => {
    // Extract theme from article (simplified - could use NLP)
    const title = article.title || '';
    const theme = extractTheme(title, idea);
    
    if (!themes.has(theme)) {
      themes.set(theme, []);
    }
    themes.get(theme)!.push(article);
  });

  // Convert themes to trends
  const news_trends = Array.from(themes.entries()).map(([theme, themeArticles]) => {
    // Calculate sentiment for this theme
    const sentimentScores = themeArticles.map(a => a.sentiment_score || 0);
    const avgSentiment = sentimentScores.reduce((sum, s) => sum + s, 0) / sentimentScores.length;
    
    const positive = Math.round(themeArticles.filter(a => (a.sentiment_score || 0) > 0.2).length / themeArticles.length * 100);
    const negative = Math.round(themeArticles.filter(a => (a.sentiment_score || 0) < -0.2).length / themeArticles.length * 100);
    const neutral = 100 - positive - negative;

    // Build timeline from article dates
    const timeline = buildTimeline(themeArticles);

    // Extract geo distribution
    const geoDistribution: Record<string, number> = {};
    themeArticles.forEach(a => {
      const country = a.source_country || 'Global';
      geoDistribution[country] = (geoDistribution[country] || 0) + 1;
    });

    return {
      trend_id: theme.toLowerCase().replace(/\s+/g, '_'),
      title: `${theme} Coverage`,
      summary: generateThemeSummary(theme, themeArticles, positive),
      metrics: {
        article_count: themeArticles.length,
        growth_rate: calculateGrowthRate(timeline),
        sentiment: { positive, neutral, negative },
        geo_distribution: geoDistribution,
        influence_score: Math.min(100, Math.round(themeArticles.length * 5)),
        recency_score: calculateRecencyScore(themeArticles),
        timeline
      },
      entities: extractEntities(themeArticles),
      citations: themeArticles.slice(0, 3).map(a => ({
        source: a.source?.name || 'News Source',
        headline: a.title,
        url: a.url || '#',
        date: new Date(a.published_at || a.seendate || Date.now()).toISOString().split('T')[0]
      }))
    };
  })
  .sort((a, b) => b.metrics.article_count - a.metrics.article_count)
  .slice(0, 5);

  const total_articles = articles.length;

  // Calculate overall sentiment
  const allSentiments = articles.map(a => a.sentiment_score || 0);
  const avgOverallSentiment = allSentiments.reduce((sum, s) => sum + s, 0) / allSentiments.length;
  
  const overallPositive = Math.round(articles.filter(a => (a.sentiment_score || 0) > 0.2).length / articles.length * 100);
  const overallNegative = Math.round(articles.filter(a => (a.sentiment_score || 0) < -0.2).length / articles.length * 100);
  const overallNeutral = 100 - overallPositive - overallNegative;

  return {
    news_trends,
    total_articles,
    overall_sentiment: {
      positive: overallPositive,
      neutral: overallNeutral,
      negative: overallNegative
    },
    data_quality: 'real',
    confidence: Math.min(0.95, 0.5 + (articles.length / 200))
  };
}

function extractTheme(title: string, idea: string): string {
  const lowerTitle = title.toLowerCase();
  const lowerIdea = idea.toLowerCase();
  
  // Try to extract main theme from title
  if (lowerTitle.includes('investment') || lowerTitle.includes('funding') || lowerTitle.includes('valuation')) {
    return 'Investment & Funding';
  }
  if (lowerTitle.includes('regulation') || lowerTitle.includes('compliance') || lowerTitle.includes('legal')) {
    return 'Regulation & Compliance';
  }
  if (lowerTitle.includes('innovation') || lowerTitle.includes('technology') || lowerTitle.includes('ai')) {
    return 'Technology Innovation';
  }
  if (lowerTitle.includes('market') || lowerTitle.includes('industry') || lowerTitle.includes('growth')) {
    return 'Market Trends';
  }
  if (lowerTitle.includes('adoption') || lowerTitle.includes('customer') || lowerTitle.includes('user')) {
    return 'Adoption & Usage';
  }
  
  // Default to idea-based theme
  const keywords = lowerIdea.split(' ').filter(w => w.length > 4);
  return keywords[0] ? keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1) + ' Developments' : 'General News';
}

function generateThemeSummary(theme: string, articles: any[], positivePercent: number): string {
  const count = articles.length;
  const sentiment = positivePercent > 60 ? 'positive' : positivePercent > 40 ? 'mixed' : 'concerning';
  
  return `${count} articles covering ${theme.toLowerCase()} with ${sentiment} sentiment (${positivePercent}% positive). Recent coverage shows ${
    positivePercent > 60 ? 'strong interest and favorable outlook' :
    positivePercent > 40 ? 'balanced perspective with both opportunities and challenges' :
    'critical analysis and cautionary perspectives'
  }.`;
}

function buildTimeline(articles: any[]): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  
  articles.forEach(a => {
    const date = new Date(a.published_at || a.seendate || Date.now());
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    counts.set(dateStr, (counts.get(dateStr) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10); // Last 10 data points
}

function calculateGrowthRate(timeline: Array<{ date: string; count: number }>): string {
  if (timeline.length < 2) return '+0%';
  
  const firstHalf = timeline.slice(0, Math.floor(timeline.length / 2));
  const secondHalf = timeline.slice(Math.floor(timeline.length / 2));
  
  const firstSum = firstHalf.reduce((sum, t) => sum + t.count, 0);
  const secondSum = secondHalf.reduce((sum, t) => sum + t.count, 0);
  
  if (firstSum === 0) return '+100%';
  
  const growth = Math.round(((secondSum - firstSum) / firstSum) * 100);
  return `${growth >= 0 ? '+' : ''}${growth}%`;
}

function calculateRecencyScore(articles: any[]): number {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const recentArticles = articles.filter(a => {
    const date = new Date(a.published_at || a.seendate || now).getTime();
    const daysAgo = (now - date) / dayMs;
    return daysAgo <= 7;
  });

  return Math.min(100, Math.round((recentArticles.length / articles.length) * 100));
}

function extractEntities(articles: any[]): string[] {
  const entities = new Set<string>();
  
  articles.forEach(a => {
    if (a.source?.name) entities.add(a.source.name);
    // Could extract more entities from title/content using NLP
  });

  return Array.from(entities).slice(0, 7);
}
