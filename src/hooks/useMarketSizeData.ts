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
      console.log('Fetching market size data for:', currentIdea);
      
      const { data, error } = await supabase.functions.invoke('market-size-analysis', {
        body: {
          idea: currentIdea,
          geo_scope: ['North America', 'Europe', 'Asia Pacific', 'Latin America'],
          audience_profiles: ['Enterprise', 'SMB', 'Consumer'],
          competitors: []
        }
      });

      if (error) {
        console.error('Market analysis error:', error);
        setError('Failed to fetch market data');
        return;
      }

      if (data?.success && data?.market_size) {
        setData(data.market_size);
        
        // Cache the data
        localStorage.setItem('market_size_data', JSON.stringify({
          idea: currentIdea,
          data: data.market_size,
          timestamp: Date.now()
        }));
        
        console.log('Market data loaded:', data.market_size);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.error('Market analysis failed:', error);
      setError('Market analysis failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem('market_size_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Use cache if it's for the same idea and less than 1 hour old
        if (parsed.idea === currentIdea && Date.now() - parsed.timestamp < 3600000) {
          setData(parsed.data);
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached market data:', e);
      }
    }
    
    if (currentIdea && !data) {
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