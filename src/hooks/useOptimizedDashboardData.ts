import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedDashboardData {
  tiles: Record<string, any>;
  searchQueries?: string[];
  costEstimate?: number;
  updatedAt?: string;
}

// Fetcher with NO fallback data - only real API data
const fetcher = async (key: string, filters: any) => {
  const { data, error } = await supabase.functions.invoke('web-search-optimized', {
    body: { filters, requestType: 'dashboard' }
  });
  
  if (error) {
    console.error('Edge function failed:', error);
    // Return null - no mock data
    return null;
  }
  
  return data;
};

export function useOptimizedDashboardData(filters: any) {
  // Use SWR for data fetching with caching
  const { 
    data, 
    error, 
    isLoading, 
    mutate 
  } = useSWR<OptimizedDashboardData | null>(
    filters ? ['optimized-dashboard', filters] : null,
    ([key, filters]) => fetcher(key, filters),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      errorRetryCount: 2,
      errorRetryInterval: 5000,
      refreshInterval: 0, // Don't auto-refresh
    }
  );

  // Fetch detailed data for a specific tile
  const fetchTileDetails = useCallback(async (tileType: string, tileData: any) => {
    try {
      const { data: detailedData, error } = await supabase.functions.invoke('web-search-optimized', {
        body: { 
          filters,
          tileType,
          requestType: 'tile-detail',
          currentData: tileData
        }
      });

      if (error) {
        console.error(`Failed to fetch detailed data for ${tileType}:`, error);
        return null;
      }

      return detailedData;
    } catch (error) {
      console.error(`Failed to fetch detailed data for ${tileType}:`, error);
      return null;
    }
  }, [filters]);

  // Extract tile-specific data
  const getTileData = useCallback((tileType: string) => {
    if (!data || !data.tiles) return null;
    
    // Map tile types to data keys
    const tileMapping: Record<string, string> = {
      'market_trends': 'market_analysis',
      'google_trends': 'google_trends',
      'reddit_sentiment': 'reddit_sentiment',
      'competitor_analysis': 'competitors',
      'news_analysis': 'news_analysis',
      'web_search': 'web_search'
    };

    const dataKey = tileMapping[tileType] || tileType;
    return data.tiles[dataKey] || null;
  }, [data]);

  // Calculate cost info
  const costInfo = useMemo(() => {
    if (!data) return null;
    
    return {
      estimate: data.costEstimate || 0,
      breakdown: {
        search: (data.searchQueries?.length || 0) * 0.001,
        analysis: 0.002,
        total: data.costEstimate || 0
      }
    };
  }, [data]);

  return {
    data,
    loading: isLoading,
    error: error?.message || null,
    getTileData,
    fetchTileDetails,
    refresh: () => mutate(),
    costInfo
  };
}