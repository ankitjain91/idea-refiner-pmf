import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useToast } from '@/hooks/use-toast';

interface BatchedDataResponse {
  [tileType: string]: {
    data: any;
    fromCache: boolean;
    error?: string;
  };
}

// Global cache for preventing duplicate requests across component instances
const requestCache = new Map<string, Promise<any>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const lastFetchTime = new Map<string, number>();
const activeRequests = new Map<string, boolean>(); // Track active requests globally

export function useBatchedDashboardData(idea: string, tileTypes: string[]) {
  const [data, setData] = useState<BatchedDataResponse>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentSession } = useSession();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasInitializedRef = useRef(false);
  const lastIdeaRef = useRef<string>('');

  const getCacheKey = useCallback(() => {
    if (!idea || !user?.id) return null;
    return `${user.id}_${idea.substring(0, 50)}_${tileTypes.sort().join(',')}`;
  }, [idea, user?.id, tileTypes]);

  const fetchBatchedData = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey();
    if (!cacheKey || tileTypes.length === 0) return;

    // Check if there's already an active request for this exact cache key
    if (activeRequests.get(cacheKey) && !forceRefresh) {
      console.log('⚠️ Request already active for this data, skipping duplicate call');
      return;
    }

    // Check if we recently fetched this data (within 5 minutes)
    if (!forceRefresh) {
      const lastFetch = lastFetchTime.get(cacheKey);
      if (lastFetch && Date.now() - lastFetch < CACHE_DURATION) {
        console.log('✅ Using cached data - fetched', Math.round((Date.now() - lastFetch) / 1000), 'seconds ago');
        
        // Try to load from localStorage
        const cachedResponse: BatchedDataResponse = {};
        let hasAllData = true;
        
        for (const tileType of tileTypes) {
          const localCacheKey = `tile_cache_${tileType}_${idea.substring(0, 50)}`;
          const cachedData = localStorage.getItem(localCacheKey);
          
          if (cachedData) {
            try {
              cachedResponse[tileType] = {
                data: JSON.parse(cachedData),
                fromCache: true
              };
            } catch {
              hasAllData = false;
              break;
            }
          } else {
            hasAllData = false;
            break;
          }
        }
        
        if (hasAllData) {
          setData(cachedResponse);
          return;
        }
      }
    }

    // Check if there's already a request in flight for this exact data
    if (!forceRefresh && requestCache.has(cacheKey)) {
      console.log('♻️ Request already in flight, reusing existing promise');
      try {
        const existingRequest = await requestCache.get(cacheKey);
        if (existingRequest?.success && existingRequest?.data) {
          setData(existingRequest.data);
          lastFetchTime.set(cacheKey, Date.now());
        }
        return;
      } catch (err) {
        console.error('Error waiting for existing request:', err);
      }
    }

    // Mark request as active
    activeRequests.set(cacheKey, true);
    setLoading(true);
    setError(null);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🚀 [${requestId}] Making SINGLE batched API call for ${tileTypes.length} tiles`);
        console.log(`📊 [${requestId}] Tiles requested:`, tileTypes);
        console.log(`🔑 [${requestId}] Cache key:`, cacheKey);
        
        const { data: response, error: fetchError } = await supabase.functions.invoke('hub-batch-data', {
          body: {
            idea,
            tileTypes,
            userId: user?.id,
            sessionId: currentSession?.id,
            filters: {
              geography: localStorage.getItem('selectedContinent') || 'global',
              time_window: 'last_12_months'
            }
          }
        });

        if (fetchError) throw fetchError;

        if (response?.success && response?.data) {
          // Store in localStorage for quick access
          Object.entries(response.data).forEach(([tileType, tileData]: [string, any]) => {
            if (tileData.data && !tileData.error) {
              const localCacheKey = `tile_cache_${tileType}_${idea.substring(0, 50)}`;
              localStorage.setItem(localCacheKey, JSON.stringify(tileData.data));
              localStorage.setItem(`${localCacheKey}_timestamp`, Date.now().toString());
            }
          });

          // Update last fetch time
          lastFetchTime.set(cacheKey, Date.now());
          
          // Clear the request cache after success
          requestCache.delete(cacheKey);
          activeRequests.delete(cacheKey); // Clear active flag
          
          console.log(`✅ [${requestId}] Batch fetch complete - ${response.fetchedCount} tiles loaded`);
          
          return response;
        }
        
        throw new Error('Invalid response from server');
      } catch (err) {
        // Clear the request cache on error
        requestCache.delete(cacheKey);
        activeRequests.delete(cacheKey); // Clear active flag
        throw err;
      }
    })();

    // Store the promise in the cache to prevent duplicate requests
    if (!forceRefresh) {
      requestCache.set(cacheKey, requestPromise);
    }

    try {
      const response = await requestPromise;
      
      if (response?.success && response?.data) {
        setData(response.data);
        
        // Show success toast if all data fetched successfully
        if (response.errorCount === 0) {
          toast({
            title: "Data loaded",
            description: `Successfully loaded ${response.fetchedCount} data tiles`,
            duration: 2000
          });
        } else if (response.errorCount > 0) {
          toast({
            title: "Partial data loaded",
            description: `Loaded ${response.fetchedCount} tiles, ${response.errorCount} failed`,
            variant: "default",
            duration: 3000
          });
        }
      }
    } catch (err) {
      console.error('Batch fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      if (forceRefresh) {  // Only show error toast on manual refresh
        toast({
          title: "Error loading data",
          description: "Some dashboard tiles couldn't be loaded. Please try refreshing.",
          variant: "destructive",
          duration: 4000
        });
      }
    } finally {
      setLoading(false);
    }
  }, [idea, tileTypes, user?.id, currentSession?.id, toast, getCacheKey]);

  // Auto-fetch on mount only - not on every dependency change
  useEffect(() => {
    // Check if idea has actually changed
    if (idea && idea !== lastIdeaRef.current) {
      lastIdeaRef.current = idea;
      hasInitializedRef.current = false; // Reset flag for new idea
    }
    
    // Only fetch once per idea
    if (!hasInitializedRef.current && idea && tileTypes.length > 0) {
      hasInitializedRef.current = true;
      console.log('🎯 Initial dashboard load - fetching all tiles for idea:', idea.substring(0, 50));
      fetchBatchedData();
    }
  }, [idea, tileTypes.length]); // Only re-run when idea or tileTypes change

  // Refresh function for manual refresh
  const refresh = useCallback(async () => {
    const cacheKey = getCacheKey();
    
    // Clear the request cache to force a fresh fetch
    if (cacheKey) {
      requestCache.delete(cacheKey);
      lastFetchTime.delete(cacheKey);
    }
    
    // Clear local storage cache for all tile types
    tileTypes.forEach(tileType => {
      const localCacheKey = `tile_cache_${tileType}_${idea.substring(0, 50)}`;
      localStorage.removeItem(localCacheKey);
      localStorage.removeItem(`${localCacheKey}_timestamp`);
    });

    // Clear database cache
    if (user?.id) {
      try {
        const deletePromises = tileTypes.map(tileType => 
          supabase
            .from('dashboard_data')
            .delete()
            .match({
              user_id: user.id,
              idea_text: idea,
              tile_type: tileType
            })
        );
        await Promise.all(deletePromises);
      } catch (err) {
        console.error('Failed to clear cache:', err);
      }
    }

    // Force refresh
    await fetchBatchedData(true);
  }, [idea, tileTypes, user?.id, fetchBatchedData, getCacheKey]);

  return {
    data,
    loading,
    error,
    refresh
  };
}