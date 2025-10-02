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
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock data
    const mockData: MarketSizeData = {
      TAM: "$85.7B",
      SAM: "$42.3B",
      SOM: "$8.5B",
      growth_rate: "24.5%",
      regions: [
        {
          region: "North America",
          TAM: "$35.2B",
          SAM: "$18.5B",
          SOM: "$3.7B",
          growth: "22.8%",
          confidence: "high"
        },
        {
          region: "Europe",
          TAM: "$28.4B",
          SAM: "$14.2B",
          SOM: "$2.8B",
          growth: "21.3%",
          confidence: "high"
        },
        {
          region: "Asia Pacific",
          TAM: "$18.6B",
          SAM: "$7.8B",
          SOM: "$1.6B",
          growth: "32.4%",
          confidence: "medium"
        },
        {
          region: "Latin America",
          TAM: "$3.5B",
          SAM: "$1.8B",
          SOM: "$0.4B",
          growth: "28.9%",
          confidence: "medium"
        }
      ],
      confidence: "high",
      explanation: "Market analysis based on comprehensive industry data showing strong growth potential across all regions, with particularly rapid expansion in Asia Pacific markets.",
      citations: [
        {
          url: "https://example.com/market-report-2024",
          title: "Global Market Intelligence Report 2024",
          snippet: "The market is experiencing unprecedented growth driven by digital transformation..."
        },
        {
          url: "https://example.com/industry-analysis",
          title: "Industry Analysis & Trends",
          snippet: "Key growth drivers include increased adoption of AI technologies..."
        },
        {
          url: "https://example.com/regional-outlook",
          title: "Regional Market Outlook",
          snippet: "Asia Pacific region shows the highest growth potential with 32.4% CAGR..."
        }
      ],
      charts: []
    };
    
    setData(mockData);
    
    // Cache the mock data
    localStorage.setItem('market_size_data', JSON.stringify({
      idea: currentIdea,
      data: mockData,
      timestamp: Date.now()
    }));
    
    console.log('Mock market data loaded:', mockData);
    setLoading(false);
  };

  useEffect(() => {
    // Load mock data on mount
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