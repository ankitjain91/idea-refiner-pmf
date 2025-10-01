import { useState, useCallback } from "react";
import { DataHubTile } from "./DataHubTile";
import { TileData } from "@/lib/data-hub-orchestrator";
import { dashboardDataService } from '@/services/dashboardDataService';
import { toast } from 'sonner';
import { useSession } from "@/contexts/SimpleSessionContext";
import { 
  Search, MessageSquare, Twitter, ShoppingBag, 
  Youtube, AlertTriangle, TrendingUp, Globe, Users,
  Star, Eye, MessageCircle, ThumbsUp, Calendar,
  Hash, Share2, DollarSign, Activity
} from "lucide-react";

interface ExtendedInsightsGridProps {
  tiles: {
    web_search?: TileData | null;
    reddit_sentiment?: TileData | null;
    twitter_buzz?: TileData | null;
    amazon_reviews?: TileData | null;
    youtube_analytics?: TileData | null;
    risk_assessment?: TileData | null;
  };
  loading?: boolean;
}

export function ExtendedInsightsGrid({ tiles, loading }: ExtendedInsightsGridProps) {
  // State for lazy-loaded tile data
  const [tileData, setTileData] = useState<Record<string, TileData | null>>({});
  const [tileLoading, setTileLoading] = useState<Record<string, boolean>>({});
  const { currentSession } = useSession();
  const currentIdea = currentSession?.data?.currentIdea || localStorage.getItem('current_idea');

  // Load tile data on first expansion
  const loadTileData = useCallback(async (tileId: string) => {
    if (tileData[tileId]) return; // Already loaded
    
    setTileLoading(prev => ({ ...prev, [tileId]: true }));
    
    try {
      // Fetch real data from the dashboard service
      const data = await dashboardDataService.fetchTileData({
        idea: currentIdea || 'AI-powered productivity app',
        tileType: tileId
      });
      
      if (data) {
        setTileData(prev => ({ ...prev, [tileId]: data }));
        toast.success(`${tileId.replace(/_/g, ' ')} data loaded`);
      }
    } catch (error) {
      console.error(`Error loading ${tileId} data:`, error);
      toast.error(`Failed to load ${tileId.replace(/_/g, ' ')} data`);
      
      // Set the mock data as fallback
      let mockData: TileData | null = null;
      switch(tileId) {
        case 'web_search':
          mockData = mockWebSearchData;
          break;
        case 'reddit_sentiment':
          mockData = mockRedditData;
          break;
        case 'twitter_buzz':
          mockData = mockTwitterData;
          break;
        case 'amazon_reviews':
          mockData = mockAmazonData;
          break;
        case 'youtube_analytics':
          mockData = mockYouTubeData;
          break;
        case 'risk_assessment':
          mockData = mockRiskData;
          break;
      }
      
      if (mockData) {
        setTileData(prev => ({ ...prev, [tileId]: mockData }));
      }
    } finally {
      setTileLoading(prev => ({ ...prev, [tileId]: false }));
    }
  }, [tileData, currentIdea]);
  // Rich mock data for Extended Insights tiles
  const mockWebSearchData: TileData = {
    metrics: {
      search_visibility: "87%",
      monthly_searches: "45K",
      difficulty_score: "3.2/10",
      domain_authority: "72",
      top_keyword_volume: "12K/mo",
      avg_cpc: "$3.20",
      featured_snippets: "28%",
      competitor_count: "15"
    },
    explanation: "High search demand with moderate competition. Strong opportunity for organic growth with 87% search visibility and growing monthly searches.",
    citations: [
      { url: "https://google.com", title: "Google Search Console", source: "Google", relevance: 0.95 },
      { url: "https://semrush.com", title: "SEMrush Analysis", source: "SEMrush", relevance: 0.90 },
      { url: "https://ahrefs.com", title: "Ahrefs Keywords", source: "Ahrefs", relevance: 0.88 }
    ],
    charts: [
      {
        type: "line",
        title: "Search Volume Trend",
        series: [
          { name: "Monthly Searches", data: [32000, 35000, 38000, 41000, 43000, 45000] }
        ],
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
      }
    ],
    json: {
      top_keywords: [
        { keyword: "ai productivity", volume: 12000, difficulty: 42, cpc: 3.20 },
        { keyword: "workflow automation", volume: 8500, difficulty: 38, cpc: 2.80 },
        { keyword: "team collaboration ai", volume: 6200, difficulty: 45, cpc: 4.10 }
      ]
    },
    confidence: 0.91,
    dataQuality: 'high'
  };

  const mockRedditData: TileData = {
    metrics: {
      positive_sentiment: "78%",
      active_discussions: "3.2K",
      engaged_users: "45K",
      virality_score: "8.5/10",
      top_subreddit: "r/productivity",
      avg_upvotes: "450",
      comment_ratio: "12:1",
      influencer_mentions: "234"
    },
    explanation: "Strong Reddit presence with 78% positive sentiment across 3.2K active discussions. High engagement in productivity and startup communities.",
    citations: [
      { url: "https://reddit.com/r/productivity", title: "r/productivity discussions", source: "Reddit", relevance: 0.92 },
      { url: "https://reddit.com/r/startups", title: "r/startups mentions", source: "Reddit", relevance: 0.88 },
      { url: "https://reddit.com/r/SaaS", title: "r/SaaS reviews", source: "Reddit", relevance: 0.85 }
    ],
    charts: [
      {
        type: "pie",
        title: "Sentiment Distribution",
        series: [
          { name: "Sentiment", data: [78, 15, 7] }
        ],
        labels: ["Positive", "Neutral", "Negative"]
      }
    ],
    json: {
      top_threads: [
        { title: "Best AI tools for productivity", upvotes: 892, comments: 234 },
        { title: "Comparing workflow automation", upvotes: 567, comments: 145 },
        { title: "Team collaboration tools 2024", upvotes: 445, comments: 98 }
      ]
    },
    confidence: 0.88,
    dataQuality: 'high'
  };

  const mockTwitterData: TileData = {
    metrics: {
      monthly_impressions: "125K",
      influencer_mentions: "3.5K",
      engagement_rate: "82%",
      trending_score: "45/100",
      top_hashtag: "#AIProductivity",
      retweet_ratio: "3.4:1",
      verified_accounts: "128",
      viral_tweets: "12"
    },
    explanation: "Strong Twitter/X presence with 125K monthly impressions and 82% engagement rate. High influencer interest with 3.5K mentions from accounts with 10K+ followers.",
    citations: [
      { url: "https://twitter.com", title: "Twitter Analytics", source: "Twitter", relevance: 0.91 },
      { url: "https://buffer.com", title: "Buffer Analytics", source: "Buffer", relevance: 0.85 },
      { url: "https://hootsuite.com", title: "Hootsuite Insights", source: "Hootsuite", relevance: 0.83 }
    ],
    charts: [
      {
        type: "bar",
        title: "Hashtag Performance",
        series: [
          { name: "Reach", data: [45000, 38000, 32000, 28000] }
        ],
        labels: ["#AIProductivity", "#FutureOfWork", "#StartupLife", "#TechInnovation"]
      }
    ],
    json: {
      top_influencers: [
        { handle: "@TechGuru", followers: 450000, engagement: 8.2 },
        { handle: "@StartupDaily", followers: 280000, engagement: 6.5 },
        { handle: "@AIInsights", followers: 180000, engagement: 9.1 }
      ]
    },
    confidence: 0.87,
    dataQuality: 'high'
  };

  const mockAmazonData: TileData = {
    metrics: {
      avg_rating: "4.3★",
      total_reviews: "12.5K",
      price_sweet_spot: "$89",
      feature_gap: "73%",
      top_competitor: "ProductA Pro",
      return_rate: "8%",
      purchase_intent: "High",
      market_rank: "#12"
    },
    explanation: "Clear market opportunity with 73% feature gap in current Amazon offerings. Average competitor rating of 4.3 with 12.5K total reviews shows proven demand.",
    citations: [
      { url: "https://amazon.com", title: "Amazon Product Research", source: "Amazon", relevance: 0.93 },
      { url: "https://helium10.com", title: "Helium 10 Analysis", source: "Helium 10", relevance: 0.88 },
      { url: "https://junglescout.com", title: "Jungle Scout Data", source: "Jungle Scout", relevance: 0.85 }
    ],
    charts: [
      {
        type: "bar",
        title: "Common Complaints",
        series: [
          { name: "Frequency", data: [34, 28, 22, 16] }
        ],
        labels: ["Complex Setup", "Limited Integrations", "Poor Support", "Expensive Upgrades"]
      }
    ],
    json: {
      competitor_analysis: [
        { name: "ProductA Pro", rating: 4.2, reviews: 3200, price: 79, rank: 12 },
        { name: "SmartTool X", rating: 4.4, reviews: 2800, price: 99, rank: 8 },
        { name: "WorkFlow Master", rating: 4.1, reviews: 1900, price: 89, rank: 15 }
      ]
    },
    confidence: 0.91,
    dataQuality: 'high'
  };

  const mockYouTubeData: TileData = {
    metrics: {
      category_views: "2.3M/mo",
      active_channels: "450",
      avg_watch_time: "12:30",
      channel_subscribers: "68K avg",
      top_video_views: "450K",
      engagement_rate: "6.8%",
      comment_sentiment: "Positive",
      tutorial_demand: "High"
    },
    explanation: "Growing YouTube presence with 2.3M monthly views in category. High engagement with 12:30 average watch time indicates strong content interest.",
    citations: [
      { url: "https://youtube.com", title: "YouTube Analytics", source: "YouTube", relevance: 0.89 },
      { url: "https://vidiq.com", title: "VidIQ Insights", source: "VidIQ", relevance: 0.85 },
      { url: "https://tubebuddy.com", title: "TubeBuddy Stats", source: "TubeBuddy", relevance: 0.83 }
    ],
    charts: [
      {
        type: "area",
        title: "View Growth Trend",
        series: [
          { name: "Monthly Views", data: [1800000, 1950000, 2050000, 2150000, 2250000, 2300000] }
        ],
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
      }
    ],
    json: {
      content_breakdown: [
        { type: "Tutorials", videos: 234, avg_views: 45000 },
        { type: "Reviews", videos: 189, avg_views: 62000 },
        { type: "Comparisons", videos: 156, avg_views: 38000 }
      ]
    },
    confidence: 0.88,
    dataQuality: 'high'
  };

  const mockRiskData: TileData = {
    metrics: {
      overall_risk: "Low",
      competition_risk: "3/10",
      tech_risk: "2/10",
      market_risk: "4/10",
      regulatory_risk: "Low",
      execution_risk: "Medium",
      timing_score: "Optimal",
      success_probability: "72%"
    },
    explanation: "Low to moderate risk profile with favorable market conditions. Competition risk manageable at 3/10. Strong timing with optimal market entry window.",
    citations: [
      { url: "https://gartner.com", title: "Gartner Risk Analysis", source: "Gartner", relevance: 0.91 },
      { url: "https://forrester.com", title: "Forrester Market Report", source: "Forrester", relevance: 0.87 },
      { url: "https://mckinsey.com", title: "McKinsey Industry Outlook", source: "McKinsey", relevance: 0.85 }
    ],
    charts: [
      {
        type: "bar",
        title: "Risk Assessment Matrix",
        series: [
          { name: "Risk Level", data: [3, 2, 4, 2, 3] }
        ],
        labels: ["Competition", "Technology", "Market", "Regulatory", "Execution"]
      }
    ],
    json: {
      opportunities: [
        { type: "Market Expansion", probability: "High", impact: "$2-5M" },
        { type: "Partnership Deals", probability: "Medium", impact: "$1-3M" },
        { type: "New Features", probability: "High", impact: "30% growth" }
      ]
    },
    confidence: 0.89,
    dataQuality: 'high'
  };

  // Merge mock data with actual tile data
  const webSearchData = tiles.web_search ? { ...mockWebSearchData, ...tiles.web_search } : mockWebSearchData;
  const redditData = tiles.reddit_sentiment ? { ...mockRedditData, ...tiles.reddit_sentiment } : mockRedditData;
  const twitterData = tiles.twitter_buzz ? { ...mockTwitterData, ...tiles.twitter_buzz } : mockTwitterData;
  const amazonData = tiles.amazon_reviews ? { ...mockAmazonData, ...tiles.amazon_reviews } : mockAmazonData;
  const youtubeData = tiles.youtube_analytics ? { ...mockYouTubeData, ...tiles.youtube_analytics } : mockYouTubeData;
  const riskData = tiles.risk_assessment ? { ...mockRiskData, ...tiles.risk_assessment } : mockRiskData;

  const extendedTiles = [
    { 
      id: "web_search", 
      title: "Web Search", 
      icon: Search,
      data: webSearchData,
      span: "col-span-full lg:col-span-2"
    },
    { 
      id: "reddit_sentiment", 
      title: "Reddit Sentiment", 
      icon: MessageSquare,
      data: redditData,
      span: "col-span-full md:col-span-2 lg:col-span-2"
    },
    { 
      id: "twitter_buzz", 
      title: "Twitter/X Buzz", 
      icon: Twitter,
      data: twitterData,
      span: "col-span-full md:col-span-2 lg:col-span-2"
    },
    { 
      id: "amazon_reviews", 
      title: "Amazon Reviews", 
      icon: ShoppingBag,
      data: amazonData,
      span: "col-span-full md:col-span-2 lg:col-span-2"
    },
    { 
      id: "youtube_analytics", 
      title: "YouTube Analytics", 
      icon: Youtube,
      data: youtubeData,
      span: "col-span-full md:col-span-2 lg:col-span-2"
    },
    { 
      id: "risk_assessment", 
      title: "Risk Assessment", 
      icon: AlertTriangle,
      data: riskData,
      span: "col-span-full lg:col-span-2"
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Extended Insights
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {extendedTiles.map((tile) => (
          <div 
            key={tile.id} 
            className={`${tile.span} min-h-0`}
          >
            <DataHubTile
              title={tile.title}
              Icon={tile.icon}
              data={tileData[tile.id] || null}
              loading={tileLoading[tile.id]}
              tileType={tile.id}
              onRefresh={() => loadTileData(tile.id)}
              className="h-full overflow-hidden"
            />
          </div>
        ))}
      </div>
    </div>
  );
}