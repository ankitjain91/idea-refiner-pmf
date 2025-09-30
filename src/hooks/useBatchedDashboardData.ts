import { useState, useEffect, useCallback } from 'react';
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

export function useBatchedDashboardData(idea: string, tileTypes: string[]) {
  const [data, setData] = useState<BatchedDataResponse>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentSession } = useSession();
  const { toast } = useToast();

  const fetchBatchedData = useCallback(async () => {
    if (!idea || tileTypes.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching batch data for ${tileTypes.length} tiles`);
      
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
        setData(response.data);
        
        // Store in localStorage for quick access
        Object.entries(response.data).forEach(([tileType, tileData]: [string, any]) => {
          if (tileData.data && !tileData.error) {
            const cacheKey = `tile_cache_${tileType}_${idea.substring(0, 50)}`;
            localStorage.setItem(cacheKey, JSON.stringify(tileData.data));
            localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
          }
        });

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
      toast({
        title: "Error loading data",
        description: "Some dashboard tiles couldn't be loaded. Please try refreshing.",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  }, [idea, tileTypes, user?.id, currentSession?.id, toast]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchBatchedData();
  }, [fetchBatchedData]);

  // Refresh function for manual refresh
  const refresh = useCallback(async () => {
    // Clear local storage cache for all tile types
    tileTypes.forEach(tileType => {
      const cacheKey = `tile_cache_${tileType}_${idea.substring(0, 50)}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`${cacheKey}_timestamp`);
    });

    // Clear database cache (simplified to avoid TypeScript issues)
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

    // Refetch
    await fetchBatchedData();
  }, [idea, tileTypes, user?.id, fetchBatchedData]);

  return {
    data,
    loading,
    error,
    refresh
  };
}