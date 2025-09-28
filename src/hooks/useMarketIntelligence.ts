import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCachedSWR, CACHE_DURATIONS } from './useCachedSWR';

interface MarketIntelligence {
  competitors: any[];
  marketSize: number;
  growthRate: number;
  demographics: any;
  pricing: any;
  trends: string[];
  sources: any[];
  lastUpdated: string;
  fromCache?: boolean;
}

export function useMarketIntelligence(idea: string) {
  const [error, setError] = useState<string | null>(null);
  
  const fetcher = useCallback(async () => {
    if (!idea) return null;
    
    try {
      // Fetch comprehensive market data
      const queries = [
        `${idea} market size statistics`,
        `${idea} competitors pricing`,
        `${idea} industry trends`,
        `${idea} target demographics`
      ];

      const responses = await Promise.all(
        queries.map(query =>
          supabase.functions.invoke('search-web', {
            body: { query }
          })
        )
      );

      // Aggregate the data
      const aggregated: MarketIntelligence = {
        competitors: [],
        marketSize: 0,
        growthRate: 0,
        demographics: {},
        pricing: {},
        trends: [],
        sources: [],
        lastUpdated: new Date().toISOString()
      };

      responses.forEach(({ data, error }) => {
        if (!error && data) {
          if (data.normalized?.topCompetitors) {
            aggregated.competitors.push(...data.normalized.topCompetitors);
          }
          if (data.raw?.marketSize) {
            aggregated.marketSize = Math.max(aggregated.marketSize, data.raw.marketSize);
          }
          if (data.raw?.growthRate) {
            aggregated.growthRate = Math.max(aggregated.growthRate, data.raw.growthRate);
          }
          if (data.raw?.demographics) {
            aggregated.demographics = { ...aggregated.demographics, ...data.raw.demographics };
          }
          if (data.raw?.pricing) {
            aggregated.pricing = { ...aggregated.pricing, ...data.raw.pricing };
          }
          if (data.normalized?.relatedQueries) {
            aggregated.trends.push(...data.normalized.relatedQueries);
          }
          if (data.citations) {
            aggregated.sources.push(...data.citations);
          }
        }
      });

      // Deduplicate
      aggregated.competitors = Array.from(
        new Map(aggregated.competitors.map(c => [c.name, c])).values()
      );
      aggregated.trends = [...new Set(aggregated.trends)];
      aggregated.sources = Array.from(
        new Map(aggregated.sources.map((s: any) => [s.url, s])).values()
      );

      return aggregated;
    } catch (err) {
      console.error('Error fetching market intelligence:', err);
      setError('Failed to fetch market data');
      throw err;
    }
  }, [idea]);
  
  const { data, error: swrError, isLoading, mutate } = useCachedSWR<MarketIntelligence>({
    cacheKey: `market-intelligence:${idea}`,
    cacheTime: CACHE_DURATIONS.ONE_DAY, // Cache for 24 hours
    fetcher,
    swrOptions: {
      revalidateIfStale: false,
      errorRetryInterval: 5000
    }
  });

  return {
    data,
    loading: isLoading,
    error: error || swrError?.message,
    refresh: mutate
  };
}