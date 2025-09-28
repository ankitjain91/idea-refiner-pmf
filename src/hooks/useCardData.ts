/**
 * useCardData Hook
 * Manages card data fetching, caching, and auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardDataFetcher, CardData, CardType } from '@/lib/dashboard-data-fetcher';
import { useToast } from '@/hooks/use-toast';

export interface UseCardDataOptions {
  cardType: CardType;
  idea: string;
  industry?: string;
  geo?: string;
  time_window?: string;
  autoRefreshInterval?: number; // in milliseconds, 0 = disabled
}

export interface UseCardDataReturn {
  data: CardData | null;
  loading: boolean;
  error: string | null;
  status: 'unloaded' | 'loading' | 'ready' | 'error';
  lastUpdated: Date | null;
  cacheAge: number; // in seconds
  load: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  setAutoRefresh: (intervalMs: number) => void;
  stopAutoRefresh: () => void;
  isAutoRefreshOn: boolean;
}

export function useCardData(options: UseCardDataOptions): UseCardDataReturn {
  const { cardType, idea, industry, geo, time_window, autoRefreshInterval = 0 } = options;
  const { toast } = useToast();
  
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'unloaded' | 'loading' | 'ready' | 'error'>('unloaded');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [cacheAge, setCacheAge] = useState(0);
  const [currentAutoRefreshInterval, setCurrentAutoRefreshInterval] = useState(autoRefreshInterval);
  
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cacheAgeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update cache age every second
  useEffect(() => {
    if (lastUpdated) {
      const updateCacheAge = () => {
        const age = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        setCacheAge(age);
      };
      
      updateCacheAge();
      cacheAgeTimerRef.current = setInterval(updateCacheAge, 1000);
      
      return () => {
        if (cacheAgeTimerRef.current) {
          clearInterval(cacheAgeTimerRef.current);
        }
      };
    }
  }, [lastUpdated]);

  // Load data function
  const load = useCallback(async (force = false) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Don't load if already loading (unless forced)
    if (loading && !force) return;
    
    setLoading(true);
    setError(null);
    setStatus('loading');
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      const result = await DashboardDataFetcher.fetchCardData(
        cardType,
        {
          idea,
          industry,
          geo,
          time_window,
          force,
        }
      );
      
      setData(result);
      setStatus('ready');
      setLastUpdated(new Date());
      setCacheAge(0);
      
      // Show warnings if any
      if (result.warnings?.length > 0) {
        toast({
          title: 'Data Notice',
          description: result.warnings[0],
          variant: 'default',
        });
      }
    } catch (err: any) {
      // Don't show error for cancelled requests
      if (err.message !== 'Request cancelled') {
        const errorMessage = err.message || 'Failed to load data';
        setError(errorMessage);
        setStatus('error');
        
        // Keep existing data if available
        if (!data) {
          toast({
            title: 'Error Loading Data',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [cardType, idea, industry, geo, time_window, loading, data, toast]);

  // Refresh function (always forces fresh fetch)
  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  // Set auto-refresh interval
  const setAutoRefresh = useCallback((intervalMs: number) => {
    // Clear existing timer
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
    
    setCurrentAutoRefreshInterval(intervalMs);
    
    // Set new timer if interval > 0
    if (intervalMs > 0 && status === 'ready') {
      autoRefreshTimerRef.current = setInterval(() => {
        load(false); // Use cache if still valid
      }, intervalMs);
      
      // Save preference to localStorage
      localStorage.setItem(`card-refresh-${cardType}`, intervalMs.toString());
    }
  }, [cardType, status, load]);

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
    setCurrentAutoRefreshInterval(0);
    localStorage.removeItem(`card-refresh-${cardType}`);
  }, [cardType]);

  // Load saved auto-refresh preference on mount
  useEffect(() => {
    const savedInterval = localStorage.getItem(`card-refresh-${cardType}`);
    if (savedInterval) {
      const interval = parseInt(savedInterval, 10);
      if (interval > 0) {
        setCurrentAutoRefreshInterval(interval);
      }
    }
  }, [cardType]);

  // Handle auto-refresh when data is ready
  useEffect(() => {
    if (currentAutoRefreshInterval > 0 && status === 'ready') {
      autoRefreshTimerRef.current = setInterval(() => {
        load(false);
      }, currentAutoRefreshInterval);
      
      return () => {
        if (autoRefreshTimerRef.current) {
          clearInterval(autoRefreshTimerRef.current);
        }
      };
    }
  }, [currentAutoRefreshInterval, status, load]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
      if (cacheAgeTimerRef.current) {
        clearInterval(cacheAgeTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    status,
    lastUpdated,
    cacheAge,
    load,
    refresh,
    setAutoRefresh,
    stopAutoRefresh,
    isAutoRefreshOn: currentAutoRefreshInterval > 0,
  };
}
