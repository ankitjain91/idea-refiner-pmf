import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, startDate, endDate, maxRecords = 100 } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

    console.log('GDELT search for:', query);

    // GDELT DOC 2.0 API endpoint (free, no auth required)
    const gdeltQuery = encodeURIComponent(query);
    let gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${gdeltQuery}&mode=artlist&maxrecords=${maxRecords}&format=json`;

    if (startDate) {
      const start = startDate.replace(/-/g, '');
      gdeltUrl += `&startdatetime=${start}000000`;
    }
    if (endDate) {
      const end = endDate.replace(/-/g, '');
      gdeltUrl += `&enddatetime=${end}235959`;
    }

    const response = await fetch(gdeltUrl);

    if (!response.ok) {
      console.error('GDELT API error:', response.status);
      throw new Error(`GDELT API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform GDELT results to our format
    const articles = data.articles?.map((article: any) => ({
      title: article.title,
      url: article.url,
      source: article.domain,
      publishedDate: article.seendate,
      sentiment: article.tone ? {
        score: parseFloat(article.tone),
        positive: parseFloat(article.tone) > 0,
        magnitude: Math.abs(parseFloat(article.tone))
      } : null,
      themes: article.themes?.split(';').filter(Boolean) || [],
      locations: article.locations?.split(';').filter(Boolean) || [],
      language: article.language,
      imageUrl: article.socialimage,
    })) || [];

    // Aggregate sentiment and themes
    const sentimentAggregate = articles.reduce((acc: any, article: any) => {
      if (article.sentiment) {
        acc.count++;
        acc.totalScore += article.sentiment.score;
        if (article.sentiment.positive) acc.positive++;
        else acc.negative++;
      }
      return acc;
    }, { count: 0, totalScore: 0, positive: 0, negative: 0 });

    const avgSentiment = sentimentAggregate.count > 0 
      ? sentimentAggregate.totalScore / sentimentAggregate.count 
      : 0;

    // Extract top themes
    const themeCount: Record<string, number> = {};
    articles.forEach((article: any) => {
      article.themes?.forEach((theme: string) => {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      });
    });

    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count }));

    return new Response(
      JSON.stringify({
        success: true,
        query,
        totalArticles: articles.length,
        articles: articles.slice(0, 50), // Limit to 50 articles in response
        sentiment: {
          average: avgSentiment,
          positive: sentimentAggregate.positive,
          negative: sentimentAggregate.negative,
          neutral: sentimentAggregate.count - sentimentAggregate.positive - sentimentAggregate.negative,
        },
        topThemes,
        credits: 0, // GDELT is free
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in gdelt-news:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});