import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const serperApiKey = Deno.env.get('SERPER_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea_keywords, geo = 'US', time_window = 'last_12_months' } = await req.json();
    
    const query = Array.isArray(idea_keywords) 
      ? idea_keywords.join(' ') 
      : (idea_keywords || '');
    
    console.log('[google-trends] Processing request:', { query, geo, time_window });
    
    if (!query) {
      return new Response(
        JSON.stringify({ 
          error: 'No query provided',
          updatedAt: new Date().toISOString(),
          filters: { idea: '', geo, time_window },
          metrics: [],
          series: [],
          top_queries: [],
          citations: [],
          warnings: ['No idea keywords provided']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!serperApiKey) {
      console.log('[google-trends] No SerpApi key - returning mock data');
      const mockData = generateMockData(query, geo, time_window);
      return new Response(
        JSON.stringify(mockData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parallel fetch both TIMESERIES and RELATED_QUERIES
    const [timeseriesData, relatedData] = await Promise.all([
      fetchGoogleTrends(query, geo, 'TIMESERIES'),
      fetchGoogleTrends(query, geo, 'RELATED_QUERIES')
    ]);
    
    // Process and normalize the data
    const processedData = processGoogleTrendsData(
      timeseriesData, 
      relatedData, 
      query, 
      geo, 
      time_window
    );
    
    return new Response(
      JSON.stringify(processedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[google-trends] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString(),
        filters: {},
        metrics: [],
        series: [],
        top_queries: [],
        citations: [],
        warnings: ['Failed to fetch trends data']
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function fetchGoogleTrends(query: string, geo: string, dataType: string) {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 7000);
  
  try {
    const params = new URLSearchParams({
      engine: 'google_trends',
      q: query,
      geo: geo.toUpperCase(),
      data_type: dataType,
      api_key: serperApiKey!
    });
    
    console.log(`[google-trends] Fetching ${dataType} for: ${query}`);
    
    const response = await fetch(`https://serpapi.com/search?${params}`, {
      signal: timeoutController.signal
    });
    
    if (!response.ok) {
      throw new Error(`SerpApi returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[google-trends] ${dataType} fetched successfully`);
    return data;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.error(`[google-trends] ${dataType} request timed out`);
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function processGoogleTrendsData(
  timeseriesData: any, 
  relatedData: any,
  query: string,
  geo: string,
  time_window: string
) {
  const warnings: string[] = [];
  const series: any[] = [];
  const top_queries: string[] = [];
  let trend_direction = 'flat';
  let confidence = 0.5;
  
  // Process timeseries data
  if (timeseriesData?.interest_over_time?.timeline_data) {
    const points: [string, number][] = [];
    
    timeseriesData.interest_over_time.timeline_data.forEach((item: any) => {
      const date = item.date?.split(' - ')[0] || item.date;
      const value = item.values?.[0]?.value || 0;
      if (date) {
        points.push([date, typeof value === 'number' ? value : parseInt(value) || 0]);
      }
    });
    
    if (points.length > 0) {
      series.push({
        name: 'search_interest',
        points
      });
      
      // Calculate trend direction
      const result = calculateTrendDirection(points);
      trend_direction = result.direction;
      confidence = result.confidence;
    }
  } else {
    warnings.push('No timeseries data available');
  }
  
  // Process related queries
  if (relatedData?.related_queries) {
    // Get rising queries first, then top queries
    const risingQueries = relatedData.related_queries.rising?.map((q: any) => q.query) || [];
    const topQueries = relatedData.related_queries.top?.map((q: any) => q.query) || [];
    
    // Combine and deduplicate, prioritizing rising queries
    const allQueries = [...new Set([...risingQueries, ...topQueries])];
    top_queries.push(...allQueries.slice(0, 6));
  } else {
    warnings.push('No related queries available');
  }
  
  return {
    updatedAt: new Date().toISOString(),
    filters: { 
      idea: query, 
      geo: geo.toUpperCase(), 
      time_window 
    },
    metrics: [
      {
        name: 'trend_direction',
        value: trend_direction,
        explanation: 'based on last-4-week vs prior-12-week avg',
        confidence
      }
    ],
    series,
    top_queries,
    citations: [
      { 
        label: 'Google Trends (via SerpApi)', 
        url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}&geo=${geo}` 
      }
    ],
    warnings
  };
}

function calculateTrendDirection(points: [string, number][]) {
  if (points.length < 16) {
    return { direction: 'flat', confidence: 0.3 };
  }
  
  // Get last 4 points and previous 12 points
  const last4 = points.slice(-4);
  const previous12 = points.slice(-16, -4);
  
  const avgLast4 = last4.reduce((sum, [_, val]) => sum + val, 0) / last4.length;
  const avgPrevious12 = previous12.reduce((sum, [_, val]) => sum + val, 0) / previous12.length;
  
  const percentChange = ((avgLast4 - avgPrevious12) / avgPrevious12) * 100;
  
  let direction = 'flat';
  let confidence = 0.5;
  
  if (percentChange > 10) {
    direction = 'up';
    confidence = Math.min(0.9, 0.5 + (percentChange / 100));
  } else if (percentChange < -10) {
    direction = 'down';
    confidence = Math.min(0.9, 0.5 + (Math.abs(percentChange) / 100));
  } else {
    confidence = 0.7; // Higher confidence for stable trends
  }
  
  return { direction, confidence };
}

function generateMockData(query: string, geo: string, time_window: string) {
  // Generate mock timeseries data
  const points: [string, number][] = [];
  const today = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    const value = Math.floor(Math.random() * 40 + 30 + (11 - i) * 2); // Slight upward trend
    points.push([date.toISOString().split('T')[0], value]);
  }
  
  return {
    updatedAt: new Date().toISOString(),
    filters: { idea: query, geo, time_window },
    metrics: [
      {
        name: 'trend_direction',
        value: 'up',
        explanation: 'based on last-4-week vs prior-12-week avg',
        confidence: 0.6
      }
    ],
    series: [
      { name: 'search_interest', points }
    ],
    top_queries: [
      `${query} tutorial`,
      `${query} vs competitors`,
      `best ${query}`,
      `${query} pricing`,
      `${query} alternatives`,
      `how to use ${query}`
    ].slice(0, 6),
    citations: [
      { 
        label: 'Google Trends (via SerpApi)', 
        url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(query)}&geo=${geo}` 
      }
    ],
    warnings: ['Using mock data - SerpApi key required for real data']
  };
}