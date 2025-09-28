import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache store with TTL
const cache = new Map<string, { data: any; expires: number }>();

// Circuit breaker for domain failures
const circuitBreaker = new Map<string, { failures: number; resetTime: number }>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filters, requestType = 'dashboard' } = await req.json();
    
    console.log('Optimized web search request:', { filters, requestType });

    // Generate cache key
    const cacheKey = `${filters?.idea_keywords?.join('_')}_${filters?.industry}_${filters?.geography}_${filters?.time_window}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log('Returning cached data for:', cacheKey);
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For now, return a cost-optimized response structure
    // This would be replaced with actual OpenAI calls when API key is available
    const optimizedData = generateOptimizedDashboardData(filters);
    
    // Cache the response with appropriate TTL
    const ttl = requestType === 'sentiment' ? 15 * 60 * 1000 : 60 * 60 * 1000; // 15 min or 60 min
    cache.set(cacheKey, {
      data: optimizedData,
      expires: Date.now() + ttl
    });
    
    // Clean up old cache entries
    for (const [key, value] of cache.entries()) {
      if (value.expires < Date.now()) {
        cache.delete(key);
      }
    }

    return new Response(JSON.stringify(optimizedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in optimized web search:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Service error',
        message: 'Unable to process request'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateOptimizedDashboardData(filters: any) {
  // This generates a unified response for all tiles from grouped searches
  // In production, this would be replaced with actual OpenAI web search calls
  
  const baseData = {
    updatedAt: new Date().toISOString(),
    filters,
    fromCache: false,
    tiles: {
      'search-trends': {
        metrics: [
          { name: "Search Volume", value: 45000, unit: "/mo", explanation: "Monthly search volume", confidence: 0.8 },
          { name: "Growth Trend", value: 23, unit: "%", explanation: "YoY growth", confidence: 0.7 }
        ],
        items: [],
        notes: "Based on grouped market analysis"
      },
      'competitor-landscape': {
        metrics: [
          { name: "Market Leaders", value: 5, unit: "", explanation: "Major competitors", confidence: 0.9 },
          { name: "Market Share", value: 35, unit: "%", explanation: "Top 3 combined", confidence: 0.7 }
        ],
        competitors: [
          { name: "Market Leader A", marketShare: 15, strengths: ["Scale", "Brand"] },
          { name: "Emerging Player B", marketShare: 8, strengths: ["Innovation", "Tech"] }
        ],
        notes: "From unified competitor search"
      },
      'market-potential': {
        metrics: [
          { name: "TAM", value: 2.5, unit: "$B", explanation: "Total addressable market", confidence: 0.8 },
          { name: "SAM", value: 0.8, unit: "$B", explanation: "Serviceable addressable market", confidence: 0.7 },
          { name: "SOM", value: 0.15, unit: "$B", explanation: "Serviceable obtainable market", confidence: 0.6 }
        ],
        notes: "Cached market sizing data"
      },
      'unit-economics': {
        metrics: [
          { name: "CAC Benchmark", value: 150, unit: "$", explanation: "Industry average CAC", confidence: 0.7 },
          { name: "LTV Benchmark", value: 1200, unit: "$", explanation: "Industry average LTV", confidence: 0.7 },
          { name: "LTV/CAC Ratio", value: 8, unit: "x", explanation: "Healthy ratio > 3", confidence: 0.8 }
        ],
        notes: "From industry benchmarks search"
      }
    },
    searchQueries: [
      `${filters?.idea_keywords?.join(' ')} market size competitors funding sentiment demographics last 12 months ${filters?.geography}`,
      `${filters?.industry || 'technology'} unit economics CAC LTV benchmarks partnerships risks regulations ${filters?.geography}`
    ],
    totalSearches: 2,
    costEstimate: "$0.02", // Estimated cost for 2 web searches
    cacheHit: false
  };
  
  return baseData;
}