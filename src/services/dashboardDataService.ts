import { TileData } from '@/lib/data-hub-orchestrator';
import { CircuitBreaker, createTileCircuitBreaker } from '@/lib/circuit-breaker';
import { invokeSupabaseFunction } from '@/lib/request-queue';

interface DataFetchOptions {
  idea: string;
  tileType: string;
}

class DashboardDataService {
  private static instance: DashboardDataService;
  private circuitBreakers: Map<string, CircuitBreaker>;
  
  private constructor() {
    this.circuitBreakers = new Map();
  }
  
  static getInstance(): DashboardDataService {
    if (!DashboardDataService.instance) {
      DashboardDataService.instance = new DashboardDataService();
    }
    return DashboardDataService.instance;
  }
  
  private getCircuitBreaker(tileType: string): CircuitBreaker {
    if (!this.circuitBreakers.has(tileType)) {
      this.circuitBreakers.set(tileType, createTileCircuitBreaker(`DashboardData-${tileType}`));
    }
    return this.circuitBreakers.get(tileType)!;
  }

  async fetchTileData(options: DataFetchOptions): Promise<TileData | null> {
    const { idea, tileType } = options;
    const circuitBreaker = this.getCircuitBreaker(tileType);
    
    return circuitBreaker.execute(
      async () => {
        try {
          switch (tileType) {
            case 'sentiment':
              return await this.fetchSentimentData(idea);
            
            case 'market_trends':
              return await this.fetchMarketTrendsData(idea);
            
            case 'google_trends':
              return await this.fetchGoogleTrendsData(idea);
            
            case 'news_analysis':
              return await this.fetchNewsData(idea);
            
            case 'web_search':
              return await this.fetchWebSearchData(idea);
            
            case 'reddit_sentiment':
              return await this.fetchRedditData(idea);
            
            case 'twitter_buzz':
              return await this.fetchTwitterData(idea);
            
            case 'amazon_reviews':
              return await this.fetchAmazonData(idea);
            
            case 'youtube_analytics':
              return await this.fetchYouTubeData(idea);
            
            default:
              console.log(`[DashboardDataService] Unknown tile type: ${tileType}`);
              return null;
          }
        } catch (error) {
          console.error(`[DashboardDataService] Error fetching ${tileType}:`, error);
          throw error;
        }
      },
      // Fallback function returns mock data
      async () => {
        console.log(`[DashboardDataService] Circuit breaker active for ${tileType}, returning fallback data`);
        return this.getFallbackData(tileType);
      }
    );
  }
  
  private getFallbackData(tileType: string): TileData {
    return {
      metrics: {},
      explanation: `${tileType} data temporarily unavailable (circuit breaker active)`,
      citations: [],
      charts: [],
      json: {},
      confidence: 0.3,
      dataQuality: 'low'
    };
  }

  private async fetchSentimentData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('reddit-sentiment', { query: idea });
    if (!data) throw new Error('No data received');
    
    return {
      metrics: {
        positiveRate: data?.sentiment?.positive || 0,
        neutralRate: data?.sentiment?.neutral || 0,
        negativeRate: data?.sentiment?.negative || 0,
        totalPosts: data?.totalPosts || 0,
        engagement: data?.engagement || 0,
        trending: data?.trending || 0
      },
      explanation: data?.summary || 'Sentiment analysis based on social media discussions.',
      confidence: data?.confidence || 0.75,
      dataQuality: 'high',
      citations: data?.sources || [],
      charts: [],
      json: data
    };
  }

  private async fetchMarketTrendsData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('market-insights', { idea });
    if (!data) throw new Error('No data received');
    
    return {
      metrics: {
        growthRate: data?.growthRate || 0,
        marketCap: data?.marketSize || 0,
        yearOverYear: data?.yearOverYear || 0,
        adoption: data?.adoption || 0,
        velocity: data?.velocity || 0,
        maturity: data?.maturity || 0,
        trendScore: data?.trendScore || 0
      },
      explanation: data?.summary || 'Market trends analysis.',
      confidence: data?.confidence || 0.8,
      dataQuality: 'high',
      citations: data?.sources || [],
      charts: data?.charts || [],
      json: data
    };
  }

  private async fetchGoogleTrendsData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('web-search', { 
      query: `${idea} trends popularity growth`,
      type: 'trends'
    });
    if (!data) throw new Error('No data received');
    
    return {
      metrics: {
        currentInterest: data?.interest || 0,
        peakInterest: data?.peakInterest || 100,
        avgInterest: data?.avgInterest || 0,
        risingQueries: data?.risingQueries?.length || 0,
        relatedTopics: data?.relatedTopics?.length || 0,
        breakoutTerms: data?.breakoutTerms?.length || 0,
        yearOverYearGrowth: data?.growth || 0
      },
      explanation: data?.summary || 'Google Trends analysis.',
      confidence: data?.confidence || 0.9,
      dataQuality: 'high',
      citations: data?.sources || [],
      charts: data?.charts || [],
      json: data
    };
  }

  private async fetchNewsData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('gdelt-news', { query: idea });
    if (!data) throw new Error('No data received');
    
    return {
      metrics: {
        articles: data?.articleCount || 0,
        reach: data?.totalReach || 0,
        mentions: data?.mentions || 0,
        sentiment: data?.sentiment || 0,
        virality: data?.virality || 0,
        shareOfVoice: data?.shareOfVoice || 0
      },
      explanation: data?.summary || 'News coverage analysis.',
      confidence: data?.confidence || 0.85,
      dataQuality: 'high',
      citations: data?.articles?.slice(0, 5) || [],
      charts: data?.charts || [],
      json: data
    };
  }

  private async fetchWebSearchData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('web-search-optimized', { query: idea });
    if (!data) throw new Error('No data received');
    
    return {
      metrics: {
        searchVolume: data?.searchVolume || 0,
        competition: data?.competition || 0,
        cpc: data?.cpc || 0,
        results: data?.totalResults || 0,
        relevantSites: data?.relevantSites || 0
      },
      explanation: data?.summary || 'Web search analysis.',
      confidence: data?.confidence || 0.8,
      dataQuality: 'high',
      citations: data?.results?.slice(0, 5) || [],
      charts: [],
      json: data
    };
  }

  private async fetchRedditData(idea: string): Promise<TileData> {
    // Use reddit-research which returns summary, posts, insights suited for ComprehensiveRedditTile
    console.log('[DashboardDataService] Fetching Reddit research for:', idea);
    const data = await invokeSupabaseFunction('reddit-research', { 
      idea_text: idea,
      time_window: 'week'
    });
    
    console.log('[DashboardDataService] Reddit research response:', {
      hasSummary: !!data?.summary,
      hasInsights: !!data?.insights,
      postCount: data?.posts?.length || 0
    });
    
    if (!data) throw new Error('No data received');

    const summary = data.summary || {};
    const insights = data.insights || {};

    return {
      metrics: {
        posts: summary.total_posts_analyzed || 0,
        activeSubreddits: (summary.top_subreddits?.length) || 0,
        sentiment: insights.sentiment_distribution?.positive || 0,
        engagement: (data.posts?.reduce((sum: number, p: any) => sum + (p.score || 0) + (p.comments || 0), 0)) || 0
      },
      explanation: `Analyzed ${summary.total_posts_analyzed || 0} Reddit posts across ${summary.top_subreddits?.length || 0} subreddits`,
      confidence: 0.8,
      dataQuality: 'high',
      citations: data.posts?.slice(0, 5).map((p: any) => ({ title: p.title, url: p.permalink })) || [],
      charts: [],
      json: data
    };
  }

  private async fetchTwitterData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('twitter-search', { idea });
    if (!data) throw new Error('No data received');

    const twitterBuzz = data.twitter_buzz || data;

    return {
      metrics: {
        tweets: twitterBuzz?.metrics?.total_tweets || 0,
        sentiment: twitterBuzz?.metrics?.overall_sentiment?.positive || 0,
        influencers: twitterBuzz?.metrics?.influencers?.length || 0
      },
      explanation: twitterBuzz?.summary || 'Twitter buzz analysis.',
      confidence: twitterBuzz?.confidence === 'High' ? 0.9 : twitterBuzz?.confidence === 'Medium' ? 0.7 : 0.5,
      dataQuality: 'medium',
      citations: twitterBuzz?.clusters?.[0]?.citations || [],
      charts: twitterBuzz?.charts || [],
      json: twitterBuzz
    };
  }

  private async fetchAmazonData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('amazon-public', { query: idea });
    if (!data) throw new Error('No data received');
    
    return {
      metrics: {
        products: data?.productCount || 0,
        avgRating: data?.avgRating || 0,
        reviews: data?.totalReviews || 0,
        priceRange: data?.priceRange || '$0-$0',
        topBrands: data?.topBrands?.length || 0,
        availability: data?.availability || 0
      },
      explanation: data?.summary || 'Amazon marketplace analysis.',
      confidence: data?.confidence || 0.8,
      dataQuality: 'high',
      citations: data?.products?.slice(0, 5) || [],
      charts: [],
      json: data
    };
  }

  private async fetchYouTubeData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('youtube-search', { idea_text: idea, time_window: 'year' });
    if (!data) throw new Error('No data received');

    const summary = data.summary || {};

    return {
      metrics: {
        videos: summary.total_videos || (data.youtube_insights?.length || 0),
        views: summary.total_views || 0,
        likes: summary.total_likes || 0,
        channels: summary.top_channels?.length || 0,
        engagement: Math.round(((summary.total_likes || 0) / Math.max(1, summary.total_views || 0)) * 100)
      },
      explanation: `Analyzed ${summary.total_videos || 0} YouTube videos`,
      confidence: data.meta?.confidence === 'High' ? 0.9 : data.meta?.confidence === 'Medium' ? 0.7 : 0.5,
      dataQuality: 'high',
      citations: (data.youtube_insights || []).slice(0, 5).map((v: any) => ({ title: v.title, url: v.url })),
      charts: [],
      json: data
    };
  }

  private async fetchRiskData(idea: string): Promise<TileData> {
    const data = await invokeSupabaseFunction('web-search-profitability', { idea });
    if (!data) throw new Error('No data received');
    
    return {
      metrics: {
        overallRisk: data?.riskScore || 0,
        marketRisk: data?.marketRisk || 0,
        competitionRisk: data?.competitionRisk || 0,
        executionRisk: data?.executionRisk || 0,
        financialRisk: data?.financialRisk || 0,
        regulatoryRisk: data?.regulatoryRisk || 0
      },
      explanation: data?.summary || 'Risk assessment analysis.',
      confidence: data?.confidence || 0.75,
      dataQuality: 'high',
      citations: data?.sources || [],
      charts: [],
      json: data
    };
  }

  // Method to fetch all tile data SEQUENTIALLY (not parallel) to respect rate limits
  async fetchAllTileData(idea: string): Promise<Record<string, TileData | null>> {
    const tileTypes = [
      'sentiment',
      'market_trends',
      'google_trends',
      'news_analysis',
      'web_search',
      'reddit_sentiment',
      'twitter_buzz',
      'amazon_reviews',
      'youtube_analytics',
      'risk_assessment'
    ];

    // Process sequentially through the global queue (no parallel requests)
    const results: Record<string, TileData | null> = {};
    
    for (const tileType of tileTypes) {
      try {
        console.log(`[DashboardDataService] Fetching ${tileType} sequentially...`);
        const data = await this.fetchTileData({ idea, tileType });
        results[tileType] = data;
      } catch (error) {
        console.error(`[DashboardDataService] Failed to fetch ${tileType}:`, error);
        results[tileType] = null;
      }
    }
    
    return results;
  }
}

export const dashboardDataService = DashboardDataService.getInstance();