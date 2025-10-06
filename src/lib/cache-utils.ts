/**
 * Centralized cache key utilities for consistent caching across the app
 */

const CACHE_VERSION = 'v2';
const CACHE_PREFIX = 'pmf';

/**
 * Normalize an idea string for use in cache keys
 */
export function normalizeIdeaForCache(idea: string): string {
  if (!idea) return '';
  return idea.trim().toLowerCase().replace(/\s+/g, '_').substring(0, 100);
}

/**
 * Generate a consistent cache key for an idea
 */
export function getCacheKeyForIdea(category: string, idea: string): string {
  const normalized = normalizeIdeaForCache(idea);
  if (!normalized) return '';
  return `${CACHE_PREFIX}.${CACHE_VERSION}.${category}:${normalized}`;
}

/**
 * Parse a cache key to extract the idea
 */
export function getIdeaFromCacheKey(cacheKey: string): string | null {
  const match = cacheKey.match(new RegExp(`${CACHE_PREFIX}\\.${CACHE_VERSION}\\.[^:]+:(.+)`));
  return match ? match[1] : null;
}

/**
 * Get all cache keys for a specific idea
 */
export function getCacheKeysForIdea(idea: string): string[] {
  const normalized = normalizeIdeaForCache(idea);
  if (!normalized) return [];
  
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(`:${normalized}`)) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Clear all caches for a specific idea
 */
export function clearCacheForIdea(idea: string): number {
  const keys = getCacheKeysForIdea(idea);
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`Cleared ${keys.length} cache entries for idea:`, idea.substring(0, 50));
  return keys.length;
}

/**
 * Check if cache exists for an idea and category
 */
export function hasCacheForIdea(category: string, idea: string): boolean {
  const key = getCacheKeyForIdea(category, idea);
  return key ? localStorage.getItem(key) !== null : false;
}

/**
 * Get cache data for an idea and category
 */
export function getCacheForIdea<T = any>(category: string, idea: string): T | null {
  const key = getCacheKeyForIdea(category, idea);
  if (!key) return null;
  
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to parse cache data:', e);
    return null;
  }
}

/**
 * Set cache data for an idea and category
 */
export function setCacheForIdea<T = any>(category: string, idea: string, data: T): boolean {
  const key = getCacheKeyForIdea(category, idea);
  if (!key) return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Failed to set cache data:', e);
    return false;
  }
}
