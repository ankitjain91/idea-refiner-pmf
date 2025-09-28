import { useCallback } from 'react';
import useSWR, { SWRConfiguration } from 'swr';

interface CacheConfig {
  cacheKey: string;
  cacheTime: number; // in milliseconds
  fetcher: () => Promise<any>;
  swrOptions?: SWRConfiguration;
}

export function useCachedSWR<T = any>({ 
  cacheKey, 
  cacheTime, 
  fetcher,
  swrOptions = {}
}: CacheConfig) {
  const cacheKeyStorage = `cache:${cacheKey}`;
  
  const fetchWithCache = useCallback(async () => {
    // Check localStorage for cached data
    const cachedData = localStorage.getItem(cacheKeyStorage);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        
        // Return cached data if within cache time
        if (cacheAge < cacheTime) {
          return { ...parsed.data, fromCache: true, cacheAge };
        }
      } catch (e) {
        console.error('Failed to parse cached data:', e);
      }
    }
    
    // Fetch fresh data if cache is stale or missing
    const data = await fetcher();
    
    // Store in localStorage with timestamp
    if (data) {
      try {
        localStorage.setItem(cacheKeyStorage, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Failed to cache data:', e);
        // If localStorage is full, clear old cache entries
        if (e instanceof DOMException && e.code === 22) {
          clearOldCacheEntries();
        }
      }
    }
    
    return { ...data, fromCache: false };
  }, [cacheKey, cacheTime, fetcher]);
  
  return useSWR<T>(
    cacheKey,
    fetchWithCache,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: cacheTime / 2, // Prevent duplicate requests
      refreshInterval: cacheTime, // Auto refresh at cache interval
      shouldRetryOnError: true,
      errorRetryCount: 2,
      revalidateOnMount: false,
      ...swrOptions
    }
  );
}

// Clear old cache entries if localStorage is full
function clearOldCacheEntries() {
  const cacheKeys: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('cache:') || key?.startsWith('market-trends-cache:')) {
      cacheKeys.push(key);
    }
  }
  
  // Sort by timestamp (oldest first) and remove oldest 25%
  const cacheEntries = cacheKeys.map(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      return { key, timestamp: data.timestamp || 0 };
    } catch {
      return { key, timestamp: 0 };
    }
  }).sort((a, b) => a.timestamp - b.timestamp);
  
  const removeCount = Math.ceil(cacheEntries.length * 0.25);
  for (let i = 0; i < removeCount; i++) {
    localStorage.removeItem(cacheEntries[i].key);
  }
}

// Export cache duration constants for consistency
export const CACHE_DURATIONS = {
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
};