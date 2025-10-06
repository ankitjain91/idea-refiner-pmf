import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { invokeSupabaseFunction } from '@/lib/request-queue';
import { useDataMode } from '@/contexts/DataModeContext';
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

// Rate limiting configuration
const RATE_LIMIT = {
  MIN_INTERVAL: 60000, // 1 minute between refreshes
  BATCH_WINDOW: 1000,  // 1 second batching window
  CACHE_TTL: 300000    // 5 minute cache TTL
};

const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes
  FORCE_TTL: 60 * 1000, // 1 minute minimum between force refreshes
  MAX_REQUESTS_PER_MINUTE: 10
};

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
  const { useMockData } = useDataMode();
  const { toast } = useToast();
  const orchestratorRef = useRef<DataHubOrchestrator | null>(null);
  const hasFetchedRef = useRef(false);
  const lastForceRefreshRef = useRef<number>(0);
  const requestCountRef = useRef<{count: number; resetTime: number}>({ count: 0, resetTime: Date.now() });
  const lastFetchRef = useRef<number>(0);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize orchestrator
  useEffect(() => {
    orchestratorRef.current = new DataHubOrchestrator();
  }, []);
  
  const fetchDataHub = useCallback(async (forceRefresh = false) => {
    if (!input.idea) {
      setState(prev => ({ ...prev, error: 'Missing idea' }));
      return;
    }

    // Check rate limiting
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;
    if (!forceRefresh && timeSinceLastFetch < RATE_LIMIT.MIN_INTERVAL) {
      console.log(`[DataHub] Rate limiting - too soon since last fetch (${timeSinceLastFetch}ms)`);      
      return;
    }

    // Check cache first
    const cacheKey = `datahub_${useMockData ? 'mock' : 'real'}_${user?.id}_${btoa(input.idea).substring(0, 20)}`;
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          const cacheAge = now - new Date(parsedCache.fetchedAt).getTime();
          if (cacheAge < RATE_LIMIT.CACHE_TTL) {
            console.log('[DataHub] Using cached data');
            setState({
              indices: parsedCache.indices,
              tiles: parsedCache.tiles,
              loading: false,
              error: null,
              summary: parsedCache.summary,
              lastFetchTime: parsedCache.fetchedAt
            });
            return;
          }
        } catch (e) {
          console.error('Cache parse error:', e);
        }
      }
    }
    
    // Clear any pending batch
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Start new batch window
    setState(prev => ({ ...prev, loading: true, error: null }));
    lastFetchRef.current = now;
    
    try {
      // Check if we should use mock data or real data
      if (useMockData) {
        // Use mock data
        console.log('📊 Loading MOCK DATA_HUB data for:', input.idea);
        
        // Simulate loading delay for mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate comprehensive mock tiles
      const mockTileBase = {
        confidence: Math.random() > 0.5 ? "high" : "medium",
        lastUpdated: new Date().toISOString(),
        trend: Math.random() > 0.5 ? "up" : "down",
      };
      
      const synthesizedTiles: Record<string, TileData> = {
        pmf_score: {
          metrics: {
            score: 82,
            market_fit: "Strong",
            demand: "High",
            urgency: "Medium"
          },
          explanation: "Strong product-market fit with high demand indicators",
          citations: [
            { url: "https://example.com", title: "Market Analysis", source: "Industry Report", relevance: 0.9 }
          ],
          charts: [],
          json: { pmf_score: 82 },
          confidence: 0.85,
          dataQuality: "high"
        },
        market_size: {
          metrics: {
            TAM: "$85.7B",
            SAM: "$42.3B",
            SOM: "$8.5B",
            growth: "24.5% CAGR"
          },
          explanation: "Large addressable market with strong growth trajectory",
          citations: [
            { url: "https://example.com", title: "Market Size Report", source: "Research Firm", relevance: 0.95 }
          ],
          charts: [],
          json: { TAM: 85700000000, SAM: 42300000000, SOM: 8500000000 },
          confidence: 0.9,
          dataQuality: "high"
        },
        competition: {
          metrics: {
            level: "Moderate",
            players: "12 major competitors",
            differentiation: "High potential"
          },
          explanation: "Moderate competition with clear differentiation opportunities",
          citations: [
            { url: "https://example.com", title: "Competitive Analysis", source: "Industry Report", relevance: 0.88 }
          ],
          charts: [],
          json: { competitors: 12, level: "moderate" },
          confidence: 0.82,
          dataQuality: "high"
        },
        sentiment: {
          metrics: {
            positive: "85%",
            neutral: "10%",
            negative: "5%"
          },
          explanation: "Overwhelmingly positive market sentiment",
          citations: [
            { url: "https://example.com", title: "Sentiment Analysis", source: "Social Media", relevance: 0.87 }
          ],
          charts: [],
          json: { positive: 0.85, neutral: 0.10, negative: 0.05 },
          confidence: 0.88,
          dataQuality: "high"
        },
        market_trends: {
          metrics: {
            momentum: "Accelerating",
            adoption: "Early majority",
            innovation: "High"
          },
          explanation: "Strong market momentum with accelerating adoption",
          citations: [
            { url: "https://example.com", title: "Trend Analysis", source: "Market Research", relevance: 0.91 }
          ],
          charts: [],
          json: { momentum: "accelerating", adoption_phase: "early_majority" },
          confidence: 0.86,
          dataQuality: "high"
        },
        google_trends: {
          metrics: {
            score: "78/100",
            trend: "+45% YoY",
            regions: "Global interest"
          },
          explanation: "Strong and growing search interest globally",
          citations: [
            { url: "https://trends.google.com", title: "Google Trends", source: "Google", relevance: 1.0 }
          ],
          charts: [],
          json: { interest_score: 78, growth_yoy: 0.45 },
          confidence: 0.92,
          dataQuality: "high"
        },
        web_search: {
          metrics: {
            results: "2.5M results",
            news: "125 recent articles",
            growth: "+65% mentions"
          },
          explanation: "High web visibility with growing mentions",
          citations: [
            { url: "https://example.com", title: "Web Analysis", source: "Search Engine", relevance: 0.85 }
          ],
          charts: [],
          json: { total_results: 2500000, recent_news: 125 },
          confidence: 0.83,
          dataQuality: "medium"
        },
        reddit_sentiment: {
          metrics: {
            posts: "450 discussions",
            upvotes: "89% positive",
            communities: "15 active subreddits"
          },
          explanation: "Very positive Reddit community engagement",
          citations: [
            { url: "https://reddit.com", title: "Reddit Analysis", source: "Reddit", relevance: 0.89 }
          ],
          charts: [],
          json: { posts: 450, positive_ratio: 0.89, subreddits: 15 },
          confidence: 0.87,
          dataQuality: "high"
        },
        twitter_buzz: {
          metrics: {
            tweets: "8.5K/week",
            impressions: "12M",
            influencers: "25 key voices"
          },
          explanation: "Trending topic with high engagement on Twitter",
          citations: [
            { url: "https://twitter.com", title: "Twitter Analysis", source: "Twitter", relevance: 0.86 }
          ],
          charts: [],
          json: { weekly_tweets: 8500, impressions: 12000000 },
          confidence: 0.84,
          dataQuality: "medium"
        },
        growth_potential: {
          metrics: {
            projection: "10x in 3 years",
            scalability: "Excellent",
            market_timing: "Optimal"
          },
          explanation: "Exceptional growth potential with optimal market timing",
          citations: [
            { url: "https://example.com", title: "Growth Analysis", source: "Analyst Report", relevance: 0.88 }
          ],
          charts: [],
          json: { growth_multiplier: 10, years: 3 },
          confidence: 0.79,
          dataQuality: "medium"
        },
        market_readiness: {
          metrics: {
            adoption_rate: "Fast",
            infrastructure: "Mature",
            regulations: "Favorable"
          },
          explanation: "Market is ready for rapid adoption",
          citations: [
            { url: "https://example.com", title: "Readiness Assessment", source: "Industry Report", relevance: 0.87 }
          ],
          charts: [],
          json: { readiness_score: 0.85 },
          confidence: 0.83,
          dataQuality: "high"
        },
        competitive_advantage: {
          metrics: {
            moat: "Technology & Brand",
            defensibility: "High",
            differentiation: "Clear"
          },
          explanation: "Strong competitive advantages with high defensibility",
          citations: [
            { url: "https://example.com", title: "Competitive Strategy", source: "Strategy Report", relevance: 0.9 }
          ],
          charts: [],
          json: { defensibility_score: 0.88 },
          confidence: 0.85,
          dataQuality: "high"
        },
        risk_assessment: {
          metrics: {
            market_risk: "Low",
            execution_risk: "Medium",
            regulatory_risk: "Low"
          },
          explanation: "Overall low to medium risk profile",
          citations: [
            { url: "https://example.com", title: "Risk Analysis", source: "Risk Report", relevance: 0.91 }
          ],
          charts: [],
          json: { overall_risk: "low-medium" },
          confidence: 0.88,
          dataQuality: "high"
        },
        news_analysis: {
          metrics: {
            mentions: "125 articles",
            sentiment: "78% positive",
            reach: "2.5M readers"
          },
          explanation: "Positive media coverage with wide reach",
          citations: [
            { url: "https://example.com", title: "News Analysis", source: "Media Monitor", relevance: 0.86 }
          ],
          charts: [],
          json: { article_count: 125, positive_sentiment: 0.78 },
          confidence: 0.84,
          dataQuality: "high"
        }
      };
      
      const summary = {
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
      
      const fetchTime = new Date().toISOString();
      
      // Update state with mock data
      const mockIndices: DataHubIndices = {
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
      
      const newState = {
        indices: mockIndices,
        tiles: synthesizedTiles,
        loading: false,
        error: null,
        summary,
        lastFetchTime: fetchTime
      };
      
      setState(newState);
      hasFetchedRef.current = true;
      
      // Dispatch event that tiles are loaded
      window.dispatchEvent(new CustomEvent('dashboard-tiles-loaded', {
        detail: { tiles: synthesizedTiles, timestamp: fetchTime }
      }));
      
      // Cache the mock data
      const cacheKey = `datahub_mock_${btoa(input.idea).substring(0, 20)}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        ...newState,
        fetchedAt: fetchTime
      }));
      
      toast({
        title: "Mock Data Loaded",
        description: "Dashboard populated with sample data",
        duration: 3000
      });
      
      } else {
        // Use real data from Supabase edge functions (through sequential queue)
        console.log('📊 Loading REAL DATA from APIs for:', input.idea);
        
        const data = await invokeSupabaseFunction('data-hub-orchestrator', {
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
        });
        
        if (!data) {
          throw new Error('No data received from orchestrator');
        }
        
        // Initialize orchestrator with the indices from edge function
        if (data?.indices && orchestratorRef.current) {
          orchestratorRef.current.setIndices(data.indices);
          
          // Synthesize tiles from the raw indices
          const tilesToSynthesize = [
            'pmf_score',
            'market_size', 
            'competition',
            'sentiment',
            'market_trends',
            'google_trends',
            'web_search',
            'reddit_sentiment',
            'twitter_buzz',
            'growth_potential',
            'market_readiness',
            'competitive_advantage',
            'risk_assessment',
            'news_analysis'
          ];
          
          const synthesizedTiles: Record<string, TileData> = {};
          
          // Synthesize each tile type
          for (const tileType of tilesToSynthesize) {
            try {
              const tileData = await orchestratorRef.current.synthesizeTileData(tileType);
              if (tileData) {
                synthesizedTiles[tileType] = tileData;
              }
            } catch (err) {
              console.error(`Failed to synthesize ${tileType}:`, err);
            }
          }
          
          const fetchTime = new Date().toISOString();
          
          setState({
            indices: data.indices,
            tiles: synthesizedTiles,
            loading: false,
            error: null,
            summary: orchestratorRef.current.getHubSummary(),
            lastFetchTime: fetchTime
          });
          
          hasFetchedRef.current = true;
          
          // Dispatch event that tiles are loaded
          window.dispatchEvent(new CustomEvent('dashboard-tiles-loaded', {
            detail: { tiles: synthesizedTiles, timestamp: fetchTime }
          }));
          
          // Cache the synthesized data
          const cacheKey = `datahub_real_${user?.id}_${btoa(input.idea).substring(0, 20)}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            indices: data.indices,
            tiles: synthesizedTiles,
            summary: orchestratorRef.current.getHubSummary(),
            fetchedAt: fetchTime
          }));
        } else {
          throw new Error('No indices data received from edge function');
        }
        
        toast({
          title: "Real Data Loaded",
          description: "Dashboard populated with live API data",
          duration: 3000
        });
      }
      
    } catch (error) {
      console.error('Data fetch error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load mock data'
      }));
      
      toast({
        title: "Error",
        description: "Failed to load mock data",
        variant: "destructive",
        duration: 4000
      });
    }
  }, [input, toast, useMockData, user?.id]);
  
  // Debounce and batch fetch requests
  useEffect(() => {
    const loadDataForIdea = async () => {
      if (!input.idea) return;
      
      // Check cache first
      const cacheKey = `datahub_${useMockData ? 'mock' : 'real'}_${user?.id}_${btoa(input.idea).substring(0, 20)}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          const cacheAge = Date.now() - new Date(parsedCache.fetchedAt).getTime();
          
          // Use cache if less than 5 minutes old
          if (cacheAge < 5 * 60 * 1000) {
            console.log('📦 Using cached data for:', input.idea.substring(0, 50));
            setState({
              indices: parsedCache.indices,
              tiles: parsedCache.tiles,
              loading: false,
              error: null,
              summary: parsedCache.summary,
              lastFetchTime: parsedCache.fetchedAt
            });
            return;
          }
        } catch (e) {
          console.error('Cache parse error:', e);
        }
      }
      
      // Debounce fetch requests
      const timeoutId = setTimeout(async () => {
        const hasDataInState = Object.keys(state.tiles).length > 0;
        const lastIdea = localStorage.getItem('lastFetchedIdea');
        const ideaChanged = lastIdea !== input.idea;
        
        if ((!hasDataInState && !hasFetchedRef.current) || ideaChanged) {
          console.log('🚀 Debounced DATA_HUB fetch for:', input.idea.substring(0, 50));
          localStorage.setItem('lastFetchedIdea', input.idea);
          await fetchDataHub(false);
        } else {
          console.log('⚡ Skipping fetch - data already loaded for:', input.idea.substring(0, 50));
        }
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(timeoutId);
    };
    
    loadDataForIdea();
  }, [input.idea]);
  
  const refresh = useCallback(() => {
    hasFetchedRef.current = false;
    const cacheKey = useMockData 
      ? `datahub_mock_${btoa(input.idea).substring(0, 20)}`
      : `datahub_real_${user?.id}_${btoa(input.idea).substring(0, 20)}`;
    localStorage.removeItem(cacheKey);
    return fetchDataHub(true);
  }, [fetchDataHub, user?.id, input.idea, useMockData]);
  
  const getTileData = useCallback((tileType: string): TileData | null => {
    return state.tiles[tileType] || null;
  }, [state.tiles]);
  
  const refreshTile = useCallback(async (tileType: string) => {
    // For non-optimized version, just refresh everything
    return refresh();
  }, [refresh]);
  
  return {
    ...state,
    fetchDataHub,
    refresh,
    refreshTile,
    getTileData,
    loadingTasks: [], // Not implemented for legacy hook
    cacheStats: { hits: 0, misses: 0, apiCalls: 0 }
  };
}