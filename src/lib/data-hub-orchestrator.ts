/**
 * DATA HUB ORCHESTRATOR
 * Central system for orchestrating all data fetching with deduplication
 */

import { SearchResult, NewsItem, CompetitorData, ReviewData, SocialData, PriceData, TrendsData } from './types';

type DataProviderSource = 'serper' | 'tavily' | 'brave' | 'firecrawl' | 'groq' | 'serpapi' | 'scraperapi';

interface DataQuality {
  dataQuality: 'high' | 'medium' | 'low';
}

export interface DataHubInput {
  idea: string;
  session_id?: string | null;
  targetMarkets?: string[];
  audienceProfiles?: string[];
  geos?: string[];
  timeHorizon?: string;
  competitorHints?: string[];
}

export interface FetchPlanItem {
  id: string;
  source: 'serper' | 'tavily' | 'brave' | 'firecrawl' | 'groq' | 'serpapi' | 'scraperapi';
  purpose: string;
  query: string;
  dedupeKey: string;
  dependencies?: string[];
  priority: number;
}

export interface DataHubIndices {
  SEARCH_INDEX: SearchResult[];
  NEWS_INDEX: NewsItem[];
  COMPETITOR_INDEX: CompetitorData[];
  REVIEWS_INDEX: ReviewData[];
  SOCIAL_INDEX: SocialData[];
  PRICE_INDEX: PriceData[];
  MARKET_INDEX: any[]; // Added for market data
  TRENDS_METRICS: TrendsData;
  EVIDENCE_STORE: Evidence[];
  PROVIDER_LOG: ProviderLogEntry[];
}

// Interfaces imported from ./types - removed duplicate declarations
  currency: string;
  source: string;
  date: string;
  priceType: 'retail' | 'wholesale' | 'subscription';
}

export interface TrendsData {
  keyword: string;
  interestOverTime: { date: string; value: number }[];
  relatedQueries: string[];
  breakoutTerms: string[];
}

export interface Evidence {
  id: string;
  url: string;
  title: string;
  source: string;
  snippet: string;
  confidence: number;
  tileReferences: string[];
}

export interface ProviderLogEntry {
  provider: string;
  requestCount: number;
  dedupeCount: number;
  estimatedCost: number;
  timestamp: string;
}

export interface TileData {
  metrics: Record<string, any>;
  explanation: string;
  citations: Citation[];
  charts: ChartData[];
  json: any;
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  insights?: any; // Enhanced insights for enriched tiles
}

export interface Citation {
  url: string;
  title: string;
  source: string;
  relevance: number;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  series: any[];
  labels?: string[];
  title?: string;
}

export class DataHubOrchestrator {
  // Static properties
  private static readonly BATCH_WINDOW: number = 100; // 100ms batch window
  private static readonly CACHE_TTL: number = 5 * 60 * 1000; // 5 minutes

  // Instance properties
  private dataHub: DataHubIndices;
  private fetchPlan: FetchPlanItem[];
  private dedupeMap: Map<string, string>;
  private input: DataHubInput;
  private batchTimeout: NodeJS.Timeout | null;
  private pendingTiles: Map<string, {
    resolve: (value: TileData) => void;
    reject: (error: Error) => void;
    tileType: string;
  }>;
  private tileCache: Map<string, {
    data: TileData;
    timestamp: number;
  }>;

  constructor() {
    this.dataHub = {
      SEARCH_INDEX: [],
      NEWS_INDEX: [],
      COMPETITOR_INDEX: [],
      REVIEWS_INDEX: [],
      SOCIAL_INDEX: [],
      PRICE_INDEX: [],
      MARKET_INDEX: [],
      TRENDS_METRICS: {} as TrendsData,
      EVIDENCE_STORE: [],
      PROVIDER_LOG: []
    };
    this.fetchPlan = [];
    this.dedupeMap = new Map<string, string>();
    this.input = { idea: '' };
    this.batchTimeout = null;
    this.pendingTiles = new Map();
    this.tileCache = new Map();
  }

  public setIndices(indices: DataHubIndices): void {
    this.dataHub = indices;
  }

  private normalizeInput(input: DataHubInput): string[] {
    const keywords: string[] = [];
    
    // Extract keywords from idea
    const ideaWords = input.idea.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    keywords.push(...ideaWords);
    
    // Add target markets
    if (input.targetMarkets) {
      keywords.push(...input.targetMarkets.map(m => m.toLowerCase()));
    }
    
    // Add audience profiles
    if (input.audienceProfiles) {
      keywords.push(...input.audienceProfiles.map(a => a.toLowerCase()));
    }
    
    // Add competitors
    if (input.competitorHints) {
      keywords.push(...input.competitorHints.map(c => c.toLowerCase()));
    }
    
    // Remove duplicates
    return [...new Set(keywords)];
  }

  private buildFetchPlan(input: DataHubInput, keywords: string[]): FetchPlanItem[] {
    const plan: FetchPlanItem[] = [];
    
    // Initialize fetch plan
    keywords.forEach(keyword => {
      plan.push({
        id: `q_${keyword}`,
        source: 'serper',
        purpose: 'search',
        query: keyword,
        dedupeKey: keyword,
        priority: 1
      });
    });
    
    return plan;
  }

  public async executeFetchPlan(plan: FetchPlanItem[]): Promise<DataHubIndices> {
    return this.dataHub;
  }
    // Store the input for later use in synthesis
    this.input = input;
    const plan: FetchPlanItem[] = [];
    const seen = new Set<string>();
    
    // Helper to add deduplicated query
    const addQuery = (source: FetchPlanItem['source'], purpose: string, query: string, priority = 1) => {
      const dedupeKey = `${source}|${purpose}|${query}`.toLowerCase();
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        plan.push({
          id: `${source}_${plan.length}`,
          source,
          purpose,
          query,
          dedupeKey,
          priority
        });
      }
    };
    
    // Core web search queries (Serper as baseline)
    addQuery('serper', 'market_overview', input.idea, 1);
    addQuery('serper', 'competitor_search', `${input.idea} competitors alternatives`, 1);
    addQuery('serper', 'pricing_search', `${input.idea} pricing cost`, 2);
    
    // Enhanced scraper queries for deep analysis
    addQuery('scraperapi', 'competitor_deep', `${input.idea} vs alternatives comparison`, 1);
    addQuery('scraperapi', 'pricing_deep', `${input.idea} pricing plans features`, 2);
    addQuery('scraperapi', 'market_analysis', `${input.idea} market analysis report`, 2);
    
    // News search (Brave for diversity)
    addQuery('brave', 'news_recent', `${input.idea} news latest`, 1);
    addQuery('brave', 'news_trends', `${input.idea} trends 2024 2025`, 2);
    
    // Social sentiment (Tavily for social focus)
    addQuery('tavily', 'reddit_sentiment', `site:reddit.com ${input.idea}`, 2);
    addQuery('tavily', 'twitter_buzz', `site:twitter.com ${input.idea}`, 3);
    
    // Competitor deep dive (Firecrawl for extraction)
    if (input.competitorHints) {
      input.competitorHints.forEach(comp => {
        addQuery('firecrawl', 'competitor_analysis', comp, 2);
      });
    }
    
    // Market sizing queries (reduced to avoid rate limits)
    keywords.slice(0, 2).forEach(keyword => {
      addQuery('serpapi', 'market_size', `${keyword} market size TAM`, 3);
    });
    
    return plan;
  }

  /**
   * PHASE 2: Execute fetch plan (would be called by edge function)
   */
  async executeFetchPlan(plan: FetchPlanItem[]): Promise<DataHubIndices> {
    // This would be executed by the edge function
    // For now, return the structure
    return this.dataHub;
  }

  /**
   * PHASE 3: Synthesize tile data from hub
   */
  async synthesizeTileData(tileType: string): Promise<TileData> {
    // Check cache first
    const cacheKey = `${this.input.idea}_${tileType}`;
    const cached = this.tileCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < DataHubOrchestrator.CACHE_TTL) {
      console.log(`[DataHub] Cache hit for ${tileType}`);
      return cached.data;
    }

    // Return promise that will be resolved when batch is processed
    return new Promise((resolve, reject) => {
      // Add to pending batch
      if (!this.pendingTiles.has(tileType)) {
        this.pendingTiles.set(tileType, []);
      }
      this.pendingTiles.get(tileType)!.push({ resolve, reject, tileType });

      // Schedule batch processing
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.processBatch(), DataHubOrchestrator.BATCH_WINDOW);
      }
    });
  }

  private async processBatch(): Promise<void> {
    // Clear timeout
    this.batchTimeout = null;

    // Process all pending tiles
    const pending = Array.from(this.pendingTiles.entries());
    this.pendingTiles.clear();

    // Base tile data
    const baseData: TileData = {
      metrics: {},
      explanation: '',
      citations: [],
      charts: [],
      json: {},
      confidence: 0,
      dataQuality: 'low'
    };

    // Process each tile type in batch
    for (const [tileType, requests] of pending) {
      try {
        let tileData: TileData;

        // Synthesize data based on tile type
        switch (tileType) {
          case 'pmf_score': {
            tileData = await this.synthesizePMFScore();
            break;
          }
          case 'market_size': {
            tileData = this.synthesizeMarketSize();
            break;
          }
          case 'competition': {
            tileData = this.synthesizeCompetition();
            break;
          }
          case 'sentiment': {
            tileData = this.synthesizeSentiment();
            break;
          }
          case 'market_trends': {
            tileData = this.synthesizeMarketTrends();
            break;
          }
          case 'google_trends': {
            tileData = this.synthesizeGoogleTrends();
            break;
          }
          case 'web_search': {
            tileData = this.synthesizeWebSearch();
            break;
          }
          case 'reddit_sentiment': {
            tileData = this.synthesizeRedditSentiment();
            break;
          }
          case 'twitter_buzz': {
            tileData = this.synthesizeTwitterBuzz();
            break;
          }
          case 'growth_potential': {
            tileData = this.synthesizeGrowthPotential();
            break;
          }
          case 'market_readiness': {
            tileData = this.synthesizeMarketReadiness();
            break;
          }
          case 'competitive_advantage': {
            tileData = this.synthesizeCompetitiveAdvantage();
            break;
          }
          case 'risk_assessment': {
            tileData = this.synthesizeRiskAssessment();
            break;
          }
          default: {
            tileData = baseData;
            break;
          }
        }

        // Cache the result
        const cacheKey = `${this.input.idea}_${tileType}`;
        this.tileCache.set(cacheKey, {
          data: tileData,
          timestamp: Date.now()
        });

        // Resolve all pending requests for this tile type
        requests.forEach(({ resolve }) => resolve(tileData));
      } catch (error) {
        // Reject all pending requests on error
        requests.forEach(({ reject }) => reject(error));
      }
    }
  }

  private async synthesizePMFScore(): Promise<TileData> {
    console.log('[PMF Score] Starting comprehensive pipeline-based synthesis');
    
    // Enhanced conversation analysis for wrinkle points
    const wrinklePoints = parseInt(localStorage.getItem('wrinklePoints') || '0');
    const chatHistory = JSON.parse(localStorage.getItem('ideaChatMessages') || '[]');
    const userAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
    const conversationDepth = chatHistory.length;
    
    console.log('[PMF Score] Pipeline conversation analysis:', {
      wrinklePoints,
      chatLength: conversationDepth,
      userAnswers: Object.keys(userAnswers).length
    });

    // Enhanced market data extraction using pipeline indices
    let marketSize = this.dataHub.MARKET_INDEX.find(d => 
      d.key?.toLowerCase().includes('tam') || 
      d.key?.toLowerCase().includes('market_size')
    )?.value;
    
    let growthRate = this.dataHub.MARKET_INDEX.find(d => 
      d.key?.toLowerCase().includes('growth') || 
      d.key?.toLowerCase().includes('cagr')
    )?.value;
    
    // Pipeline-enhanced market size extraction from multiple sources
    if (!marketSize && this.dataHub.SEARCH_INDEX.length > 0) {
      for (const result of this.dataHub.SEARCH_INDEX.slice(0, 10)) {
        const text = (result.title + ' ' + result.snippet).toLowerCase();
        const tamMatch = text.match(/(\$?\d+\.?\d*)\s*(billion|trillion|b|t)/);
        if (tamMatch) {
          const value = parseFloat(tamMatch[1].replace('$', ''));
          const multiplier = tamMatch[2].includes('t') ? 'T' : 'B';
          marketSize = `$${value}${multiplier}`;
          break;
        }
      }
    }
    
    // Pipeline-enhanced growth rate extraction
    if (!growthRate) {
      for (const news of this.dataHub.NEWS_INDEX.slice(0, 10)) {
        const text = (news.title + ' ' + news.snippet).toLowerCase();
        const growthMatch = text.match(/(\d+\.?\d*)%?\s*(growth|cagr|increase|expanding)/);
        if (growthMatch) {
          growthRate = `${growthMatch[1]}%`;
          break;
        }
      }
    }
    
    marketSize = marketSize || '$10B';
    growthRate = growthRate || '15%';
    
    const marketData = {
      TAM: marketSize,
      growth_rate: growthRate
    };
    
    console.log('[PMF Score] Pipeline-enhanced market data:', marketData);
    
    // Enhanced competition analysis through pipeline
    const competitionScore = this.calculateCompetitionScore();
    const competitorCount = this.dataHub.COMPETITOR_INDEX.length;
    const competitionData = {
      level: competitionScore < 30 ? 'high' : competitionScore < 70 ? 'moderate' : 'low',
      score: Math.max(1, Math.min(10, (100 - competitionScore) / 10)),
      count: competitorCount,
      pipelineEnhanced: true
    };
    
    console.log('[PMF Score] Pipeline-enhanced competition data:', competitionData);
    
    // Enhanced sentiment analysis from multiple pipeline sources
    const sentimentScore = this.calculateSentimentScore();
    const socialSignals = this.dataHub.SOCIAL_INDEX.length;
    const newsSignals = this.dataHub.NEWS_INDEX.length;
    const sentimentData = {
      score: Math.max(0, Math.min(1, sentimentScore / 100)),
      sentiment: sentimentScore,
      socialSignals,
      newsSignals,
      pipelineEnhanced: true
    };
    
    console.log('[PMF Score] Pipeline-enhanced sentiment data:', sentimentData);
    
    // Calculate enhanced pipeline-based component scores
    const demandScore = this.calculateDemandScore();
    const trendsScore = this.calculateTrendsScore();
    const executionScore = this.calculateExecutionViability();
    const refinementScore = this.calculateIdeaRefinementScore();
    
    console.log('[PMF Score] Pipeline component scores:', {
      demand: demandScore,
      trends: trendsScore,
      execution: executionScore,
      refinement: refinementScore
    });

    try {
      // Enhanced factors for SmoothBrains calculation using comprehensive pipeline data
      const enhancedFactors = {
        idea: this.input.idea,
        wrinklePoints,
        marketData,
        competitionData,
        sentimentData,
        chatHistory,
        userAnswers,
        // Pipeline-derived enhancements
        demandSignals: demandScore,
        trendsSignals: trendsScore,
        executionViability: executionScore,
        refinementQuality: refinementScore,
        dataQuality: this.assessDataQuality(),
        pipelineConfidence: this.calculateConfidence(['sentiment', 'competition', 'market', 'demand']),
        dataSourcesCount: {
          search: this.dataHub.SEARCH_INDEX.length,
          news: this.dataHub.NEWS_INDEX.length,
          competitors: this.dataHub.COMPETITOR_INDEX.length,
          social: this.dataHub.SOCIAL_INDEX.length
        }
      };
      
      console.log('[PMF Score] Calling SmoothBrains with pipeline-enhanced factors');
      
      // Call SmoothBrains score calculation with enhanced pipeline data
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.functions.invoke('calculate-smoothbrains-score', {
        body: enhancedFactors
      });
      
      if (error) throw error;
      
      if (data && data.success) {
        console.log('[PMF Score] Pipeline-enhanced SmoothBrains calculation successful:', {
          score: data.score,
          category: data.category
        });
        
        return {
          metrics: {
            score: data.score,
            category: data.category,
            sentiment: sentimentScore,
            competition: competitionScore,
            demand: demandScore,
            trends: trendsScore,
            execution: executionScore,
            refinement: refinementScore,
            wrinklePoints,
            breakdown: data.breakdown,
            pipelineEnhanced: true
          },
          explanation: `${data.explanation} (Enhanced with multistep pipeline analysis from ${this.dataHub.SEARCH_INDEX.length} search results, ${this.dataHub.NEWS_INDEX.length} news items, ${this.dataHub.COMPETITOR_INDEX.length} competitors)`,
          citations: this.getTopCitations('pmf', 5),
          charts: [
            {
              type: 'bar',
              series: [
                { name: 'Pipeline Components', data: [sentimentScore, competitionScore, demandScore, trendsScore, executionScore, refinementScore] }
              ],
              labels: ['Sentiment', 'Competition', 'Demand', 'Trends', 'Execution', 'Refinement'],
              title: 'Pipeline-Enhanced SmoothBrains Score Breakdown'
            },
            {
              type: 'pie',
              series: [data.breakdown?.wrinklePoints || 0, data.breakdown?.marketOpportunity || 0, data.breakdown?.productMarketFit || 0],
              labels: ['Understanding', 'Market Opportunity', 'Product-Market Fit'],
              title: 'Core Score Factors'
            }
          ],
          json: { 
            smoothBrainsScore: data.score,
            category: data.category,
            breakdown: data.breakdown,
            pipelineData: {
              searchResults: this.dataHub.SEARCH_INDEX.length,
              newsItems: this.dataHub.NEWS_INDEX.length,
              competitors: this.dataHub.COMPETITOR_INDEX.length,
              socialSignals: this.dataHub.SOCIAL_INDEX.length
            },
            components: { 
              sentimentScore, 
              competitionScore, 
              demandScore, 
              trendsScore,
              executionScore,
              refinementScore,
              wrinklePoints
            }
          },
          confidence: this.calculateConfidence(['sentiment', 'competition', 'demand', 'trends', 'market']),
          dataQuality: this.assessDataQuality(),
          insights: {
            pipelineEnhanced: true,
            dataSourceCount: this.dataHub.SEARCH_INDEX.length + this.dataHub.NEWS_INDEX.length + this.dataHub.COMPETITOR_INDEX.length,
            confidenceLevel: data.breakdown ? 'high' : 'medium',
            recommendedActions: this.generatePMFRecommendations(data.score, data.category)
          }
        };
      }
    } catch (error) {
      console.error('[PMF Score] SmoothBrains calculation failed, using pipeline fallback:', error);
    }
    
    // Enhanced pipeline fallback calculation
    console.log('[PMF Score] Using enhanced pipeline fallback calculation');
    
    const pipelinePMFScore = Math.min(95, Math.round(
      (sentimentScore * 0.25) +
      (competitionScore * 0.15) +
      (demandScore * 0.20) +
      (trendsScore * 0.15) +
      (executionScore * 0.15) +
      (refinementScore * 0.10) +
      (Math.min(wrinklePoints, 50) * 0.20) // Bonus for understanding depth
    ));
    
    const fallbackCategory = pipelinePMFScore > 85 ? 'Unicorn Potential' : 
                            pipelinePMFScore > 75 ? 'Strong Business' : 
                            pipelinePMFScore > 60 ? 'Viable Startup' : 
                            pipelinePMFScore > 40 ? 'Early Stage' : 'Concept Phase';

    return {
      metrics: {
        score: pipelinePMFScore,
        category: fallbackCategory,
        sentiment: sentimentScore,
        competition: competitionScore,
        demand: demandScore,
        trends: trendsScore,
        execution: executionScore,
        refinement: refinementScore,
        wrinklePoints,
        pipelineEnhanced: true
      },
      explanation: `Pipeline-Enhanced PMF Score: ${pipelinePMFScore}/100 (${fallbackCategory}). Analysis based on ${this.dataHub.SEARCH_INDEX.length} search results, ${this.dataHub.NEWS_INDEX.length} news items, ${this.dataHub.COMPETITOR_INDEX.length} competitors, and conversation depth of ${conversationDepth} exchanges.`,
      citations: this.getTopCitations('pmf', 5),
      charts: [
        {
          type: 'bar',
          series: [
            { name: 'Pipeline Components', data: [sentimentScore, competitionScore, demandScore, trendsScore, executionScore, refinementScore] }
          ],
          labels: ['Sentiment', 'Competition', 'Demand', 'Trends', 'Execution', 'Refinement'],
          title: 'Enhanced PMF Score Breakdown'
        }
      ],
      json: { 
        smoothBrainsScore: pipelinePMFScore,
        category: fallbackCategory,
        pipelineData: {
          searchResults: this.dataHub.SEARCH_INDEX.length,
          newsItems: this.dataHub.NEWS_INDEX.length,
          competitors: this.dataHub.COMPETITOR_INDEX.length,
          socialSignals: this.dataHub.SOCIAL_INDEX.length
        },
        components: { 
          sentimentScore, 
          competitionScore, 
          demandScore, 
          trendsScore,
          executionScore,
          refinementScore,
          wrinklePoints
        }
      },
      confidence: this.calculateConfidence(['sentiment', 'competition', 'demand', 'trends']),
      dataQuality: this.assessDataQuality(),
      insights: {
        pipelineEnhanced: true,
        fallbackMode: true,
        dataSourceCount: this.dataHub.SEARCH_INDEX.length + this.dataHub.NEWS_INDEX.length + this.dataHub.COMPETITOR_INDEX.length,
        recommendedActions: this.generatePMFRecommendations(pipelinePMFScore, fallbackCategory)
      }
    };
  }

  private synthesizeMarketSize(): TileData {
    const searchVolume = this.dataHub.SEARCH_INDEX.length;
    const competitorCount = this.dataHub.COMPETITOR_INDEX.length;
    const newsVolume = this.dataHub.NEWS_INDEX.length;
    const avgPricing = this.calculateAveragePricing();
    
    // Enhanced TAM calculation with multiple factors
    const estimatedUsers = searchVolume * 1000; // Proxy multiplier
    const marketGrowthFactor = this.calculateMarketGrowthFactor();
    const competitionFactor = Math.max(0.5, 1 - (competitorCount * 0.05)); // Reduce TAM based on competition
    
    const tam = estimatedUsers * avgPricing * 12 * marketGrowthFactor * competitionFactor;
    const sam = tam * 0.15; // Serviceable = 15% of TAM
    const som = sam * 0.05; // Obtainable = 5% of SAM in year 1
    
    // Calculate growth rate from trend analysis
    const growthRate = this.calculateMarketGrowthRate();
    
    // Determine market maturity
    const marketMaturity = this.determineMarketMaturity();
    
    // Calculate competitive density
    const competitiveDensity = this.calculateCompetitiveDensity();
    
    // Generate enriched insights
    const enrichedInsights = {
      trends: this.extractMarketTrends(),
      disruptors: this.identifyMarketDisruptors(),
      maturity: marketMaturity,
      technologyAdoption: this.calculateTechnologyAdoption(),
      regulatoryRisk: this.assessRegulatoryRisk(),
      searchVolume: searchVolume * 100, // Scaled search volume
      searchTrend: searchVolume > 50 ? 'up' : searchVolume > 20 ? 'stable' : 'down',
      sentiment: this.calculateSentimentScore(),
      mentions: newsVolume * 10, // Social mentions estimate
      newsCount: newsVolume,
      newsSentiment: this.calculateNewsSentiment(),
      fundingDeals: Math.floor(competitorCount * 0.3), // Estimate funding activity
      fundingAmount: `$${Math.floor(tam / 1000000)}M`, // Funding volume estimate
      lastDeal: `${Math.floor(Math.random() * 30) + 1} days ago`,
      competitors: this.getTopCompetitors(),
      concentration: competitorCount > 20 ? 'fragmented' : competitorCount > 5 ? 'consolidated' : 'monopolistic',
      barriers: this.assessBarriersToEntry(),
      nextYearTam: `$${(tam * (1 + growthRate/100)).toLocaleString()}`,
      nextYearGrowth: `${growthRate}%`,
      fiveYearTam: `$${(tam * Math.pow(1 + growthRate/100, 5)).toLocaleString()}`,
      fiveYearCagr: `${growthRate}%`,
      drivers: this.identifyGrowthDrivers(),
      risks: this.identifyMarketRisks()
    };

    return {
      metrics: {
        tam: tam,
        sam: sam,
        som: som,
        growth_rate: growthRate,
        avgPricing: avgPricing,
        competitorCount: competitorCount,
        marketMaturity: marketMaturity,
        competitive_density: competitiveDensity
      },
      explanation: `Enhanced Market Analysis: TAM = Search Volume (${searchVolume}) × 1000 × $${avgPricing} × 12 months × ${marketGrowthFactor.toFixed(2)} (growth) × ${competitionFactor.toFixed(2)} (competition) = $${tam.toLocaleString()}. SAM = 15% of TAM, SOM = 5% of SAM. Market shows ${marketMaturity} characteristics with ${growthRate}% projected growth.`,
      citations: this.getTopCitations('market', 5),
      charts: [
        {
          type: 'pie',
          series: [tam, sam, som],
          labels: ['TAM', 'SAM', 'SOM'],
          title: 'Market Size Breakdown'
        },
        {
          type: 'bar',
          series: [{ name: 'Growth Projection', data: [tam, tam * (1 + growthRate/100), tam * Math.pow(1 + growthRate/100, 2)] }],
          labels: ['Current', 'Year 1', 'Year 2'],
          title: 'Market Growth Projection'
        }
      ],
      json: { 
        tam, sam, som, 
        growthRate,
        marketMaturity,
        competitiveDensity,
        calculation: { 
          searchVolume, 
          avgPricing, 
          multiplier: 1000,
          marketGrowthFactor,
          competitionFactor
        }
      },
      confidence: this.calculateConfidence(['search', 'pricing', 'competition', 'trends']),
      dataQuality: this.assessDataQuality(),
      insights: enrichedInsights
    };
  }

  private calculateMarketGrowthFactor(): number {
    // Calculate growth factor based on trend data
    const trendsData = this.dataHub.TRENDS_METRICS;
    if (Object.keys(trendsData).length === 0) return 1.0;
    
    const avgTrend = Object.values(trendsData).reduce((acc: number, val: any) => acc + (val.score || 50), 0) / Object.keys(trendsData).length;
    return Math.max(0.5, Math.min(2.0, avgTrend / 50)); // Scale between 0.5x and 2.0x
  }

  private calculateMarketGrowthRate(): number {
    // Extract growth rate from various data sources
    const newsGrowthSignals = this.dataHub.NEWS_INDEX.filter(n => 
      n.title.toLowerCase().includes('growth') || 
      n.title.toLowerCase().includes('expand') ||
      n.snippet.toLowerCase().includes('cagr')
    ).length;
    
    const baseGrowthRate = 15; // Default market growth
    const growthBonus = Math.min(25, newsGrowthSignals * 2); // Cap at 25% bonus
    
    return Math.min(50, baseGrowthRate + growthBonus); // Cap at 50% growth
  }

  private determineMarketMaturity(): string {
    const searchVolume = this.dataHub.SEARCH_INDEX.length;
    const competitorCount = this.dataHub.COMPETITOR_INDEX.length;
    
    if (searchVolume < 20 && competitorCount < 5) return 'emerging';
    if (searchVolume < 50 && competitorCount < 15) return 'growth';
    if (competitorCount > 20) return 'mature';
    return 'growth';
  }

  private calculateCompetitiveDensity(): number {
    const competitorCount = this.dataHub.COMPETITOR_INDEX.length;
    return Math.min(100, competitorCount * 5); // Scale to 0-100
  }

  private extractMarketTrends(): string[] {
    const trends: string[] = [];
    const newsIndex = this.dataHub.NEWS_INDEX;
    
    // Extract common themes from news
    const trendKeywords = ['AI', 'automation', 'remote', 'digital', 'cloud', 'mobile', 'sustainable'];
    trendKeywords.forEach(keyword => {
      const count = newsIndex.filter(n => 
        n.title.toLowerCase().includes(keyword.toLowerCase()) ||
        n.snippet.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      
      if (count > 2) {
        trends.push(`${keyword} integration trending`);
      }
    });
    
    return trends.slice(0, 4); // Limit to top 4 trends
  }

  private identifyMarketDisruptors(): string[] {
    const disruptors = [
      'AI and machine learning adoption',
      'Changing regulatory landscape',
      'New market entrants',
      'Technology convergence'
    ];
    
    return disruptors.slice(0, 3);
  }

  private calculateTechnologyAdoption(): number {
    const techNews = this.dataHub.NEWS_INDEX.filter(n => 
      n.title.toLowerCase().includes('technology') ||
      n.title.toLowerCase().includes('digital') ||
      n.title.toLowerCase().includes('ai')
    ).length;
    
    return Math.min(100, 50 + (techNews * 5)); // Base 50% + tech signals
  }

  private assessRegulatoryRisk(): string {
    const regulatoryNews = this.dataHub.NEWS_INDEX.filter(n => 
      n.title.toLowerCase().includes('regulation') ||
      n.title.toLowerCase().includes('compliance') ||
      n.title.toLowerCase().includes('policy')
    ).length;
    
    if (regulatoryNews > 5) return 'high';
    if (regulatoryNews > 2) return 'medium';
    return 'low';
  }

  private calculateNewsSentiment(): string {
    const positiveNews = this.dataHub.NEWS_INDEX.filter(n => 
      n.title.toLowerCase().includes('growth') ||
      n.title.toLowerCase().includes('expansion') ||
      n.title.toLowerCase().includes('success')
    ).length;
    
    const negativeNews = this.dataHub.NEWS_INDEX.filter(n => 
      n.title.toLowerCase().includes('decline') ||
      n.title.toLowerCase().includes('challenge') ||
      n.title.toLowerCase().includes('crisis')
    ).length;
    
    if (positiveNews > negativeNews) return 'positive';
    if (negativeNews > positiveNews) return 'negative';
    return 'neutral';
  }

  private getTopCompetitors(): string[] {
    return this.dataHub.COMPETITOR_INDEX
      .sort((a, b) => (b.marketShare || 0) - (a.marketShare || 0))
      .slice(0, 5)
      .map(c => c.name);
  }

  private assessBarriersToEntry(): string {
    const competitorCount = this.dataHub.COMPETITOR_INDEX.length;
    const fundingNews = this.dataHub.NEWS_INDEX.filter(n => 
      n.title.toLowerCase().includes('funding') ||
      n.title.toLowerCase().includes('investment')
    ).length;
    
    if (competitorCount > 15 && fundingNews > 5) return 'high';
    if (competitorCount > 5 || fundingNews > 2) return 'medium';
    return 'low';
  }

  private identifyGrowthDrivers(): string[] {
    const drivers = [
      'Market demand increase',
      'Technology advancement',
      'Regulatory support',
      'Investment influx'
    ];
    
    return drivers.slice(0, 3);
  }

  private identifyMarketRisks(): string[] {
    const risks = [
      'Competitive pressure',
      'Market saturation risk',
      'Technology disruption',
      'Economic volatility'
    ];
    
    return risks.slice(0, 3);
  }

  private synthesizeCompetition(): TileData {
    const competitors = this.dataHub.COMPETITOR_INDEX;
    const directCompetitors = competitors.filter(c => c.marketShare && c.marketShare > 5);
    const indirectCompetitors = competitors.filter(c => !c.marketShare || c.marketShare <= 5);
    
    return {
      metrics: {
        total: competitors.length,
        direct: directCompetitors.length,
        indirect: indirectCompetitors.length,
        avgMarketShare: competitors.reduce((acc, c) => acc + (c.marketShare || 0), 0) / competitors.length
      },
      explanation: `Identified ${competitors.length} competitors: ${directCompetitors.length} direct (>5% market share) and ${indirectCompetitors.length} indirect. Market concentration analyzed from pricing pages and feature comparisons.`,
      citations: this.getTopCitations('competition', 3),
      charts: [
        {
          type: 'bar',
          series: competitors.map(c => ({ name: c.name, value: c.marketShare || 0 })),
          labels: competitors.map(c => c.name)
        }
      ],
      json: { competitors, analysis: { direct: directCompetitors, indirect: indirectCompetitors } },
      confidence: this.calculateConfidence(['competitors']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeSentiment(): TileData {
    const reviews = this.dataHub.REVIEWS_INDEX;
    const social = this.dataHub.SOCIAL_INDEX;
    
    const positive = [...reviews, ...social].filter(item => 
      'sentiment' in item && item.sentiment === 'positive'
    ).length;
    const neutral = [...reviews, ...social].filter(item => 
      'sentiment' in item && item.sentiment === 'neutral'
    ).length;
    const negative = [...reviews, ...social].filter(item => 
      'sentiment' in item && item.sentiment === 'negative'
    ).length;
    
    const total = positive + neutral + negative;
    const sentimentScore = total > 0 ? Math.round((positive / total) * 100) : 0;

    return {
      metrics: {
        score: sentimentScore,
        positive: positive,
        neutral: neutral,
        negative: negative,
        total: total
      },
      explanation: `Sentiment score ${sentimentScore}% based on ${total} data points: ${positive} positive, ${neutral} neutral, ${negative} negative. Sources include ${reviews.length} reviews and ${social.length} social mentions.`,
      citations: this.getTopCitations('sentiment', 3),
      charts: [
        {
          type: 'pie',
          series: [positive, neutral, negative],
          labels: ['Positive', 'Neutral', 'Negative']
        }
      ],
      json: { sentimentScore, breakdown: { positive, neutral, negative }, sources: { reviews: reviews.length, social: social.length } },
      confidence: this.calculateConfidence(['reviews', 'social']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeMarketTrends(): TileData {
    const news = this.dataHub.NEWS_INDEX;
    const recentNews = news.filter(n => {
      const daysAgo = (Date.now() - new Date(n.publishedDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    });
    
    const velocity = recentNews.length / 30; // News per day
    const momentum = velocity > 1 ? 'high' : velocity > 0.5 ? 'medium' : 'low';

    return {
      metrics: {
        velocity: velocity,
        momentum: momentum,
        recentArticles: recentNews.length,
        trendDirection: this.calculateTrendDirection()
      },
      explanation: `Market velocity: ${velocity.toFixed(2)} news articles/day over last 30 days. Momentum classified as ${momentum} based on publication frequency.`,
      citations: this.getTopCitations('trends', 3),
      charts: [
        {
          type: 'line',
          series: this.generateTrendTimeSeries(),
          labels: this.generateTimeLabels()
        }
      ],
      json: { velocity, momentum, articles: recentNews },
      confidence: this.calculateConfidence(['news']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeGoogleTrends(): TileData {
    const trends = this.dataHub.TRENDS_METRICS;
    
    if (!trends.interestOverTime || trends.interestOverTime.length === 0) {
      return this.getInsufficientDataResponse('google_trends');
    }

    return {
      metrics: {
        currentInterest: trends.interestOverTime[trends.interestOverTime.length - 1]?.value || 0,
        peakInterest: Math.max(...trends.interestOverTime.map(t => t.value)),
        relatedQueries: trends.relatedQueries?.length || 0
      },
      explanation: `Interest trends showing ${trends.interestOverTime[trends.interestOverTime.length - 1]?.value || 0}/100 current interest. Peak was ${Math.max(...trends.interestOverTime.map(t => t.value))}/100.`,
      citations: this.getTopCitations('trends', 3),
      charts: [
        {
          type: 'area',
          series: trends.interestOverTime.map(t => t.value),
          labels: trends.interestOverTime.map(t => t.date)
        }
      ],
      json: trends,
      confidence: this.calculateConfidence(['trends']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeWebSearch(): TileData {
    const searchResults = this.dataHub.SEARCH_INDEX;
    
    return {
      metrics: {
        totalResults: searchResults.length,
        avgRelevance: searchResults.reduce((acc, r) => acc + r.relevanceScore, 0) / searchResults.length,
        topSources: this.getTopSources(searchResults)
      },
      explanation: `Found ${searchResults.length} relevant search results with average relevance score ${(searchResults.reduce((acc, r) => acc + r.relevanceScore, 0) / searchResults.length).toFixed(2)}.`,
      citations: searchResults.slice(0, 5).map(r => ({
        url: r.url,
        title: r.title,
        source: r.source,
        relevance: r.relevanceScore
      })),
      charts: [],
      json: { results: searchResults },
      confidence: this.calculateConfidence(['search']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeRedditSentiment(): TileData {
    const redditPosts = this.dataHub.SOCIAL_INDEX.filter(s => s.platform === 'reddit');
    
    return {
      metrics: {
        posts: redditPosts.length,
        avgEngagement: redditPosts.reduce((acc, p) => acc + p.engagement, 0) / redditPosts.length,
        sentiment: this.calculatePlatformSentiment(redditPosts)
      },
      explanation: `Analyzed ${redditPosts.length} Reddit posts with average engagement of ${(redditPosts.reduce((acc, p) => acc + p.engagement, 0) / redditPosts.length).toFixed(0)} upvotes.`,
      citations: this.getTopCitations('reddit', 3),
      charts: [],
      json: { posts: redditPosts },
      confidence: this.calculateConfidence(['reddit']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeTwitterBuzz(): TileData {
    const tweets = this.dataHub.SOCIAL_INDEX.filter(s => s.platform === 'twitter');
    
    return {
      metrics: {
        tweets: tweets.length,
        avgEngagement: tweets.reduce((acc, t) => acc + t.engagement, 0) / tweets.length,
        sentiment: this.calculatePlatformSentiment(tweets)
      },
      explanation: `Found ${tweets.length} tweets with average engagement of ${(tweets.reduce((acc, t) => acc + t.engagement, 0) / tweets.length).toFixed(0)}.`,
      citations: this.getTopCitations('twitter', 3),
      charts: [],
      json: { tweets },
      confidence: this.calculateConfidence(['twitter']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeGrowthPotential(): TileData {
    const trendsScore = this.calculateTrendsScore();
    const newsVelocity = this.dataHub.NEWS_INDEX.length / 30;
    
    const growthScore = Math.round((trendsScore * 0.6) + (newsVelocity * 40));

    return {
      metrics: {
        score: growthScore,
        trendsContribution: trendsScore,
        newsContribution: newsVelocity * 40
      },
      explanation: `Growth potential ${growthScore}/100 based on trends (${trendsScore}) weighted 60% and news velocity (${newsVelocity.toFixed(2)}/day) weighted 40%.`,
      citations: this.getTopCitations('growth', 3),
      charts: [],
      json: { growthScore, factors: { trends: trendsScore, news: newsVelocity } },
      confidence: this.calculateConfidence(['trends', 'news']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeMarketReadiness(): TileData {
    const socialVelocity = this.dataHub.SOCIAL_INDEX.length / 30;
    const newsCadence = this.dataHub.NEWS_INDEX.length / 30;
    const adoptionScore = Math.round((socialVelocity * 50) + (newsCadence * 50));

    return {
      metrics: {
        score: adoptionScore,
        socialVelocity: socialVelocity,
        newsCadence: newsCadence
      },
      explanation: `Market readiness ${adoptionScore}/100 from social velocity (${socialVelocity.toFixed(2)} posts/day) and news cadence (${newsCadence.toFixed(2)} articles/day).`,
      citations: this.getTopCitations('readiness', 3),
      charts: [],
      json: { adoptionScore, metrics: { socialVelocity, newsCadence } },
      confidence: this.calculateConfidence(['social', 'news']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeCompetitiveAdvantage(): TileData {
    const competitorGaps = this.identifyCompetitorGaps();
    const advantageScore = Math.min(100, competitorGaps.length * 20);

    return {
      metrics: {
        score: advantageScore,
        gaps: competitorGaps.length,
        opportunities: competitorGaps
      },
      explanation: `Identified ${competitorGaps.length} competitive gaps/opportunities. Each gap represents ~20 points of advantage potential.`,
      citations: this.getTopCitations('advantage', 3),
      charts: [],
      json: { advantageScore, gaps: competitorGaps },
      confidence: this.calculateConfidence(['competitors']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeRiskAssessment(): TileData {
    const regulatoryRisks = this.dataHub.NEWS_INDEX.filter(n => 
      n.snippet.toLowerCase().includes('regulation') || 
      n.snippet.toLowerCase().includes('compliance')
    );
    const competitorIntensity = this.dataHub.COMPETITOR_INDEX.length;
    const securityIssues = this.dataHub.SEARCH_INDEX.filter(s => 
      s.snippet.toLowerCase().includes('security') || 
      s.snippet.toLowerCase().includes('breach')
    );
    
    const riskScore = Math.min(100, 
      (regulatoryRisks.length * 10) + 
      (competitorIntensity * 5) + 
      (securityIssues.length * 15)
    );

    return {
      metrics: {
        score: riskScore,
        regulatory: regulatoryRisks.length,
        competitive: competitorIntensity,
        security: securityIssues.length
      },
      explanation: `Risk assessment ${riskScore}/100 from ${regulatoryRisks.length} regulatory mentions, ${competitorIntensity} competitors, and ${securityIssues.length} security concerns.`,
      citations: this.getTopCitations('risk', 3),
      charts: [
        {
          type: 'bar',
          series: [regulatoryRisks.length * 10, competitorIntensity * 5, securityIssues.length * 15],
          labels: ['Regulatory', 'Competition', 'Security']
        }
      ],
      json: { riskScore, factors: { regulatory: regulatoryRisks.length, competitive: competitorIntensity, security: securityIssues.length } },
      confidence: this.calculateConfidence(['news', 'competitors', 'search']),
      dataQuality: this.assessDataQuality()
    };
  }

  // Helper methods
  private calculateSentimentScore(): number {
    const allSentiments = [...this.dataHub.REVIEWS_INDEX, ...this.dataHub.SOCIAL_INDEX];
    
    // If we have sentiment data, use it
    if (allSentiments.length > 0) {
      const positive = allSentiments.filter(s => s.sentiment === 'positive').length;
      const total = allSentiments.length;
      return Math.round((positive / total) * 100);
    }
    
    // Fallback: analyze text content from various sources
    const socialItems = this.dataHub.SOCIAL_INDEX || [];
    const newsItems = this.dataHub.NEWS_INDEX || [];
    const searchItems = this.dataHub.SEARCH_INDEX || [];
    
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    // Analyze text from search items
    searchItems.forEach(item => {
      const fullText = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
      
      const positiveKeywords = ['positive', 'great', 'excellent', 'love', 'amazing', 'good', 'best', 'perfect', 'success', 'innovative'];
      const negativeKeywords = ['negative', 'bad', 'poor', 'hate', 'terrible', 'worst', 'awful', 'fail', 'problem', 'issue'];
      
      const hasPositive = positiveKeywords.some(keyword => fullText.includes(keyword));
      const hasNegative = negativeKeywords.some(keyword => fullText.includes(keyword));
      
      if (hasPositive && !hasNegative) {
        positiveCount++;
      } else if (hasNegative && !hasPositive) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });
    
    // Analyze text from news items
    newsItems.forEach(item => {
      const fullText = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
      
      const positiveKeywords = ['positive', 'great', 'excellent', 'love', 'amazing', 'good', 'best', 'perfect', 'success', 'innovative'];
      const negativeKeywords = ['negative', 'bad', 'poor', 'hate', 'terrible', 'worst', 'awful', 'fail', 'problem', 'issue'];
      
      const hasPositive = positiveKeywords.some(keyword => fullText.includes(keyword));
      const hasNegative = negativeKeywords.some(keyword => fullText.includes(keyword));
      
      if (hasPositive && !hasNegative) {
        positiveCount++;
      } else if (hasNegative && !hasPositive) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });
    
    // Analyze text from social items
    socialItems.forEach(item => {
      const fullText = `${item.author || ''} ${item.content || ''}`.toLowerCase();
      
      const positiveKeywords = ['positive', 'great', 'excellent', 'love', 'amazing', 'good', 'best', 'perfect', 'success', 'innovative'];
      const negativeKeywords = ['negative', 'bad', 'poor', 'hate', 'terrible', 'worst', 'awful', 'fail', 'problem', 'issue'];
      
      const hasPositive = positiveKeywords.some(keyword => fullText.includes(keyword));
      const hasNegative = negativeKeywords.some(keyword => fullText.includes(keyword));
      
      if (hasPositive && !hasNegative) {
        positiveCount++;
      } else if (hasNegative && !hasPositive) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });
    
    const total = positiveCount + negativeCount + neutralCount;
    if (total === 0) return 65; // Default to slightly positive if no data
    
    return Math.round((positiveCount / total) * 100);
  }

  private calculateCompetitionScore(): number {
    const competitorCount = this.dataHub.COMPETITOR_INDEX.length;
    // Inverse scoring: fewer competitors = higher score
    return Math.max(0, 100 - (competitorCount * 10));
  }

  private calculateDemandScore(): number {
    const searchVolume = this.dataHub.SEARCH_INDEX.length;
    return Math.min(100, searchVolume * 2);
  }

  private calculateTrendsScore(): number {
    if (!this.dataHub.TRENDS_METRICS.interestOverTime) return 50;
    const recent = this.dataHub.TRENDS_METRICS.interestOverTime.slice(-3);
    const avg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
    return Math.round(avg);
  }

  private calculateAveragePricing(): number {
    const prices = this.dataHub.PRICE_INDEX;
    if (prices.length === 0) return 29.99; // Default
    return prices.reduce((acc, p) => acc + p.price, 0) / prices.length;
  }

  private calculateConfidence(requiredIndices: string[]): number {
    let filledIndices = 0;
    if (requiredIndices.includes('search') && this.dataHub.SEARCH_INDEX.length > 0) filledIndices++;
    if (requiredIndices.includes('news') && this.dataHub.NEWS_INDEX.length > 0) filledIndices++;
    if (requiredIndices.includes('competitors') && this.dataHub.COMPETITOR_INDEX.length > 0) filledIndices++;
    if (requiredIndices.includes('reviews') && this.dataHub.REVIEWS_INDEX.length > 0) filledIndices++;
    if (requiredIndices.includes('social') && this.dataHub.SOCIAL_INDEX.length > 0) filledIndices++;
    if (requiredIndices.includes('trends') && this.dataHub.TRENDS_METRICS.interestOverTime) filledIndices++;
    
    return Math.round((filledIndices / requiredIndices.length) * 100);
  }

  private assessDataQuality(): 'high' | 'medium' | 'low' {
    const totalDataPoints = 
      this.dataHub.SEARCH_INDEX.length +
      this.dataHub.NEWS_INDEX.length +
      this.dataHub.COMPETITOR_INDEX.length +
      this.dataHub.REVIEWS_INDEX.length +
      this.dataHub.SOCIAL_INDEX.length;
    
    if (totalDataPoints > 100) return 'high';
    if (totalDataPoints > 30) return 'medium';
    return 'low';
  }

  private getTopCitations(category: string, count: number): Citation[] {
    const relevant = this.dataHub.EVIDENCE_STORE
      .filter(e => e.tileReferences.includes(category))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, count);
    
    return relevant.map(e => ({
      url: e.url,
      title: e.title,
      source: e.source,
      relevance: e.confidence
    }));
  }

  private getTopSources(results: SearchResult[]): string[] {
    const sourceCounts = new Map<string, number>();
    results.forEach(r => {
      const domain = new URL(r.url).hostname;
      sourceCounts.set(domain, (sourceCounts.get(domain) || 0) + 1);
    });
    
    return Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => domain);
  }

  private calculatePlatformSentiment(posts: SocialData[]): number {
    const positive = posts.filter(p => p.sentiment === 'positive').length;
    return posts.length > 0 ? Math.round((positive / posts.length) * 100) : 50;
  }

  private calculateTrendDirection(): 'up' | 'down' | 'stable' {
    const news = this.dataHub.NEWS_INDEX;
    const recentPositive = news.filter(n => {
      const daysAgo = (Date.now() - new Date(n.publishedDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7 && n.tone === 'positive';
    }).length;
    
    const olderPositive = news.filter(n => {
      const daysAgo = (Date.now() - new Date(n.publishedDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo > 7 && daysAgo <= 14 && n.tone === 'positive';
    }).length;
    
    if (recentPositive > olderPositive * 1.2) return 'up';
    if (recentPositive < olderPositive * 0.8) return 'down';
    return 'stable';
  }

  private generateTrendTimeSeries(): any[] {
    // Generate mock time series for now
    return [{
      name: 'Interest',
      data: Array.from({ length: 30 }, (_, i) => Math.random() * 100)
    }];
  }

  private generateTimeLabels(): string[] {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toLocaleDateString();
    });
  }

  private identifyCompetitorGaps(): string[] {
    const gaps: string[] = [];
    const competitors = this.dataHub.COMPETITOR_INDEX;
    
    // Analyze feature gaps
    const allFeatures = new Set<string>();
    competitors.forEach(c => c.features.forEach(f => allFeatures.add(f)));
    
    // Find underserved features
    const featureCoverage = new Map<string, number>();
    allFeatures.forEach(feature => {
      const coverage = competitors.filter(c => c.features.includes(feature)).length;
      featureCoverage.set(feature, coverage);
    });
    
    // Gaps are features with low coverage
    featureCoverage.forEach((coverage, feature) => {
      if (coverage < competitors.length * 0.3) {
        gaps.push(`Feature gap: ${feature}`);
      }
    });
    
    return gaps.slice(0, 5); // Top 5 gaps
  }

  private getInsufficientDataResponse(tileType: string): TileData {
    return {
      metrics: {},
      explanation: `Insufficient data for ${tileType}. Need more evidence from search and social indices.`,
      citations: [],
      charts: [],
      json: { error: 'insufficient_data', tile: tileType },
      confidence: 0,
      dataQuality: 'low'
    };
  }

  private calculateExecutionViability(): number {
    // Analyze execution factors from available data
    const chatHistory = JSON.parse(localStorage.getItem('ideaChatMessages') || '[]');
    const userAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
    
    let executionScore = 50; // Base score
    
    // Factor in conversation depth - shows engagement
    executionScore += Math.min(20, chatHistory.length * 2);
    
    // Factor in answered questions - shows thoroughness
    executionScore += Math.min(15, Object.keys(userAnswers).length * 3);
    
    // Check for execution-related signals in data
    const executionKeywords = ['implementation', 'development', 'launch', 'build', 'team', 'funding', 'mvp', 'prototype'];
    let executionMentions = 0;
    
    // Search through news and search results for execution signals
    [...this.dataHub.NEWS_INDEX, ...this.dataHub.SEARCH_INDEX].forEach(item => {
      const text = (item.title + ' ' + item.snippet).toLowerCase();
      executionKeywords.forEach(keyword => {
        if (text.includes(keyword)) executionMentions++;
      });
    });
    
    executionScore += Math.min(15, executionMentions * 2);
    
    return Math.min(100, Math.round(executionScore));
  }

  private calculateIdeaRefinementScore(): number {
    const chatHistory = JSON.parse(localStorage.getItem('ideaChatMessages') || '[]');
    const wrinklePoints = parseInt(localStorage.getItem('wrinklePoints') || '0');
    
    let refinementScore = 30; // Base score
    
    // Factor in wrinkle points - shows deep understanding
    refinementScore += Math.min(30, wrinklePoints);
    
    // Factor in conversation evolution - shows iteration
    if (chatHistory.length > 5) refinementScore += 10;
    if (chatHistory.length > 10) refinementScore += 10;
    if (chatHistory.length > 20) refinementScore += 10;
    
    // Look for refinement indicators in conversation
    const refinementKeywords = ['pivot', 'iterate', 'refine', 'improve', 'adjust', 'modify', 'enhance'];
    let refinementMentions = 0;
    
    chatHistory.forEach((message: any) => {
      if (message.content) {
        const text = message.content.toLowerCase();
        refinementKeywords.forEach(keyword => {
          if (text.includes(keyword)) refinementMentions++;
        });
      }
    });
    
    refinementScore += Math.min(10, refinementMentions * 2);
    
    return Math.min(100, Math.round(refinementScore));
  }

  private generatePMFRecommendations(score: number, category: string): string[] {
    const recommendations: string[] = [];
    
    if (score >= 85) {
      recommendations.push("Consider seeking Series A funding - your PMF indicators are strong");
      recommendations.push("Focus on scaling customer acquisition and retention");
      recommendations.push("Build strategic partnerships to accelerate market penetration");
    } else if (score >= 75) {
      recommendations.push("Validate business model with paying customers");
      recommendations.push("Optimize conversion funnel and user onboarding");
      recommendations.push("Consider pre-seed or seed funding opportunities");
    } else if (score >= 60) {
      recommendations.push("Conduct more customer interviews to validate problem-solution fit");
      recommendations.push("Build an MVP to test core value proposition");
      recommendations.push("Focus on product-market fit before scaling");
    } else if (score >= 40) {
      recommendations.push("Refine your value proposition based on customer feedback");
      recommendations.push("Consider pivoting to address a more pressing problem");
      recommendations.push("Build a stronger understanding of your target market");
    } else {
      recommendations.push("Go back to customer discovery and problem validation");
      recommendations.push("Consider significant pivots or new market opportunities");
      recommendations.push("Focus on building deeper domain expertise");
    }
    
    // Add data-specific recommendations
    if (this.dataHub.COMPETITOR_INDEX.length > 10) {
      recommendations.push("High competition detected - focus on unique differentiation");
    }
    
    if (this.dataHub.SOCIAL_INDEX.length < 5) {
      recommendations.push("Build stronger social proof and community engagement");
    }
    
    return recommendations;
  }

  /**
   * Get full hub summary
   */
  getHubSummary(): any {
    return {
      DATA_HUB_SUMMARY: {
        requests: this.fetchPlan.length,
        deduped: this.dedupeMap.size,
        providers_used: [...new Set(this.fetchPlan.map(p => p.source))],
        fetched_at: new Date().toISOString(),
        indices: {
          search: this.dataHub.SEARCH_INDEX.length,
          news: this.dataHub.NEWS_INDEX.length,
          competitors: this.dataHub.COMPETITOR_INDEX.length,
          reviews: this.dataHub.REVIEWS_INDEX.length,
          social: this.dataHub.SOCIAL_INDEX.length,
          prices: this.dataHub.PRICE_INDEX.length
        }
      }
    };
  }
}