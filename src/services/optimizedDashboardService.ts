import { UnifiedResponseCache } from '@/lib/cache/unifiedResponseCache';
import { GroqQueryService, TILE_REQUIREMENTS } from './groqQueryService';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeTileData } from '@/utils/dataFormatting';
import { CircuitBreaker, createTileCircuitBreaker } from '@/lib/circuit-breaker';
import { toast } from 'sonner';

export interface OptimizedTileData {
  metrics: any[];
  items?: any[];
  insights?: any;
  citations?: string[];
  assumptions?: string[];
  notes?: string;
  updatedAt: string;
  fromCache: boolean;
  confidence: number;
}

export class OptimizedDashboardService {
  private static instance: OptimizedDashboardService;
  private cache: UnifiedResponseCache;
  private groqService: GroqQueryService;
  private ongoingFetches: Map<string, Promise<any>>;
  private circuitBreakers: Map<string, CircuitBreaker>;
  
  private constructor() {
    this.cache = UnifiedResponseCache.getInstance();
    this.groqService = GroqQueryService.getInstance();
    this.ongoingFetches = new Map();
    this.circuitBreakers = new Map();
  }
  
  static getInstance(): OptimizedDashboardService {
    if (!OptimizedDashboardService.instance) {
      OptimizedDashboardService.instance = new OptimizedDashboardService();
    }
    return OptimizedDashboardService.instance;
  }
  
  
  private getCircuitBreaker(tileType: string): CircuitBreaker {
    if (!this.circuitBreakers.has(tileType)) {
      this.circuitBreakers.set(tileType, createTileCircuitBreaker(`OptimizedService-${tileType}`));
    }
    return this.circuitBreakers.get(tileType)!;
  }
  
  async getDataForTile(tileType: string, idea: string): Promise<OptimizedTileData | null> {
    const cacheKey = `${idea}:${tileType}`;
    const circuitBreaker = this.getCircuitBreaker(tileType);
    
    // Check if we're already fetching this
    if (this.ongoingFetches.has(cacheKey)) {
      return await this.ongoingFetches.get(cacheKey);
    }
    
    const fetchPromise = circuitBreaker.execute(
      () => this.fetchTileData(tileType, idea),
      async () => {
        // Fallback: return cached data or default
        console.log(`[OptimizedDashboard] Circuit open for ${tileType}, using fallback`);
        const cachedResponses = await this.cache.getResponsesForIdea(idea);
        if (cachedResponses.length > 0) {
          return this.formatTileData({}, {
            fromCache: true,
            confidence: 0.5,
            sourceIds: []
          });
        }
        return null;
      }
    );
    
    this.ongoingFetches.set(cacheKey, fetchPromise);
    
    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.ongoingFetches.delete(cacheKey);
    }
  }
  
  private async fetchTileData(tileType: string, idea: string): Promise<OptimizedTileData | null> {
    try {
      // 1. Get all cached responses for this idea
      const cachedResponses = await this.cache.getResponsesForIdea(idea);
      
      // 2. Also get related data that might be useful
      const relatedData = await this.cache.getRelatedData(idea);
      const allResponses = [...cachedResponses];
      
      relatedData.forEach((responses) => {
        allResponses.push(...responses);
      });
      
      // 3. Use Groq to check if we can extract needed data
      const extractionResult = await this.groqService.extractDataForTile({
        tileType,
        cachedResponses: allResponses,
        requirements: TILE_REQUIREMENTS[tileType]
      });
      
      // 4. If confidence is high enough and no critical missing data, return
      if (extractionResult.confidence > 0.6 && extractionResult.missingDataPoints.length === 0) {
        console.log(`[OptimizedDashboard] High confidence extraction for ${tileType}:`, extractionResult);
        return this.formatTileData(extractionResult.data, {
          fromCache: true,
          confidence: extractionResult.confidence,
          sourceIds: extractionResult.sourceResponseIds
        });
      }
      
      // 5. Identify what specific data we need to fetch
      const gaps = await this.groqService.identifyDataGaps(idea, tileType, allResponses);
      
      if (gaps.hasAllData) {
        // We have the data but extraction confidence is low, still use it
        return this.formatTileData(extractionResult.data, {
          fromCache: true,
          confidence: extractionResult.confidence,
          sourceIds: extractionResult.sourceResponseIds
        });
      }
      
      // 6. Fetch only the missing data
      const newData = await this.fetchMissingData(idea, tileType, gaps.missingSource);
      
      // 7. Store new responses in cache
      for (const response of newData) {
        await this.cache.storeResponse(response);
      }
      
      // 8. Re-extract with complete data
      const finalExtraction = await this.groqService.extractDataForTile({
        tileType,
        cachedResponses: [...allResponses, ...newData],
        requirements: TILE_REQUIREMENTS[tileType]
      });
      
      return this.formatTileData(finalExtraction.data, {
        fromCache: false,
        confidence: finalExtraction.confidence,
        sourceIds: finalExtraction.sourceResponseIds
      });
      
    } catch (error) {
      console.error(`Error fetching data for ${tileType}:`, error);
      return null;
    }
  }
  
  private async fetchMissingData(
    idea: string,
    tileType: string,
    missingSources: string[]
  ): Promise<any[]> {
    const requirements = TILE_REQUIREMENTS[tileType];
    if (!requirements) return [];
    
    const responses: any[] = [];
    const fetchPromises: Promise<any>[] = [];
    
    // Determine which sources to fetch (prefer primary)
    const sourcesToFetch = missingSources.length > 0 
      ? missingSources.slice(0, 2) // Limit to 2 sources max
      : [requirements.primarySources[0]]; // At least fetch one primary
    
    for (const source of sourcesToFetch) {
      const promise = this.fetchFromSource(idea, source, tileType);
      fetchPromises.push(promise);
    }
    
    const results = await Promise.allSettled(fetchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        responses.push({
          idea,
          source: sourcesToFetch[index],
          endpoint: this.getEndpointForSource(sourcesToFetch[index]),
          rawResponse: result.value,
          expiresAt: Date.now() + (requirements.freshnessHours * 60 * 60 * 1000),
          metadata: {
            searchQuery: idea,
            confidence: 0.7
          }
        });
      }
    });
    
    return responses;
  }
  
  private async fetchFromSource(idea: string, source: string, tileType: string): Promise<any> {
    try {
      // Map source to appropriate edge function
      const endpoint = this.getEndpointForSource(source);
      
      if (!endpoint) {
        console.warn(`No endpoint mapped for source: ${source}`);
        return null;
      }
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: endpoint === 'serper-batch-search' 
          ? { 
              idea,
              searchTypes: [tileType] // serper-batch-search expects searchTypes array
            }
          : { 
              idea,
              query: idea,
              tileType 
            }
      });
      
      if (error) throw error;
      return data;
      
    } catch (error) {
      console.error(`Error fetching from ${source}:`, error);
      return null;
    }
  }
  
  private getEndpointForSource(source: string): string {
    const endpointMap: Record<string, string> = {
      'reddit-sentiment': 'reddit-sentiment',
      'twitter-search': 'twitter-search',
      'market-insights': 'market-insights',
      'market-intelligence': 'market-intelligence',
      'market-size-analysis': 'market-size-analysis',
      'competitive-landscape': 'competitive-landscape',
      'web-search-optimized': 'web-search-optimized',
      'competition-chat': 'competition-chat',
      'serper-batch-search': 'serper-batch-search',
      'gdelt-news': 'gdelt-news',
      'user-engagement': 'user-engagement',
      'financial-analysis': 'financial-analysis',
      'web-search-profitability': 'web-search-profitability',
      'launch-timeline': 'launch-timeline',
      'execution-insights': 'execution-insights',
      'youtube-search': 'youtube-search',
      'web-search': 'web-search'
    };
    
    return endpointMap[source] || '';
  }
  
  private formatTileData(
    data: any,
    meta: { fromCache: boolean; confidence: number; sourceIds: string[] }
  ): OptimizedTileData {
    if (!data) {
      return {
        metrics: [],
        items: [],
        citations: [],
        updatedAt: new Date().toISOString(),
        fromCache: meta.fromCache,
        confidence: 0
      };
    }
    
    // Sanitize the data to ensure human-readable values
    const sanitizedData = sanitizeTileData(data);
    
    // Format based on common tile data structure
    const formatted: OptimizedTileData = {
      metrics: sanitizedData.metrics || [],
      items: sanitizedData.items || [],
      insights: sanitizedData.insights || sanitizedData,
      citations: sanitizedData.citations || [],
      assumptions: sanitizedData.assumptions || [],
      notes: sanitizedData.notes || '',
      updatedAt: new Date().toISOString(),
      fromCache: meta.fromCache,
      confidence: meta.confidence
    };
    
    // Add metadata to metrics if not present
    if (formatted.metrics.length > 0) {
      formatted.metrics = formatted.metrics.map((metric: any) => ({
        ...metric,
        confidence: metric.confidence || meta.confidence,
        fromCache: meta.fromCache
      }));
    }
    
    return formatted;
  }
  
  async getAllTileData(idea: string, tileTypes?: string[]): Promise<Record<string, OptimizedTileData | null>> {
    const tiles = tileTypes || Object.keys(TILE_REQUIREMENTS);
    const results: Record<string, OptimizedTileData | null> = {};
    
    // Fetch all tiles in parallel
    const promises = tiles.map(async (tileType) => {
      const data = await this.getDataForTile(tileType, idea);
      return { tileType, data };
    });
    
    const settled = await Promise.allSettled(promises);
    
    settled.forEach((result) => {
      if (result.status === 'fulfilled') {
        results[result.value.tileType] = result.value.data;
      }
    });
    
    return results;
  }
  
  async getCacheStats() {
    return await this.cache.getStats();
  }
  
  async clearCache() {
    await this.cache.clearAll();
  }
  
  async clearExpiredCache() {
    return await this.cache.clearExpired();
  }
}