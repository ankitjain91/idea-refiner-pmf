import { DataHubTile } from "./DataHubTile";
import { TileData } from "@/lib/data-hub-orchestrator";
import { 
  Search, MessageSquare, Twitter, ShoppingBag, 
  Youtube, AlertTriangle, TrendingUp
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
  const extendedTiles = [
    { 
      id: "web_search", 
      title: "Web Search", 
      icon: Search,
      data: tiles.web_search,
      span: "col-span-1 lg:col-span-2"
    },
    { 
      id: "reddit_sentiment", 
      title: "Reddit Sentiment", 
      icon: MessageSquare,
      data: tiles.reddit_sentiment,
      span: "col-span-1"
    },
    { 
      id: "twitter_buzz", 
      title: "Twitter/X Buzz", 
      icon: Twitter,
      data: tiles.twitter_buzz,
      span: "col-span-1"
    },
    { 
      id: "amazon_reviews", 
      title: "Amazon Reviews", 
      icon: ShoppingBag,
      data: tiles.amazon_reviews,
      span: "col-span-1"
    },
    { 
      id: "youtube_analytics", 
      title: "YouTube Analytics", 
      icon: Youtube,
      data: tiles.youtube_analytics,
      span: "col-span-1"
    },
    { 
      id: "risk_assessment", 
      title: "Risk Assessment", 
      icon: AlertTriangle,
      data: tiles.risk_assessment,
      span: "col-span-1 lg:col-span-2"
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
          <div key={tile.id} className={tile.span}>
            <DataHubTile
              title={tile.title}
              Icon={tile.icon}
              data={tile.data}
              loading={loading}
              tileType={tile.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}