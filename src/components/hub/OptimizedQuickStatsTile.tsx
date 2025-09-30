import { useState } from 'react';
import { BaseTile } from './BaseTile';
import { TileInsightsDialog } from './TileInsightsDialog';
import { SmoothBrainsDialog } from './SmoothBrainsDialog';
import { MarketSizeDialog } from './MarketSizeDialog';
import { UserSentimentDialog } from './UserSentimentDialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Brain, Globe, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OptimizedQuickStatsTileProps {
  title: string;
  icon: any;
  tileType: 'pmf_score' | 'market_size' | 'competition' | 'sentiment';
  data: any;  // Data from batched fetch
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export function OptimizedQuickStatsTile({
  title,
  icon,
  tileType,
  data,
  isLoading = false,
  error,
  onRefresh
}: OptimizedQuickStatsTileProps) {
  const [showInsights, setShowInsights] = useState(false);
  const [showSmoothBrainsDialog, setShowSmoothBrainsDialog] = useState(false);
  const [showMarketSizeDialog, setShowMarketSizeDialog] = useState(false);
  const [showUserSentimentDialog, setShowUserSentimentDialog] = useState(false);

  const renderTileContent = () => {
    if (!data) return null;

    switch (tileType) {
      case 'pmf_score':
        const score = data.score || 0;
        const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600';
        return (
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowSmoothBrainsDialog(true)}
            >
              <div>
                <p className={cn("text-3xl font-bold", scoreColor)}>
                  {score}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.tier || (score >= 70 ? 'Strong PMF' : score >= 40 ? 'Moderate PMF' : 'Needs Work')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={score >= 70 ? 'default' : score >= 40 ? 'secondary' : 'destructive'}>
                  {score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low'}
                </Badge>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </div>
            </div>
            {data.factors && (
              <div className="space-y-2">
                {Object.entries(data.factors).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">
                      {typeof value === 'number' ? `${value}%` : value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'market_size':
        const tam = data.tam || 0;
        const sam = data.sam || 0;
        const som = data.som || 0;
        const formatMarketValue = (value: number) => {
          if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
          if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
          return `$${value}`;
        };

        return (
          <div className="space-y-4">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowMarketSizeDialog(true)}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">TAM</p>
                  <p className="text-2xl font-bold">{formatMarketValue(tam)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">SAM</p>
                    <p className="text-sm font-semibold">{formatMarketValue(sam)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SOM</p>
                    <p className="text-sm font-semibold">{formatMarketValue(som)}</p>
                  </div>
                </div>
                {data.cagr && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Growth</span>
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {data.cagr}%
                    </Badge>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs mt-3 w-full">
                <Globe className="h-3 w-3 mr-1" />
                View Analysis
              </Button>
            </div>
          </div>
        );

      case 'competition':
        const competitionLevel = data.level || 'Unknown';
        const competitors = data.competitors || [];
        const levelColor = competitionLevel === 'Low' ? 'text-green-600' : 
                          competitionLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600';
        
        return (
          <div className="space-y-4">
            <div>
              <p className={cn("text-2xl font-bold", levelColor)}>
                {competitionLevel}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {competitors.length} competitors identified
              </p>
            </div>
            {data.insights && data.insights.length > 0 && (
              <div className="space-y-2">
                {data.insights.slice(0, 2).map((insight: string, idx: number) => (
                  <p key={idx} className="text-xs text-muted-foreground">
                    • {insight}
                  </p>
                ))}
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs w-full"
              onClick={() => setShowInsights(true)}
            >
              View Details
            </Button>
          </div>
        );

      case 'sentiment':
        const sentimentScore = data.overall || data.sentiment || 0;
        const sentimentColor = sentimentScore >= 70 ? 'text-green-600' : 
                              sentimentScore >= 40 ? 'text-yellow-600' : 'text-red-600';
        
        return (
          <div className="space-y-4">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowUserSentimentDialog(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-2xl font-bold", sentimentColor)}>
                    {sentimentScore}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sentimentScore >= 70 ? 'Positive' : sentimentScore >= 40 ? 'Neutral' : 'Negative'}
                  </p>
                </div>
                <Heart className={cn("h-8 w-8", sentimentColor)} />
              </div>
              {data.distribution && (
                <div className="space-y-1 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Positive</span>
                    <span>{data.distribution.positive || 0}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-600">Neutral</span>
                    <span>{data.distribution.neutral || 0}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Negative</span>
                    <span>{data.distribution.negative || 0}%</span>
                  </div>
                </div>
              )}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs mt-3 w-full">
                <Heart className="h-3 w-3 mr-1" />
                View Analysis
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <BaseTile
      title={title}
      icon={icon}
      isLoading={isLoading}
      error={error}
      data={data}
      className="h-full"
    >
      {renderTileContent()}
    </BaseTile>
  );
}