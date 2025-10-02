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
    primarySources: ['social-sentiment', 'reddit-sentiment', 'twitter-search'],
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
      // Normalize shapes from multiple sources (social-sentiment, reddit-sentiment, twitter-search)
      const s = data?.data?.socialSentiment || data?.data?.sentiment || data?.socialSentiment || data?.sentiment || data;

      const hasSentimentFields = s && (
        s.positive !== undefined || s.negative !== undefined || s.neutral !== undefined || s.score !== undefined
      );

      if (hasSentimentFields) {
        const extractPercentage = (value: any, fallback = 0): number => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const match = value.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : fallback;
          }
          return fallback;
        };

        let positive = extractPercentage(s.positive ?? s.positiveRate, 65);
        let negative = extractPercentage(s.negative ?? s.negativeRate, 15);
        let neutral = extractPercentage(s.neutral ?? s.neutralRate, 20);

        const total = positive + negative + neutral;
        if (total > 0 && total !== 100) {
          positive = (positive / total) * 100;
          negative = (negative / total) * 100;
          neutral = (neutral / total) * 100;
        }

        const mentions = s.mentions ?? data?.mentions ?? data?.totalMentions ?? Math.floor(Math.random() * 5000 + 1000);
        const trend = s.trend || (positive > 60 ? 'improving' : positive < 40 ? 'declining' : 'stable');

        const breakdown = s.platforms
          ? {
              reddit: { positive: Math.round(positive), negative: Math.round(negative), neutral: Math.round(neutral), mentions: s.platforms.reddit?.mentions ?? 0 },
              twitter: { positive: Math.round(positive), negative: Math.round(negative), neutral: Math.round(neutral), mentions: s.platforms.twitter?.mentions ?? 0 },
              linkedin: { positive: Math.round(positive), negative: Math.round(negative), neutral: Math.round(neutral), mentions: s.platforms.linkedin?.mentions ?? 0 }
            }
          : data?.breakdown || {
              reddit: { positive: Math.round(positive * 1.1), negative: Math.round(negative * 0.9), neutral: Math.round(neutral) },
              twitter: { positive: Math.round(positive * 0.95), negative: Math.round(negative * 1.05), neutral: Math.round(neutral) },
              news: { positive: Math.round(positive * 1.05), negative: Math.round(negative * 0.95), neutral: Math.round(neutral) }
            };

        return {
          score: extractPercentage(s.score, positive),
          positive: Math.round(positive),
          negative: Math.round(negative),
          neutral: Math.round(neutral),
          mentions: Number(mentions) || 0,
          trend,
          breakdown,
          confidence: data?.confidence || 0.85,
          sources: data?.sources || ['Reddit', 'Twitter', 'LinkedIn', 'News'],
          timeframe: data?.timeframe || 'Last 7 days'
        };
      }
      return null;
    }
  },
  'market-trends': {
    primarySources: ['market-insights', 'gdelt-news', 'web-search-optimized'],
    fallbackSources: ['serper-batch-search', 'youtube-search', 'web-search'],
    dataPoints: ['trend_analysis', 'growth_indicators', 'market_drivers', 'emerging_technologies'],
    freshnessHours: 4,
    groqQuery: `
      Extract comprehensive market trends including:
      - Current market trends and directions
      - Growth indicators and projections
      - Key market drivers and catalysts
      - Emerging technologies and innovations
      - Consumer behavior shifts
      - Industry disruptions
      - Regulatory changes
      - Investment trends
    `,
    localExtractor: (data: any) => {
      const trendsData: any = {};
      const text = JSON.stringify(data).toLowerCase();
      
      // Extract growth indicators
      const growthMatch = text.match(/(?:growth|cagr)[:\s]*(\d+\.?\d*)%?/gi);
      if (growthMatch && growthMatch[0]) {
        trendsData.growthRate = parseFloat(growthMatch[0].match(/\d+\.?\d*/)?.[0] || '0');
      }
      
      // Extract trend keywords and descriptions
      const trendPatterns = [
        /(?:emerging|trending|rising|growing) (?:technologies?|trends?|sectors?|markets?)[^.]*\./gi,
        /(?:market is|industry is) (?:shifting|moving|trending)[^.]*\./gi,
        /(?:key|major|significant) (?:trend|driver|catalyst)[^.]*\./gi
      ];
      
      const trends: string[] = [];
      trendPatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        trends.push(...matches.map(m => m.trim().substring(0, 150)));
      });
      
      if (trends.length > 0) {
        trendsData.trends = [...new Set(trends)].slice(0, 5);
      }
      
      // Extract market drivers
      const driverPatterns = [
        /(?:driven by|fueled by|powered by|catalyzed by)[^.]*\./gi,
        /(?:due to|because of|as a result of)[^.]*\./gi,
        /(?:key|main|primary) driver[s]?[^.]*\./gi
      ];
      
      const drivers: string[] = [];
      driverPatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        drivers.push(...matches.map(m => m.trim().substring(0, 100)));
      });
      
      if (drivers.length > 0) {
        trendsData.drivers = [...new Set(drivers)].slice(0, 4);
      }
      
      // Extract emerging technologies
      const techKeywords = ['ai', 'blockchain', 'iot', 'cloud', '5g', 'quantum', 'sustainable', 'renewable'];
      const technologies: string[] = [];
      techKeywords.forEach(tech => {
        if (text.includes(tech)) {
          technologies.push(tech.toUpperCase());
        }
      });
      
      if (technologies.length > 0) {
        trendsData.emergingTech = technologies;
      }
      
      // Determine trend direction
      const positiveIndicators = (text.match(/(?:growth|rising|increasing|expanding|booming)/gi) || []).length;
      const negativeIndicators = (text.match(/(?:declining|falling|decreasing|slowing|contracting)/gi) || []).length;
      trendsData.direction = positiveIndicators > negativeIndicators ? 'upward' : 
                             negativeIndicators > positiveIndicators ? 'downward' : 'stable';
      
      return Object.keys(trendsData).length > 0 ? {
        ...trendsData,
        confidence: 0.75,
        timestamp: new Date().toISOString()
      } : null;
    }
  },
  competition: {
    primarySources: ['competitive-landscape', 'competition-chat', 'serper-batch-search'],
    fallbackSources: ['web-search', 'gdelt-news'],
    dataPoints: ['competitors_list', 'market_leaders', 'differentiators'],
    freshnessHours: 48,
    groqQuery: `
      Extract competition data including:
      - List of direct competitors
      - Market leaders and their strengths
      - Key differentiators
      - Funding information
    `,
    localExtractor: (data: any) => {
      // Normalize competitive-landscape response shape
      const d = data?.data || data?.competitiveAnalysis || data;
      const topCompetitors = d?.topCompetitors || d?.competitors || [];
      if (Array.isArray(topCompetitors) && topCompetitors.length > 0) {
        return {
          topCompetitors,
          marketConcentration: d?.marketConcentration || d?.concentration,
          barrierToEntry: d?.barrierToEntry || d?.barriers,
          confidence: 0.8,
          summary: `Found ${topCompetitors.length} competitors; top: ${topCompetitors[0]?.name || 'N/A'}`
        };
      }
      return null;
    }
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
  
  /**
   * Generate optimized search queries for a specific tile based on the idea
   */
  async generateOptimizedQuery(idea: string, tileType: string): Promise<{
    searchQuery: string;
    filters: string[];
    keywords: string[];
  }> {
    try {
      const requirements = TILE_REQUIREMENTS[tileType];
      if (!requirements) {
        return {
          searchQuery: idea,
          filters: [],
          keywords: []
        };
      }
      
      // Call Groq to generate an optimized query
      const { data, error } = await supabase.functions.invoke('groq-synthesis', {
        body: {
          prompt: `Generate an optimized search query for "${idea}" to gather ${tileType} data.
          
          Requirements:
          ${requirements.groqQuery}
          
          Create a search query that will find:
          ${requirements.dataPoints.join(', ')}
          
          Return a JSON object with:
          - searchQuery: main search query string (optimized for search engines)
          - filters: array of filter terms (e.g., "2024", "market size", "competitors")
          - keywords: array of key terms to look for in results
          
          Make the query specific and targeted to get the best results.`,
          responseFormat: 'json'
        }
      });
      
      if (error) throw error;
      
      // Parse and validate the response
      const result = data?.result || data;
      if (result && typeof result === 'object') {
        return {
          searchQuery: result.searchQuery || `${idea} ${tileType.replace(/_/g, ' ')}`,
          filters: Array.isArray(result.filters) ? result.filters : [],
          keywords: Array.isArray(result.keywords) ? result.keywords : []
        };
      }
      
      // Fallback to default query generation
      return this.generateDefaultQuery(idea, tileType, requirements);
      
    } catch (error) {
      console.error('Error generating optimized query:', error);
      return this.generateDefaultQuery(idea, tileType, TILE_REQUIREMENTS[tileType]);
    }
  }
  
  private generateDefaultQuery(idea: string, tileType: string, requirements?: TileDataRequirements): {
    searchQuery: string;
    filters: string[];
    keywords: string[];
  } {
    const queryMap: Record<string, any> = {
      sentiment: {
        searchQuery: `"${idea}" sentiment analysis user opinions reviews feedback`,
        filters: ['reddit', 'twitter', 'reviews', 'forums'],
        keywords: ['positive', 'negative', 'users say', 'feedback', 'opinion']
      },
      'market-trends': {
        searchQuery: `"${idea}" market trends growth forecast industry analysis 2024`,
        filters: ['market research', 'industry report', 'growth rate', 'CAGR'],
        keywords: ['trend', 'growth', 'forecast', 'emerging', 'market driver']
      },
      market_size: {
        searchQuery: `"${idea}" market size TAM SAM SOM valuation billions revenue`,
        filters: ['market research', 'industry analysis', 'billion', 'million'],
        keywords: ['TAM', 'SAM', 'SOM', 'market size', 'revenue', 'CAGR']
      },
      competition: {
        searchQuery: `"${idea}" competitors alternatives comparison vs market leaders`,
        filters: ['vs', 'alternatives', 'competitors', 'comparison'],
        keywords: ['competitor', 'alternative', 'market leader', 'vs', 'compare']
      },
      pmf_score: {
        searchQuery: `"${idea}" product market fit adoption users traction metrics`,
        filters: ['users', 'adoption', 'traction', 'engagement'],
        keywords: ['adoption', 'users', 'engagement', 'retention', 'growth']
      },
      google_trends: {
        searchQuery: `"${idea}" trending search volume interest over time popularity`,
        filters: ['trending', 'search volume', 'interest'],
        keywords: ['trending', 'popular', 'search', 'interest', 'volume']
      }
    };
    
    const defaultQuery = queryMap[tileType] || {
      searchQuery: `"${idea}" ${tileType.replace(/[_-]/g, ' ')} analysis data`,
      filters: [],
      keywords: requirements?.dataPoints || []
    };
    
    return defaultQuery;
  }
  
  /**
   * Extract data for a specific tile from cached responses with enhanced Groq querying
   */
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
    
    // If local extraction insufficient, use enhanced Groq with dynamic query
    const groqResult = await this.extractWithEnhancedGroq(
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
  
  private async extractWithEnhancedGroq(
    responses: CachedApiResponse[],
    requirements: TileDataRequirements,
    tileType: string
  ): Promise<ExtractionResult> {
    try {
      // Prepare a summarized version of responses to avoid token limits
      const summarizedResponses = responses.slice(0, 5).map(r => {
        const data = r.rawResponse;
        if (typeof data === 'string') {
          return data.substring(0, 500);
        }
        return JSON.stringify(data).substring(0, 500);
      });
      
      const { data, error } = await supabase.functions.invoke('groq-synthesis', {
        body: {
          prompt: `Extract structured data for ${tileType} tile from these API responses.
          
          Required data points: ${requirements.dataPoints.join(', ')}
          
          Extraction instructions:
          ${requirements.groqQuery}
          
          Responses to analyze:
          ${summarizedResponses.join('\n---\n')}
          
          Return a JSON object with the extracted data matching the required data points.
          Be specific and extract actual values, not generic placeholders.`,
          responseFormat: 'json'
        }
      });
      
      if (!error && data?.result) {
        const extractedData = data.result;
        const missingPoints = requirements.dataPoints.filter(
          point => !extractedData[point] || extractedData[point] === null
        );
        
        return {
          data: extractedData,
          confidence: missingPoints.length === 0 ? 0.9 : 0.7 - (missingPoints.length * 0.1),
          missingDataPoints: missingPoints,
          sourceResponseIds: responses.slice(0, 5).map(r => r.id || ''),
          fromCache: true
        };
      }
    } catch (error) {
      console.error('Enhanced Groq extraction failed:', error);
    }
    
    // Fallback to the original extractWithGroq method
    return this.extractWithGroq(responses, requirements, tileType);
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