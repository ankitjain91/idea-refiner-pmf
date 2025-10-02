import { supabase } from '@/integrations/supabase/client';
import { TileData } from '@/lib/data-hub-orchestrator';
import { CircuitBreaker, createTileCircuitBreaker } from '@/lib/circuit-breaker';

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
    const { data, error } = await supabase.functions.invoke('reddit-sentiment', {
      body: { query: idea }
    });
    
    if (error) throw error;
    
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
    const { data, error } = await supabase.functions.invoke('market-insights', {
      body: { idea }
    });
    
    if (error) throw error;
    
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
    const { data, error } = await supabase.functions.invoke('web-search', {
      body: { 
        query: `${idea} trends popularity growth`,
        type: 'trends'
      }
    });
    
    if (error) throw error;
    
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
    const { data, error } = await supabase.functions.invoke('gdelt-news', {
      body: { query: idea }
    });
    
    if (error) throw error;
    
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
    const { data, error } = await supabase.functions.invoke('web-search-optimized', {
      body: { query: idea }
    });
    
    if (error) throw error;
    
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
    const { data, error } = await supabase.functions.invoke('reddit-search', {
      body: { query: idea }
    });
    
    if (error) throw error;
    
    return {
      metrics: {
        posts: data?.postCount || 0,
        upvotes: data?.totalUpvotes || 0,
        comments: data?.totalComments || 0,
        activeSubreddits: data?.subreddits?.length || 0,
        sentiment: data?.sentiment?.score || 0,
        engagement: data?.engagement || 0
      },
      explanation: data?.summary || 'Reddit community analysis.',
      confidence: data?.confidence || 0.75,
      dataQuality: 'high',
      citations: data?.topPosts?.slice(0, 5) || [],
      charts: [],
      json: data
    };
  }

  private async fetchTwitterData(idea: string): Promise<TileData> {
    const { data, error } = await supabase.functions.invoke('twitter-search', {
      body: { query: idea }
    });
    
    if (error) throw error;
    
    return {
      metrics: {
        tweets: data?.tweetCount || 0,
        retweets: data?.retweets || 0,
        likes: data?.likes || 0,
        reach: data?.reach || 0,
        influencers: data?.influencers || 0,
        sentiment: data?.sentiment || 0
      },
      explanation: data?.summary || 'Twitter buzz analysis.',
      confidence: data?.confidence || 0.7,
      dataQuality: 'medium',
      citations: data?.topTweets?.slice(0, 5) || [],
      charts: [],
      json: data
    };
  }

  private async fetchAmazonData(idea: string): Promise<TileData> {
    const { data, error } = await supabase.functions.invoke('amazon-public', {
      body: { query: idea }
    });
    
    if (error) throw error;
    
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
    const { data, error } = await supabase.functions.invoke('youtube-search', {
      body: { query: idea }
    });
    
    if (error) throw error;
    
    return {
      metrics: {
        videos: data?.videoCount || 0,
        views: data?.totalViews || 0,
        likes: data?.totalLikes || 0,
        channels: data?.channelCount || 0,
        avgWatchTime: data?.avgWatchTime || '0:00',
        engagement: data?.engagement || 0
      },
      explanation: data?.summary || 'YouTube content analysis.',
      confidence: data?.confidence || 0.85,
      dataQuality: 'high',
      citations: data?.topVideos?.slice(0, 5) || [],
      charts: [],
      json: data
    };
  }

  private async fetchRiskData(idea: string): Promise<TileData> {
    const { data, error } = await supabase.functions.invoke('web-search-profitability', {
      body: { idea }
    });
    
    if (error) throw error;
    
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

  // Method to fetch all tile data in parallel
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

    const promises = tileTypes.map(async (tileType) => {
      try {
        const data = await this.fetchTileData({ idea, tileType });
        return { tileType, data };
      } catch (error) {
        console.error(`Failed to fetch ${tileType}:`, error);
        return { tileType, data: null };
      }
    });

    const results = await Promise.all(promises);
    
    return results.reduce((acc, { tileType, data }) => {
      acc[tileType] = data;
      return acc;
    }, {} as Record<string, TileData | null>);
  }
}

export const dashboardDataService = DashboardDataService.getInstance();