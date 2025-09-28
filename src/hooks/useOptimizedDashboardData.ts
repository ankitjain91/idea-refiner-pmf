import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useSWR from 'swr';

interface OptimizedDashboardData {
  tiles: Record<string, any>;
  searchQueries: string[];
  totalSearches: number;
  costEstimate: string;
  cacheHit: boolean;
  updatedAt: string;
}

const fetcher = async (key: string, filters: any) => {
  const { data, error } = await supabase.functions.invoke('web-search-optimized', {
    body: { filters, requestType: 'dashboard' }
  });
  
  if (error) throw error;
  return data;
};

export function useOptimizedDashboardData(filters: any) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create a stable cache key from filters
  const cacheKey = `dashboard_${filters?.idea_keywords?.join('_')}_${filters?.industry}_${filters?.geography}_${filters?.time_window}`;
  
  // Use SWR for intelligent caching and revalidation
  const { data, error: swrError, mutate } = useSWR<OptimizedDashboardData>(
    filters?.idea_keywords?.length > 0 ? [cacheKey, filters] : null,
    ([key, filters]) => fetcher(key, filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      errorRetryCount: 1, // Only retry once on error
      errorRetryInterval: 5000, // Wait 5 seconds before retry
      shouldRetryOnError: (error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return true;
      }
    }
  );
  
  // Handle tile-specific data requests (on-demand when user opens details)
  const fetchTileDetails = useCallback(async (tileType: string) => {
    if (!filters?.idea_keywords?.length) return null;
    
    try {
      const { data: detailsData, error: detailsError } = await supabase.functions.invoke('web-search-optimized', {
        body: {
          filters,
          requestType: 'tile-details',
          tileType
        }
      });
      
      if (detailsError) throw detailsError;
      return detailsData;
    } catch (err) {
      console.error(`Error fetching details for ${tileType}:`, err);
      return null;
    }
  }, [filters]);
  
  // Extract tile data from the optimized response
  const getTileData = useCallback((tileType: string) => {
    if (!data?.tiles) return null;
    
    const tileData = data.tiles[tileType];
    if (!tileData) return null;
    
    // Transform to match existing DataTile format
    return {
      updatedAt: data.updatedAt,
      filters,
      metrics: tileData.metrics || [],
      items: tileData.items || [],
      competitors: tileData.competitors || [],
      insights: tileData.insights || [],
      projections: tileData.projections || {},
      assumptions: [`Cost-optimized: ${data.totalSearches} searches, ${data.costEstimate}`],
      notes: tileData.notes || '',
      citations: [],
      fromCache: data.cacheHit,
      stale: false
    };
  }, [data, filters]);
  
  useEffect(() => {
    if (swrError) {
      setError(swrError.message || 'Failed to fetch dashboard data');
    } else {
      setError(null);
    }
  }, [swrError]);
  
  return {
    data,
    loading: !data && !swrError && filters?.idea_keywords?.length > 0,
    error,
    getTileData,
    fetchTileDetails,
    refresh: mutate,
    costInfo: data ? {
      totalSearches: data.totalSearches,
      costEstimate: data.costEstimate,
      cacheHit: data.cacheHit
    } : null
  };
}