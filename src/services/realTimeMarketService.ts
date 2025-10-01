import { supabase } from '@/integrations/supabase/client';

interface MarketSizeData {
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
  citations: any[];
  charts: any[];
  timestamp?: string;
}

export class RealTimeMarketService {
  private static instance: RealTimeMarketService;
  private cache: Map<string, { data: MarketSizeData; expires: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {}
  
  static getInstance(): RealTimeMarketService {
    if (!RealTimeMarketService.instance) {
      RealTimeMarketService.instance = new RealTimeMarketService();
    }
    return RealTimeMarketService.instance;
  }
  
  async fetchMarketSize(idea: string, forceRefresh = false): Promise<MarketSizeData | null> {
    const cacheKey = `market_${idea}`;
    
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        console.log('[RealTimeMarket] Returning cached data for:', idea);
        return cached.data;
      }
    }
    
    try {
      console.log('[RealTimeMarket] Fetching fresh market data for:', idea);
      
      // Call the market-size-analysis edge function
      const { data, error } = await supabase.functions.invoke('market-size-analysis', {
        body: { 
          idea,
          geo_scope: ['North America', 'Europe', 'APAC'],
          audience_profiles: [],
          competitors: []
        }
      });
      
      if (error) {
        console.error('[RealTimeMarket] Edge function error:', error);
        throw error;
      }
      
      if (data?.success && data?.market_size) {
        const marketData = {
          ...data.market_size,
          timestamp: new Date().toISOString()
        };
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: marketData,
          expires: Date.now() + this.CACHE_DURATION
        });
        
        console.log('[RealTimeMarket] Market data fetched successfully:', {
          TAM: marketData.TAM,
          SAM: marketData.SAM,
          SOM: marketData.SOM,
          growth: marketData.growth_rate
        });
        
        return marketData;
      }
      
      // If no data, return a structured fallback
      return this.getFallbackData(idea);
      
    } catch (error) {
      console.error('[RealTimeMarket] Error fetching market data:', error);
      return this.getFallbackData(idea);
    }
  }
  
  private getFallbackData(idea: string): MarketSizeData {
    return {
      TAM: "$50B",
      SAM: "$20B",
      SOM: "$2B",
      growth_rate: "18% CAGR (2025-2030)",
      regions: [
        {
          region: "North America",
          TAM: "$22.5B",
          SAM: "$9B",
          SOM: "$0.9B",
          growth: "15%",
          confidence: "Moderate"
        },
        {
          region: "Europe",
          TAM: "$14B",
          SAM: "$5.6B",
          SOM: "$0.56B",
          growth: "17%",
          confidence: "Moderate"
        },
        {
          region: "APAC",
          TAM: "$13.5B",
          SAM: "$5.4B",
          SOM: "$0.54B",
          growth: "25%",
          confidence: "Moderate"
        }
      ],
      confidence: "Low",
      explanation: `Estimated market size for ${idea}. Real-time data temporarily unavailable.`,
      citations: [],
      charts: [],
      timestamp: new Date().toISOString()
    };
  }
  
  clearCache(idea?: string) {
    if (idea) {
      this.cache.delete(`market_${idea}`);
    } else {
      this.cache.clear();
    }
  }
}