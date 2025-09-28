/**
 * Dashboard Data Fetcher
 * Manages real-time data fetching with caching, cost optimization, and retry logic
 */

import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from './cache-manager';

export interface CardData {
  updatedAt: string;
  filters: {
    idea: string;
    industry: string;
    geo: string;
    time_window: string;
  };
  metrics: Array<{
    name: string;
    value: string | number;
    unit?: string;
    confidence: number;
    explanation: string;
    assumptions: string[];
  }>;
  series: Array<{
    name: string;
    points: Array<[string, number]>;
  }>;
  items: Array<{
    title: string;
    snippet: string;
    url: string;
    published: string;
    source: string;
    evidence: string[];
  }>;
  citations: Array<{
    label: string;
    url: string;
    published: string;
  }>;
  warnings: string[];
}

export type CardType = 
  | 'web-search'
  | 'news-analysis'
  | 'reddit-sentiment'
  | 'youtube-analytics'
  | 'twitter-buzz'
  | 'amazon-reviews'
  | 'competitor-analysis'
  | 'target-audience'
  | 'pricing-strategy'
  | 'market-size'
  | 'growth-projections'
  | 'user-engagement'
  | 'launch-timeline';

// TTL configuration in minutes
const TTL_CONFIG: Record<CardType, number> = {
  'web-search': 30,
  'news-analysis': 15,
  'reddit-sentiment': 15,
  'youtube-analytics': 15,
  'twitter-buzz': 15,
  'amazon-reviews': 30,
  'competitor-analysis': 30,
  'target-audience': 60,
  'pricing-strategy': 60,
  'market-size': 60,
  'growth-projections': 60,
  'user-engagement': 30,
  'launch-timeline': 60,
};

export class DashboardDataFetcher {
  private static activeRequests = new Map<string, AbortController>();

  /**
   * Fetch data for a specific card with caching and retry logic
   */
  static async fetchCardData(
    cardType: CardType,
    params: {
      idea: string;
      industry?: string;
      geo?: string;
      time_window?: string;
      force?: boolean;
    }
  ): Promise<CardData> {
    const cacheKey = CacheManager.generateKey({
      card: cardType,
      ...params,
    });

    // Cancel any in-flight request for this card
    const existingController = this.activeRequests.get(cacheKey);
    if (existingController) {
      existingController.abort();
    }

    // Check cache unless forced refresh
    if (!params.force) {
      const cached = CacheManager.get<CardData>(cacheKey);
      if (cached && !CacheManager.isStale(cacheKey)) {
        console.log(`[Cache Hit] ${cardType}:`, cached);
        return cached;
      }
    }

    // Create new abort controller
    const controller = new AbortController();
    this.activeRequests.set(cacheKey, controller);

    try {
      // Fetch fresh data based on card type
      const data = await this.fetchFromSource(cardType, params, controller.signal);
      
      // Cache the result
      CacheManager.set(cacheKey, data, TTL_CONFIG[cardType]);
      
      return data;
    } catch (error: any) {
      // If request was aborted, throw a specific error
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      
      // Try to return stale cache on error
      const staleCache = CacheManager.get<CardData>(cacheKey);
      if (staleCache) {
        console.warn(`[Using Stale Cache] ${cardType} due to error:`, error);
        return { ...staleCache, warnings: [...(staleCache.warnings || []), 'Using cached data due to fetch error'] };
      }
      
      throw error;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch data from the appropriate source based on card type
   */
  private static async fetchFromSource(
    cardType: CardType,
    params: {
      idea: string;
      industry?: string;
      geo?: string;
      time_window?: string;
    },
    signal: AbortSignal
  ): Promise<CardData> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 7000);
    });

    const fetchPromise = this.performFetch(cardType, params, signal);
    
    try {
      const result = await Promise.race([fetchPromise, timeoutPromise]) as CardData;
      return result;
    } catch (error) {
      console.error(`[Fetch Error] ${cardType}:`, error);
      throw error;
    }
  }

  /**
   * Perform the actual fetch based on card type
   */
  private static async performFetch(
    cardType: CardType,
    params: {
      idea: string;
      industry?: string;
      geo?: string;
      time_window?: string;
    },
    signal: AbortSignal
  ): Promise<CardData> {
    const baseParams = {
      idea_keywords: params.idea,
      industry: params.industry || 'general',
      geography: params.geo || 'global',
      time_window: params.time_window || 'last_90_days',
    };

    // Map card types to their respective edge functions
    const functionMap: Record<CardType, string> = {
      'web-search': 'web-search-optimized',
      'news-analysis': 'gdelt-news',
      'reddit-sentiment': 'reddit-search',
      'youtube-analytics': 'youtube-search',
      'twitter-buzz': 'twitter-search',
      'amazon-reviews': 'amazon-public',
      'competitor-analysis': 'competitor-analysis',
      'target-audience': 'market-insights',
      'pricing-strategy': 'market-insights',
      'market-size': 'market-insights',
      'growth-projections': 'dashboard-insights',
      'user-engagement': 'social-sentiment',
      'launch-timeline': 'execution-insights',
    };

    const functionName = functionMap[cardType];
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          ...baseParams,
          card_type: cardType,
          signal,
        },
      });

      if (error) throw error;

      // Transform to unified schema if needed
      return this.transformToUnifiedSchema(cardType, data, params);
    } catch (error: any) {
      // Generate fallback data for demo/development
      if (error.message?.includes('not found') || error.message?.includes('Function not found')) {
        console.warn(`[Fallback] Using mock data for ${cardType}`);
        return this.generateFallbackData(cardType, params);
      }
      throw error;
    }
  }

  /**
   * Transform various API responses to unified schema
   */
  private static transformToUnifiedSchema(
    cardType: CardType,
    rawData: any,
    params: any
  ): CardData {
    const baseData: CardData = {
      updatedAt: new Date().toISOString(),
      filters: {
        idea: params.idea,
        industry: params.industry || 'general',
        geo: params.geo || 'global',
        time_window: params.time_window || 'last_90_days',
      },
      metrics: [],
      series: [],
      items: [],
      citations: [],
      warnings: [],
    };

    // Handle different response formats
    if (rawData.metrics) baseData.metrics = rawData.metrics;
    if (rawData.series) baseData.series = rawData.series;
    if (rawData.items) baseData.items = rawData.items;
    if (rawData.citations) baseData.citations = rawData.citations;
    if (rawData.warnings) baseData.warnings = rawData.warnings;

    // Card-specific transformations
    switch (cardType) {
      case 'web-search':
        if (rawData.results) {
          baseData.items = rawData.results.slice(0, 10).map((r: any) => ({
            title: r.title,
            snippet: r.snippet,
            url: r.link,
            published: r.date || 'unknown',
            source: new URL(r.link).hostname,
            evidence: [],
          }));
        }
        break;

      case 'reddit-sentiment':
        if (rawData.posts) {
          const sentiment = this.calculateSentiment(rawData.posts);
          baseData.metrics = [
            { name: 'Positive', value: sentiment.positive, unit: '%', confidence: 0.8, explanation: 'Posts with positive sentiment', assumptions: [] },
            { name: 'Neutral', value: sentiment.neutral, unit: '%', confidence: 0.8, explanation: 'Posts with neutral sentiment', assumptions: [] },
            { name: 'Negative', value: sentiment.negative, unit: '%', confidence: 0.8, explanation: 'Posts with negative sentiment', assumptions: [] },
          ];
        }
        break;

      // Add more card-specific transformations as needed
    }

    return baseData;
  }

  /**
   * Calculate sentiment from posts/comments
   */
  private static calculateSentiment(posts: any[]): { positive: number; neutral: number; negative: number } {
    // Simple sentiment calculation (can be enhanced with better NLP)
    const positive = posts.filter(p => 
      p.title?.toLowerCase().match(/good|great|love|awesome|amazing|excellent/g)
    ).length;
    const negative = posts.filter(p => 
      p.title?.toLowerCase().match(/bad|hate|terrible|awful|poor|worst/g)
    ).length;
    const total = posts.length || 1;
    
    return {
      positive: Math.round((positive / total) * 100),
      negative: Math.round((negative / total) * 100),
      neutral: Math.round(((total - positive - negative) / total) * 100),
    };
  }

  /**
   * Generate fallback data for development/demo
   */
  private static generateFallbackData(cardType: CardType, params: any): CardData {
    const now = new Date().toISOString();
    const baseData: CardData = {
      updatedAt: now,
      filters: {
        idea: params.idea,
        industry: params.industry || 'general',
        geo: params.geo || 'global',
        time_window: params.time_window || 'last_90_days',
      },
      metrics: [],
      series: [],
      items: [],
      citations: [
        { label: 'Demo Data', url: '#', published: now },
      ],
      warnings: ['Using demo data - connect APIs for real data'],
    };

    // Generate card-specific demo data
    switch (cardType) {
      case 'web-search':
        baseData.metrics = [
          { name: 'Search Volume', value: '12.5K', unit: '/mo', confidence: 0.9, explanation: 'Monthly search volume for keywords', assumptions: ['Google Trends data'] },
          { name: 'Competition', value: 'Medium', unit: '', confidence: 0.7, explanation: 'Competitive landscape assessment', assumptions: ['SERP analysis'] },
        ];
        baseData.series = [{
          name: 'Search Trend',
          points: Array.from({ length: 12 }, (_, i) => [
            new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000).toISOString(),
            Math.floor(Math.random() * 100 + 50),
          ]),
        }];
        break;

      case 'reddit-sentiment':
        baseData.metrics = [
          { name: 'Positive', value: 65, unit: '%', confidence: 0.8, explanation: 'Positive sentiment in discussions', assumptions: ['NLP analysis'] },
          { name: 'Neutral', value: 25, unit: '%', confidence: 0.8, explanation: 'Neutral sentiment in discussions', assumptions: ['NLP analysis'] },
          { name: 'Negative', value: 10, unit: '%', confidence: 0.8, explanation: 'Negative sentiment in discussions', assumptions: ['NLP analysis'] },
        ];
        break;

      case 'market-size':
        baseData.metrics = [
          { name: 'TAM', value: '$45B', unit: '', confidence: 0.6, explanation: 'Total Addressable Market', assumptions: ['Industry reports', '10% YoY growth'] },
          { name: 'SAM', value: '$12B', unit: '', confidence: 0.7, explanation: 'Serviceable Addressable Market', assumptions: ['Geographic constraints'] },
          { name: 'SOM', value: '$1.2B', unit: '', confidence: 0.5, explanation: 'Serviceable Obtainable Market', assumptions: ['5-year projection'] },
        ];
        break;

      // Add more card-specific demo data
    }

    return baseData;
  }

  /**
   * Cancel all active requests
   */
  static cancelAll(): void {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }
}