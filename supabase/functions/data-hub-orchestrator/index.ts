import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Provider API Keys
const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
const BRAVE_SEARCH_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
const SCRAPERAPI_API_KEY = Deno.env.get('SCRAPERAPI_API_KEY');

interface FetchPlanItem {
  id: string;
  source: 'serper' | 'tavily' | 'brave' | 'firecrawl' | 'groq' | 'serpapi' | 'scraperapi';
  purpose: string;
  query: string;
  dedupeKey: string;
  dependencies?: string[];
  priority: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, keywords, fetchPlan, userId } = await req.json();
    
    console.log('🚀 DATA_HUB Orchestrator started');
    console.log('📋 Fetch plan:', fetchPlan.length, 'queries');
    console.log('🔑 Keywords:', keywords.length);
    
    // Initialize data indices
    const indices = {
      SEARCH_INDEX: [],
      NEWS_INDEX: [],
      COMPETITOR_INDEX: [],
      REVIEWS_INDEX: [],
      SOCIAL_INDEX: [],
      PRICE_INDEX: [],
      TRENDS_METRICS: {},
      EVIDENCE_STORE: [],
      PROVIDER_LOG: []
    };
    
    // Track provider usage
    const providerCounts = new Map();
    const dedupeMap = new Map();
    
    // Execute fetch plan with deduplication
    const executionPromises = [];
    const processedQueries = new Set();
    
    for (const item of fetchPlan) {
      // Check for deduplication
      if (processedQueries.has(item.dedupeKey)) {
        dedupeMap.set(item.id, dedupeMap.get(item.dedupeKey));
        continue;
      }
      processedQueries.add(item.dedupeKey);
      
      // Track provider usage
      providerCounts.set(item.source, (providerCounts.get(item.source) || 0) + 1);
      
      // Execute based on source
      const promise = executeQuery(item, indices);
      executionPromises.push(promise);
    }
    
    // Execute all queries in parallel
    const results = await Promise.allSettled(executionPromises);
    
    // Log results
    console.log('✅ Executed', results.filter(r => r.status === 'fulfilled').length, 'queries successfully');
    console.log('❌ Failed', results.filter(r => r.status === 'rejected').length, 'queries');
    
    // Update provider log
    providerCounts.forEach((count, provider) => {
      indices.PROVIDER_LOG.push({
        provider,
        requestCount: count,
        dedupeCount: dedupeMap.size,
        estimatedCost: estimateCost(provider, count),
        timestamp: new Date().toISOString()
      });
    });
    
    // Store in Supabase cache
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const cacheKey = `datahub_${userId}_${Date.now()}`;
    const { error: cacheError } = await supabase
      .from('dashboard_data')
      .upsert({
        user_id: userId,
        tile_type: 'data_hub',
        idea_text: input.idea,
        data: indices,
        metadata: {
          keywords,
          fetchPlan: fetchPlan.length,
          providers: Array.from(providerCounts.keys()),
          deduped: dedupeMap.size
        },
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      });
    
    if (cacheError) {
      console.error('Cache storage error:', cacheError);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        indices,
        summary: {
          requests: fetchPlan.length,
          deduped: dedupeMap.size,
          providers_used: Array.from(providerCounts.keys()),
          fetched_at: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Orchestrator error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to orchestrate data hub'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function executeQuery(item: FetchPlanItem, indices: any) {
  try {
    switch (item.source) {
      case 'serper':
        return await executeSerperQuery(item, indices);
      case 'tavily':
        return await executeTavilyQuery(item, indices);
      case 'brave':
        return await executeBraveQuery(item, indices);
      case 'firecrawl':
        return await executeFirecrawlQuery(item, indices);
      case 'serpapi':
        return await executeSerpApiQuery(item, indices);
      case 'scraperapi':
        return await executeScraperApiQuery(item, indices);
      case 'groq':
        return await executeGroqQuery(item, indices);
      default:
        console.warn('Unknown source:', item.source);
    }
  } catch (error) {
    console.error(`Query failed [${item.source}]:`, error);
    indices.PROVIDER_LOG.push({
      provider: item.source,
      error: error.message,
      query: item.query,
      timestamp: new Date().toISOString()
    });
  }
}

async function executeSerperQuery(item: FetchPlanItem, indices: any) {
  if (!SERPER_API_KEY) {
    console.warn('Serper API key not configured');
    return;
  }
  
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: item.query, num: 10 })
  });
  
  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Process results based on purpose
  if (item.purpose.includes('market') || item.purpose.includes('search')) {
    data.organic?.forEach((result: any) => {
      indices.SEARCH_INDEX.push({
        url: result.link,
        title: result.title,
        snippet: result.snippet,
        source: 'serper',
        fetchedAt: new Date().toISOString(),
        relevanceScore: result.position ? (11 - result.position) / 10 : 0.5
      });
      
      // Add to evidence store
      indices.EVIDENCE_STORE.push({
        id: `serper_${indices.EVIDENCE_STORE.length}`,
        url: result.link,
        title: result.title,
        source: 'serper',
        snippet: result.snippet,
        confidence: 0.8,
        tileReferences: [item.purpose.split('_')[0]]
      });
    });
  }
  
  if (item.purpose.includes('competitor')) {
    data.organic?.forEach((result: any) => {
      if (result.title.toLowerCase().includes('vs') || 
          result.title.toLowerCase().includes('alternative') ||
          result.title.toLowerCase().includes('competitor')) {
        // Extract competitor names from title/snippet
        const competitorName = extractCompetitorName(result.title, result.snippet);
        if (competitorName) {
          indices.COMPETITOR_INDEX.push({
            name: competitorName,
            url: result.link,
            pricing: null, // Would need deeper extraction
            features: [],
            claims: [result.snippet],
            traction: null,
            lastUpdated: new Date().toISOString()
          });
        }
      }
    });
  }
}

async function executeTavilyQuery(item: FetchPlanItem, indices: any) {
  if (!TAVILY_API_KEY) {
    console.warn('Tavily API key not configured');
    return;
  }
  
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: item.query,
      search_depth: 'basic',
      max_results: 10
    })
  });
  
  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Process for social sentiment
  if (item.purpose.includes('reddit') || item.purpose.includes('social')) {
    data.results?.forEach((result: any) => {
      const sentiment = analyzeSentiment(result.content);
      indices.SOCIAL_INDEX.push({
        platform: item.purpose.includes('reddit') ? 'reddit' : 'social',
        content: result.content,
        engagement: result.score || 0,
        sentiment,
        date: new Date().toISOString(),
        url: result.url
      });
    });
  }
}

async function executeBraveQuery(item: FetchPlanItem, indices: any) {
  if (!BRAVE_SEARCH_API_KEY) {
    console.warn('Brave Search API key not configured');
    return;
  }
  
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(item.query)}`, {
    headers: {
      'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
    }
  });
  
  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Process for news
  if (item.purpose.includes('news')) {
    data.news?.results?.forEach((article: any) => {
      const tone = analyzeTone(article.description);
      indices.NEWS_INDEX.push({
        publisher: article.meta_url?.hostname || 'unknown',
        title: article.title,
        url: article.url,
        publishedDate: article.age || new Date().toISOString(),
        tone,
        snippet: article.description,
        relevanceScore: 0.7
      });
    });
  }
}

async function executeFirecrawlQuery(item: FetchPlanItem, indices: any) {
  if (!FIRECRAWL_API_KEY) {
    console.warn('Firecrawl API key not configured');
    return;
  }
  
  // Firecrawl for deep competitor extraction
  const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: item.query, // For Firecrawl, query should be a URL
      pageOptions: {
        onlyMainContent: true
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Firecrawl API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (item.purpose.includes('competitor') && data.data) {
    // Extract pricing, features, etc. from the scraped content
    const pricing = extractPricing(data.data.content);
    const features = extractFeatures(data.data.content);
    
    indices.COMPETITOR_INDEX.push({
      name: item.query.split('/')[2], // Extract domain as name
      url: item.query,
      pricing,
      features,
      claims: [],
      traction: null,
      lastUpdated: new Date().toISOString()
    });
    
    if (pricing) {
      indices.PRICE_INDEX.push({
        product: item.query.split('/')[2],
        price: pricing.amount,
        currency: pricing.currency || 'USD',
        source: 'firecrawl',
        date: new Date().toISOString(),
        priceType: pricing.type || 'subscription'
      });
    }
  }
}

async function executeSerpApiQuery(item: FetchPlanItem, indices: any) {
  if (!SERPAPI_KEY) {
    console.warn('SerpAPI key not configured');
    return;
  }
  
  const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(item.query)}&api_key=${SERPAPI_KEY}`);
  
  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Process for market size
  if (item.purpose.includes('market_size')) {
    data.organic_results?.forEach((result: any) => {
      if (result.snippet?.includes('billion') || result.snippet?.includes('million') || result.snippet?.includes('TAM')) {
        indices.SEARCH_INDEX.push({
          url: result.link,
          title: result.title,
          snippet: result.snippet,
          source: 'serpapi',
          fetchedAt: new Date().toISOString(),
          relevanceScore: 0.9
        });
      }
    });
  }
}

async function executeScraperApiQuery(item: FetchPlanItem, indices: any) {
  if (!SCRAPERAPI_API_KEY) {
    console.warn('ScraperAPI key not configured');
    return;
  }
  
  // ScraperAPI for JS-heavy pages
  const response = await fetch(`http://api.scraperapi.com?api_key=${SCRAPERAPI_API_KEY}&url=${encodeURIComponent(item.query)}&render=true`);
  
  if (!response.ok) {
    throw new Error(`ScraperAPI error: ${response.status}`);
  }
  
  const html = await response.text();
  
  // Extract structured data from HTML
  if (item.purpose.includes('pricing')) {
    const prices = extractPricesFromHTML(html);
    prices.forEach((price: any) => {
      indices.PRICE_INDEX.push({
        product: item.query,
        price: price.amount,
        currency: price.currency || 'USD',
        source: 'scraperapi',
        date: new Date().toISOString(),
        priceType: price.type || 'retail'
      });
    });
  }
}

async function executeGroqQuery(item: FetchPlanItem, indices: any) {
  // Groq is for synthesis only, not fetching
  // This would be called in the synthesis phase
  return;
}

// Helper functions
function extractCompetitorName(title: string, snippet: string): string | null {
  // Simple extraction logic - would be more sophisticated in production
  const words = [...title.split(' '), ...snippet.split(' ')];
  const capitalizedWords = words.filter(w => w[0] === w[0].toUpperCase() && w.length > 2);
  return capitalizedWords[0] || null;
}

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['great', 'excellent', 'good', 'amazing', 'love', 'best'];
  const negativeWords = ['bad', 'terrible', 'hate', 'worst', 'awful', 'poor'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function analyzeTone(text: string): 'positive' | 'neutral' | 'negative' {
  return analyzeSentiment(text); // Reuse sentiment analysis
}

function extractPricing(content: string): any {
  // Simple price extraction
  const priceMatch = content.match(/\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) {
    return { amount: parseFloat(priceMatch[1]), currency: 'USD', type: 'subscription' };
  }
  return null;
}

function extractFeatures(content: string): string[] {
  // Simple feature extraction
  const features = [];
  const featureKeywords = ['feature', 'includes', 'offers', 'provides'];
  const lines = content.split('\n');
  
  lines.forEach(line => {
    if (featureKeywords.some(kw => line.toLowerCase().includes(kw))) {
      features.push(line.trim());
    }
  });
  
  return features.slice(0, 10); // Limit to 10 features
}

function extractPricesFromHTML(html: string): any[] {
  const prices = [];
  const priceRegex = /\$(\d+(?:\.\d{2})?)/g;
  let match;
  
  while ((match = priceRegex.exec(html)) !== null) {
    prices.push({
      amount: parseFloat(match[1]),
      currency: 'USD',
      type: 'retail'
    });
  }
  
  return prices.slice(0, 5); // Limit to 5 prices
}

function estimateCost(provider: string, count: number): number {
  const costs: Record<string, number> = {
    serper: 0.001,
    tavily: 0.0005,
    brave: 0.0003,
    firecrawl: 0.002,
    serpapi: 0.001,
    scraperapi: 0.0015,
    groq: 0.0001
  };
  
  return (costs[provider] || 0.001) * count;
}