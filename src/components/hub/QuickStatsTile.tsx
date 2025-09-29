import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BaseTile, useTileData } from './BaseTile';
import { TileInsightsDialog } from './TileInsightsDialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface QuickStatsTileProps {
  title: string;
  icon: any;
  tileType: 'pmf_score' | 'market_size' | 'competition' | 'sentiment';
  currentIdea: string;
  onAnalyze?: () => void;
}

export function QuickStatsTile({
  title,
  icon,
  tileType,
  currentIdea,
  onAnalyze
}: QuickStatsTileProps) {
  const [showInsights, setShowInsights] = useState(false);
  const cacheKey = `quick_stats_${tileType}_${currentIdea}`;

  const fetchTileData = async () => {
    if (!currentIdea) return null;

    // Check cache first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        const cacheAge = Date.now() - parsedCache.timestamp;
        if (cacheAge < 10 * 60 * 1000) { // 10 minutes
          return parsedCache.data;
        }
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }

    // Map tile types to their respective functions
    const functionMap = {
      'pmf_score': 'smoothbrains-score',
      'market_size': 'market-size',
      'competition': 'competition',
      'sentiment': 'sentiment'
    };

    const functionName = functionMap[tileType];
    if (!functionName) throw new Error(`Unknown tile type: ${tileType}`);

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { idea: currentIdea }
    });

    if (error) throw error;

    // Cache the result
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));

    // Store values for other tiles if needed
    if (tileType === 'market_size' && data?.tam) {
      localStorage.setItem('market_size_value', JSON.stringify({
        tam: data.tam,
        sam: data.sam,
        som: data.som
      }));
    }

    return data;
  };

  const { data, isLoading, error, loadData } = useTileData(fetchTileData, [currentIdea, tileType]);

  const renderTileContent = () => {
    if (!data) return null;

    switch (tileType) {
      case 'pmf_score':
        const score = data.score || 0;
        const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600';
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-3xl font-bold", scoreColor)}>
                  {score}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {score >= 70 ? 'Strong PMF' : score >= 40 ? 'Moderate PMF' : 'Needs Work'}
                </p>
              </div>
              <Badge variant={score >= 70 ? 'default' : score >= 40 ? 'secondary' : 'destructive'}>
                {score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low'}
              </Badge>
            </div>
            {data.factors && (
              <div className="space-y-2">
                {Object.entries(data.factors).slice(0, 3).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{value.score || value}%</span>
                  </div>
                ))}
              </div>
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
            <div>
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
                {data.competitors.slice(0, 3).map((comp: any, idx: number) => (
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
            <div className="flex items-center justify-between">
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
          </div>
        );

      default:
        return null;
    }
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
      >
        {renderTileContent()}
      </BaseTile>

      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}