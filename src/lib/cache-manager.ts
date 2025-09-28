/**
 * Cache Manager for AI and Search Results
 * Implements SWR (Stale-While-Revalidate) pattern with configurable TTL
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  stale?: boolean;
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry<any>>();
  private static circuitBreaker = new Map<string, { failures: number; lastFailure: number }>();
  
  /**
   * Get cached data with SWR pattern
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Check if still fresh
    if (age < entry.ttl * 60 * 1000) {
      return entry.data;
    }
    
    // Mark as stale but return (SWR pattern)
    entry.stale = true;
    return entry.data;
  }
  
  /**
   * Set cache with TTL in minutes
   */
  static set<T>(key: string, data: T, ttlMinutes: number = 60): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes,
      stale: false,
    });
    
    // Clean up old entries periodically
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }
  
  /**
   * Check if data is stale
   */
  static isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    const age = Date.now() - entry.timestamp;
    return age >= entry.ttl * 60 * 1000;
  }
  
  /**
   * Generate cache key from parameters
   */
  static generateKey(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .map(k => `${k}:${JSON.stringify(params[k])}`)
      .join('|');
    return btoa(sorted).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  /**
   * Circuit breaker for unreliable domains
   */
  static checkCircuitBreaker(domain: string, maxFailures: number = 3, windowMinutes: number = 10): boolean {
    const breaker = this.circuitBreaker.get(domain);
    if (!breaker) return true; // Circuit is closed, allow request
    
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    // Reset if outside window
    if (now - breaker.lastFailure > windowMs) {
      this.circuitBreaker.delete(domain);
      return true;
    }
    
    // Check if circuit should be open
    return breaker.failures < maxFailures;
  }
  
  /**
   * Record failure for circuit breaker
   */
  static recordFailure(domain: string): void {
    const breaker = this.circuitBreaker.get(domain) || { failures: 0, lastFailure: 0 };
    breaker.failures++;
    breaker.lastFailure = Date.now();
    this.circuitBreaker.set(domain, breaker);
    
    console.warn(`Circuit breaker: ${domain} has ${breaker.failures} failures`);
  }
  
  /**
   * Clean up old cache entries
   */
  private static cleanup(): void {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  static getStats(): { size: number; keys: string[]; circuitBreakers: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      circuitBreakers: Array.from(this.circuitBreaker.keys()),
    };
  }
  
  /**
   * Clear all cache
   */
  static clear(): void {
    this.cache.clear();
    this.circuitBreaker.clear();
  }
}