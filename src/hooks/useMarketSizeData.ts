import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SimpleSessionContext';
import { LS_KEYS } from '@/lib/storage-keys';
import { getCacheKeyForIdea, getCacheForIdea, setCacheForIdea } from '@/lib/cache-utils';

export interface MarketSizeData {
  TAM: string;
  SAM: string;
  SOM: string;
  growth_rate: string;
  regions: Array<{
    region: string;
    TAM: string;
    SAM: string;
    SOM: string;
    growth: string;
    confidence: string;
  }>;
  confidence: string;
  explanation: string;
  citations: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
  charts: any[];
  enriched?: {
    marketIntelligence: {
      keyTrends: string[];
      disruptors: string[];
      marketMaturity: string;
      technologyAdoption: number;
      regulatoryRisk: string;
    };
    liveIndicators: {
      searchVolume: {
        volume: number;
        trend: string;
      };
      socialSentiment: {
        score: number;
        mentions: number;
      };
      newsActivity: {
        articles: number;
        sentiment: string;
      };
      fundingActivity: {
        deals: number;
        totalAmount: string;
        lastDeal: string;
      };
    };
    competitiveAnalysis: {
      topCompetitors: any[];
      marketConcentration: string;
      barrierToEntry: string;
    };
    projections: {
      nextYear: string;
      fiveYear: string;
      keyDrivers: string[];
      risks: string[];
    };
  };
}

export function useMarketSizeData(idea?: string) {
  const [data, setData] = useState<MarketSizeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentSession } = useSession();

  // Resolve and normalize the current idea from multiple known sources
  const resolveIdea = () => {
    try {
      const fromProp = idea?.trim();
      if (fromProp) return fromProp;
      const fromSession = currentSession?.data?.currentIdea?.trim();
      if (fromSession) return fromSession;
      const fromUserIdea = localStorage.getItem(LS_KEYS.userIdea)?.trim();
      if (fromUserIdea) return fromUserIdea;
      const appIdeaRaw = localStorage.getItem('appIdea');
      if (appIdeaRaw) {
        try {
          const parsed = JSON.parse(appIdeaRaw);
          const summary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : '';
          if (summary) return summary;
        } catch {}
      }
      const legacy = localStorage.getItem('current_idea')?.trim();
      if (legacy) return legacy;
    } catch {}
    return '';
  };

  const resolvedIdea = resolveIdea();
  const normalizedIdea = resolvedIdea ? resolvedIdea.trim().toLowerCase() : '';

  const fetchMarketData = async () => {
    if (!resolvedIdea) {
      setError('No idea provided');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: functionError } = await supabase.functions.invoke('market-size-analysis', {
        body: { idea: resolvedIdea }
      });

      if (functionError) {
        console.error('Market size analysis error:', functionError);
        setError(functionError.message);
        setLoading(false);
        return;
      }

      if (result) {
        setData(result);
        // CRITICAL: Persist using centralized cache utils
        setCacheForIdea('market_size', normalizedIdea, result);
        console.log('[useMarketSizeData] ✅ Persisted market data to cache for:', resolvedIdea.substring(0, 50));
      }
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!resolvedIdea || !normalizedIdea) return;

    // CRITICAL: Check cache FIRST before any loading/fetching
    const cached = getCacheForIdea<MarketSizeData>('market_size', normalizedIdea);
    if (cached) {
      console.log('[useMarketSizeData] ✅ Loading from persistent cache for:', resolvedIdea.substring(0, 50));
      setData(cached);
      setError(null);
      setLoading(false);
      return; // Skip network fetch completely
    }

    // Only fetch if we don't have cached data
    if (!data) {
      console.log('[useMarketSizeData] Cache miss, fetching from API for:', resolvedIdea.substring(0, 50));
      fetchMarketData();
    }
  }, [normalizedIdea]);

  return {
    data,
    loading,
    error,
    refresh: fetchMarketData
  };
}