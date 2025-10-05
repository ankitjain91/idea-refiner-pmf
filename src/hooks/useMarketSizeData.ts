import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SimpleSessionContext';

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
  
  const currentIdea = idea || currentSession?.data?.currentIdea || localStorage.getItem('current_idea') || '';

  const fetchMarketData = async () => {
    if (!currentIdea) {
      setError('No idea provided');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: functionError } = await supabase.functions.invoke('market-size-analysis', {
        body: { idea: currentIdea }
      });

      if (functionError) {
        console.error('Market size analysis error:', functionError);
        setError(functionError.message);
        setLoading(false);
        return;
      }

      if (result) {
        setData(result);
        // Cache per-idea to persist across tab changes and reloads
        try {
          localStorage.setItem(`market_size_data:${currentIdea}`, JSON.stringify(result));
          localStorage.setItem('lastFetchedIdea', currentIdea);
        } catch (e) {
          console.warn('Failed to cache market size data', e);
        }
      }
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentIdea) return;

    // Try to load cached data for this idea first
    try {
      const cached = localStorage.getItem(`market_size_data:${currentIdea}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed);
        setError(null);
        localStorage.setItem('lastFetchedIdea', currentIdea);
        return; // Skip network fetch when cache exists
      }
    } catch (e) {
      console.warn('Failed to read cached market size data', e);
    }

    // No cache: fetch once
    if (!data) {
      fetchMarketData();
    }
  }, [currentIdea]);

  return {
    data,
    loading,
    error,
    refresh: fetchMarketData
  };
}