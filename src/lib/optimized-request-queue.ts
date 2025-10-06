import { GlobalRequestManager, invokeSupabaseFunction as baseInvoke, queuedFetch as baseFetch } from './request-queue';
import { UnifiedResponseCache } from './cache/unifiedResponseCache';

// Enhanced client-side request queue with heavy caching and optimization
export class OptimizedRequestQueue {
  private static instance: OptimizedRequestQueue;
  private requestManager: GlobalRequestManager;
  private cache: UnifiedResponseCache;
  
  private constructor() {
    this.requestManager = GlobalRequestManager.getInstance();
    this.cache = UnifiedResponseCache.getInstance();
  }

  static getInstance(): OptimizedRequestQueue {
    if (!OptimizedRequestQueue.instance) {
      OptimizedRequestQueue.instance = new OptimizedRequestQueue();
    }
    return OptimizedRequestQueue.instance;
  }

  // Optimized fetch with caching pipeline
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const cacheKey = this.generateCacheKey(url, options);
    
    // Check cache first
    const cachedResponse = await this.checkCache(cacheKey);
    if (cachedResponse) {
      console.log(`[OptimizedQueue] Cache HIT: ${url}`);
      return new Response(JSON.stringify(cachedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    // Queue the request through optimization pipeline
    console.log(`[OptimizedQueue] Cache MISS, queueing: ${url}`);
    const response = await baseFetch(url, options);
    
    // Cache successful responses
    if (response.ok) {
      try {
        const data = await response.clone().json();
        await this.storeInCache(cacheKey, data, url);
      } catch (e) {
        console.warn('[OptimizedQueue] Could not cache response:', e);
      }
    }
    
    return response;
  }

  // Optimized Supabase function invocation with heavy caching
  async invokeFunction(functionName: string, body?: any): Promise<any> {
    const cacheKey = `fn:${functionName}:${JSON.stringify(body || {})}`;
    
    // Check multiple cache layers
    const cachedData = await this.checkCache(cacheKey);
    if (cachedData) {
      console.log(`[OptimizedQueue] Function cache HIT: ${functionName}`);
      // Add small delay to prevent cache stampede
      await new Promise(resolve => setTimeout(resolve, 10));
      return cachedData;
    }

    // Check if identical request is already in flight (deduplication)
    const inFlightKey = `inflight:${cacheKey}`;
    const inFlightRequest = this.getInFlightRequest(inFlightKey);
    if (inFlightRequest) {
      console.log(`[OptimizedQueue] Deduping request: ${functionName}`);
      return await inFlightRequest;
    }

    // Queue through optimization pipeline
    console.log(`[OptimizedQueue] Function cache MISS, queueing: ${functionName}`);
    
    // Store promise for deduplication
    const requestPromise = baseInvoke(functionName, body);
    this.setInFlightRequest(inFlightKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Cache the result with extended TTL for sentiment/reddit data
      if (result && !result.error) {
        const ttl = this.getTTLForFunction(functionName);
        await this.storeInCache(cacheKey, result, functionName, ttl);
      }
      
      return result;
    } finally {
      // Clean up in-flight tracking
      this.clearInFlightRequest(inFlightKey);
    }
  }

  // In-flight request tracking for deduplication
  private inFlightRequests = new Map<string, Promise<any>>();

  private getInFlightRequest(key: string): Promise<any> | undefined {
    return this.inFlightRequests.get(key);
  }

  private setInFlightRequest(key: string, promise: Promise<any>): void {
    this.inFlightRequests.set(key, promise);
  }

  private clearInFlightRequest(key: string): void {
    this.inFlightRequests.delete(key);
  }

  // Function-specific TTL configuration - HEAVY CACHING
  private getTTLForFunction(functionName: string): number {
    const ttlMap: Record<string, number> = {
      'reddit-sentiment': 43200000, // 12 hours for Reddit data
      'reddit-research': 43200000, // 12 hours for Reddit research data
      'unified-sentiment': 43200000, // 12 hours for unified sentiment
      'market-trends': 86400000, // 24 hours for market trends
      'google-trends': 86400000, // 24 hours for Google trends
      'news-analysis': 43200000, // 12 hours for news
      'web-search': 86400000, // 24 hours for web search
      'twitter-search': 21600000, // 6 hours for Twitter
      'youtube-search': 86400000, // 24 hours for YouTube
      'market-size-analysis': 604800000, // 7 days for market size
      'competitive-landscape': 259200000, // 3 days for competition
      'financial-analysis': 259200000, // 3 days for financials
      'execution-insights': 259200000, // 3 days for execution
      'funding-tracker': 604800000, // 7 days for funding
      'launch-timeline': 604800000, // 7 days for launch timeline
      'dashboard-insights': 43200000, // 12 hours for dashboard
      'generate-ai-insights': 86400000, // 24 hours for AI insights
      'analyze-idea': 259200000, // 3 days for idea analysis
      'calculate-smoothbrains-score': 86400000, // 24 hours for PMF score
      'user-engagement': 21600000, // 6 hours for engagement
      'social-sentiment': 21600000, // 6 hours for social sentiment
    };
    
    return ttlMap[functionName] || 21600000; // Default 6 hours
  }

  private generateCacheKey(url: string, options?: any): string {
    const params = {
      url,
      method: options?.method || 'GET',
      body: options?.body ? JSON.stringify(options.body) : undefined
    };
    
    
    return Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
  }

  private async checkCache(key: string): Promise<any | null> {
    try {
      // First check unified response cache
      const responses = await this.cache.queryResponses({
        topics: [key],
        maxAge: 3600000 // 1 hour
      });
      
      if (responses.length > 0) {
        return responses[0].rawResponse;
      }

      // Check localStorage as fallback
      const localCache = localStorage.getItem(`cache:${key}`);
      if (localCache) {
        const parsed = JSON.parse(localCache);
        if (parsed.expiresAt > Date.now()) {
          return parsed.data;
        }
        localStorage.removeItem(`cache:${key}`);
      }
    } catch (error) {
      console.error('[OptimizedQueue] Cache check error:', error);
    }
    
    return null;
  }

  private async storeInCache(key: string, data: any, source: string, ttl?: number): Promise<void> {
    const effectiveTTL = ttl || 3600000; // Default 1 hour
    
    try {
      // Store in unified response cache
      await this.cache.storeResponse({
        idea: 'global',
        source,
        endpoint: key,
        rawResponse: data,
        expiresAt: Date.now() + effectiveTTL,
        metadata: {
          confidence: 0.9,
          extractedTopics: [key]
        }
      });

      // Also store in localStorage for quick access
      const cacheEntry = {
        data,
        expiresAt: Date.now() + 3600000,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem(`cache:${key}`, JSON.stringify(cacheEntry));
      } catch (e) {
        // Handle quota exceeded
        this.cleanupLocalStorage();
        try {
          localStorage.setItem(`cache:${key}`, JSON.stringify(cacheEntry));
        } catch {
          console.warn('[OptimizedQueue] localStorage full, skipping cache');
        }
      }
    } catch (error) {
      console.error('[OptimizedQueue] Cache store error:', error);
    }
  }

  private cleanupLocalStorage(): void {
    const cacheKeys = Object.keys(localStorage)
      .filter(k => k.startsWith('cache:'));
    
    // Remove oldest entries
    const entries = cacheKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return { key, timestamp: data.timestamp || 0 };
      } catch {
        return { key, timestamp: 0 };
      }
    }).sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }
    
    console.log(`[OptimizedQueue] Cleaned up ${toRemove} old cache entries`);
  }

  // Get cache statistics
  async getCacheStats() {
    const cacheStats = await this.cache.getStats();
    const queueStatus = this.requestManager.getQueueStatus();
    
    return {
      cache: cacheStats,
      queue: queueStatus,
      localStorage: {
        entries: Object.keys(localStorage).filter(k => k.startsWith('cache:')).length,
        size: new Blob(Object.values(localStorage)).size
      }
    };
  }

  // Clear all caches
  async clearAllCaches() {
    await this.cache.clearAll();
    
    // Clear localStorage cache
    const cacheKeys = Object.keys(localStorage)
      .filter(k => k.startsWith('cache:'));
    
    for (const key of cacheKeys) {
      localStorage.removeItem(key);
    }
    
    console.log('[OptimizedQueue] All caches cleared');
  }
  // Warm cache for common requests
  async warmCache(idea: string): Promise<void> {
    const warmupFunctions = [
      { name: 'unified-sentiment', body: { idea, detailed: true } },
      { name: 'reddit-sentiment', body: { idea, detailed: true } },
      { name: 'market-trends', body: { idea } },
      { name: 'google-trends', body: { idea } },
      { name: 'web-search', body: { idea_keywords: idea } }
    ];

    console.log(`[OptimizedQueue] Warming cache for: ${idea}`);
    
    // Parallel cache warming with staggered delays
    await Promise.all(
      warmupFunctions.map(async (fn, index) => {
        // Stagger requests by 100ms to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        try {
          await this.invokeFunction(fn.name, fn.body);
          console.log(`[OptimizedQueue] Warmed ${fn.name}`);
        } catch (error) {
          console.warn(`[OptimizedQueue] Failed to warm ${fn.name}:`, error);
        }
      })
    );
  }

  // Batch prefetch for related data
  async prefetchRelated(functionName: string, body: any): Promise<void> {
    // Define related functions to prefetch
    const relatedFunctions: Record<string, Array<{ name: string; body?: any }>> = {
      'unified-sentiment': [
        { name: 'reddit-sentiment', body },
        { name: 'social-sentiment', body }
      ],
      'market-trends': [
        { name: 'google-trends', body },
        { name: 'market-size-analysis', body }
      ]
    };

    const related = relatedFunctions[functionName];
    if (related) {
      // Prefetch in background without blocking
      setTimeout(async () => {
        for (const fn of related) {
          try {
            await this.invokeFunction(fn.name, fn.body || body);
          } catch (error) {
            console.warn(`[OptimizedQueue] Prefetch failed for ${fn.name}`);
          }
        }
      }, 500);
    }
  }
}

// Export singleton instance
export const optimizedQueue = OptimizedRequestQueue.getInstance();