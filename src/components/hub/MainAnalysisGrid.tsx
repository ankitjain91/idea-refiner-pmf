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
      data: tiles.sentiment,
      span: "col-span-full"
    },
    { 
      id: "market_trends", 
      title: "Market Trends", 
      icon: TrendingUp,
      data: tiles.market_trends,
      span: "col-span-full"
    },
    { 
      id: "google_trends", 
      title: "Google Trends", 
      icon: Search,
      data: tiles.google_trends,
      span: "col-span-full"
    },
    { 
      id: "news_analysis", 
      title: "News Analysis", 
      icon: Newspaper,
      data: tiles.news_analysis,
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