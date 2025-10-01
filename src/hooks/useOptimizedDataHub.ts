import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useDataMode } from '@/contexts/DataModeContext';
import { useToast } from '@/hooks/use-toast';
import { OptimizedDashboardService } from '@/services/optimizedDashboardService';
import { UnifiedResponseCache } from '@/lib/cache/unifiedResponseCache';
import { DataHubInput, DataHubIndices, TileData } from '@/lib/data-hub-orchestrator';
import { getPMFInsights } from '@/lib/pmf-category';

interface DataHubState {
  indices: DataHubIndices | null;
  tiles: Record<string, TileData>;
  loading: boolean;
  error: string | null;
  summary: any;
  lastFetchTime: string | null;
  cacheStats: {
    hits: number;
    misses: number;
    apiCalls: number;
  };
}

export function useOptimizedDataHub(input: DataHubInput) {
  const [state, setState] = useState<DataHubState>({
    indices: null,
    tiles: {},
    loading: false,
    error: null,
    summary: null,
    lastFetchTime: null,
    cacheStats: {
      hits: 0,
      misses: 0,
      apiCalls: 0
    }
  });
  
  const { user } = useAuth();
  const { useMockData } = useDataMode();
  const { toast } = useToast();
  const optimizedService = useRef(OptimizedDashboardService.getInstance());
  const cache = useRef(UnifiedResponseCache.getInstance());
  const hasFetchedRef = useRef(false);
  
  // Migration: Import existing localStorage data into IndexedDB
  useEffect(() => {
    const migrateLocalStorageData = async () => {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('datahub_'));
        
        for (const key of keys) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              // Store in new cache format
              if (parsed.tiles) {
                for (const [tileType, tileData] of Object.entries(parsed.tiles)) {
                  await cache.current.storeResponse({
                    idea: input.idea || 'unknown',
                    source: 'legacy_migration',
                    endpoint: `tile_${tileType}`,
                    rawResponse: tileData,
                    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                    metadata: {
                      confidence: 0.7,
                      extractedTopics: [tileType]
                    }
                  });
                }
              }
            } catch (e) {
              console.error('Failed to migrate cache key:', key, e);
            }
          }
        }
      } catch (error) {
        console.error('Cache migration failed:', error);
      }
    };
    
    migrateLocalStorageData();
  }, []);
  
  const fetchDataHub = useCallback(async (forceRefresh = false) => {
    if (!input.idea) {
      setState(prev => ({ ...prev, error: 'Missing idea' }));
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const cacheStatsTracker = {
      hits: 0,
      misses: 0,
      apiCalls: 0
    };
    
    try {
      if (useMockData) {
        // Keep existing mock data logic
        console.log('📊 Loading MOCK DATA for:', input.idea);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Use the same mock data structure as before
        const mockTiles = generateMockTiles();
        const mockIndices = generateMockIndices();
        
        setState({
          indices: mockIndices,
          tiles: mockTiles,
          loading: false,
          error: null,
          summary: generateMockSummary(),
          lastFetchTime: new Date().toISOString(),
          cacheStats: { hits: 0, misses: 0, apiCalls: 0 }
        });
        
        toast({
          title: "Mock Data Loaded",
          description: "Dashboard populated with sample data",
          duration: 3000
        });
        
      } else {
        // Use optimized data loading
        console.log('🚀 Loading OPTIMIZED DATA for:', input.idea);
        
        const tileTypes = [
          'sentiment', 'market_trends', 'competition', 'user_engagement',
          'financial', 'news_analysis', 'growth_potential', 'market_readiness',
          'competitive_advantage', 'risk_assessment', 'pmf_score', 'market_size',
          'google_trends', 'web_search', 'reddit_sentiment', 'twitter_buzz'
        ];
        
        const tiles: Record<string, TileData> = {};
        
        // Clear cache if force refresh to ensure real API calls
        if (forceRefresh) {
          console.log('🔄 Force refresh: Clearing cache for idea:', input.idea);
          await cache.current.clearForIdea(input.idea);
        }
        
        // Fetch all tile data in parallel using the optimized service
        const tilePromises = tileTypes.map(async (tileType) => {
          const optimizedData = await optimizedService.current.getDataForTile(tileType, input.idea);
          
          if (optimizedData) {
            // Track cache stats
            if (optimizedData.fromCache) {
              cacheStatsTracker.hits++;
            } else {
              cacheStatsTracker.misses++;
              cacheStatsTracker.apiCalls += 3; // Approximate API calls per tile
            }
            
            // Convert optimized format to TileData format
            const tileData: TileData = {
              metrics: optimizedData.metrics || {},
              explanation: optimizedData.insights?.summary || 
                            optimizedData.notes || 
                            'Analysis in progress',
              citations: optimizedData.citations?.map(c => 
                typeof c === 'string' ? { url: c, title: 'Source', source: 'Web', relevance: 0.8 } : c
              ) || [],
              charts: [],
              json: optimizedData.items?.[0] || optimizedData.metrics || {},
              confidence: optimizedData.confidence || 0.7,
              dataQuality: optimizedData.confidence > 0.8 ? 'high' : 
                           optimizedData.confidence > 0.6 ? 'medium' : 'low'
            };
            
            tiles[tileType] = tileData;
          }
        });
        
        await Promise.all(tilePromises);
        
        // Ensure PMF score exists; if missing or zero, compute via edge function using available tiles
        if (!tiles.pmf_score || !(Number(tiles.pmf_score.metrics?.score) > 0)) {
          try {
            const wrinklePoints = parseInt(localStorage.getItem('wrinklePoints') || '0');
            const chatHistory = JSON.parse(localStorage.getItem('ideaChatMessages') || '[]');
            const userAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
            
            const marketMetrics: any = tiles.market_size?.metrics || tiles.market_size?.json || {};
            const competitionMetrics: any = tiles.competition?.metrics || tiles.competition?.json || {};
            const sentimentMetrics: any = tiles.sentiment?.metrics || tiles.sentiment?.json || {};
            
            // Normalize market data
            const TAM = marketMetrics.TAM || marketMetrics.tam || '$10B';
            const growth_rate = marketMetrics.growth_rate || marketMetrics.growth || '15%';
            
            // Normalize competition data
            const compLevel = (competitionMetrics.level || competitionMetrics.competition || '').toString().toLowerCase();
            const compScore = Number(competitionMetrics.score) || undefined;
            const competitionData = {
              level: compLevel || 'moderate',
              score: typeof compScore === 'number' && compScore > 0 ? compScore : 5
            };
            
            // Normalize sentiment data
            let sentScore = 0.5; // 0-1
            if (typeof sentimentMetrics.positive === 'string' && sentimentMetrics.positive.includes('%')) {
              const val = parseFloat(sentimentMetrics.positive.replace(/[^\d.]/g, ''));
              sentScore = isNaN(val) ? 0.5 : Math.min(Math.max(val / 100, 0), 1);
            } else if (typeof sentimentMetrics.score === 'number') {
              sentScore = Math.min(Math.max(sentimentMetrics.score, 0), 1);
            } else if (typeof sentimentMetrics.positive === 'number') {
              sentScore = Math.min(Math.max(sentimentMetrics.positive, 0), 1);
            }
            
            const { data: pmfResp, error: pmfErr } = await supabase.functions.invoke('calculate-smoothbrains-score', {
              body: {
                idea: input.idea,
                wrinklePoints,
                marketData: { TAM, growth_rate },
                competitionData,
                sentimentData: { score: sentScore, sentiment: Math.round(sentScore * 100) },
                chatHistory,
                userAnswers
              }
            });
            
            if (!pmfErr && pmfResp?.success) {
              tiles.pmf_score = {
                metrics: { score: pmfResp.score, category: pmfResp.category },
                explanation: pmfResp.explanation,
                citations: [],
                charts: [],
                json: { breakdown: pmfResp.breakdown, factors: pmfResp.factors },
                confidence: 0.8,
                dataQuality: 'high'
              };
            }
          } catch (e) {
            console.error('[OptimizedDataHub] PMF computation fallback failed:', e);
          }
        }
        
        // Add PMF category calculation if we have PMF score
        if (tiles.pmf_score) {
          const score = tiles.pmf_score.metrics?.score || 0;
          const insights = getPMFInsights(score, tiles.pmf_score.metrics);
          
          tiles.pmf_score = {
            ...tiles.pmf_score,
            metrics: {
              ...tiles.pmf_score.metrics,
              category: insights.category,
              trend: insights.trend
            },
            explanation: tiles.pmf_score.explanation || insights.recommendation
          };
        }
        
        // Generate summary based on collected data
        const summary = generateSummaryFromTiles(tiles);
        
        // Generate indices from cached data
        const cachedResponses = await cache.current.getResponsesForIdea(input.idea);
        const indices = generateIndicesFromResponses(cachedResponses);
        
        setState({
          indices,
          tiles,
          loading: false,
          error: null,
          summary,
          lastFetchTime: new Date().toISOString(),
          cacheStats: cacheStatsTracker
        });
        
        hasFetchedRef.current = true;
        
        // Show cache performance
        const cachePerformance = Math.round((cacheStatsTracker.hits / (cacheStatsTracker.hits + cacheStatsTracker.misses)) * 100);
        
        toast({
          title: "Data Loaded Efficiently",
          description: `${cachePerformance}% from cache, ${cacheStatsTracker.apiCalls} API calls saved`,
          duration: 3000
        });
      }
      
    } catch (error) {
      console.error('Data fetch error:', error);
      
      // Fallback to original edge function if optimized loading fails
      try {
        console.log('⚠️ Falling back to original data-hub-orchestrator');
        
        const { data, error: fallbackError } = await supabase.functions.invoke('data-hub-orchestrator', {
          body: {
            idea: input.idea,
            userId: user?.id,
            sessionId: Date.now().toString(),
            filters: {
              targetMarkets: input.targetMarkets,
              audienceProfiles: input.audienceProfiles,
              geos: input.geos,
              timeHorizon: input.timeHorizon,
              competitorHints: input.competitorHints
            }
          }
        });
        
        if (fallbackError) throw fallbackError;
        
        setState({
          indices: data?.indices || null,
          tiles: data?.tiles || {},
          loading: false,
          error: null,
          summary: data?.summary || null,
          lastFetchTime: new Date().toISOString(),
          cacheStats: { hits: 0, misses: 1, apiCalls: 50 } // Approximate
        });
        
      } catch (fallbackError) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load data'
        }));
        
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
          duration: 4000
        });
      }
    }
  }, [input, toast, useMockData, user?.id]);
  
  // Auto-fetch on mount
  useEffect(() => {
    if (input.idea && !hasFetchedRef.current) {
      console.log('🚀 Initial optimized fetch for:', input.idea.substring(0, 50));
      fetchDataHub(false);
    }
  }, [input.idea]);
  
  const refresh = useCallback(async () => {
    hasFetchedRef.current = false;
    // Clear relevant cache entries to force real API calls
    if (input.idea) {
      await cache.current.clearForIdea(input.idea);
    }
    return fetchDataHub(true);
  }, [fetchDataHub, input.idea]);
  
  const refreshTile = useCallback(async (tileType: string) => {
    if (!input.idea) return;
    
    console.log(`[OptimizedDataHub] Refreshing tile: ${tileType}`);
    setState(prev => ({
      ...prev,
      loading: true
    }));
    
    try {
      // Clear cache for this specific tile type
      const cachedResponses = await cache.current.getResponsesForIdea(input.idea);
      const tileCacheKeys = cachedResponses.filter(r => 
        (r.metadata as any)?.tileType === tileType || 
        r.source === tileType
      ).map(r => r.id);
      
      // For now, clear all cache for the idea (can optimize later)
      await cache.current.clearForIdea(input.idea);
      
      // Fetch fresh data for this tile through the optimized pipeline
      const tileData = await optimizedService.current.getDataForTile(tileType, input.idea);
      
      if (tileData) {
        // Convert OptimizedTileData to TileData format
        const convertedTileData: TileData = {
          metrics: tileData.metrics || {},
          explanation: tileData.notes || '',
          citations: (tileData.citations || []).map(c => 
            typeof c === 'string' 
              ? { url: '', title: c, source: '', relevance: 0.5 }
              : c
          ),
          charts: [],
          json: { ...tileData.metrics },
          dataQuality: (tileData.metrics && Object.keys(tileData.metrics).length > 3) ? 'high' : 'medium',
          confidence: tileData.confidence || 0.7
        };
        
        setState(prev => ({
          ...prev,
          tiles: {
            ...prev.tiles,
            [tileType]: convertedTileData
          },
          loading: false,
          lastFetchTime: new Date().toISOString()
        }));
        
        toast({
          title: "✅ Tile refreshed",
          description: `${tileType.replace(/_/g, ' ')} data updated`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error(`[OptimizedDataHub] Error refreshing tile ${tileType}:`, error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: `Failed to refresh ${tileType}`
      }));
      
      toast({
        title: "❌ Refresh failed",
        description: `Could not refresh ${tileType.replace(/_/g, ' ')} data`,
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [input.idea, toast]);
  
  const getTileData = useCallback((tileType: string): TileData | null => {
    return state.tiles[tileType] || null;
  }, [state.tiles]);
  
  const getCacheStats = useCallback(async () => {
    return await cache.current.getStats();
  }, []);
  
  return {
    ...state,
    fetchDataHub,
    refresh,
    refreshTile,
    getTileData,
    getCacheStats
  };
}

// Helper functions
function generateMockTiles(): Record<string, TileData> {
  // Reuse the existing mock data structure
  return {
    pmf_score: {
      metrics: { score: 82, market_fit: "Strong", demand: "High", urgency: "Medium" },
      explanation: "Strong product-market fit with high demand indicators",
      citations: [{ url: "https://example.com", title: "Market Analysis", source: "Industry Report", relevance: 0.9 }],
      charts: [],
      json: { pmf_score: 82 },
      confidence: 0.85,
      dataQuality: "high"
    },
    market_size: {
      metrics: { TAM: "$85.7B", SAM: "$42.3B", SOM: "$8.5B", growth: "24.5% CAGR" },
      explanation: "Large addressable market with strong growth trajectory",
      citations: [{ url: "https://example.com", title: "Market Size Report", source: "Research Firm", relevance: 0.95 }],
      charts: [],
      json: { TAM: 85700000000, SAM: 42300000000, SOM: 8500000000 },
      confidence: 0.9,
      dataQuality: "high"
    },
    // Add other mock tiles as needed...
  };
}

function generateMockIndices(): DataHubIndices {
  return {
    SEARCH_INDEX: [],
    NEWS_INDEX: [],
    COMPETITOR_INDEX: [],
    REVIEWS_INDEX: [],
    SOCIAL_INDEX: [],
    PRICE_INDEX: [],
    MARKET_INDEX: [],
    TRENDS_METRICS: {
      keyword: "startup idea analysis",
      interestOverTime: [
        { date: "2024-01", value: 65 },
        { date: "2024-02", value: 72 },
        { date: "2024-03", value: 78 },
        { date: "2024-04", value: 85 }
      ],
      relatedQueries: ["market analysis", "competitor research", "PMF"],
      breakoutTerms: ["AI", "automation", "efficiency"]
    },
    EVIDENCE_STORE: [],
    PROVIDER_LOG: []
  };
}

function generateMockSummary() {
  return {
    overall_score: 85,
    recommendation: "Strong opportunity with excellent growth potential",
    key_insights: [
      "Market showing 24.5% annual growth with $85.7B TAM",
      "User sentiment overwhelmingly positive at 85%",
      "Competition moderate with clear differentiation opportunities",
      "Technology trends favor rapid adoption"
    ],
    action_items: [
      "Focus on early adopter segments",
      "Build strategic partnerships",
      "Accelerate product development"
    ]
  };
}

function generateSummaryFromTiles(tiles: Record<string, TileData>) {
  const hasHighConfidence = Object.values(tiles).some(t => t.confidence > 0.8);
  const avgConfidence = Object.values(tiles).reduce((acc, t) => acc + (t.confidence || 0), 0) / Object.keys(tiles).length;
  
  return {
    overall_score: Math.round(avgConfidence * 100),
    recommendation: hasHighConfidence ? 
      "Strong indicators suggest viable opportunity" : 
      "Further validation recommended",
    key_insights: Object.entries(tiles)
      .filter(([_, tile]) => tile.confidence > 0.7)
      .slice(0, 4)
      .map(([type, tile]) => tile.explanation),
    action_items: [
      "Review high-confidence indicators",
      "Validate low-confidence areas",
      "Consider market timing"
    ]
  };
}

function generateIndicesFromResponses(responses: any[]): DataHubIndices {
  // Generate indices structure from cached responses
  return {
    SEARCH_INDEX: responses.filter(r => r.source === 'web_search').slice(0, 10),
    NEWS_INDEX: responses.filter(r => r.source === 'news').slice(0, 10),
    COMPETITOR_INDEX: responses.filter(r => r.source === 'competition').slice(0, 10),
    REVIEWS_INDEX: [],
    SOCIAL_INDEX: responses.filter(r => ['reddit', 'twitter'].includes(r.source)).slice(0, 10),
    PRICE_INDEX: [],
    MARKET_INDEX: [],
    TRENDS_METRICS: {
      keyword: "",
      interestOverTime: [],
      relatedQueries: [],
      breakoutTerms: []
    },
    EVIDENCE_STORE: responses.slice(0, 20),
    PROVIDER_LOG: responses.map(r => ({ 
      provider: r.source || 'unknown',
      timestamp: r.timestamp || Date.now(),
      requestCount: 1,
      dedupeCount: 0,
      estimatedCost: 0.001
    }))
  };
}
