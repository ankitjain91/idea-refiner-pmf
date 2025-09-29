import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTileData } from './BaseTile';
import { TileInsightsDialog } from './TileInsightsDialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { ExpandableTile } from '@/components/dashboard/ExpandableTile';
import { metricExplanations } from '@/lib/metric-explanations';

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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
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

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { idea: currentIdea }
    });

    if (error) throw error;
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

  // Process data for expandable tile
  const processDataForExpandable = () => {
    if (!data) return { metrics: {}, chartData: [], sources: [], insights: [] };

    const metrics: Record<string, any> = {};
    const chartData: any[] = [];
    const sources: any[] = [];
    const insights: string[] = [];

    try {
      switch (tileType) {
        case 'pmf_score':
          metrics.score = data.score || 0;
          metrics.confidence = data.confidence || 0;
          if (data.factors) {
            Object.entries(data.factors).forEach(([key, value]: [string, any]) => {
              metrics[key] = value.score || value;
            });
          }
          insights.push(
            `Your idea scores ${data.score || 0}% on product-market fit`,
            'This score combines market demand, competition, and feasibility',
            data.score >= 70 ? 'Strong potential for success' : 'Areas for improvement identified'
          );
          break;

        case 'market_size':
          metrics.tam = data.tam || data.market_size?.tam || 0;
          metrics.sam = data.sam || data.market_size?.sam || 0;
          metrics.som = metrics.sam * 0.1;
          insights.push(
            `Total addressable market of $${(metrics.tam / 1e6).toFixed(1)}M`,
            `Serviceable market opportunity of $${(metrics.sam / 1e6).toFixed(1)}M`,
            'Market size indicates significant opportunity for growth'
          );
          break;

        case 'competition':
          metrics.competition_level = data.competition_level || data.level;
          metrics.competitor_count = data.competitors?.length || 0;
          if (data.competitors) {
            chartData.push(...data.competitors.slice(0, 5).map((comp: any, i: number) => ({
              name: comp.name || comp,
              value: 100 - (i * 15),
              strength: comp.strength
            })));
          }
          insights.push(
            `Competition level is ${data.level || 'unknown'}`,
            `${data.competitors?.length || 0} main competitors identified`,
            data.level === 'Low' ? 'Good opportunity for market entry' : 'Differentiation strategy needed'
          );
          break;

        case 'sentiment':
          metrics.overall_sentiment = data.overall_sentiment || data.sentiment;
          metrics.positive_percentage = data.positive_percentage || data.positive || 0;
          if (data.sentiment_breakdown) {
            chartData.push(
              { name: 'Positive', value: data.sentiment_breakdown.positive || 0, color: '#22c55e' },
              { name: 'Neutral', value: data.sentiment_breakdown.neutral || 0, color: '#eab308' },
              { name: 'Negative', value: data.sentiment_breakdown.negative || 0, color: '#ef4444' }
            );
          }
          insights.push(
            `Overall sentiment is ${data.overall_sentiment || 'neutral'}`,
            `${data.positive_percentage || 0}% of mentions are positive`,
            'Sentiment analysis helps gauge market reception'
          );
          break;
      }
    } catch (error) {
      console.error('Error processing data for expandable tile:', error);
      insights.push('Data processing encountered an issue. Please try refreshing.');
    }

    return { metrics, chartData, sources, insights };
  };

  const { metrics, chartData, sources, insights } = processDataForExpandable();

  // Get metric explanations
  const availableExplanations: Record<string, any> = {};
  if (metrics && typeof metrics === 'object') {
    Object.keys(metrics).forEach(key => {
      if (metricExplanations[key]) {
        availableExplanations[key] = metricExplanations[key];
      }
    });
  }

  const getDataSourceBadge = () => {
    if (!data) return null;
    
    let source = 'API';
    let variant: 'default' | 'secondary' | 'outline' = 'default';
    
    if (data?.fromDatabase) {
      source = 'DB';
      variant = 'default';
    } else if (data?.fromCache) {
      source = 'Cache';
      variant = 'secondary';
    }
    
    return { label: source, variant };
  };

  const Icon = icon;

  return (
    <>
      <ExpandableTile
        title={title}
        icon={<Icon className="h-5 w-5" />}
        loading={isLoading}
        error={error ? String(error) : undefined}
        data={data}
        chartData={chartData}
        sources={sources}
        metrics={metrics}
        metricExplanations={availableExplanations}
        insights={insights}
        rawData={data}
        chartType={tileType === 'sentiment' ? 'pie' : 'bar'}
        className="h-full"
        quickInfo={`Quick overview of ${title.toLowerCase()}. Click to explore detailed metrics and insights.`}
        badge={getDataSourceBadge()}
        onExpand={() => {
          console.log(`Expanding ${tileType} quick stat with data:`, data);
          if (!hasLoadedOnce && loadData) {
            loadData();
          }
        }}
      >
        {renderTileContent()}
      </ExpandableTile>

      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}