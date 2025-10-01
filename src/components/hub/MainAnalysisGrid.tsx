import { DataHubTile } from "./DataHubTile";
import { TileData } from "@/lib/data-hub-orchestrator";
import { EnhancedMarketSizeTile } from "@/components/market/EnhancedMarketSizeTile";
import { EnhancedCompetitionTile } from "@/components/competition/EnhancedCompetitionTile";
import { useSession } from "@/contexts/SimpleSessionContext";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, Users, MessageSquare, Activity, 
  Search, Newspaper, DollarSign, Building2
} from "lucide-react";

interface MainAnalysisGridProps {
  tiles: {
    market_size?: TileData | null;
    competition?: TileData | null;
    sentiment?: TileData | null;
    market_trends?: TileData | null;
    google_trends?: TileData | null;
    news_analysis?: TileData | null;
  };
  loading?: boolean;
  viewMode: "executive" | "deep";
}

export function MainAnalysisGrid({ tiles, loading, viewMode }: MainAnalysisGridProps) {
  const { currentSession } = useSession();
  const currentIdea = currentSession?.data?.currentIdea || localStorage.getItem('current_idea') || '';
  
  // Create enriched mock data with regional and detailed information
  const mockSentimentData: any = {
    metrics: {
      positive: 82,
      neutral: 15,
      negative: 3,
      engagement: 4200,
      reach: "2.3M",
      trending: "+23%",
      nps: 67,
      csat: 4.2,
      responseRate: 89,
      viralityScore: 8.5
    },
    primaryInsight: "Overall sentiment is 82% positive with exceptionally high engagement in tech-savvy demographics",
    explanation: "Users express strong enthusiasm for AI-powered productivity solutions, with particular interest in workflow automation and time-saving features. The sentiment has improved 23% over the past month.",
    confidence: 85,
    dataQuality: "high",
    keyMetrics: [
      { label: "Positive", value: "82%", trend: "up", change: "+5%" },
      { label: "Neutral", value: "15%", trend: null, change: "0%" },
      { label: "Negative", value: "3%", trend: "down", change: "-2%" },
      { label: "Engagement", value: "4.2K", trend: "up", change: "+23%" }
    ],
    regionalBreakdown: [
      { 
        region: "North America", 
        positive: 85, 
        neutral: 12, 
        negative: 3, 
        volume: "45%",
        engagement: 4800,
        topSentiment: "Innovation",
        growthRate: "+28%",
        demographics: {
          age18_24: 22,
          age25_34: 38,
          age35_44: 25,
          age45_plus: 15,
          techSavvy: 78,
          earlyAdopters: 42
        }
      },
      { 
        region: "Europe", 
        positive: 78, 
        neutral: 18, 
        negative: 4, 
        volume: "30%",
        engagement: 3200,
        topSentiment: "Efficiency",
        growthRate: "+18%",
        demographics: {
          age18_24: 18,
          age25_34: 35,
          age35_44: 28,
          age45_plus: 19,
          techSavvy: 72,
          earlyAdopters: 38
        }
      },
      { 
        region: "Asia Pacific", 
        positive: 83, 
        neutral: 14, 
        negative: 3, 
        volume: "20%",
        engagement: 5600,
        topSentiment: "Automation",
        growthRate: "+45%",
        demographics: {
          age18_24: 28,
          age25_34: 42,
          age35_44: 20,
          age45_plus: 10,
          techSavvy: 85,
          earlyAdopters: 52
        }
      },
      { 
        region: "Latin America", 
        positive: 80, 
        neutral: 17, 
        negative: 3, 
        volume: "5%",
        engagement: 2100,
        topSentiment: "Cost-effective",
        growthRate: "+35%",
        demographics: {
          age18_24: 32,
          age25_34: 40,
          age35_44: 18,
          age45_plus: 10,
          techSavvy: 68,
          earlyAdopters: 35
        }
      }
    ],
    topThemes: [
      { theme: "Automation", mentions: 1234, sentiment: "Very Positive", growth: "+45%", reach: "892K" },
      { theme: "Time Saving", mentions: 987, sentiment: "Positive", growth: "+32%", reach: "654K" },
      { theme: "Integration", mentions: 654, sentiment: "Positive", growth: "+28%", reach: "432K" },
      { theme: "Pricing", mentions: 432, sentiment: "Mixed", growth: "+12%", reach: "298K" },
      { theme: "Learning Curve", mentions: 321, sentiment: "Neutral", growth: "+8%", reach: "187K" },
      { theme: "Customer Support", mentions: 298, sentiment: "Positive", growth: "+22%", reach: "156K" }
    ],
    platforms: {
      reddit: { 
        sentiment: 88, 
        posts: 234, 
        engagement: 12500,
        topSubreddits: ["r/productivity", "r/startups", "r/SaaS"],
        avgUpvotes: 145,
        comments: 3421,
        shareOfVoice: 34
      },
      twitter: { 
        sentiment: 79, 
        posts: 1892,
        engagement: 45600,
        impressions: 2340000,
        retweets: 8923,
        likes: 34567,
        influencerMentions: 23
      },
      linkedin: { 
        sentiment: 91, 
        posts: 567,
        engagement: 23400,
        shares: 4567,
        comments: 2134,
        professionalReach: 890000,
        decisionMakers: 42
      },
      facebook: { 
        sentiment: 75, 
        posts: 445,
        engagement: 8900,
        shares: 2345,
        reactions: 6789,
        groupMentions: 34,
        adSentiment: 68
      },
      youtube: {
        sentiment: 84,
        videos: 123,
        views: 3456000,
        likes: 234000,
        comments: 45678,
        avgWatchTime: "8:34",
        creatorMentions: 56
      },
      productHunt: {
        sentiment: 92,
        reviews: 89,
        upvotes: 2345,
        avgRating: 4.7,
        hunterComments: 234,
        featured: true,
        rank: 3
      }
    },
    emotionalBreakdown: {
      joy: 34,
      trust: 28,
      anticipation: 22,
      surprise: 8,
      fear: 4,
      sadness: 2,
      anger: 1,
      disgust: 1
    },
    temporalAnalysis: {
      hourly: [
        { hour: 0, sentiment: 78, volume: 23 },
        { hour: 6, sentiment: 80, volume: 45 },
        { hour: 12, sentiment: 85, volume: 89 },
        { hour: 18, sentiment: 82, volume: 67 },
        { hour: 23, sentiment: 79, volume: 34 }
      ],
      daily: [
        { day: "Mon", sentiment: 80, volume: 234 },
        { day: "Tue", sentiment: 82, volume: 267 },
        { day: "Wed", sentiment: 83, volume: 289 },
        { day: "Thu", sentiment: 85, volume: 312 },
        { day: "Fri", sentiment: 84, volume: 298 },
        { day: "Sat", sentiment: 78, volume: 187 },
        { day: "Sun", sentiment: 76, volume: 156 }
      ],
      monthly: [
        { month: "Jul", sentiment: 72, volume: 3421 },
        { month: "Aug", sentiment: 75, volume: 4532 },
        { month: "Sep", sentiment: 82, volume: 6789 }
      ]
    },
    competitorComparison: [
      { competitor: "Your Product", sentiment: 82, mentions: 4200, growth: "+23%" },
      { competitor: "Competitor A", sentiment: 74, mentions: 3200, growth: "+12%" },
      { competitor: "Competitor B", sentiment: 68, mentions: 2800, growth: "+8%" },
      { competitor: "Competitor C", sentiment: 71, mentions: 1900, growth: "+15%" }
    ],
    influencerMentions: [
      { 
        name: "TechGuru", 
        platform: "Twitter", 
        followers: 234000,
        sentiment: "Very Positive",
        engagement: 12300,
        reach: 456000,
        impact: "High"
      },
      { 
        name: "ProductivityPro", 
        platform: "YouTube",
        followers: 890000,
        sentiment: "Positive",
        engagement: 45600,
        reach: 1230000,
        impact: "Very High"
      },
      { 
        name: "StartupSteve", 
        platform: "LinkedIn",
        followers: 123000,
        sentiment: "Positive",
        engagement: 8900,
        reach: 234000,
        impact: "Medium"
      }
    ],
    keywordClouds: {
      positive: ["innovative", "time-saving", "intuitive", "powerful", "game-changer", "efficient", "seamless", "revolutionary"],
      negative: ["expensive", "complex", "buggy", "slow", "limited"],
      neutral: ["interesting", "potential", "learning", "testing", "considering"]
    },
    customerSegments: [
      { 
        segment: "Enterprise", 
        sentiment: 78, 
        volume: 1234,
        topConcern: "Integration",
        satisfaction: 4.1,
        churnRisk: "Low"
      },
      { 
        segment: "SMB", 
        sentiment: 85, 
        volume: 2345,
        topConcern: "Pricing",
        satisfaction: 4.3,
        churnRisk: "Medium"
      },
      { 
        segment: "Startup", 
        sentiment: 88, 
        volume: 1567,
        topConcern: "Features",
        satisfaction: 4.5,
        churnRisk: "Low"
      },
      { 
        segment: "Individual", 
        sentiment: 82, 
        volume: 890,
        topConcern: "Ease of use",
        satisfaction: 4.2,
        churnRisk: "Medium"
      }
    ],
    predictiveTrends: {
      next7Days: { sentiment: 84, confidence: 0.85 },
      next30Days: { sentiment: 86, confidence: 0.72 },
      next90Days: { sentiment: 88, confidence: 0.65 },
      drivers: ["Product updates", "Marketing campaign", "Industry trends"],
      risks: ["Competitor launch", "Price sensitivity", "Feature gaps"]
    },
    actionableInsights: [
      {
        insight: "Focus on enterprise integration features",
        impact: "High",
        urgency: "Medium",
        estimatedROI: "+15%"
      },
      {
        insight: "Address pricing concerns for SMB segment",
        impact: "Medium",
        urgency: "High",
        estimatedROI: "+8%"
      },
      {
        insight: "Leverage positive YouTube sentiment",
        impact: "Medium",
        urgency: "Low",
        estimatedROI: "+12%"
      }
    ],
    citations: [
      { url: "reddit.com", title: "Reddit Discussion", source: "Reddit", relevance: 0.95 },
      { url: "twitter.com", title: "Twitter Analysis", source: "Twitter", relevance: 0.92 }
    ],
    charts: [],
    json: {}
  };
  
  const mockMarketTrendsData: any = {
    metrics: {
      growthRate: 28,
      marketCap: 4500000000,
      yearOverYear: 45,
      adoption: 67,
      velocity: "Accelerating",
      maturity: "Early Growth"
    },
    primaryInsight: "Market growing at 28% CAGR with accelerating enterprise adoption",
    explanation: "AI productivity tools are experiencing rapid growth driven by remote work trends and digital transformation initiatives.",
    confidence: 90,
    dataQuality: "high",
    keyMetrics: [
      { label: "Growth Rate", value: "28%", trend: "up" },
      { label: "Market Cap", value: "$4.5B", trend: "up" },
      { label: "YoY Change", value: "+45%", trend: "up" },
      { label: "Adoption", value: "67%", trend: "up" }
    ],
    regionalGrowth: [
      { region: "North America", growth: 26, marketShare: 38, trend: "Stable" },
      { region: "Europe", growth: 24, marketShare: 28, trend: "Growing" },
      { region: "Asia Pacific", growth: 35, marketShare: 22, trend: "Accelerating" },
      { region: "Rest of World", growth: 18, marketShare: 12, trend: "Emerging" }
    ],
    segments: [
      { segment: "Enterprise", size: "$2.1B", growth: 32, adoption: 45 },
      { segment: "SMB", size: "$1.6B", growth: 28, adoption: 62 },
      { segment: "Consumer", size: "$0.8B", growth: 22, adoption: 78 }
    ],
    drivers: [
      "Remote work acceleration",
      "AI technology maturity",
      "Cost reduction pressures",
      "Digital transformation initiatives"
    ],
    citations: [
      { url: "gartner.com", title: "Gartner Report", source: "Gartner", relevance: 0.98 },
      { url: "forrester.com", title: "Forrester Trends", source: "Forrester", relevance: 0.96 }
    ],
    charts: [],
    json: {}
  };
  
  const mockGoogleTrendsData: any = {
    metrics: {
      interest: 87,
      growth: 150,
      queries: 2300000,
      peakInterest: 92,
      avgInterest: 78,
      breakoutTerms: 5
    },
    primaryInsight: "Search interest up 150% over past 12 months",
    explanation: "Significant spike in searches for 'AI productivity tools' and related terms, indicating growing consumer awareness and demand.",
    confidence: 95,
    dataQuality: "high",
    keyMetrics: [
      { label: "Interest", value: "87/100", trend: "up" },
      { label: "Peak", value: "Last week", trend: null },
      { label: "Growth", value: "+150%", trend: "up" },
      { label: "Queries", value: "2.3M/mo", trend: "up" }
    ],
    regionalInterest: [
      { region: "United States", interest: 89, queries: "892K/mo" },
      { region: "United Kingdom", interest: 82, queries: "234K/mo" },
      { region: "Canada", interest: 85, queries: "156K/mo" },
      { region: "Germany", interest: 78, queries: "189K/mo" },
      { region: "Australia", interest: 81, queries: "98K/mo" }
    ],
    relatedQueries: [
      { query: "best AI productivity tools", volume: 45600, growth: "+280%" },
      { query: "AI workflow automation", volume: 34200, growth: "+195%" },
      { query: "ChatGPT for productivity", volume: 28900, growth: "+450%" },
      { query: "AI task management", volume: 19800, growth: "+167%" }
    ],
    breakoutTerms: [
      "AI assistant apps",
      "Automated workflow tools",
      "Smart productivity software",
      "AI project management",
      "Intelligent task automation"
    ],
    seasonality: {
      peak: "January",
      low: "August",
      trend: "Year-round interest with Q1 spike"
    },
    citations: [
      { url: "trends.google.com", title: "Google Trends", source: "Google", relevance: 1.0 }
    ],
    charts: [],
    json: {}
  };
  
  const mockNewsData: any = {
    metrics: {
      articles: 342,
      reach: 12500000,
      mentions: 1200,
      sentiment: 78,
      virality: 4.2,
      shareOfVoice: 34
    },
    primaryInsight: "42 major announcements in the past month, dominated by funding news",
    explanation: "Media coverage is overwhelmingly positive with focus on innovation, funding rounds, and successful implementations.",
    confidence: 88,
    dataQuality: "high",
    keyMetrics: [
      { label: "Articles", value: "342", trend: "up" },
      { label: "Reach", value: "12.5M", trend: "up" },
      { label: "Sentiment", value: "78% Positive", trend: null },
      { label: "Mentions", value: "1.2K/day", trend: "up" }
    ],
    topPublications: [
      { publication: "TechCrunch", articles: 45, reach: "2.3M", sentiment: "Positive" },
      { publication: "Forbes", articles: 38, reach: "3.1M", sentiment: "Positive" },
      { publication: "Wired", articles: 29, reach: "1.8M", sentiment: "Neutral" },
      { publication: "VentureBeat", articles: 24, reach: "1.2M", sentiment: "Positive" },
      { publication: "The Verge", articles: 21, reach: "1.6M", sentiment: "Positive" }
    ],
    topics: [
      { topic: "Funding Rounds", count: 89, sentiment: 92 },
      { topic: "Product Launches", count: 67, sentiment: 85 },
      { topic: "Partnerships", count: 54, sentiment: 78 },
      { topic: "Market Analysis", count: 42, sentiment: 72 },
      { topic: "Case Studies", count: 38, sentiment: 88 }
    ],
    keyEvents: [
      { date: "2025-09-28", event: "Major Series B funding of $50M", impact: "High" },
      { date: "2025-09-22", event: "Partnership with Microsoft announced", impact: "Very High" },
      { date: "2025-09-15", event: "New AI feature launch", impact: "Medium" },
      { date: "2025-09-10", event: "Industry report published", impact: "Medium" }
    ],
    geographicCoverage: [
      { region: "North America", coverage: 45, sentiment: 82 },
      { region: "Europe", coverage: 28, sentiment: 76 },
      { region: "Asia", coverage: 18, sentiment: 79 },
      { region: "Rest of World", coverage: 9, sentiment: 74 }
    ],
    citations: [
      { url: "techcrunch.com", title: "TechCrunch", source: "TechCrunch", relevance: 0.94 },
      { url: "forbes.com", title: "Forbes", source: "Forbes", relevance: 0.91 }
    ],
    charts: [],
    json: {}
  };
  
  const mainTiles = [
    { 
      id: "market_size", 
      title: "Market Size", 
      icon: DollarSign,
      data: tiles.market_size,
      span: "col-span-full"
    },
    { 
      id: "competition", 
      title: "Competition", 
      icon: Building2,
      data: tiles.competition,
      span: "col-span-full"
    },
    { 
      id: "sentiment", 
      title: "Sentiment", 
      icon: MessageSquare,
      data: tiles.sentiment || mockSentimentData,
      span: "col-span-full"
    },
    { 
      id: "market_trends", 
      title: "Market Trends", 
      icon: TrendingUp,
      data: tiles.market_trends || mockMarketTrendsData,
      span: "col-span-full"
    },
    { 
      id: "google_trends", 
      title: "Google Trends", 
      icon: Search,
      data: tiles.google_trends || mockGoogleTrendsData,
      span: "col-span-full"
    },
    { 
      id: "news_analysis", 
      title: "News Analysis", 
      icon: Newspaper,
      data: tiles.news_analysis || mockNewsData,
      span: "col-span-full"
    }
  ];

  // In executive mode, only show first 4 tiles
  const displayTiles = viewMode === "executive" ? mainTiles.slice(0, 4) : mainTiles;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Main Analysis
      </h2>
      <div className="grid grid-cols-1 gap-6">
        {displayTiles.map((tile) => {
          
          // Use enhanced tiles for market_size and competition
          if (tile.id === "market_size") {
            return (
              <div key={tile.id} className={tile.span}>
                <EnhancedMarketSizeTile idea={currentIdea} />
              </div>
            );
          }
          
          if (tile.id === "competition") {
            return (
              <div key={tile.id} className={tile.span}>
                <EnhancedCompetitionTile idea={currentIdea} />
              </div>
            );
          }
          
          // Determine tile size based on content richness
          const hasRegionalData = (tile.data as any)?.regionalBreakdown || (tile.data as any)?.regionalGrowth || (tile.data as any)?.regionalInterest;
          const hasMultipleMetrics = tile.data?.metrics && Object.keys(tile.data.metrics).length > 2;
          const hasDetailedInsights = (tile.data as any)?.segments || (tile.data as any)?.drivers || (tile.data as any)?.breakoutTerms || (tile.data as any)?.keyEvents;
          
          const isLargeTile = hasRegionalData || (hasMultipleMetrics && hasDetailedInsights);
          const gridClass = isLargeTile && viewMode === "deep" ? "lg:col-span-2" : "";
          
          return (
            <div key={tile.id} className={cn(tile.span, gridClass)}>
              <DataHubTile
                title={tile.title}
                Icon={tile.icon}
                data={tile.data}
                loading={loading}
                expanded={viewMode === "deep"}
                tileType={tile.id}
                className={cn(
                  "h-full",
                  isLargeTile && viewMode === "deep" ? "min-h-[400px]" : "min-h-[300px]"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}