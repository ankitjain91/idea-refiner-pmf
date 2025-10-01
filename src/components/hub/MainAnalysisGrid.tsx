import { DataHubTile } from "./DataHubTile";
import { TileData } from "@/lib/data-hub-orchestrator";
import { EnhancedMarketSizeTile } from "@/components/market/EnhancedMarketSizeTile";
import { EnhancedCompetitionTile } from "@/components/competition/EnhancedCompetitionTile";
import { useSession } from "@/contexts/SimpleSessionContext";
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
  
  // Create extended mock data with additional properties for display
  const mockSentimentData: any = {
    metrics: {
      positive: 82,
      neutral: 15,
      negative: 3,
      engagement: 4200
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
      adoption: 67
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
      queries: 2300000
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
      mentions: 1200
    },
    primaryInsight: "42 major announcements in the past month, dominated by funding news",
    explanation: "Media coverage is overwhelmingly positive with focus on innovation, funding rounds, and successful implementations.",
    confidence: 88,
    dataQuality: "high",
    keyMetrics: [
      { label: "Articles", value: "342", trend: "up" },
      { label: "Reach", value: "12.5M", trend: "up" },
      { label: "Sentiment", value: "Positive", trend: null },
      { label: "Mentions", value: "1.2K/day", trend: "up" }
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
          console.log('MainAnalysisGrid tile:', tile.id, { title: tile.title, icon: tile.icon, data: tile.data });
          
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
          
          return (
            <div key={tile.id} className={tile.span}>
              <DataHubTile
                title={tile.title}
                Icon={tile.icon}
                data={tile.data}
                loading={loading}
                expanded={viewMode === "deep"}
                tileType={tile.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}