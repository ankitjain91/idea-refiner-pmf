import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, industry, geo, time_window } = await req.json();
    
    console.log('[news-analysis] Processing query:', { idea, industry, geo, time_window });

    if (!idea) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: idea' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build news search query - simplify if too specific
    let searchQuery = idea || '';
    
    // If the idea is very long and specific, extract key terms for broader search
    if (searchQuery.split(' ').length > 8) {
      // Extract key concepts for broader search
      const keyTerms = searchQuery
        .toLowerCase()
        .match(/\b(ai|virtual|book|club|reading|platform|app|technology|software|online|digital|social|startup|business)\b/gi);
      
      if (keyTerms && keyTerms.length > 0) {
        searchQuery = [...new Set(keyTerms)].slice(0, 4).join(' ') + ' news startup';
        console.log('[news-analysis] Simplified long query to:', searchQuery);
      }
    } else if (searchQuery) {
      // Add context for better news results
      searchQuery = searchQuery + ' technology startup news';
    }
    
    // Add industry and geo if available
    if (industry) searchQuery = industry + ' ' + searchQuery;
    if (geo && geo !== 'global') searchQuery = searchQuery + ' ' + geo;
    
    // Determine time range for search
    const timeRangeMap: Record<string, string> = {
      'last_7_days': 'd7',
      'last_30_days': 'd',
      'last_90_days': 'qdr:m3',
      'last_12_months': 'qdr:y'
    };
    
    const timeRange = timeRangeMap[time_window || 'last_90_days'] || 'qdr:m3';
    
    // Step 1: Fetch news from Google News via SerpApi
    let newsResults: any[] = [];
    let newsError: string | null = null;
    
    if (SERPAPI_KEY) {
      try {
        console.log('[news-analysis] Fetching from Google News via SerpApi');
        const serpUrl = new URL('https://serpapi.com/search');
        serpUrl.searchParams.append('engine', 'google_news');
        serpUrl.searchParams.append('q', searchQuery);
        serpUrl.searchParams.append('num', '50');
        serpUrl.searchParams.append('api_key', SERPAPI_KEY);
        
        const serpResponse = await fetch(serpUrl.toString());
        const serpData = await serpResponse.json();
        
        if (serpData.news_results) {
          newsResults = serpData.news_results.map((item: any) => ({
            title: item.title,
            snippet: item.snippet || item.description,
            url: item.link,
            source: item.source?.name || item.source,
            published: item.date || item.published,
            thumbnail: item.thumbnail
          }));
          console.log(`[news-analysis] SerpApi returned ${newsResults.length} results`);
        }
      } catch (error) {
        console.error('[news-analysis] SerpApi error:', error);
        newsError = error instanceof Error ? error.message : String(error);
      }
    }
    
    // Step 2: Fallback to Serper if needed
    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    if (newsResults.length < 10 && SERPER_API_KEY) {
      try {
        console.log('[news-analysis] Falling back to Serper for more results');
        const serperResponse = await fetch('https://google.serper.dev/news', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: searchQuery,
            num: 30,
            tbs: timeRange,
          }),
        });
        
        const serperData = await serperResponse.json();
        if (serperData.news) {
          const serperResults = serperData.news.map((item: any) => ({
            title: item.title,
            snippet: item.snippet,
            url: item.link,
            source: item.source,
            published: item.date,
          }));
          newsResults = [...newsResults, ...serperResults];
          console.log(`[news-analysis] Added ${serperResults.length} results from Serper`);
        }
      } catch (error) {
        console.error('[news-analysis] Serper error:', error);
      }
    }
    
    // Step 3: Clean content with Firecrawl (top 3 articles only)
    let cleanedArticles: any[] = [];
    
    if (FIRECRAWL_API_KEY && newsResults.length > 0) {
      try {
        const topArticles = newsResults
          .filter(item => item.url && !item.url.includes('youtube.com'))
          .slice(0, 3)
          .map(item => item.url);
        
        if (topArticles.length > 0) {
          console.log(`[news-analysis] Cleaning ${topArticles.length} articles with Firecrawl`);
          
          for (const url of topArticles) {
            try {
              const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url,
                  formats: ['markdown'],
                  onlyMainContent: true,
                }),
              });
              
              if (firecrawlResponse.ok) {
                const data = await firecrawlResponse.json();
                if (data.success && data.data) {
                  cleanedArticles.push({
                    url,
                    markdown: data.data.markdown?.slice(0, 2000), // Limit content length
                    title: data.data.metadata?.title,
                  });
                }
              }
            } catch (error) {
              console.error(`[news-analysis] Error cleaning ${url}:`, error);
            }
          }
          
          console.log(`[news-analysis] Successfully cleaned ${cleanedArticles.length} articles`);
        }
      } catch (error) {
        console.error('[news-analysis] Firecrawl error:', error);
      }
    }
    
    // Step 4: Analyze and synthesize data
    const now = new Date();
    const articles = newsResults.map(item => ({
      ...item,
      publishedDate: item.published ? new Date(item.published) : null,
      weekNumber: item.published ? getISOWeek(new Date(item.published)) : null,
    }));
    
    // Calculate momentum (simplified z-score)
    const recentArticles = articles.filter(a => {
      if (!a.publishedDate) return false;
      const daysAgo = (now.getTime() - a.publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 28; // Last 4 weeks
    });
    
    const olderArticles = articles.filter(a => {
      if (!a.publishedDate) return false;
      const daysAgo = (now.getTime() - a.publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo > 28 && daysAgo <= 112; // Previous 12 weeks
    });
    
    const recentAvg = recentArticles.length / 4; // Per week average
    const olderAvg = olderArticles.length / 12; // Per week average
    
    let momentum_z = 0;
    let direction = 'flat';
    
    if (olderAvg > 0) {
      momentum_z = (recentAvg - olderAvg) / Math.max(1, Math.sqrt(olderAvg));
      const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      if (changePercent > 10) direction = 'up';
      else if (changePercent < -10) direction = 'down';
      else direction = 'flat';
    }
    
    // Extract top outlets
    const outletCounts = new Map<string, number>();
    articles.forEach(item => {
      if (item.source) {
        outletCounts.set(item.source, (outletCounts.get(item.source) || 0) + 1);
      }
    });
    
    const top_outlets = Array.from(outletCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([outlet]) => outlet);
    
    // Simple sentiment analysis (rule-based)
    const positiveWords = ['success', 'growth', 'innovation', 'breakthrough', 'leading', 'winning', 'excellent'];
    const negativeWords = ['failure', 'decline', 'problem', 'issue', 'concern', 'risk', 'challenge'];
    
    let posCount = 0;
    let negCount = 0;
    
    articles.forEach(item => {
      const text = `${item.title} ${item.snippet}`.toLowerCase();
      positiveWords.forEach(word => {
        if (text.includes(word)) posCount++;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) negCount++;
      });
    });
    
    const total = posCount + negCount;
    const sentiment_pos = total > 0 ? (posCount / total) * 100 : 50;
    
    // Extract themes (simple keyword extraction)
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'was', 'are', 'were']);
    
    articles.forEach(item => {
      const words = `${item.title} ${item.snippet}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
      
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });
    
    const themes = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word);
    
    // Generate weekly series data
    const weeklyData = new Map<string, number>();
    articles.forEach(item => {
      if (item.weekNumber) {
        const weekKey = `2025-W${item.weekNumber}`;
        weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + 1);
      }
    });
    
    const series = Array.from(weeklyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => [week, count]);
    
    // Build response
    const result = {
      updatedAt: new Date().toISOString(),
      filters: { idea, industry, geo, time_window },
      metrics: [
        {
          name: 'momentum_z',
          value: momentum_z.toFixed(2),
          unit: 'z',
          explanation: `Recent (${recentArticles.length}) vs baseline (${olderArticles.length}) news volume`,
          confidence: 0.7,
        },
        {
          name: 'direction',
          value: direction,
          explanation: `Trend over last 4 weeks vs prior 12 weeks`,
          confidence: 0.75,
        },
        {
          name: 'sentiment_pos',
          value: sentiment_pos.toFixed(1),
          unit: '%',
          explanation: `Share of positive sentiment in titles`,
          confidence: 0.6,
        },
      ],
      series: [
        { name: 'news_volume', points: series },
      ],
      items: articles.slice(0, 10).map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.url,
        published: item.published,
        source: item.source,
        evidence: cleanedArticles
          .filter(a => a.url === item.url)
          .map(a => a.markdown?.slice(0, 500))
          .filter(Boolean),
      })),
      top_outlets,
      themes,
      cleanedArticles: cleanedArticles.map(a => ({
        url: a.url,
        title: a.title,
        summary: a.markdown?.slice(0, 500),
      })),
      citations: [
        {
          label: 'Google News (via SerpApi)',
          url: `https://news.google.com/search?q=${encodeURIComponent(searchQuery)}`,
          published: 'real-time',
        },
        ...top_outlets.slice(0, 3).map(outlet => ({
          label: outlet,
          url: '#',
          published: 'recent',
        })),
      ],
      warnings: newsError ? [newsError] : [],
      cost_estimate: {
        serp_calls: 1,
        firecrawl_urls: cleanedArticles.length,
        total_api_cost: `$${(0.01 + cleanedArticles.length * 0.002).toFixed(3)}`,
      },
    };
    
    console.log('[news-analysis] Analysis complete:', {
      articles: articles.length,
      cleanedArticles: cleanedArticles.length,
      momentum_z,
      direction,
      sentiment_pos,
    });
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('[news-analysis] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.toString() : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to get ISO week number
function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}