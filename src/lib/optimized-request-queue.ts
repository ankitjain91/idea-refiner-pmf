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

  // Optimized Supabase function invocation
  async invokeFunction(functionName: string, body?: any): Promise<any> {
    const cacheKey = `fn:${functionName}:${JSON.stringify(body || {})}`;
    
    // Check cache first
    const cachedData = await this.checkCache(cacheKey);
    if (cachedData) {
      console.log(`[OptimizedQueue] Function cache HIT: ${functionName}`);
      return cachedData;
    }

    // Queue through optimization pipeline
    console.log(`[OptimizedQueue] Function cache MISS, queueing: ${functionName}`);
    const result = await baseInvoke(functionName, body);
    
    // Cache the result
    if (result && !result.error) {
      await this.storeInCache(cacheKey, result, functionName);
    }
    
    return result;
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

  private async storeInCache(key: string, data: any, source: string): Promise<void> {
    try {
      // Store in unified response cache
      await this.cache.storeResponse({
        idea: 'global',
        source,
        endpoint: key,
        rawResponse: data,
        expiresAt: Date.now() + 3600000, // 1 hour
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
}

// Export singleton instance
export const optimizedQueue = OptimizedRequestQueue.getInstance();