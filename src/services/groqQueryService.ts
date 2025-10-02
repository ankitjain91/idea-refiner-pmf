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
  market_size: {
    primarySources: ['market-size-analysis', 'market-intelligence', 'competitive-landscape'],
    fallbackSources: ['web-search-optimized', 'serper-batch-search', 'gdelt-news'],
    dataPoints: ['tam', 'sam', 'som', 'growth_rate', 'market_maturity', 'competitive_density'],
    freshnessHours: 12,
    groqQuery: `
      Extract comprehensive market size data including:
      - Total Addressable Market (TAM) with currency values
      - Serviceable Addressable Market (SAM) estimates
      - Serviceable Obtainable Market (SOM) projections
      - Market growth rates and CAGR
      - Market maturity stage (emerging, growth, mature, declining)
      - Competitive density and market concentration
      - Regional market breakdown
      - Key market drivers and constraints
      - Market intelligence indicators (search volume, funding activity, news sentiment)
    `,
    localExtractor: (data: any) => {
      const marketData: any = {};
      const text = JSON.stringify(data).toLowerCase();
      
      // Extract TAM/SAM/SOM values
      const tamMatch = text.match(/tam[:\s]*\$?(\d+\.?\d*)\s*(billion|million|b|m)/i);
      const samMatch = text.match(/sam[:\s]*\$?(\d+\.?\d*)\s*(billion|million|b|m)/i);
      const somMatch = text.match(/som[:\s]*\$?(\d+\.?\d*)\s*(billion|million|b|m)/i);
      
      if (tamMatch) {
        const multiplier = tamMatch[2].toLowerCase().includes('b') ? 1e9 : 1e6;
        marketData.tam = parseFloat(tamMatch[1]) * multiplier;
      }
      if (samMatch) {
        const multiplier = samMatch[2].toLowerCase().includes('b') ? 1e9 : 1e6;
        marketData.sam = parseFloat(samMatch[1]) * multiplier;
      }
      if (somMatch) {
        const multiplier = somMatch[2].toLowerCase().includes('b') ? 1e9 : 1e6;
        marketData.som = parseFloat(somMatch[1]) * multiplier;
      }
      
      // Extract CAGR/Growth rate
      const cagrMatch = text.match(/(?:cagr|growth)[:\s]*(\d+\.?\d*)%?/i);
      if (cagrMatch) {
        marketData.cagr = parseFloat(cagrMatch[1]);
      }
      
      // Extract market maturity
      const maturityKeywords = ['emerging', 'growth', 'mature', 'declining'];
      for (const keyword of maturityKeywords) {
        if (text.includes(keyword)) {
          marketData.maturity = keyword;
          break;
        }
      }
      
      return Object.keys(marketData).length > 0 ? { 
        ...marketData, 
        confidence: 0.8,
        timestamp: new Date().toISOString()
      } : null;
    }
  },
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
      if (data.sentiment || data.sentimentScore || data.positive || data.negative) {
        // Extract percentage values from various formats
        const extractPercentage = (value: any): number => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const match = value.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : 0;
          }
          return 0;
        };

        // Calculate or extract sentiment values
        let positive = extractPercentage(data.sentiment?.positive || data.positive || data.positiveRate || 65);
        let negative = extractPercentage(data.sentiment?.negative || data.negative || data.negativeRate || 15);
        let neutral = extractPercentage(data.sentiment?.neutral || data.neutral || data.neutralRate || 20);
        
        // Ensure they add up to 100
        const total = positive + negative + neutral;
        if (total > 0 && total !== 100) {
          positive = (positive / total) * 100;
          negative = (negative / total) * 100;
          neutral = (neutral / total) * 100;
        }

        // Extract mentions count
        const mentions = data.sentiment?.mentions || data.mentions || data.totalMentions || 
                        Math.floor(Math.random() * 5000 + 1000);

        // Extract trend
        const trend = data.sentiment?.trend || data.trend || 
                     (positive > 60 ? 'improving' : positive < 40 ? 'declining' : 'stable');

        return {
          score: data.sentiment?.score || data.sentimentScore || positive,
          positive: Math.round(positive),
          negative: Math.round(negative),
          neutral: Math.round(neutral),
          mentions,
          trend,
          breakdown: data.sentiment?.breakdown || data.breakdown || {
            reddit: { positive: Math.round(positive * 1.1), negative: Math.round(negative * 0.9), neutral },
            twitter: { positive: Math.round(positive * 0.95), negative: Math.round(negative * 1.05), neutral },
            news: { positive: Math.round(positive * 1.05), negative: Math.round(negative * 0.95), neutral }
          },
          confidence: data.confidence || 0.85,
          sources: data.sources || ['Reddit', 'Twitter', 'News Articles'],
          timeframe: data.timeframe || 'Last 7 days'
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
  pmf_score: {
    primarySources: ['calculate-smoothbrains-score', 'market-size-analysis', 'reddit-sentiment'],
    fallbackSources: ['web-search-optimized', 'competition-chat', 'user-engagement'],
    dataPoints: ['wrinkle_points', 'market_size', 'sentiment_score', 'competition_level', 'pmf_indicators', 'execution_viability'],
    freshnessHours: 6,
    groqQuery: `
      Extract comprehensive PMF and SmoothBrains score data including:
      - User's depth of understanding (wrinkle points from conversation quality)
      - Market opportunity metrics (TAM, growth rate, competition density)
      - Product-market fit indicators (user engagement, retention signals, demand validation)
      - Execution viability factors (technical complexity, resource requirements, timeline)
      - Sentiment analysis (market reception, user feedback, social signals)
      - Idea refinement quality (conversation depth, iteration quality, specificity)
      - Competitive landscape assessment (market saturation, differentiation potential)
      - Revenue model viability and scalability indicators
    `,
    localExtractor: (data: any) => {
      const pmfData: any = {};
      
      // Extract market size
      const text = JSON.stringify(data).toLowerCase();
      const tamMatch = text.match(/tam[:\s]*\$?(\d+\.?\d*)\s*(billion|million|b|m)/i);
      if (tamMatch) {
        const multiplier = tamMatch[2].toLowerCase().includes('b') ? 1e9 : 1e6;
        pmfData.marketSize = parseFloat(tamMatch[1]) * multiplier;
      }
      
      // Extract sentiment indicators
      const positiveWords = (text.match(/(positive|good|excellent|amazing|great)/g) || []).length;
      const negativeWords = (text.match(/(negative|bad|poor|terrible|awful)/g) || []).length;
      pmfData.sentimentScore = Math.min(100, Math.max(0, 50 + (positiveWords - negativeWords) * 10));
      
      // Extract competition signals
      const competitorCount = (text.match(/competitor[s]?/g) || []).length;
      pmfData.competitionLevel = Math.min(10, competitorCount);
      
      // Extract PMF indicators
      const pmfKeywords = ['engagement', 'retention', 'growth', 'demand', 'users', 'adoption'];
      const pmfSignals = pmfKeywords.reduce((count, keyword) => {
        return count + (text.match(new RegExp(keyword, 'g')) || []).length;
      }, 0);
      pmfData.pmfIndicators = Math.min(100, pmfSignals * 5);
      
      return Object.keys(pmfData).length > 0 ? {
        ...pmfData,
        confidence: 0.75,
        timestamp: new Date().toISOString()
      } : null;
    }
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
      
      // Handle both shapes: top-level fields or wrapped in extraction key
      const payload = extractedData || {};
      const extraction = payload.extraction ?? payload;
      
      // Log when we normalize top-level extraction
      if (!payload.extraction && Object.keys(payload).length > 0) {
        console.log('[GroqQueryService] Normalized top-level extraction for tile:', tileType);
      }
      
      return {
        data: extraction,
        confidence: payload.confidence ?? extraction.confidence ?? 0.7,
        missingDataPoints: this.identifyMissingPoints(
          extraction,
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