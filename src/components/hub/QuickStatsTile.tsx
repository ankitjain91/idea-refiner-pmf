import { useState, useEffect } from 'react';
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { BaseTile, useTileData } from './BaseTile';
import { TileInsightsDialog } from './TileInsightsDialog';
import { SmoothBrainsDialog } from './SmoothBrainsDialog';
import { MarketSizeDialog } from './MarketSizeDialog';
import { UserSentimentDialog } from './UserSentimentDialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Brain, Globe, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { Button } from '@/components/ui/button';
import { useLockedIdea } from '@/hooks/useLockedIdea';

interface QuickStatsTileProps {
  title: string;
  icon: any;
  tileType: 'pmf_score' | 'market_size' | 'competition' | 'sentiment';
  onAnalyze?: () => void;
}

export function QuickStatsTile({
  title,
  icon,
  tileType,
  onAnalyze
}: QuickStatsTileProps) {
  // SINGLE SOURCE OF TRUTH: Use locked idea manager
  const { idea: currentIdea } = useLockedIdea();
  const [showInsights, setShowInsights] = useState(false);
  const [showSmoothBrainsDialog, setShowSmoothBrainsDialog] = useState(false);
  const [showMarketSizeDialog, setShowMarketSizeDialog] = useState(false);
  const [showUserSentimentDialog, setShowUserSentimentDialog] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();

  const fetchTileData = async () => {
    if (!currentIdea) return null;

    // Map tile types to their respective functions
    const functionMap = {
      'pmf_score': 'smoothbrains-score',
      'market_size': 'market-size',
      'competition': 'competition',
      'sentiment': 'sentiment'
    };

    const functionName = functionMap[tileType];
    if (!functionName) throw new Error(`Unknown tile type: ${tileType}`);

    const data = await optimizedQueue.invokeFunction(functionName, { 
      idea: currentIdea, detailed: tileType === 'pmf_score' 
    });

    
    return data;
  };

  const { data, isLoading, error, loadData } = useTileData(fetchTileData, [currentIdea, tileType], {
    tileType: `quick_stats_${tileType}`,
    useDatabase: true,
    cacheMinutes: 30
  });

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
                    <span className="font-medium">{value.score || value}%</span>
                  </div>
                ))}
              </div>
            )}
            {data.metadata?.methodology && (
              <p className="text-[10px] text-muted-foreground text-center border-t pt-2">
                VC-grade evaluation
              </p>
            )}
          </div>
        );

      case 'market_size':
        const tam = data.tam || data.market_size?.tam || 0;
        const sam = data.sam || data.market_size?.sam || 0;
        const formatValue = (val: number) => {
          if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
          if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
          return `$${(val / 1e3).toFixed(0)}K`;
        };
        
        return (
          <div className="space-y-3">
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowMarketSizeDialog(true)}
            >
              <p className="text-2xl font-bold">{formatValue(tam)}</p>
              <p className="text-xs text-muted-foreground">Total Market</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted/30 rounded">
                <p className="text-sm font-semibold">{formatValue(sam)}</p>
                <p className="text-xs text-muted-foreground">SAM</p>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <p className="text-sm font-semibold">{formatValue(sam * 0.1)}</p>
                <p className="text-xs text-muted-foreground">SOM</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-6 text-xs"
              onClick={() => setShowMarketSizeDialog(true)}
            >
              <Globe className="h-3 w-3 mr-1" />
              View Analysis
            </Button>
          </div>
        );

      case 'competition':
        const level = data.competition_level || data.level || 'Unknown';
        const competitorCount = data.competitors?.length || data.main_competitors?.length || 0;
        const levelColor = level === 'Low' ? 'text-green-600' : level === 'Medium' ? 'text-yellow-600' : 'text-red-600';
        
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-xl font-bold", levelColor)}>
                  {level}
                </p>
                <p className="text-xs text-muted-foreground">Competition Level</p>
              </div>
              <Badge variant={level === 'Low' ? 'default' : level === 'Medium' ? 'secondary' : 'destructive'}>
                {competitorCount} Competitors
              </Badge>
            </div>
            {data.competitors && data.competitors.length > 0 && (
              <div className="space-y-1">
                {data.competitors.slice(0, 5).map((comp: any, idx: number) => (
                  <div key={idx} className="text-xs flex justify-between">
                    <span className="text-muted-foreground truncate">{comp.name || comp}</span>
                    {comp.strength && (
                      <Badge variant="outline" className="text-xs ml-2">
                        {comp.strength}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'sentiment':
        const sentiment = data.overall_sentiment || data.sentiment || 'Neutral';
        const positive = data.positive_percentage || data.positive || 0;
        const sentimentColor = sentiment === 'Positive' ? 'text-green-600' : 
                              sentiment === 'Negative' ? 'text-red-600' : 'text-yellow-600';
        
        return (
          <div className="space-y-3">
            <div 
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowUserSentimentDialog(true)}
            >
              <div>
                <p className={cn("text-xl font-bold", sentimentColor)}>
                  {sentiment}
                </p>
                <p className="text-xs text-muted-foreground">Overall Sentiment</p>
              </div>
              <Badge variant={sentiment === 'Positive' ? 'default' : 
                            sentiment === 'Negative' ? 'destructive' : 'secondary'}>
                {positive}% Positive
              </Badge>
            </div>
            {data.sentiment_breakdown && (
              <div className="flex gap-2">
                <div className="flex-1 text-center p-2 bg-green-500/10 rounded">
                  <p className="text-xs font-semibold text-green-600">
                    {data.sentiment_breakdown.positive || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Positive</p>
                </div>
                <div className="flex-1 text-center p-2 bg-yellow-500/10 rounded">
                  <p className="text-xs font-semibold text-yellow-600">
                    {data.sentiment_breakdown.neutral || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Neutral</p>
                </div>
                <div className="flex-1 text-center p-2 bg-red-500/10 rounded">
                  <p className="text-xs font-semibold text-red-600">
                    {data.sentiment_breakdown.negative || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Negative</p>
                </div>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-6 text-xs"
              onClick={() => setShowUserSentimentDialog(true)}
            >
              <Heart className="h-3 w-3 mr-1" />
              View Details
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const getDataSourceBadge = () => {
    if (!data) return null;
    
    let source = 'API';
    let variant: 'default' | 'secondary' | 'outline' = 'default';
    
    // Debug logging
    console.log(`[${tileType}] Data source check:`, {
      fromDatabase: data.fromDatabase,
      fromCache: data.fromCache,
      dataKeys: Object.keys(data),
      user: user?.id,
      session: currentSession?.id
    });
    
    if (data?.fromDatabase) {
      source = 'DB';
      variant = 'default';
      console.log(`[${tileType}] Using DB source`);
    } else if (data?.fromCache) {
      source = 'Cache';
      variant = 'secondary';
      console.log(`[${tileType}] Using Cache source`);
    } else {
      console.log(`[${tileType}] Using API source - fromApi:`, data?.fromApi);
    }
    
    return (
      <Badge variant={variant} className="text-xs px-1.5 py-0.5 h-5">
        {source}
      </Badge>
    );
  };

  return (
    <>
      <BaseTile
        title={title}
        icon={icon}
        isLoading={isLoading}
        error={error}
        data={data}
        onLoad={loadData}
        autoLoad={true}
        className="h-full"
        headerActions={getDataSourceBadge()}
      >
        {renderTileContent()}
      </BaseTile>

      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
        tileData={data}
        ideaText={currentIdea}
      />

      {tileType === 'pmf_score' && (
        <SmoothBrainsDialog
          isOpen={showSmoothBrainsDialog}
          onClose={() => setShowSmoothBrainsDialog(false)}
          data={data?.data || data}
        />
      )}

      {tileType === 'market_size' && (
        <MarketSizeDialog
          isOpen={showMarketSizeDialog}
          onClose={() => setShowMarketSizeDialog(false)}
          data={data?.data || data}
        />
      )}

      {tileType === 'sentiment' && (
        <UserSentimentDialog
          isOpen={showUserSentimentDialog}
          onClose={() => setShowUserSentimentDialog(false)}
          data={data?.data || data}
        />
      )}
    </>
  );
}