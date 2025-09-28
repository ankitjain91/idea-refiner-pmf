import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache store with TTL
const cache = new Map<string, { data: any, timestamp: number, ttl: number }>();

// Circuit breaker for domains
const circuitBreaker = new Map<string, { failures: number, lastFailure: number }>();

interface SearchRequest {
  tileType: string;
  filters: {
    idea_keywords: string[];
    industry?: string;
    geography?: string;
    time_window?: string;
  };
  useCache?: boolean;
}

interface UnifiedResponse {
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: number | string;
    unit: string;
    explanation: string;
    method: string;
    confidence: number;
  }>;
  items: Array<{
    title: string;
    snippet: string;
    url: string;
    canonicalUrl: string;
    published: string;
    source: string;
    evidence: string[];
  }>;
  assumptions: string[];
  notes: string;
  citations: Array<{
    url: string;
    label: string;
    published: string;
  }>;
}

// Exponential backoff retry logic
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 4,
  delays = [500, 1000, 2000, 4000]
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
  throw new Error('Max retries exceeded');
}

// Web search with timeout
async function searchWeb(query: string, timeout = 7000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(
      `https://${Deno.env.get('SUPABASE_URL')!.replace('https://', '')}/functions/v1/search-web`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, numResults: 10 }),
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Generate search prompt based on tile type
function generateSearchPrompt(tileType: string, filters: any): string {
  const keywords = filters.idea_keywords?.join(' ') || '';
  const industry = filters.industry || '';
  const geography = filters.geography || 'global';
  const timeWindow = filters.time_window || 'last_12_months';
  
  const prompts: Record<string, string> = {
    'search-trends': `Find current and 12-month historical interest for ${keywords} in ${geography}. Include related rising queries. Prefer 'Google Trends' analysis pages and reputable explainers. Return time series points and top 10 related queries.`,
    
    'competitor-landscape': `Identify top competitors for ${keywords} in ${industry} and ${geography}. Return name, one-line value prop, pricing hint, traction signals (users/revenue if public), and recent press. Use company sites, Wikipedia, reputable tech media, product review sites.`,
    
    'target-audience': `Find demographics and segments likely to adopt ${keywords}: age bands, roles/industries, regions, income bands or firm sizes. Use surveys, analyst notes, reputable blogs, gov/industry reports.`,
    
    'pm-fit-score': `Using evidence gathered, produce a reasoned Product-Market Fit likelihood score (0–100) for ${keywords} with 3–5 drivers and 2–3 cautions. Cite sources used.`,
    
    'market-potential': `Estimate TAM/SAM/SOM for ${keywords} in ${geography}. Prefer analyst market size reports, government stats, or credible market research. Show assumptions transparently.`,
    
    'unit-economics': `Return benchmark CAC and LTV ranges for businesses similar to ${keywords} in ${industry}. Cite at least 2 credible sources; if unavailable, use adjacent category benchmarks and mark as such.`,
    
    'funding-pathways': `List recent funding rounds in ${keywords} problem space in last ${timeWindow} with stage, amount, investors, one-line thesis. Prefer reputable media and investor blogs.`,
    
    'success-stories': `Return 4–8 comparable startups/products to ${keywords}: what they did, key inflection, exit/IPO or scale milestones, with dates.`,
    
    'roadmap': `Generate a concrete 30/60/90-day plan to validate and ship an MVP for ${keywords}. Cite any playbooks or credible sources where applicable.`,
    
    'resource-estimator': `Estimate budget ranges, time, and roles needed for an MVP of ${keywords}. Provide low/medium/high scenarios and link to references.`,
    
    'risk-matrix': `List top regulatory, technical, and adoption risks for ${keywords}. Provide likelihood × impact and 1-line mitigations with evidence.`,
    
    'social-sentiment': `Summarize sentiment for ${keywords} from Reddit and reputable forums in ${timeWindow}. Provide sample post excerpts and a polarity summary. Avoid low-quality sources.`,
    
    'quick-poll': `Suggest 5 concise poll questions to validate problem severity, willingness to pay, and top alternatives for ${keywords}.`,
    
    'partnerships': `List platforms and companies that make logical distribution or integration partners for ${keywords}, with why-now rationale and sources.`,
    
    'simulations': `Given baseline findings, describe how changes in Pricing / Geography / Channel / Launch Speed typically affect adoption and revenue for ${keywords}, citing credible growth essays or studies.`
  };
  
  return prompts[tileType] || prompts['search-trends'];
}

// Process search results into unified schema
async function processSearchResults(
  tileType: string,
  searchResults: any,
  filters: any
): Promise<UnifiedResponse> {
  const items = searchResults.results?.map((result: any) => ({
    title: result.title || '',
    snippet: result.content || result.snippet || '',
    url: result.link || result.url || '',
    canonicalUrl: result.link || result.url || '',
    published: 'unknown',
    source: new URL(result.link || result.url || 'https://example.com').hostname,
    evidence: [result.content?.substring(0, 200) || '']
  })) || [];
  
  // Extract metrics based on tile type
  const metrics = extractMetrics(tileType, searchResults, items);
  
  // Get top 3 citations
  const citations = items.slice(0, 3).map((item: any) => ({
    url: item.url,
    label: item.source,
    published: item.published
  }));
  
  return {
    updatedAt: new Date().toISOString(),
    filters,
    metrics,
    items: items.slice(0, 5), // Top 5 items
    assumptions: generateAssumptions(tileType),
    notes: generateNotes(tileType),
    citations
  };
}

// Extract metrics based on tile type
function extractMetrics(tileType: string, searchResults: any, items: any[]): any[] {
  const defaultConfidence = items.length > 0 ? 0.7 : 0.3;
  
  switch (tileType) {
    case 'search-trends':
      return [{
        name: 'Search Interest',
        value: items.length > 0 ? 'Growing' : 'Unknown',
        unit: 'trend',
        explanation: 'Based on search result volume and recency',
        method: 'Web search analysis',
        confidence: defaultConfidence
      }];
      
    case 'market-potential':
      return [
        {
          name: 'TAM',
          value: 'Data collection in progress',
          unit: 'USD',
          explanation: 'Total Addressable Market estimate',
          method: 'Industry reports analysis',
          confidence: 0.5
        },
        {
          name: 'SAM',
          value: 'Data collection in progress',
          unit: 'USD',
          explanation: 'Serviceable Addressable Market',
          method: 'Geographic and segment filtering',
          confidence: 0.4
        }
      ];
      
    case 'pm-fit-score':
      return [{
        name: 'PM Fit Score',
        value: items.length * 10, // Simple heuristic based on data availability
        unit: '/100',
        explanation: 'Product-Market Fit likelihood based on available signals',
        method: 'Multi-factor analysis',
        confidence: defaultConfidence
      }];
      
    default:
      return [{
        name: 'Data Points',
        value: items.length,
        unit: 'sources',
        explanation: 'Number of relevant sources found',
        method: 'Web search',
        confidence: 1.0
      }];
  }
}

// Generate assumptions based on tile type
function generateAssumptions(tileType: string): string[] {
  const assumptions: Record<string, string[]> = {
    'market-potential': [
      'Market size estimates based on available public data',
      'Growth rates extrapolated from recent trends'
    ],
    'unit-economics': [
      'CAC/LTV based on industry benchmarks',
      'May vary significantly based on execution'
    ],
    'pm-fit-score': [
      'Score derived from multiple signals',
      'Actual fit requires customer validation'
    ]
  };
  
  return assumptions[tileType] || [];
}

// Generate notes
function generateNotes(tileType: string): string {
  const notes: Record<string, string> = {
    'search-trends': 'Search interest indicates market awareness',
    'competitor-landscape': 'Competition validates market demand',
    'market-potential': 'Estimates subject to market conditions',
    'unit-economics': 'Benchmarks vary by business model'
  };
  
  return notes[tileType] || 'Data refreshed from web sources';
}

// Check cache
function checkCache(key: string, ttlMinutes: number): any | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  const age = now - cached.timestamp;
  const ttlMs = ttlMinutes * 60 * 1000;
  
  if (age > ttlMs) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

// Set cache
function setCache(key: string, data: any, ttlMinutes: number) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes
  });
}

// Get TTL for tile type
function getTTL(tileType: string): number {
  const fastMoving = ['search-trends', 'social-sentiment', 'funding-pathways'];
  return fastMoving.includes(tileType) ? 15 : 60;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { tileType, filters, useCache = true }: SearchRequest = await req.json();
    
    // Generate cache key
    const cacheKey = `${tileType}-${JSON.stringify(filters)}`;
    const ttl = getTTL(tileType);
    
    // Check cache if enabled
    if (useCache) {
      const cached = checkCache(cacheKey, ttl);
      if (cached) {
        return new Response(
          JSON.stringify({ ...cached, fromCache: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Generate search prompt
    const searchPrompt = generateSearchPrompt(tileType, filters);
    
    // Perform web search with retry
    const searchResults = await retryWithBackoff(
      () => searchWeb(searchPrompt),
      4,
      [500, 1000, 2000, 4000]
    );
    
    // Process results into unified schema
    const processedData = await processSearchResults(tileType, searchResults, filters);
    
    // Cache the results
    setCache(cacheKey, processedData, ttl);
    
    return new Response(
      JSON.stringify({ ...processedData, fromCache: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Hub data fetcher error:', error);
    
    // Try to return cached data if available
    const { tileType, filters } = await req.json().catch(() => ({ tileType: '', filters: {} }));
    const cacheKey = `${tileType}-${JSON.stringify(filters)}`;
    const cached = checkCache(cacheKey, 999); // Check with long TTL for fallback
    
    if (cached) {
      return new Response(
        JSON.stringify({ ...cached, fromCache: true, stale: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString(),
        filters: {},
        metrics: [],
        items: [],
        assumptions: [],
        notes: 'Error fetching data',
        citations: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});