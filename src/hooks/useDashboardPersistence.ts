import { useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SimpleSessionContext';

/**
 * Hook to persist dashboard data as it's generated
 * Automatically captures and saves dashboard data to the current session
 */
export const useDashboardPersistence = () => {
  const { currentSession, saveCurrentSession } = useSession();

  /**
   * Save specific dashboard data to localStorage and trigger session save
   */
  const persistDashboardData = useCallback((key: string, data: any) => {
    if (!currentSession) return;

    try {
      // Save to localStorage based on data type
      if (typeof data === 'object') {
        localStorage.setItem(key, JSON.stringify(data));
      } else {
        localStorage.setItem(key, String(data));
      }

      // Trigger session save after a short delay to batch updates
      const timeoutId = setTimeout(() => {
        saveCurrentSession();
      }, 1000);

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error(`Error persisting dashboard data for ${key}:`, error);
    }
  }, [currentSession, saveCurrentSession]);

  /**
   * Persist tile data with cache key
   */
  const persistTileData = useCallback((tileType: string, data: any) => {
    if (!currentSession) return;

    const cacheKey = `tile_cache_${tileType}`;
    const refreshKey = `tile_last_refresh_${tileType}`;

    try {
      // Save tile data
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(refreshKey, new Date().toISOString());

      // Trigger session save
      setTimeout(() => {
        saveCurrentSession();
      }, 1000);
    } catch (error) {
      console.error(`Error persisting tile data for ${tileType}:`, error);
    }
  }, [currentSession, saveCurrentSession]);

  /**
   * Persist component-specific data
   */
  const persistComponentData = useCallback((componentName: string, data: any) => {
    if (!currentSession) return;

    const key = `${componentName}Data`;
    persistDashboardData(key, data);
  }, [currentSession, persistDashboardData]);

  /**
   * Persist chart data
   */
  const persistChartData = useCallback((chartName: string, data: any) => {
    if (!currentSession) return;

    const key = `${chartName}ChartData`;
    persistDashboardData(key, data);
  }, [currentSession, persistDashboardData]);

  /**
   * Persist web search results
   */
  const persistWebSearchResults = useCallback((searchType: string, results: any) => {
    if (!currentSession) return;

    try {
      // Get existing web search results
      const existingResults = JSON.parse(localStorage.getItem('webSearchResults') || '{}');
      
      // Update with new results
      existingResults[searchType] = {
        data: results,
        timestamp: new Date().toISOString()
      };

      // Save updated results
      localStorage.setItem('webSearchResults', JSON.stringify(existingResults));

      // Trigger session save
      setTimeout(() => {
        saveCurrentSession();
      }, 1000);
    } catch (error) {
      console.error(`Error persisting web search results for ${searchType}:`, error);
    }
  }, [currentSession, saveCurrentSession]);

  /**
   * Persist UI state (filters, expanded cards, etc.)
   */
  const persistUIState = useCallback((stateType: string, state: any) => {
    if (!currentSession) return;

    persistDashboardData(stateType, state);
  }, [currentSession, persistDashboardData]);

  /**
   * Auto-save dashboard data on window unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSession) {
        saveCurrentSession();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentSession, saveCurrentSession]);

  return {
    persistDashboardData,
    persistTileData,
    persistComponentData,
    persistChartData,
    persistWebSearchResults,
    persistUIState
  };
};