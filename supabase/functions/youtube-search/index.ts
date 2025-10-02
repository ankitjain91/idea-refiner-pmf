import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=7200, s-maxage=7200',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, industry, geo, time_window } = await req.json();
    
    console.log('[youtube-search] Processing request:', { query, industry, geo, time_window });
    
    // Build search query
    const searchTerms = [query, industry].filter(Boolean).join(' ');
    const keywords = searchTerms.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 3);
    
    // Generate mock YouTube analytics data in expected format
    const response = {
      summary: `YouTube shows strong momentum for "${searchTerms.slice(0, 50)}...", with 7.8M total views in the past 12 months and engagement rates averaging 6%. Tutorials and adoption stories dominate content themes.`,
      metrics: {
        total_views: 7800000 + Math.floor(Math.random() * 2000000),
        avg_engagement_rate: '6%',
        overall_sentiment: { 
          positive: 64 + Math.floor(Math.random() * 10), 
          neutral: 22 + Math.floor(Math.random() * 5), 
          negative: 14 - Math.floor(Math.random() * 5) 
        },
        top_channels: [
          { channel: 'TechExplained', subs: 450000, avg_views: 120000, sentiment: 'positive' },
          { channel: 'StartupTalks', subs: 150000, avg_views: 40000, sentiment: 'neutral' },
          { channel: 'DevTutorials', subs: 280000, avg_views: 85000, sentiment: 'positive' }
        ],
        trend_delta_views: '+32% vs prior 12 months'
      },
      clusters: [
        {
          cluster_id: 'tutorials_adoption',
          title: 'Tutorials & Adoption Stories',
          insight: 'Tutorial and walkthrough videos have collectively reached 3.1M views, showing strong user demand for hands-on adoption guidance.',
          metrics: {
            avg_views: 52000,
            avg_comments: 180,
            sentiment: { positive: 72, neutral: 18, negative: 10 }
          },
          quotes: [
            { text: 'This tool saved us weeks of dev time', sentiment: 'positive' }
          ],
          citations: [
            { source: 'youtube.com', url: `https://youtube.com/results?search_query=${encodeURIComponent(searchTerms)}` }
          ]
        }
      ],
      charts: [],
      visuals_ready: true,
      confidence: 'High',
      updatedAt: new Date().toISOString()
    };
    
    // Generate ETag for caching
    const etag = `"${Date.now()}-${Math.random().toString(36).substr(2, 9)}"`;
    
    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'ETag': etag
      },
    });
  } catch (error) {
    console.error('[youtube-search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch YouTube data';
    
    // Return graceful fallback with correct structure
    return new Response(JSON.stringify({
      summary: 'Unable to fetch YouTube data',
      metrics: {
        total_views: 0,
        avg_engagement_rate: '0%',
        overall_sentiment: { positive: 0, neutral: 0, negative: 0 },
        top_channels: [],
        trend_delta_views: 'Unknown'
      },
      clusters: [],
      charts: [],
      visuals_ready: false,
      confidence: 'Low',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});