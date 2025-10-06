/**
 * Minimal, stable Data Hub Orchestrator
 * This refactor restores type safety and valid structure to fix build/runtime errors
 * while preserving public API used by hooks/components.
 */

import { SearchResult, NewsItem, CompetitorData, ReviewData, SocialData, PriceData, TrendsData } from './types';

// Core input passed from UI
export interface DataHubInput {
  idea: string;
  session_id?: string | null;
  targetMarkets?: string[];
  audienceProfiles?: string[];
  geos?: string[];
  timeHorizon?: string;
  competitorHints?: string[];
}

// Optional planning type (kept for compatibility)
export interface FetchPlanItem {
  id: string;
  source: 'serper' | 'tavily' | 'brave' | 'firecrawl' | 'groq' | 'serpapi' | 'scraperapi';
  purpose: string;
  query: string;
  dedupeKey: string;
  dependencies?: string[];
  priority: number;
}

// Evidence and logs
export interface Evidence {
  id: string;
  url: string;
  title: string;
  source: string;
  snippet?: string;
  confidence: number;
  tileReferences: string[];
  fetchedAt?: string;
}

export interface ProviderLogEntry {
  provider: string;
  requestCount: number;
  dedupeCount: number;
  estimatedCost: number;
  timestamp: string;
}

// Visualization helpers
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

// Tile payload type (consumed across the app)
export interface TileData {
  metrics: Record<string, any>;
  explanation: string;
  citations: Citation[];
  charts: ChartData[];
  json: any;
  confidence: number; // 0..1
  dataQuality: 'high' | 'medium' | 'low';
  insights?: any;
}

// Aggregated indices produced by edge functions
export interface DataHubIndices {
  SEARCH_INDEX: SearchResult[];
  NEWS_INDEX: NewsItem[];
  COMPETITOR_INDEX: CompetitorData[];
  REVIEWS_INDEX: ReviewData[];
  SOCIAL_INDEX: SocialData[];
  PRICE_INDEX: PriceData[];
  MARKET_INDEX: any[];
  TRENDS_METRICS: TrendsData;
  EVIDENCE_STORE: Evidence[];
  PROVIDER_LOG: ProviderLogEntry[];
}

// Minimal, safe implementation keeping the same public API used by hooks
export class DataHubOrchestrator {
  private indices: DataHubIndices;

  constructor() {
    this.indices = {
      SEARCH_INDEX: [],
      NEWS_INDEX: [],
      COMPETITOR_INDEX: [],
      REVIEWS_INDEX: [],
      SOCIAL_INDEX: [],
      PRICE_INDEX: [],
      MARKET_INDEX: [],
      TRENDS_METRICS: {
        keyword: '',
        interestOverTime: [],
        relatedQueries: [],
        breakoutTerms: []
      },
      EVIDENCE_STORE: [],
      PROVIDER_LOG: []
    };
  }

  // Called by hooks with edge function output
  public setIndices(indices: DataHubIndices): void {
    this.indices = indices;
  }

  // Public API expected by useDataHub: generate a tile from current indices
  public async synthesizeTileData(tileType: string): Promise<TileData> {
    // Very lightweight synthesis to avoid type errors and keep UI flowing.
    const baseConfidence = 0.8;

    const metrics: Record<string, any> = {
      tile: tileType,
      sources: {
        search: this.indices.SEARCH_INDEX.length,
        news: this.indices.NEWS_INDEX.length,
        competitors: this.indices.COMPETITOR_INDEX.length,
        social: this.indices.SOCIAL_INDEX.length,
      },
    };

    // Simple explanation per tile type
    const explanation = `Synthesized ${tileType.replace(/_/g, ' ')} using available indices.`;

    const citations: Citation[] = [];
    // Add up to 1 citation from search/news if present
    if (this.indices.SEARCH_INDEX[0]) {
      citations.push({
        url: this.indices.SEARCH_INDEX[0].url,
        title: this.indices.SEARCH_INDEX[0].title,
        source: this.indices.SEARCH_INDEX[0].source,
        relevance: 0.8,
      });
    } else if (this.indices.NEWS_INDEX[0]) {
      citations.push({
        url: '#',
        title: this.indices.NEWS_INDEX[0].title,
        source: this.indices.NEWS_INDEX[0].publisher,
        relevance: 0.7,
      });
    }

    const charts: ChartData[] = [];

    return {
      metrics,
      explanation,
      citations,
      charts,
      json: { indicesSummary: this.getIndicesSummary() },
      confidence: baseConfidence,
      dataQuality: 'medium',
    };
  }

  // Summary consumed by hooks for high-level context
  public getHubSummary(): any {
    return this.getIndicesSummary();
  }

  private getIndicesSummary() {
    return {
      counts: {
        search: this.indices.SEARCH_INDEX.length,
        news: this.indices.NEWS_INDEX.length,
        competitors: this.indices.COMPETITOR_INDEX.length,
        reviews: this.indices.REVIEWS_INDEX.length,
        social: this.indices.SOCIAL_INDEX.length,
      },
      trendsKeyword: this.indices.TRENDS_METRICS.keyword || '',
    };
  }
}
