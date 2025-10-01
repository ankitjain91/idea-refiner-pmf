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
      trending: "+23%"
    },
    primaryInsight: "Overall sentiment is 82% positive across social media and forums",
    explanation: "Users express strong enthusiasm for AI-powered productivity solutions, with particular interest in workflow automation and time-saving features.",
    confidence: 85,
    dataQuality: "high",
    keyMetrics: [
      { label: "Positive", value: "82%", trend: "up" },
      { label: "Neutral", value: "15%", trend: null },
      { label: "Negative", value: "3%", trend: "down" },
      { label: "Engagement", value: "4.2K", trend: "up" }
    ],
    regionalBreakdown: [
      { region: "North America", positive: 85, neutral: 12, negative: 3, volume: "45%" },
      { region: "Europe", positive: 78, neutral: 18, negative: 4, volume: "30%" },
      { region: "Asia Pacific", positive: 83, neutral: 14, negative: 3, volume: "20%" },
      { region: "Latin America", positive: 80, neutral: 17, negative: 3, volume: "5%" }
    ],
    topThemes: [
      { theme: "Automation", mentions: 1234, sentiment: "Very Positive" },
      { theme: "Time Saving", mentions: 987, sentiment: "Positive" },
      { theme: "Integration", mentions: 654, sentiment: "Positive" },
      { theme: "Pricing", mentions: 432, sentiment: "Mixed" }
    ],
    platforms: {
      reddit: { sentiment: 88, posts: 234 },
      twitter: { sentiment: 79, posts: 1892 },
      linkedin: { sentiment: 91, posts: 567 },
      facebook: { sentiment: 75, posts: 445 }
    },
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