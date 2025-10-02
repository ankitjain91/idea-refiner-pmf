import { useState, useCallback } from "react";
import { DataHubTile } from "./DataHubTile";
import { TileData } from "@/lib/data-hub-orchestrator";
import { EnhancedMarketSizeTile } from "@/components/market/EnhancedMarketSizeTile";
import { OptimizedCompetitionTile } from "@/components/competition/OptimizedCompetitionTile";
import { useSession } from "@/contexts/SimpleSessionContext";
import { cn } from "@/lib/utils";
import { dashboardDataService } from '@/services/dashboardDataService';
import { toast } from 'sonner';
import { sanitizeTileData } from '@/utils/dataFormatting';
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
  onRefreshTile?: (tileType: string) => void | Promise<void>;
}

export function MainAnalysisGrid({ tiles, loading = false, viewMode, onRefreshTile }: MainAnalysisGridProps) {
  const { currentSession } = useSession();
  const currentIdea = localStorage.getItem('dashboardIdea') || 
                     currentSession?.data?.currentIdea || 
                     localStorage.getItem('currentIdea') || 
                     localStorage.getItem('userIdea') || '';
  
  // State to manage tile data loading
  const [tileData, setTileData] = useState<Record<string, TileData | null>>({});
  const [tileLoading, setTileLoading] = useState<Record<string, boolean>>({});
  
  // Lazy load data for each tile type
  const loadTileData = useCallback((tileId: string) => {
    // Skip if already loading or already has data
    if (tileLoading[tileId] || tileData[tileId]) return;
    
    setTileLoading(prev => ({ ...prev, [tileId]: true }));
    
    // Simulate API call with mock data
    setTimeout(() => {
      let mockData: TileData | null = null;
      
      switch(tileId) {
        case 'sentiment':
          mockData = {
            metrics: {
              positive: 65,
              neutral: 25,
              negative: 10,
              total_mentions: 4200,
              trend: 'improving',
              engagement_rate: 85,
              sentiment_summary: '65% positive / 10% negative'
            },
            explanation: "Users express strong enthusiasm for AI-powered productivity solutions, with particular interest in workflow automation and time-saving features. The sentiment has improved 23% over the past month.",
            confidence: 85,
            dataQuality: "high" as const,
            citations: [
              { url: "reddit.com", title: "Reddit Discussion", source: "Reddit", relevance: 0.95 },
              { url: "twitter.com", title: "Twitter Analysis", source: "Twitter", relevance: 0.92 }
            ],
            charts: [],
            json: {
              positive: 65,
              neutral: 25,
              negative: 10,
              mentions: 4200,
              trend: 'improving'
            }
          };
          break;
          
        case 'market_trends':
          mockData = {
            metrics: {
              growthRate: 28,
              marketCap: 4500000000,
              yearOverYear: 45,
              adoption: 67,
              velocity: 85,  // Changed to number to fix console warning
              maturity: 65,   // Changed to number
              trendScore: 82  // Added trend score
            },
            explanation: "AI productivity tools are experiencing rapid growth driven by remote work trends and digital transformation initiatives.",
            confidence: 90,
            dataQuality: "high" as const,
            citations: [
              { url: "gartner.com", title: "Gartner Report", source: "Gartner", relevance: 0.98 },
              { url: "forrester.com", title: "Forrester Trends", source: "Forrester", relevance: 0.96 }
            ],
            charts: [],
            json: {}
          };
          break;
          
        case 'google_trends':
          mockData = {
            metrics: {
              interest: 87,
              growth: 150,
              queries: 2300000,
              peakInterest: 92,
              avgInterest: 78,
              breakoutTerms: 5
            },
            explanation: "Significant spike in searches for 'AI productivity tools' and related terms, indicating growing consumer awareness and demand.",
            confidence: 95,
            dataQuality: "high" as const,
            citations: [
              { url: "trends.google.com", title: "Google Trends", source: "Google", relevance: 1.0 }
            ],
            charts: [],
            json: {}
          };
          break;
          
        case 'news_analysis':
          mockData = {
            metrics: {
              articles: 342,
              reach: 12500000,
              mentions: 1200,
              sentiment: 78,
              virality: 4.2,
              shareOfVoice: 34
            },
            explanation: "Media coverage is overwhelmingly positive with focus on innovation, funding rounds, and successful implementations.",
            confidence: 88,
            dataQuality: "high" as const,
            citations: [
              { url: "techcrunch.com", title: "TechCrunch", source: "TechCrunch", relevance: 0.94 },
              { url: "forbes.com", title: "Forbes", source: "Forbes", relevance: 0.91 }
            ],
            charts: [],
            json: {}
          };
          break;
      }
      
      setTileData(prev => ({ ...prev, [tileId]: mockData }));
      setTileLoading(prev => ({ ...prev, [tileId]: false }));
    }, 1500 + Math.random() * 1000); // Random delay for realistic loading
  }, [tileLoading, tileData]);
  
  const mainTiles = [
    { 
      id: "market_size", 
      title: "Market Size", 
      icon: DollarSign,
      data: tiles.market_size || tileData.market_size || null,
      span: "col-span-full",
      isUsingFallback: tiles.market_size?.confidence < 0.5 || (!tiles.market_size && tileData.market_size?.confidence < 0.5)
    },
    { 
      id: "competition", 
      title: "Competition", 
      icon: Building2,
      data: tiles.competition || tileData.competition || null,
      span: "col-span-full",
      isUsingFallback: tiles.competition?.confidence < 0.5 || (!tiles.competition && tileData.competition?.confidence < 0.5)
    },
    { 
      id: "sentiment", 
      title: "Sentiment", 
      icon: MessageSquare,
      data: tiles.sentiment || tileData.sentiment || null,
      span: "col-span-full",
      isUsingFallback: tiles.sentiment?.confidence < 0.5 || (!tiles.sentiment && tileData.sentiment?.confidence < 0.5)
    },
    { 
      id: "market_trends", 
      title: "Market Trends", 
      icon: TrendingUp,
      data: tiles.market_trends || tileData.market_trends || null,
      span: "col-span-full",
      isUsingFallback: tiles.market_trends?.confidence < 0.5 || (!tiles.market_trends && tileData.market_trends?.confidence < 0.5)
    },
    { 
      id: "google_trends", 
      title: "Google Trends", 
      icon: Search,
      data: tiles.google_trends || tileData.google_trends || null,
      span: "col-span-full",
      isUsingFallback: tiles.google_trends?.confidence < 0.5 || (!tiles.google_trends && tileData.google_trends?.confidence < 0.5)
    },
    { 
      id: "news_analysis", 
      title: "News Analysis", 
      icon: Newspaper,
      data: tiles.news_analysis || tileData.news_analysis || null,
      span: "col-span-full",
      isUsingFallback: tiles.news_analysis?.confidence < 0.5 || (!tiles.news_analysis && tileData.news_analysis?.confidence < 0.5)
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
                <EnhancedMarketSizeTile 
                  idea={currentIdea} 
                  initialData={sanitizeTileData(tiles.market_size) || null}
                  onRefresh={async () => {
                    if (onRefreshTile) {
                      toast.info('Refreshing market size data...');
                      await onRefreshTile('market_size');
                    }
                  }}
                />
              </div>
            );
          }
          
          if (tile.id === "competition") {
            return (
              <div key={tile.id} className={tile.span}>
                <OptimizedCompetitionTile 
                  idea={currentIdea} 
                  initialData={sanitizeTileData(tiles.competition) || null}
                  onRefresh={async () => {
                    if (onRefreshTile) {
                      toast.info('Refreshing competition data...');
                      await onRefreshTile('competition');
                    }
                  }}
                />
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
                data={sanitizeTileData(tile.data)}
                loading={tileLoading[tile.id] || loading}
                onRefresh={async () => {
                  if (onRefreshTile && tiles[tile.id as keyof typeof tiles]) {
                    toast.info(`Refreshing ${tile.title} data...`);
                    await onRefreshTile(tile.id);
                  } else {
                    loadTileData(tile.id);
                  }
                }}
                expanded={viewMode === "deep"}
                tileType={tile.id}
                isUsingFallback={(tile as any).isUsingFallback}
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