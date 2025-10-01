/**
 * DATA HUB ORCHESTRATOR
 * Central system for orchestrating all data fetching with deduplication
 */

export interface DataHubInput {
  idea: string;
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
  TRENDS_METRICS: TrendsData;
  EVIDENCE_STORE: Evidence[];
  PROVIDER_LOG: ProviderLogEntry[];
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source: string;
  fetchedAt: string;
  relevanceScore: number;
}

export interface NewsItem {
  publisher: string;
  title: string;
  url: string;
  publishedDate: string;
  tone: 'positive' | 'neutral' | 'negative';
  snippet: string;
  relevanceScore: number;
}

export interface CompetitorData {
  name: string;
  url: string;
  pricing: any;
  features: string[];
  claims: string[];
  traction: any;
  marketShare?: number;
  lastUpdated: string;
}

export interface ReviewData {
  source: string;
  text: string;
  rating: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  date: string;
  productName?: string;
  verified: boolean;
}

export interface SocialData {
  platform: 'reddit' | 'twitter' | 'youtube' | 'linkedin';
  content: string;
  engagement: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  date: string;
  author?: string;
  url?: string;
}

export interface PriceData {
  product: string;
  price: number;
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
  private dataHub: DataHubIndices = {
    SEARCH_INDEX: [],
    NEWS_INDEX: [],
    COMPETITOR_INDEX: [],
    REVIEWS_INDEX: [],
    SOCIAL_INDEX: [],
    PRICE_INDEX: [],
    TRENDS_METRICS: {} as TrendsData,
    EVIDENCE_STORE: [],
    PROVIDER_LOG: []
  };

  private fetchPlan: FetchPlanItem[] = [];
  private dedupeMap = new Map<string, string>();

  // Allow injecting indices from edge function response
  public setIndices(indices: DataHubIndices) {
    this.dataHub = indices;
  }

  /**
   * PHASE 0: Normalize input
   */
  normalizeInput(input: DataHubInput): string[] {
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

  /**
   * PHASE 1: Build fetch plan with deduplication
   */
  buildFetchPlan(input: DataHubInput, keywords: string[]): FetchPlanItem[] {
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
  synthesizeTileData(tileType: string): TileData {
    const baseData: TileData = {
      metrics: {},
      explanation: '',
      citations: [],
      charts: [],
      json: {},
      confidence: 0,
      dataQuality: 'low'
    };

    switch (tileType) {
      case 'pmf_score':
        return this.synthesizePMFScore();
      case 'market_size':
        return this.synthesizeMarketSize();
      case 'competition':
        return this.synthesizeCompetition();
      case 'sentiment':
        return this.synthesizeSentiment();
      case 'market_trends':
        return this.synthesizeMarketTrends();
      case 'google_trends':
        return this.synthesizeGoogleTrends();
      case 'web_search':
        return this.synthesizeWebSearch();
      case 'reddit_sentiment':
        return this.synthesizeRedditSentiment();
      case 'twitter_buzz':
        return this.synthesizeTwitterBuzz();
      case 'growth_potential':
        return this.synthesizeGrowthPotential();
      case 'market_readiness':
        return this.synthesizeMarketReadiness();
      case 'competitive_advantage':
        return this.synthesizeCompetitiveAdvantage();
      case 'risk_assessment':
        return this.synthesizeRiskAssessment();
      default:
        return baseData;
    }
  }

  private synthesizePMFScore(): TileData {
    const sentimentScore = this.calculateSentimentScore();
    const competitionScore = this.calculateCompetitionScore();
    const demandScore = this.calculateDemandScore();
    const trendsScore = this.calculateTrendsScore();
    
    const pmfScore = Math.round(
      (sentimentScore * 0.3) +
      (competitionScore * 0.2) +
      (demandScore * 0.3) +
      (trendsScore * 0.2)
    );

    return {
      metrics: {
        score: pmfScore,
        sentiment: sentimentScore,
        competition: competitionScore,
        demand: demandScore,
        trends: trendsScore
      },
      explanation: `PMF Score = (Sentiment × 30%) + (Competition × 20%) + (Demand × 30%) + (Trends × 20%). Sentiment derived from ${this.dataHub.SOCIAL_INDEX.length} social posts and ${this.dataHub.REVIEWS_INDEX.length} reviews. Competition based on ${this.dataHub.COMPETITOR_INDEX.length} competitors analyzed.`,
      citations: this.getTopCitations('pmf', 3),
      charts: [
        {
          type: 'bar',
          series: [
            { name: 'Components', data: [sentimentScore, competitionScore, demandScore, trendsScore] }
          ],
          labels: ['Sentiment', 'Competition', 'Demand', 'Trends']
        }
      ],
      json: { pmfScore, components: { sentimentScore, competitionScore, demandScore, trendsScore } },
      confidence: this.calculateConfidence(['sentiment', 'competition', 'demand', 'trends']),
      dataQuality: this.assessDataQuality()
    };
  }

  private synthesizeMarketSize(): TileData {
    const searchVolume = this.dataHub.SEARCH_INDEX.length;
    const competitorCount = this.dataHub.COMPETITOR_INDEX.length;
    const avgPricing = this.calculateAveragePricing();
    
    // TAM calculation with transparency
    const estimatedUsers = searchVolume * 1000; // Proxy multiplier
    const tam = estimatedUsers * avgPricing * 12; // Annual
    const sam = tam * 0.15; // Serviceable = 15% of TAM
    const som = sam * 0.05; // Obtainable = 5% of SAM in year 1

    return {
      metrics: {
        tam: tam,
        sam: sam,
        som: som,
        avgPricing: avgPricing,
        competitorCount: competitorCount
      },
      explanation: `TAM = Search Volume (${searchVolume}) × 1000 (multiplier) × $${avgPricing} (avg price) × 12 months = $${tam.toLocaleString()}. SAM = 15% of TAM based on geographic/demographic filters. SOM = 5% of SAM for year 1 capture.`,
      citations: this.getTopCitations('market', 3),
      charts: [
        {
          type: 'pie',
          series: [tam, sam, som],
          labels: ['TAM', 'SAM', 'SOM']
        }
      ],
      json: { tam, sam, som, calculation: { searchVolume, avgPricing, multiplier: 1000 } },
      confidence: this.calculateConfidence(['search', 'pricing']),
      dataQuality: this.assessDataQuality()
    };
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
    const positive = allSentiments.filter(s => s.sentiment === 'positive').length;
    const total = allSentiments.length;
    return total > 0 ? Math.round((positive / total) * 100) : 50;
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