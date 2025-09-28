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
    const { filters, requestType = 'dashboard', tileType } = await req.json();
    
    console.log('Optimized web search request:', { filters, requestType, tileType });

    // Generate cache key
    const cacheKey = `${filters?.idea_keywords?.join('_')}_${filters?.industry}_${filters?.geography}_${filters?.time_window}_${requestType}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log('Returning cached data for:', cacheKey);
      return new Response(JSON.stringify({ ...cached.data, fromCache: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({
          error: 'Service configuration error',
          message: 'API key not configured'
        }), 
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let responseData;
    
    if (requestType === 'dashboard') {
      // Main dashboard view - run 2 grouped searches
      responseData = await performGroupedSearches(filters, openAIApiKey);
    } else if (requestType === 'tile-details') {
      // On-demand deeper search for specific tile
      responseData = await performTileDetailSearch(filters, tileType, openAIApiKey);
    }
    
    // Cache the response with appropriate TTL
    const ttl = determineTTL(requestType, tileType);
    cache.set(cacheKey, {
      data: responseData,
      expires: Date.now() + ttl
    });
    
    // Clean up old cache entries periodically
    cleanupCache();

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in optimized web search:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Service error',
        message: error instanceof Error ? error.message : 'Unable to process request'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function performGroupedSearches(filters: any, apiKey: string) {
  const ideaKeywords = filters?.idea_keywords?.join(' ') || '';
  const industry = filters?.industry || 'technology';
  const geography = filters?.geography || 'global';
  
  // Group 1: Market & Competition Insights
  const query1 = `Comprehensive insights on ${ideaKeywords} in ${industry}, ${geography}:
    - search trends
    - competitors
    - demographics / target users
    - product-market fit signals
    - market size (TAM/SAM/SOM)
    - comparable startups and funding`;
  
  // Group 2: Operational & Execution Insights
  const query2 = `Operational and execution insights for ${ideaKeywords} in ${industry}, ${geography}:
    - unit economics (CAC/LTV benchmarks)
    - risks (regulatory, technical, adoption)
    - partnerships and integrations
    - investor/mentor interest
    - social sentiment (forums, Reddit, Twitter)
    - roadmap best practices and resources`;
  
  console.log('Performing 2 grouped web searches...');
  
  try {
    // Execute both searches in parallel with timeout
    const searchPromises = [
      executeWebSearch(query1, apiKey),
      executeWebSearch(query2, apiKey)
    ];
    
    const [group1Results, group2Results] = await Promise.all(
      searchPromises.map(p => 
        Promise.race([
          p,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Search timeout')), 7000)
          )
        ])
      )
    );
    
    // Synthesize results using GPT-4o-mini
    const synthesizedData = await synthesizeWithGPT(
      { group1: group1Results, group2: group2Results },
      filters,
      apiKey
    );
    
    return synthesizedData;
  } catch (error) {
    console.error('Error in grouped searches:', error);
    throw error;
  }
}

async function executeWebSearch(query: string, apiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07', // Using GPT-5 mini for web search
        tools: [{ type: "web_search" }],
        input: query,
        max_completion_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.output_text || '';
  } catch (error) {
    console.error('Web search error:', error);
    // Return empty result on error to allow partial results
    return '';
  }
}

async function synthesizeWithGPT(searchResults: any, filters: any, apiKey: string) {
  const synthesisPrompt = `You are a dashboard synthesis engine. Take these grouped search results and create a unified JSON response for all dashboard tiles.

Search Results Group 1 (Market & Competition):
${truncateText(searchResults.group1, 800)}

Search Results Group 2 (Operational & Execution):
${truncateText(searchResults.group2, 800)}

Context:
- Idea Keywords: ${filters?.idea_keywords?.join(', ')}
- Industry: ${filters?.industry || 'technology'}
- Geography: ${filters?.geography || 'global'}

Create a JSON response with this exact structure for each tile type:

{
  "updatedAt": "<ISO8601 timestamp>",
  "filters": ${JSON.stringify(filters)},
  "tiles": {
    "search-trends": {
      "metrics": [
        {"name": "Search Volume", "value": <number>, "unit": "/mo", "explanation": "<string>", "confidence": <0-1>}
      ],
      "items": [],
      "notes": "<brief note>"
    },
    "competitor-landscape": {
      "metrics": [],
      "competitors": [
        {"name": "<company>", "marketShare": <number>, "strengths": ["<string>"]}
      ],
      "notes": "<brief note>"
    },
    "target-audience": {
      "metrics": [
        {"name": "Primary Age", "value": "<age range>", "unit": "", "explanation": "<string>", "confidence": <0-1>}
      ],
      "demographics": {},
      "notes": "<brief note>"
    },
    "pm-fit-score": {
      "metrics": [
        {"name": "PMF Score", "value": <0-100>, "unit": "/100", "explanation": "<string>", "confidence": <0-1>}
      ],
      "signals": [],
      "notes": "<brief note>"
    },
    "market-potential": {
      "metrics": [
        {"name": "TAM", "value": <number>, "unit": "$B", "explanation": "<string>", "confidence": <0-1>},
        {"name": "SAM", "value": <number>, "unit": "$B", "explanation": "<string>", "confidence": <0-1>},
        {"name": "SOM", "value": <number>, "unit": "$B", "explanation": "<string>", "confidence": <0-1>}
      ],
      "notes": "<brief note>"
    },
    "unit-economics": {
      "metrics": [
        {"name": "CAC Benchmark", "value": <number>, "unit": "$", "explanation": "<string>", "confidence": <0-1>},
        {"name": "LTV Benchmark", "value": <number>, "unit": "$", "explanation": "<string>", "confidence": <0-1>}
      ],
      "notes": "<brief note>"
    },
    "risk-matrix": {
      "metrics": [],
      "risks": [
        {"category": "<string>", "level": "high/medium/low", "mitigation": "<string>"}
      ],
      "notes": "<brief note>"
    },
    "social-sentiment": {
      "metrics": [
        {"name": "Sentiment Score", "value": <-100 to 100>, "unit": "", "explanation": "<string>", "confidence": <0-1>}
      ],
      "mentions": [],
      "notes": "<brief note>"
    },
    "partnerships": {
      "metrics": [],
      "opportunities": [],
      "notes": "<brief note>"
    },
    "roadmap": {
      "metrics": [],
      "milestones": [],
      "notes": "<brief note>"
    },
    "resource-estimator": {
      "metrics": [
        {"name": "Initial Budget", "value": <number>, "unit": "$K", "explanation": "<string>", "confidence": <0-1>},
        {"name": "Team Size", "value": <number>, "unit": "people", "explanation": "<string>", "confidence": <0-1>}
      ],
      "notes": "<brief note>"
    },
    "funding-pathways": {
      "metrics": [],
      "pathways": [],
      "notes": "<brief note>"
    },
    "success-stories": {
      "companies": [],
      "notes": "<brief note>"
    },
    "simulations": {
      "scenarios": [],
      "notes": "<brief note>"
    },
    "quick-poll": {
      "questions": [],
      "notes": "<brief note>"
    }
  },
  "searchQueries": ["query1", "query2"],
  "totalSearches": 2,
  "costEstimate": "$0.06",
  "warnings": []
}

IMPORTANT:
- Be conservative with confidence scores
- If data is unknown, use "unknown" and add a warning
- Keep notes brief
- Extract real company names and numbers when found
- Map findings to the most appropriate tiles`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using GPT-4o-mini for cost efficiency
        messages: [
          { role: 'system', content: 'You are a precise JSON synthesis engine. Always return valid JSON.' },
          { role: 'user', content: synthesisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GPT synthesis error:', errorText);
      throw new Error(`Synthesis error: ${response.status}`);
    }

    const data = await response.json();
    const synthesized = JSON.parse(data.choices[0].message.content);
    
    // Add metadata
    synthesized.fromCache = false;
    synthesized.synthesizedAt = new Date().toISOString();
    
    return synthesized;
  } catch (error) {
    console.error('Synthesis error:', error);
    // Return fallback structure on error
    return generateFallbackData(filters);
  }
}

async function performTileDetailSearch(filters: any, tileType: string, apiKey: string) {
  // Targeted search for specific tile when user wants more details
  const ideaKeywords = filters?.idea_keywords?.join(' ') || '';
  
  const tileQueries: Record<string, string> = {
    'competitor-landscape': `Deep competitive analysis for ${ideaKeywords}: company profiles, market share, strengths, weaknesses, recent news`,
    'market-potential': `Detailed market sizing for ${ideaKeywords}: TAM calculation, SAM analysis, SOM projections, growth rates`,
    'unit-economics': `Unit economics deep dive for ${ideaKeywords}: detailed CAC breakdown, LTV analysis, payback period, benchmarks`,
    'social-sentiment': `Social media and forum analysis for ${ideaKeywords}: Reddit discussions, Twitter sentiment, community feedback`,
    'funding-pathways': `Funding landscape for ${ideaKeywords}: recent deals, active investors, valuation benchmarks, funding stages`
  };
  
  const query = tileQueries[tileType] || `Detailed analysis for ${tileType} regarding ${ideaKeywords}`;
  
  const searchResult = await executeWebSearch(query, apiKey);
  
  // Simple parsing for tile-specific details
  return {
    tileType,
    detailedData: searchResult,
    updatedAt: new Date().toISOString(),
    fromCache: false
  };
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function determineTTL(requestType: string, tileType?: string): number {
  // TTL in milliseconds
  if (requestType === 'dashboard') {
    return 60 * 60 * 1000; // 60 minutes for main dashboard
  }
  
  // Specific TTLs for different tile types
  const tileTTLs: Record<string, number> = {
    'social-sentiment': 15 * 60 * 1000, // 15 minutes
    'funding-pathways': 15 * 60 * 1000, // 15 minutes
    'search-trends': 30 * 60 * 1000,    // 30 minutes
    'market-potential': 60 * 60 * 1000, // 60 minutes
    'unit-economics': 60 * 60 * 1000,   // 60 minutes
  };
  
  return tileTTLs[tileType || ''] || 30 * 60 * 1000; // Default 30 minutes
}

function cleanupCache() {
  // Clean up expired cache entries
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expires < now) {
      cache.delete(key);
    }
  }
  
  // Also clean up circuit breaker
  for (const [domain, state] of circuitBreaker.entries()) {
    if (state.resetTime < now) {
      circuitBreaker.delete(domain);
    }
  }
}

function generateFallbackData(filters: any) {
  // Fallback data structure when API calls fail
  return {
    updatedAt: new Date().toISOString(),
    filters,
    tiles: {
      'search-trends': {
        metrics: [],
        items: [],
        notes: "Data temporarily unavailable"
      },
      'competitor-landscape': {
        metrics: [],
        competitors: [],
        notes: "Data temporarily unavailable"
      },
      'market-potential': {
        metrics: [],
        notes: "Data temporarily unavailable"
      },
      'unit-economics': {
        metrics: [],
        notes: "Data temporarily unavailable"
      }
    },
    searchQueries: [],
    totalSearches: 0,
    costEstimate: "$0.00",
    warnings: ["Service temporarily unavailable"],
    fromCache: false
  };
}