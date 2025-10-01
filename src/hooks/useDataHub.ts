import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  DataHubOrchestrator, 
  DataHubInput, 
  DataHubIndices,
  TileData 
} from '@/lib/data-hub-orchestrator';

interface DataHubState {
  indices: DataHubIndices | null;
  tiles: Record<string, TileData>;
  loading: boolean;
  error: string | null;
  summary: any;
  lastFetchTime: string | null;
}

export function useDataHub(input: DataHubInput) {
  const [state, setState] = useState<DataHubState>({
    indices: null,
    tiles: {},
    loading: false,
    error: null,
    summary: null,
    lastFetchTime: null
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const orchestratorRef = useRef<DataHubOrchestrator | null>(null);
  const hasFetchedRef = useRef(false);
  
  // Initialize orchestrator
  useEffect(() => {
    orchestratorRef.current = new DataHubOrchestrator();
  }, []);
  
  const fetchDataHub = useCallback(async (forceRefresh = false) => {
    if (!user?.id || !input.idea) {
      setState(prev => ({ ...prev, error: 'Missing user or idea' }));
      return;
    }
    
    // Check if already fetched (unless force refresh)
    const cacheKey = `datahub_${user.id}_${btoa(input.idea).substring(0, 20)}`;
    
    if (!forceRefresh && hasFetchedRef.current) {
      console.log('📊 Using existing DATA_HUB data');
      return;
    }
    
    // Check localStorage cache
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          const cacheAge = Date.now() - new Date(cachedData.fetchedAt).getTime();
          
          // Use cache if less than 5 minutes old
          if (cacheAge < 5 * 60 * 1000) {
            console.log('✅ Using cached DATA_HUB (age:', Math.round(cacheAge / 1000), 'seconds)');
            setState(prev => ({
              ...prev,
              ...cachedData,
              loading: false
            }));
            hasFetchedRef.current = true;
            return;
          }
        } catch (e) {
          console.error('Cache parse error:', e);
        }
      }
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const orchestrator = orchestratorRef.current!;
      
      // PHASE 1: Build fetch plan
      const keywords = orchestrator.normalizeInput(input);
      const fetchPlan = orchestrator.buildFetchPlan(input, keywords);
      
      console.log('📋 FETCH_PLAN created:', {
        queries: fetchPlan.length,
        deduped: new Set(fetchPlan.map(p => p.dedupeKey)).size,
        providers: [...new Set(fetchPlan.map(p => p.source))]
      });
      
      // PHASE 2: Execute via edge function
      const { data: hubData, error: fetchError } = await supabase.functions.invoke('data-hub-orchestrator', {
        body: {
          input,
          keywords,
          fetchPlan,
          userId: user.id
        }
      });
      
      if (fetchError) throw fetchError;
      
      if (!hubData?.success) {
        throw new Error(hubData?.error || 'Failed to fetch data hub');
      }
      
      // PHASE 3: Synthesize tiles from hub data
      const tileTypes = [
        'pmf_score', 'market_size', 'competition', 'sentiment',
        'market_trends', 'google_trends', 'web_search', 'reddit_sentiment',
        'twitter_buzz', 'growth_potential', 'market_readiness',
        'competitive_advantage', 'risk_assessment'
      ];
      
      const synthesizedTiles: Record<string, TileData> = {};
      
      // Set the indices in orchestrator (from edge function response)
      if (hubData.indices) {
        // The orchestrator would need a method to set indices
        // For now, we'll pass them through
        for (const tileType of tileTypes) {
          synthesizedTiles[tileType] = orchestrator.synthesizeTileData(tileType);
        }
      }
      
      const summary = orchestrator.getHubSummary();
      const fetchTime = new Date().toISOString();
      
      // Update state
      const newState = {
        indices: hubData.indices || null,
        tiles: synthesizedTiles,
        loading: false,
        error: null,
        summary,
        lastFetchTime: fetchTime
      };
      
      setState(newState);
      hasFetchedRef.current = true;
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify({
        ...newState,
        fetchedAt: fetchTime
      }));
      
      toast({
        title: "Data Hub Updated",
        description: `Fetched ${fetchPlan.length} queries, synthesized ${tileTypes.length} tiles`,
        duration: 3000
      });
      
    } catch (error) {
      console.error('DATA_HUB fetch error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data hub'
      }));
      
      toast({
        title: "Data Hub Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    }
  }, [input, user?.id, toast]);
  
  // Auto-fetch on mount
  useEffect(() => {
    if (input.idea && !hasFetchedRef.current) {
      console.log('🚀 Initial DATA_HUB fetch for:', input.idea.substring(0, 50));
      fetchDataHub();
    }
  }, [input.idea]);
  
  const refresh = useCallback(() => {
    hasFetchedRef.current = false;
    const cacheKey = `datahub_${user?.id}_${btoa(input.idea).substring(0, 20)}`;
    localStorage.removeItem(cacheKey);
    return fetchDataHub(true);
  }, [fetchDataHub, user?.id, input.idea]);
  
  const getTileData = useCallback((tileType: string): TileData | null => {
    return state.tiles[tileType] || null;
  }, [state.tiles]);
  
  return {
    ...state,
    fetchDataHub,
    refresh,
    getTileData
  };
}