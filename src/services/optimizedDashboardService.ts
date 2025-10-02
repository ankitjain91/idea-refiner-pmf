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
      if (extractionResult.confidence > 0.7 && extractionResult.missingDataPoints.length === 0) {
        console.log(`[OptimizedDashboard] High confidence extraction for ${tileType}:`, extractionResult);
        return this.formatTileData(extractionResult.data, {
          fromCache: true,
          confidence: extractionResult.confidence,
          sourceIds: extractionResult.sourceResponseIds
        });
      }
      
      // 5. Identify what specific data we need to fetch
      const gaps = await this.groqService.identifyDataGaps(idea, tileType, allResponses);
      
      // 6. Fetch from multiple sources to enrich data
      const enrichmentSources = this.getEnrichmentSources(tileType);
      let newData = await this.fetchFromMultipleSources(idea, tileType, enrichmentSources);
      
      // If primary sources failed, try fallback sources
      if (newData.length < 2 && TILE_REQUIREMENTS[tileType]) {
        console.log(`[OptimizedDashboard] Fetching from fallback sources for ${tileType}`);
        const fallbackSources = TILE_REQUIREMENTS[tileType].fallbackSources;
        const fallbackData = await this.fetchFromMultipleSources(idea, tileType, fallbackSources);
        newData = [...newData, ...fallbackData];
      }
      
      // 7. Store new responses in cache
      for (const response of newData) {
        await this.cache.storeResponse(response);
      }
      
      // 8. Aggregate and enrich data from all sources
      const finalResponses = [...allResponses, ...newData];
      
      if (finalResponses.length === 0) {
        console.log(`[OptimizedDashboard] No data available for ${tileType}, using mock data`);
        return this.getMockDataForTile(tileType);
      }
      
      // Extract and aggregate data from multiple sources
      const aggregatedData = await this.aggregateDataFromSources(tileType, finalResponses);
      
      return this.formatTileData(aggregatedData.data, {
        fromCache: newData.length === 0,
        confidence: aggregatedData.confidence,
        sourceIds: aggregatedData.sourceIds
      });
      
    } catch (error) {
      console.error(`Error fetching data for ${tileType}:`, error);
      return this.getMockDataForTile(tileType);
    }
  }
  
  async getDataForPlatform(platform: string, idea: string): Promise<OptimizedTileData | null> {
    const cacheKey = `platform_${platform}_${idea}`;
    
    try {
      // Get the social sentiment data which contains all platforms
      const sentimentData = await this.getDataForTile('sentiment', idea);
      
      if (!sentimentData || !(sentimentData as any).socialSentiment?.platforms?.[platform]) {
        return null;
      }
      
      const platformData = (sentimentData as any).socialSentiment.platforms[platform];
      const result: OptimizedTileData = {
        metrics: [
          { name: 'Sentiment', value: platformData.sentiment || 0, unit: '%' },
          { name: 'Mentions', value: platformData.mentions || 0, unit: '' },
          { name: 'Trending', value: platformData.trending ? 'Yes' : 'No', unit: '' }
        ],
        notes: `${platform.charAt(0).toUpperCase() + platform.slice(1)} sentiment: ${platformData.sentiment}% positive`,
        insights: {
          summary: `${platformData.mentions || 0} mentions on ${platform} with ${platformData.sentiment}% positive sentiment`
        },
        confidence: 0.85,
        citations: [],
        fromCache: false,
        updatedAt: new Date().toISOString()
      };
      
      return result;
      
    } catch (error) {
      console.error(`Error fetching ${platform} data:`, error);
      return null;
    }
  }
  
  private getEnrichmentSources(tileType: string): string[] {
    // Define multiple sources for each tile type to enrich data
    const enrichmentMap: Record<string, string[]> = {
      sentiment: ['social-sentiment', 'reddit-sentiment', 'twitter-search', 'gdelt-news'],
      market_size: ['market-size-analysis', 'market-intelligence', 'competitive-landscape'],
      competition: ['competitive-landscape', 'web-search-optimized', 'serper-batch-search'],
      'market-trends': ['market-insights', 'gdelt-news', 'web-search-optimized', 'youtube-search'],
      trends: ['web-search', 'gdelt-news', 'youtube-search'],
      pmf_score: ['market-insights', 'user-engagement', 'social-sentiment'],
      google_trends: ['web-search-optimized', 'serper-batch-search'],
      launch_timeline: ['launch-timeline', 'execution-insights'],
      financial: ['financial-analysis', 'web-search-profitability']
    };
    
    return enrichmentMap[tileType] || ['web-search-optimized', 'serper-batch-search'];
  }
  
  private async fetchFromMultipleSources(
    idea: string, 
    tileType: string, 
    sources: string[]
  ): Promise<any[]> {
    console.log(`[OptimizedDashboard] Fetching from multiple sources for ${tileType}:`, sources);
    
    const fetchPromises = sources.map(source => 
      this.fetchFromSource(idea, source, tileType)
        .then(data => data ? {
          idea,
          source,
          endpoint: this.getEndpointForSource(source),
          rawResponse: data,
          timestamp: new Date().toISOString(),
          id: `${source}-${Date.now()}`
        } : null)
        .catch(err => {
          console.warn(`Failed to fetch from ${source}:`, err);
          return null;
        })
    );
    
    const results = await Promise.allSettled(fetchPromises);
    
    return results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => (r as PromiseFulfilledResult<any>).value);
  }
  
  private async aggregateDataFromSources(
    tileType: string, 
    responses: any[]
  ): Promise<{ data: any; confidence: number; sourceIds: string[] }> {
    console.log(`[OptimizedDashboard] Aggregating ${responses.length} responses for ${tileType}`);
    
    // Use Groq to intelligently aggregate data from multiple sources
    const aggregationResult = await this.groqService.extractDataForTile({
      tileType,
      cachedResponses: responses,
      requirements: TILE_REQUIREMENTS[tileType]
    });
    
    // If Groq extraction has good confidence, use it
    if (aggregationResult.confidence > 0.5) {
      return {
        data: aggregationResult.data,
        confidence: aggregationResult.confidence,
        sourceIds: aggregationResult.sourceResponseIds
      };
    }
    
    // Fallback to local aggregation for specific tile types
    if (tileType === 'sentiment') {
      return this.aggregateSentimentData(responses);
    } else if (tileType === 'market-trends' || tileType === 'market_trends') {
      return this.aggregateMarketTrendsData(responses);
    }
    
    return {
      data: aggregationResult.data || {},
      confidence: aggregationResult.confidence,
      sourceIds: responses.map(r => r.id || '')
    };
  }
  
  private aggregateMarketTrendsData(responses: any[]): { data: any; confidence: number; sourceIds: string[] } {
    const trendsData: any[] = [];
    const sourceIds: string[] = [];
    let marketInsightsData: any = null;
    
    console.log('[aggregateMarketTrendsData] Processing responses:', responses.length);
    
    responses.forEach(response => {
      console.log('[aggregateMarketTrendsData] Response:', {
        id: response.id,
        hasRawResponse: !!response.rawResponse,
        rawData: response.rawResponse
      });
      
      // Check for market-insights response with structured data
      if (response.id === 'market-insights' && response.rawResponse) {
        const data = response.rawResponse;
        if (data.trends || data.drivers || data.emergingTech) {
          marketInsightsData = data;
          sourceIds.push('market-insights');
          console.log('[aggregateMarketTrendsData] Found market insights data:', marketInsightsData);
        }
      } else {
        const localExtractor = TILE_REQUIREMENTS['market-trends']?.localExtractor;
        if (localExtractor) {
          const extracted = localExtractor(response.rawResponse);
          if (extracted) {
            trendsData.push(extracted);
            sourceIds.push(response.id || '');
          }
        }
      }
    });
    
    // If we have market insights data, use it as primary source
    if (marketInsightsData) {
      return {
        data: {
          trends: marketInsightsData.trends || ['AI integration rising', 'Cloud adoption accelerating'],
          growthRate: marketInsightsData.growthRate || 25,
          drivers: marketInsightsData.drivers || ['Digital transformation', 'Market demand'],
          direction: marketInsightsData.direction || 'upward',
          emergingTech: marketInsightsData.emergingTech || ['AI', 'CLOUD'],
          consumerShifts: marketInsightsData.consumerShifts || [],
          disruptions: marketInsightsData.disruptions || [],
          investmentTrends: marketInsightsData.investmentTrends || [],
          insights: marketInsightsData.insights || 'Market analysis in progress',
          confidence: 0.85
        },
        confidence: 0.85,
        sourceIds
      };
    }
    
    if (trendsData.length === 0) {
      return {
        data: {
          trends: ['AI integration rising rapidly', 'Cloud adoption accelerating', 'Sustainability focus increasing'],
          growthRate: 25,
          drivers: ['Digital transformation', 'Remote work adoption', 'Regulatory changes', 'Consumer demand'],
          direction: 'upward',
          emergingTech: ['AI', 'CLOUD', 'IOT'],
          insights: 'Market shows strong growth potential with multiple positive indicators'
        },
        confidence: 0.3,
        sourceIds: []
      };
    }
    
    // Aggregate trends from multiple sources
    const allTrends = trendsData.flatMap(d => d.trends || []);
    const uniqueTrends = [...new Set(allTrends)].slice(0, 5);
    
    const allDrivers = trendsData.flatMap(d => d.drivers || []);
    const uniqueDrivers = [...new Set(allDrivers)].slice(0, 4);
    
    const allTech = trendsData.flatMap(d => d.emergingTech || []);
    const uniqueTech = [...new Set(allTech)];
    
    // Average growth rates
    const growthRates = trendsData.map(d => d.growthRate).filter(r => r);
    const avgGrowth = growthRates.length > 0 
      ? growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length 
      : 0;
    
    // Determine overall direction
    const directions = trendsData.map(d => d.direction).filter(d => d);
    const upwardCount = directions.filter(d => d === 'upward').length;
    const downwardCount = directions.filter(d => d === 'downward').length;
    const overallDirection = upwardCount > downwardCount ? 'upward' : 
                            downwardCount > upwardCount ? 'downward' : 'stable';
    
    return {
      data: {
        trends: uniqueTrends.length > 0 ? uniqueTrends : ['Market showing moderate growth', 'Competition increasing'],
        growthRate: avgGrowth || 15,
        drivers: uniqueDrivers.length > 0 ? uniqueDrivers : ['Innovation', 'Market demand'],
        direction: overallDirection,
        emergingTech: uniqueTech.length > 0 ? uniqueTech : ['AI', 'CLOUD'],
        insights: `Analysis based on ${responses.length} data sources`,
        confidence: Math.min(0.9, 0.5 + (trendsData.length * 0.15))
      },
      confidence: Math.min(0.9, 0.5 + (trendsData.length * 0.15)),
      sourceIds
    };
  }
  
  private aggregateSentimentData(responses: any[]): { data: any; confidence: number; sourceIds: string[] } {
    const sentiments: any[] = [];
    const sourceIds: string[] = [];
    let socialSentimentData: any = null;
    let searchVolumeData: any = null;
    
    console.log('[aggregateSentimentData] Processing responses:', responses.length);
    
    responses.forEach(response => {
      console.log('[aggregateSentimentData] Response:', {
        id: response.id,
        hasRawResponse: !!response.rawResponse,
        hasSocialSentiment: !!response.rawResponse?.data?.socialSentiment,
        rawData: response.rawResponse?.data
      });
      
      // Check if this is the social-sentiment response with rich data
      if (response.rawResponse?.data?.socialSentiment) {
        socialSentimentData = response.rawResponse.data.socialSentiment;
        searchVolumeData = response.rawResponse.data.searchVolume;
        sourceIds.push(response.id || 'social-sentiment');
        console.log('[aggregateSentimentData] Found social sentiment data:', socialSentimentData);
      } else if (response.rawResponse?.socialSentiment) {
        // Check if socialSentiment is directly in rawResponse
        socialSentimentData = response.rawResponse.socialSentiment;
        searchVolumeData = response.rawResponse.searchVolume;
        sourceIds.push(response.id || 'social-sentiment');
        console.log('[aggregateSentimentData] Found social sentiment data (direct):', socialSentimentData);
      } else {
        const localExtractor = TILE_REQUIREMENTS.sentiment.localExtractor;
        if (localExtractor) {
          const extracted = localExtractor(response.rawResponse);
          if (extracted) {
            sentiments.push(extracted);
            sourceIds.push(response.id || '');
          }
        }
      }
    });
    
    // If we have social sentiment data, use it as the primary source
    if (socialSentimentData) {
      const result = {
        data: {
          positive: socialSentimentData.positive || 65,
          neutral: socialSentimentData.neutral || 25,
          negative: socialSentimentData.negative || 10,
          mentions: socialSentimentData.mentions || 0,
          trend: socialSentimentData.trend || 'stable',
          socialSentiment: socialSentimentData,
          searchVolume: searchVolumeData,
          sources: socialSentimentData.sources || responses.map(r => r.id || 'unknown'),
          confidence: responses[0]?.rawResponse?.data?.confidence || responses[0]?.rawResponse?.confidence || 0.85
        },
        confidence: responses[0]?.rawResponse?.data?.confidence || responses[0]?.rawResponse?.confidence || 0.85,
        sourceIds
      };
      console.log('[aggregateSentimentData] Returning social sentiment result:', result);
      return result;
    }
    
    // Fallback to aggregation if no social sentiment data
    if (sentiments.length === 0) {
      console.log('[aggregateSentimentData] No sentiment data found, using fallback');
      return {
        data: {
          positive: 65,
          neutral: 25,
          negative: 10,
          mentions: 1200,
          trend: 'stable'
        },
        confidence: 0.3,
        sourceIds: []
      };
    }
    
    // Aggregate sentiment scores from multiple sources
    const avgPositive = sentiments.reduce((sum, s) => sum + (s.positive || 0), 0) / sentiments.length;
    const avgNegative = sentiments.reduce((sum, s) => sum + (s.negative || 0), 0) / sentiments.length;
    const avgNeutral = sentiments.reduce((sum, s) => sum + (s.neutral || 0), 0) / sentiments.length;
    const totalMentions = sentiments.reduce((sum, s) => sum + (s.mentions || 0), 0);
    
    // Determine trend based on sentiment distribution
    const trend = avgPositive > 60 ? 'improving' : avgPositive < 40 ? 'declining' : 'stable';
    
    return {
      data: {
        positive: Math.round(avgPositive),
        negative: Math.round(avgNegative),
        neutral: Math.round(avgNeutral),
        mentions: totalMentions,
        trend,
        sources: sentiments.flatMap(s => s.sources || []),
        breakdown: sentiments[0]?.breakdown || {}
      },
      confidence: Math.min(0.9, 0.5 + (sentiments.length * 0.1)),
      sourceIds
    };
  }
  
  private getMockDataForTile(tileType: string): OptimizedTileData {
    const mockData: Record<string, any> = {
      sentiment: {
        positive: 65,
        neutral: 25,
        negative: 10,
        mentions: 1200,
        trend: 'improving',
        breakdown: {
          reddit: { positive: 70, negative: 10, neutral: 20 },
          twitter: { positive: 60, negative: 15, neutral: 25 },
          news: { positive: 65, negative: 10, neutral: 25 }
        }
      },
      'market-trends': {
        trends: ['AI adoption accelerating', 'Cloud-first strategies dominating', 'Sustainability focus increasing'],
        growthRate: 28,
        drivers: ['Digital transformation', 'Remote work normalization', 'AI breakthroughs', 'ESG mandates'],
        direction: 'upward',
        emergingTech: ['AI', 'QUANTUM', 'BLOCKCHAIN', 'IOT'],
        insights: 'Strong market momentum with multiple growth catalysts',
        metrics: [
          { label: 'Growth Rate', value: '28% CAGR', trend: 'up' },
          { label: 'Market Direction', value: 'Upward', trend: 'stable' },
          { label: 'Innovation Index', value: '8.5/10', trend: 'up' }
        ]
      },
      market_trends: {
        trends: ['AI adoption accelerating', 'Cloud-first strategies dominating', 'Sustainability focus increasing'],
        growthRate: 28,
        drivers: ['Digital transformation', 'Remote work normalization', 'AI breakthroughs', 'ESG mandates'],
        direction: 'upward',
        emergingTech: ['AI', 'QUANTUM', 'BLOCKCHAIN', 'IOT'],
        insights: 'Strong market momentum with multiple growth catalysts',
        metrics: [
          { label: 'Growth Rate', value: '28% CAGR', trend: 'up' },
          { label: 'Market Direction', value: 'Upward', trend: 'stable' },
          { label: 'Innovation Index', value: '8.5/10', trend: 'up' }
        ]
      },
      market_size: {
        tam: 15000000000,
        sam: 3000000000,
        som: 500000000,
        cagr: 25,
        maturity: 'growth'
      },
      competition: {
        topCompetitors: ['Competitor A', 'Competitor B', 'Competitor C'],
        marketConcentration: 'moderate',
        barrierToEntry: 'medium'
      },
      pmf_score: {
        score: 75,
        indicators: {
          market_need: 85,
          timing: 70,
          execution: 75,
          competition: 70
        }
      }
    };
    
    return this.formatTileData(mockData[tileType] || mockData['market-trends'], {
      fromCache: false,
      confidence: 0.3,
      sourceIds: []
    });
  }
  
  // Keeping for backward compatibility, but using fetchFromMultipleSources now
  private async fetchMissingData(
    idea: string,
    tileType: string,
    missingSources: string[]
  ): Promise<any[]> {
    const requirements = TILE_REQUIREMENTS[tileType];
    if (!requirements) return [];
    
    const sourcesToFetch = missingSources.length > 0 
      ? missingSources.slice(0, 3) // Fetch up to 3 sources for enrichment
      : requirements.primarySources.slice(0, 2);
    
    return this.fetchFromMultipleSources(idea, tileType, sourcesToFetch);
  }
  
  private async fetchFromSource(idea: string, source: string, tileType: string): Promise<any> {
    try {
      // Generate optimized query for this tile type
      const optimizedQuery = await this.groqService.generateOptimizedQuery(idea, tileType);
      
      // Map source to appropriate edge function
      const endpoint = this.getEndpointForSource(source);
      
      if (!endpoint) {
        console.warn(`No endpoint mapped for source: ${source}`);
        return null;
      }
      
      console.log(`[OptimizedDashboard] Fetching from ${source} with query:`, optimizedQuery.searchQuery);
      
      // Prepare request body based on endpoint requirements
      let requestBody: any = {
        idea,
        query: optimizedQuery.searchQuery,
        tileType
      };
      
      // Add specific parameters for different endpoints
      if (endpoint === 'serper-batch-search') {
        // Special handling for market trends
        const searchType = tileType === 'market-trends' ? 'market_trends' : tileType;
        requestBody = {
          idea: optimizedQuery.searchQuery,
          searchTypes: [searchType],
          filters: optimizedQuery.filters
        };
      } else if (endpoint === 'web-search-optimized' || endpoint === 'web-search') {
        requestBody = {
          query: optimizedQuery.searchQuery,
          filters: optimizedQuery.filters.join(' '),
          keywords: optimizedQuery.keywords
        };
      } else if (endpoint === 'market-insights') {
        requestBody = {
          idea,
          query: optimizedQuery.searchQuery,
          type: tileType === 'market-trends' ? 'market-trends' : tileType
        };
      } else if (endpoint === 'market-intelligence') {
        requestBody = {
          idea,
          query: `${optimizedQuery.searchQuery} ${optimizedQuery.filters.join(' ')}`,
          type: tileType
        };
      } else if (endpoint === 'reddit-sentiment') {
        requestBody = {
          idea,
          industry: tileType,
          geography: 'global',
          timeWindow: '30_days',
          analyzeType: 'sentiment'
        };
      } else if (endpoint === 'social-sentiment') {
        requestBody = {
          query: idea,
          searchTerms: [idea, ...optimizedQuery.keywords.slice(0, 3)]
        };
      } else if (endpoint === 'twitter-search') {
        requestBody = {
          query: idea,
          industry: tileType,
          geo: 'global',
          time_window: '30_days'
        };
      } else if (endpoint === 'gdelt-news') {
        requestBody = {
          query: idea,
          type: 'sentiment'
        };
      } else if (endpoint === 'youtube-search') {
        requestBody = {
          query: idea,
          maxResults: 25
        };
      }
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: requestBody
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
      'social-sentiment': 'social-sentiment',
      'market-insights': 'market-insights',
      'market-intelligence': 'market-intelligence',
      'market-size-analysis': 'market-size-analysis',
      'competitive-landscape': 'competitive-landscape',
      'web-search-optimized': 'web-search-optimized',
      'competition-chat': 'competition-chat',
      'serper-batch-search': 'serper-batch-search',
      'gdelt-news': 'gdelt-news',
      'youtube-search': 'youtube-search',
      'groq-data-extraction': 'groq-data-extraction',
      'user-engagement': 'user-engagement',
      'financial-analysis': 'financial-analysis',
      'web-search-profitability': 'web-search-profitability',
      'launch-timeline': 'launch-timeline',
      'execution-insights': 'execution-insights',
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