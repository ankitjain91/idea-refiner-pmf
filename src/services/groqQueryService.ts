import { CachedApiResponse } from '@/lib/cache/unifiedResponseCache';
import { supabase } from '@/integrations/supabase/client';

export interface TileDataRequirements {
  primarySources: string[];
  fallbackSources: string[];
  dataPoints: string[];
  freshnessHours: number;
  groqQuery: string;
  localExtractor?: (data: any) => any;
}

export interface ExtractionResult {
  data: any;
  confidence: number;
  missingDataPoints: string[];
  sourceResponseIds: string[];
  fromCache: boolean;
}

export const TILE_REQUIREMENTS: Record<string, TileDataRequirements> = {
  sentiment: {
    primarySources: ['reddit-sentiment', 'twitter-search'],
    fallbackSources: ['web-search', 'gdelt-news'],
    dataPoints: ['sentiment_score', 'user_opinions', 'engagement_metrics'],
    freshnessHours: 1,
    groqQuery: `
      Extract sentiment data including:
      - Overall sentiment (positive/negative/neutral percentages)
      - Key opinions and concerns
      - Engagement metrics (likes, shares, comments)
      - Trending discussions
    `,
    localExtractor: (data: any) => {
      // Try to extract sentiment locally first
      if (data.sentiment || data.sentimentScore) {
        return {
          score: data.sentiment?.score || data.sentimentScore,
          breakdown: data.sentiment?.breakdown,
          confidence: 0.8
        };
      }
      return null;
    }
  },
  'market-trends': {
    primarySources: ['market-insights', 'web-search-optimized'],
    fallbackSources: ['serper-batch-search', 'gdelt-news'],
    dataPoints: ['market_size', 'growth_rate', 'competition'],
    freshnessHours: 24,
    groqQuery: `
      Extract market data including:
      - Market size estimates (TAM, SAM, SOM)
      - Growth rates and projections
      - Competitor information
      - Industry trends
    `,
    localExtractor: (data: any) => {
      const marketData: any = {};
      
      // Extract market size mentions
      const text = JSON.stringify(data).toLowerCase();
      const billionMatch = text.match(/(\d+\.?\d*)\s*billion/);
      const millionMatch = text.match(/(\d+\.?\d*)\s*million/);
      
      if (billionMatch) {
        marketData.tam = parseFloat(billionMatch[1]) * 1e9;
      } else if (millionMatch) {
        marketData.tam = parseFloat(millionMatch[1]) * 1e6;
      }
      
      // Extract CAGR
      const cagrMatch = text.match(/(\d+\.?\d*)%?\s*cagr/i);
      if (cagrMatch) {
        marketData.cagr = parseFloat(cagrMatch[1]);
      }
      
      return Object.keys(marketData).length > 0 ? marketData : null;
    }
  },
  competition: {
    primarySources: ['competition-chat', 'serper-batch-search'],
    fallbackSources: ['web-search', 'gdelt-news'],
    dataPoints: ['competitors_list', 'market_leaders', 'differentiators'],
    freshnessHours: 48,
    groqQuery: `
      Extract competition data including:
      - List of direct competitors
      - Market leaders and their strengths
      - Key differentiators
      - Funding information
    `
  },
  engagement: {
    primarySources: ['user-engagement', 'reddit-sentiment'],
    fallbackSources: ['twitter-search', 'youtube-search'],
    dataPoints: ['active_users', 'engagement_rate', 'peak_hours'],
    freshnessHours: 2,
    groqQuery: `
      Extract engagement data including:
      - User activity metrics
      - Engagement rates
      - Peak usage patterns
      - Community size
    `
  },
  financial: {
    primarySources: ['financial-analysis', 'web-search-profitability'],
    fallbackSources: ['market-insights', 'serper-batch-search'],
    dataPoints: ['cac', 'ltv', 'payback_period', 'revenue_model'],
    freshnessHours: 72,
    groqQuery: `
      Extract financial data including:
      - Customer acquisition cost (CAC)
      - Lifetime value (LTV)
      - Payback period
      - Revenue models
      - Unit economics
    `
  },
  'launch-timeline': {
    primarySources: ['launch-timeline', 'execution-insights'],
    fallbackSources: ['web-search', 'market-insights'],
    dataPoints: ['milestones', 'timeline', 'critical_path'],
    freshnessHours: 168,
    groqQuery: `
      Extract timeline data including:
      - Key milestones
      - Development phases
      - Critical path items
      - Time to market estimates
    `
  },
  'quick-poll': {
    primarySources: ['reddit-sentiment', 'twitter-search'],
    fallbackSources: ['youtube-search'],
    dataPoints: ['poll_results', 'vote_distribution'],
    freshnessHours: 1,
    groqQuery: `
      Extract polling data including:
      - User preferences
      - Vote distributions
      - Popular opinions
    `
  }
};

export class GroqQueryService {
  private static instance: GroqQueryService;
  
  private constructor() {}
  
  static getInstance(): GroqQueryService {
    if (!GroqQueryService.instance) {
      GroqQueryService.instance = new GroqQueryService();
    }
    return GroqQueryService.instance;
  }
  
  async extractDataForTile(params: {
    tileType: string;
    cachedResponses: CachedApiResponse[];
    requirements?: TileDataRequirements;
  }): Promise<ExtractionResult> {
    const requirements = params.requirements || TILE_REQUIREMENTS[params.tileType];
    
    if (!requirements) {
      return {
        data: null,
        confidence: 0,
        missingDataPoints: ['all'],
        sourceResponseIds: [],
        fromCache: false
      };
    }
    
    // First, try local extraction
    const localResult = this.tryLocalExtraction(params.cachedResponses, requirements);
    if (localResult && localResult.confidence > 0.7) {
      return {
        ...localResult,
        fromCache: true
      };
    }
    
    // If local extraction insufficient, use Groq
    const groqResult = await this.extractWithGroq(
      params.cachedResponses,
      requirements,
      params.tileType
    );
    
    return groqResult;
  }
  
  private tryLocalExtraction(
    responses: CachedApiResponse[],
    requirements: TileDataRequirements
  ): ExtractionResult | null {
    if (!requirements.localExtractor) {
      return null;
    }
    
    // Try primary sources first
    for (const source of requirements.primarySources) {
      const sourceResponses = responses.filter(r => r.source === source);
      
      for (const response of sourceResponses) {
        const extracted = requirements.localExtractor(response.rawResponse);
        if (extracted) {
          return {
            data: extracted,
            confidence: 0.8,
            missingDataPoints: [],
            sourceResponseIds: [response.id],
            fromCache: true
          };
        }
      }
    }
    
    // Try fallback sources
    for (const source of requirements.fallbackSources) {
      const sourceResponses = responses.filter(r => r.source === source);
      
      for (const response of sourceResponses) {
        const extracted = requirements.localExtractor(response.rawResponse);
        if (extracted) {
          return {
            data: extracted,
            confidence: 0.6,
            missingDataPoints: this.identifyMissingPoints(extracted, requirements.dataPoints),
            sourceResponseIds: [response.id],
            fromCache: true
          };
        }
      }
    }
    
    return null;
  }
  
  private async extractWithGroq(
    responses: CachedApiResponse[],
    requirements: TileDataRequirements,
    tileType: string
  ): Promise<ExtractionResult> {
    // Filter relevant responses
    const relevantResponses = responses.filter(r => 
      [...requirements.primarySources, ...requirements.fallbackSources].includes(r.source)
    );
    
    if (relevantResponses.length === 0) {
      return {
        data: null,
        confidence: 0,
        missingDataPoints: requirements.dataPoints,
        sourceResponseIds: [],
        fromCache: false
      };
    }
    
    try {
      // Call Groq extraction edge function
      const { data: extractedData, error } = await supabase.functions.invoke('groq-data-extraction', {
        body: {
          tileType,
          requirements: requirements.groqQuery,
          dataPoints: requirements.dataPoints,
          responses: relevantResponses.map(r => ({
            source: r.source,
            data: r.rawResponse,
            metadata: r.metadata
          }))
        }
      });
      
      if (error) throw error;
      
      return {
        data: extractedData.extraction,
        confidence: extractedData.confidence || 0.7,
        missingDataPoints: this.identifyMissingPoints(
          extractedData.extraction,
          requirements.dataPoints
        ),
        sourceResponseIds: relevantResponses.map(r => r.id),
        fromCache: true
      };
    } catch (error) {
      console.error('Groq extraction failed:', error);
      
      // Fallback to extracted insights if available
      const extractedInsights = this.mergeExtractedInsights(relevantResponses, tileType);
      
      return {
        data: extractedInsights,
        confidence: extractedInsights ? 0.5 : 0,
        missingDataPoints: requirements.dataPoints,
        sourceResponseIds: relevantResponses.map(r => r.id),
        fromCache: true
      };
    }
  }
  
  private identifyMissingPoints(data: any, requiredPoints: string[]): string[] {
    if (!data) return requiredPoints;
    
    const missing: string[] = [];
    const dataStr = JSON.stringify(data).toLowerCase();
    
    for (const point of requiredPoints) {
      const searchKey = point.replace(/_/g, ' ').toLowerCase();
      if (!dataStr.includes(searchKey)) {
        missing.push(point);
      }
    }
    
    return missing;
  }
  
  private mergeExtractedInsights(responses: CachedApiResponse[], tileType: string): any {
    const insights: any = {};
    
    responses.forEach(response => {
      if (!response.extractedInsights) return;
      
      // Map tile types to insight keys
      const insightMap: Record<string, keyof typeof response.extractedInsights> = {
        'sentiment': 'sentiment',
        'market-trends': 'marketSize',
        'competition': 'competitors',
        'engagement': 'engagement',
        'financial': 'financial'
      };
      
      const insightKey = insightMap[tileType];
      if (insightKey && response.extractedInsights[insightKey]) {
        Object.assign(insights, response.extractedInsights[insightKey]);
      }
    });
    
    return Object.keys(insights).length > 0 ? insights : null;
  }
  
  async identifyDataGaps(
    idea: string,
    tileType: string,
    existingResponses: CachedApiResponse[]
  ): Promise<{
    hasAllData: boolean;
    missingSource: string[];
    recommendations: string[];
  }> {
    const requirements = TILE_REQUIREMENTS[tileType];
    if (!requirements) {
      return {
        hasAllData: false,
        missingSource: ['unknown'],
        recommendations: ['Tile type not configured']
      };
    }
    
    const availableSources = new Set(existingResponses.map(r => r.source));
    const missingSources: string[] = [];
    
    // Check primary sources
    const hasPrimary = requirements.primarySources.some(s => availableSources.has(s));
    
    if (!hasPrimary) {
      // Need at least one primary source
      missingSources.push(...requirements.primarySources);
    }
    
    // Check data freshness
    const now = Date.now();
    const freshnessMs = requirements.freshnessHours * 60 * 60 * 1000;
    const freshResponses = existingResponses.filter(r => 
      (now - r.timestamp) < freshnessMs
    );
    
    const recommendations: string[] = [];
    
    if (freshResponses.length === 0 && existingResponses.length > 0) {
      recommendations.push('Data is stale, consider refreshing');
    }
    
    if (missingSources.length > 0) {
      recommendations.push(`Fetch data from: ${missingSources.slice(0, 2).join(', ')}`);
    }
    
    return {
      hasAllData: hasPrimary && freshResponses.length > 0,
      missingSource: missingSources,
      recommendations
    };
  }
}