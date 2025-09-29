import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { 
  RefreshCw, ChevronDown, ChevronUp, AlertCircle, Clock, 
  ExternalLink, Download, Database, Loader2, HelpCircle,
  TrendingUp, TrendingDown, Minus, Calendar, Newspaper,
  BarChart3, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TileInsightsDialog } from './TileInsightsDialog';

interface DataTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  className?: string;
  description?: string;
}

interface TileData {
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: number | string;
    unit?: string;
    explanation?: string;
    method?: string;
    confidence?: number;
  }>;
  series?: Array<{
    name: string;
    points: Array<[string, number]>;
  }>;
  items?: Array<{
    title: string;
    snippet: string;
    url?: string;
    source?: string;
    published?: string;
    evidence?: string[];
  }>;
  competitors?: Array<{
    name: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  projections?: {
    revenue?: number[];
    users?: number[];
    timeline?: string[];
  };
  insights?: string[];
  assumptions?: string[];
  notes?: string;
  citations?: Array<{
    url: string;
    label: string;
    published?: string;
  }>;
  top_outlets?: string[];
  themes?: string[];
  cleanedArticles?: Array<{
    url: string;
    title: string;
    summary: string;
  }>;
  cost_estimate?: {
    serp_calls: number;
    firecrawl_urls: number;
    total_api_cost: string;
  };
  fromCache?: boolean;
  stale?: boolean;
}

export function DataTile({ 
  title, 
  icon: Icon, 
  tileType, 
  filters,
  className,
  description 
}: DataTileProps) {
  const [data, setData] = useState<TileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use 15 minute interval for news analysis, 30 seconds for others
  const refreshInterval = tileType === 'news_analysis' ? 15 * 60 : 30;
  const refreshIntervalMs = refreshInterval * 1000;

  const fetchTileData = async (tileType: string, filters: any): Promise<TileData> => {
    try {
      // Get current idea from multiple sources
      const currentIdea = filters?.idea_keywords?.join(' ') || 
        (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
      
      if (!currentIdea) {
        throw new Error('No idea configured');
      }
      
      // Special handling for news_analysis - call dedicated edge function directly
      if (tileType === 'news_analysis') {
        const { data: newsData, error: newsError } = await supabase.functions.invoke('news-analysis', {
          body: { 
            idea: currentIdea,
            industry: filters?.industry || '',
            geo: filters?.geography || 'global',
            time_window: filters?.time_window || 'last_90_days'
          }
        });
        
        if (newsError) throw newsError;
        return newsData as TileData;
      }
      
      // Primary path: consolidated AI search for other tile types
      const { data: response, error: fetchError } = await supabase.functions.invoke('web-search-ai', {
        body: { tileType, filters, query: currentIdea }
      });
      
      if (fetchError) {
        console.warn(`web-search-ai failed for ${tileType}, trying fallback:`, fetchError);
        throw fetchError;
      }
      
      // Check for error in response
      if (response?.error) {
        throw new Error(response.message || response.error);
      }
      
      return response as TileData;
    } catch (primaryError) {
      // Fallback to specific edge functions
      console.warn(`Primary fetch failed for ${tileType}, trying fallback:`, primaryError);
      
      const fallbackFunctions: Record<string, string> = {
        market_trends: 'market-trends',
        google_trends: 'google-trends',
        web_search: 'web-search',
        news_analysis: 'news-analysis',
        reddit_sentiment: 'reddit-search',
        youtube_analytics: 'youtube-search',
        twitter_buzz: 'twitter-search',
        amazon_reviews: 'amazon-public',
        competitor_analysis: 'competitor-analysis',
        target_audience: 'dashboard-insights',
        pricing_strategy: 'dashboard-insights',
        market_size: 'dashboard-insights',
        growth_projections: 'dashboard-insights',
        user_engagement: 'dashboard-insights',
        launch_timeline: 'dashboard-insights'
      };
      
      const fallbackFunction = fallbackFunctions[tileType] || 'dashboard-insights';
      
      try {
        // Special handling for news-analysis edge function
        if (tileType === 'news_analysis') {
          const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('news-analysis', {
            body: { 
              idea: filters?.idea_keywords?.join(' ') || (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '') || 'startup',
              industry: filters?.industry,
              geo: filters?.geography || 'global',
              time_window: filters?.time_window || 'last_90_days'
            }
          });
          
          if (fallbackError) throw fallbackError;
          return fallbackData as TileData;
        }
        
        // Default handling for other tile types
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke(fallbackFunction, {
          body: { 
            query: filters?.idea_keywords?.join(' ') || 'startup', 
            filters,
            tileType 
          }
        });
        
        if (fallbackError) throw fallbackError;
        
        // Transform fallback data to match TileData structure
        return transformFallbackData(tileType, fallbackData);
      } catch (fallbackErr) {
        console.error(`All fetch attempts failed for ${tileType}:`, fallbackErr);
        // Return minimal data structure
        return generateMinimalData(tileType);
      }
    }
  };

  const transformFallbackData = (type: string, data: any): TileData => {
    const now = new Date().toISOString();
    return {
      updatedAt: data?.updatedAt || now,
      filters,
      metrics: data?.metrics || [
        { name: 'Status', value: 'Limited Data', unit: '', explanation: 'Fallback mode active' }
      ],
      items: data?.items || [],
      competitors: data?.competitors || [],
      projections: data?.projections || {},
      insights: data?.insights || ['Data temporarily limited'],
      assumptions: data?.assumptions || [],
      notes: data?.notes || 'Using fallback data source',
      citations: data?.citations || [],
      fromCache: true,
      stale: false
    };
  };

  const generateMinimalData = (type: string): TileData => {
    const now = new Date().toISOString();
    return {
      updatedAt: now,
      filters,
      metrics: [
        { name: 'Data Status', value: 'Pending', unit: '', explanation: 'Click refresh to load' }
      ],
      items: [],
      insights: ['Data will be available after refresh'],
      assumptions: [],
      notes: 'Initial load required',
      citations: [],
      fromCache: false,
      stale: true
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tileData = await fetchTileData(tileType, filters);
      setData(tileData);
      setLastRefresh(new Date());
      setHasLoadedOnce(true);
      setRefreshCountdown(refreshInterval);
    } catch (err) {
      console.error(`Error fetching data for ${tileType}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [tileType, filters]);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh && hasLoadedOnce) {
      // Set up countdown
      countdownRef.current = setInterval(() => {
        setRefreshCountdown(prev => {
          if (prev <= 1) {
            fetchData();
            return refreshInterval;
          }
          return prev - 1;
        });
      }, 1000);

      // Set up actual refresh interval
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refreshIntervalMs);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    } else {
      // Clear intervals when auto-refresh is disabled
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setRefreshCountdown(refreshInterval);
    }
  }, [autoRefresh, fetchData, hasLoadedOnce, refreshInterval, refreshIntervalMs]);

  const renderMetrics = () => {
    if (!data?.metrics || data.metrics.length === 0) return null;
    
    return (
      <div className="grid grid-cols-2 gap-3">
        {data.metrics.slice(0, expanded ? undefined : 2).map((metric, idx) => (
          <div key={idx} className="bg-muted/10 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{metric.name}</p>
            <p className="text-xl font-bold mt-1">
              {metric.value}
              {metric.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{metric.unit}</span>}
            </p>
            {metric.explanation && expanded && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{metric.explanation}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderItems = () => {
    if (!data?.items || data.items.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest Updates</h4>
        {data.items.slice(0, expanded ? undefined : 2).map((item, idx) => {
          const ItemWrapper = item.url ? 'a' : 'div';
          const itemProps = item.url ? {
            href: item.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: "block p-3 bg-muted/10 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
          } : {
            className: "p-3 bg-muted/10 rounded-lg border border-border/50"
          };
          
          return (
            <ItemWrapper key={idx} {...itemProps}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
                  {item.snippet && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{item.snippet}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {item.source && (
                      <p className="text-xs text-muted-foreground/70 font-medium">Source: {item.source}</p>
                    )}
                    {item.published && tileType === 'news_analysis' && (
                      <>
                        <span className="text-xs text-muted-foreground/50">•</span>
                        <div className="flex items-center gap-0.5 text-xs text-muted-foreground/70">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(item.published).toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {item.url && (
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary flex-shrink-0 mt-1" />
                )}
              </div>
            </ItemWrapper>
          );
        })}
      </div>
    );
  };

  const renderInsights = () => {
    if (!data?.insights || data.insights.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Insights</h4>
        <ul className="space-y-2">
          {data.insights.slice(0, expanded ? undefined : 2).map((insight, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5 flex-shrink-0">•</span>
              <span className="text-muted-foreground leading-relaxed">{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Helper function to get direction icon and style
  const getDirectionStyle = (value: string) => {
    switch (value) {
      case 'up':
        return { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'down':
        return { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' };
      default:
        return { icon: Minus, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    }
  };

  // Helper function to get momentum level
  const getMomentumLevel = (zScore: number): { label: string; color: string; bg: string } => {
    if (zScore >= 1.0) return { label: 'High', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (zScore >= 0.5) return { label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Low', color: 'text-blue-500', bg: 'bg-blue-500/10' };
  };

  // Render news-specific badges
  const renderNewsBadges = () => {
    if (tileType !== 'news_analysis' || !data?.metrics) return null;
    
    const momentumMetric = data.metrics.find(m => m.name === 'momentum_z');
    const directionMetric = data.metrics.find(m => m.name === 'direction');
    const sentimentMetric = data.metrics.find(m => m.name === 'sentiment_pos');
    
    if (!momentumMetric && !directionMetric && !sentimentMetric) return null;
    
    return (
      <div className="flex gap-1.5 flex-wrap mb-3">
        {directionMetric && (() => {
          const style = getDirectionStyle(String(directionMetric.value));
          return (
            <Badge className={cn("gap-0.5 text-xs", style.bg, style.color)} variant="secondary">
              <style.icon className="h-3 w-3" />
              {String(directionMetric.value).toUpperCase()}
            </Badge>
          );
        })()}
        {momentumMetric && (() => {
          const momentum = getMomentumLevel(Number(momentumMetric.value));
          return (
            <Badge className={cn("text-xs", momentum.bg, momentum.color)} variant="secondary">
              Momentum: {momentum.label}
            </Badge>
          );
        })()}
        {sentimentMetric && (
          <Badge variant="outline" className="text-xs">
            {Number(sentimentMetric.value).toFixed(0)}% Positive
          </Badge>
        )}
      </div>
    );
  };

  // Render themes for news analysis
  const renderThemes = () => {
    if (tileType !== 'news_analysis' || !data?.themes || data.themes.length === 0) return null;
    
    return (
      <div className="space-y-1.5 mb-3">
        <p className="text-xs font-medium text-muted-foreground">Key Themes</p>
        <div className="flex flex-wrap gap-1">
          {data.themes.slice(0, expanded ? undefined : 4).map((theme, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {theme}
            </Badge>
          ))}
          {!expanded && data.themes.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{data.themes.length - 4} more
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // Render top outlets for news analysis
  const renderTopOutlets = () => {
    if (tileType !== 'news_analysis' || !data?.top_outlets || data.top_outlets.length === 0) return null;
    
    return (
      <div className="p-2 bg-muted/30 rounded-lg mb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Top Sources</span>
          <div className="flex -space-x-1.5">
            {data.top_outlets.slice(0, 3).map((outlet, idx) => (
              <div 
                key={idx}
                className="h-6 w-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                title={outlet}
              >
                <span className="text-[10px] font-semibold">
                  {outlet.slice(0, 2).toUpperCase()}
                </span>
              </div>
            ))}
            {data.top_outlets.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-[10px]">+{data.top_outlets.length - 3}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTileContent = () => {
    const content = [];
    
    // News-specific badges at the top
    if (tileType === 'news_analysis') {
      const badges = renderNewsBadges();
      if (badges) content.push(<div key="news-badges">{badges}</div>);
      
      const themes = renderThemes();
      if (themes) content.push(<div key="themes">{themes}</div>);
      
      const outlets = renderTopOutlets();
      if (outlets) content.push(<div key="outlets">{outlets}</div>);
    }
    
    // Regular metrics for non-news tiles
    if (tileType !== 'news_analysis' && data?.metrics && data.metrics.length > 0) {
      content.push(<div key="metrics">{renderMetrics()}</div>);
    }
    
    if (data?.items && data.items.length > 0) {
      content.push(<div key="items">{renderItems()}</div>);
    }
    
    if (data?.insights && data.insights.length > 0) {
      content.push(<div key="insights">{renderInsights()}</div>);
    }
    
    if (content.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No data available</p>
      );
    }
    
    return <div className="space-y-4">{content}</div>;
  };

  return (
    <>
      <Card 
        className={cn("h-full flex flex-col hover:shadow-2xl transition-all duration-300 border-border/30 shadow-lg bg-gradient-to-br from-card via-card to-background/50 animate-fade-in group", className)}
      >
        <CardHeader className="pb-4 px-5 pt-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-3 bg-gradient-to-br from-primary/25 to-primary/10 rounded-xl animate-scale-in group-hover:from-primary/30 group-hover:to-primary/15 transition-all duration-300 flex-shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <CardTitle className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent truncate">{title}</CardTitle>
                {description && (
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {lastRefresh && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                      <Clock className="h-3 w-3" />
                      <span className="hidden lg:inline">{lastRefresh.toLocaleTimeString()}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </TooltipContent>
                </Tooltip>
              )}
              {hasLoadedOnce && (
                <div className="flex items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInsights(true);
                        }}
                        className="h-7 w-7 hover-scale"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>How this helps</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchData();
                        }}
                        disabled={loading}
                        className="h-7 w-7 hover-scale"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetails(true);
                        }}
                        className="h-7 w-7 hover-scale"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Details</TooltipContent>
                  </Tooltip>
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!expanded);
                    }}
                    className="h-7 w-7 hover-scale"
                  >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{expanded ? 'Collapse' : 'Expand'}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 px-5 pb-5 pt-0 overflow-hidden">
          {!hasLoadedOnce && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
                <div className="p-6 rounded-full bg-gradient-to-br from-muted/40 to-muted/20 relative">
                  <Database className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <p className="text-base font-semibold">No data loaded</p>
                <p className="text-sm text-muted-foreground">Click to load {title.toLowerCase()} data</p>
                <Button onClick={fetchData} size="lg" disabled={loading} className="hover-scale bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Load Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-4 py-8 animate-fade-in">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-12 w-3/4 rounded-xl" />
            </div>
          ) : error || (data as any)?.error ? (
            <div className="py-4">
              <Alert variant="destructive" className="border-destructive/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {error || (data as any)?.error || 'Failed to load data'}
                  {(data as any)?.message && (
                    <span className="block mt-1 text-xs opacity-75">
                      {(data as any).message}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {renderTileContent()}
              {expanded && hasLoadedOnce && (
                <div className="pt-4 mt-4 border-t border-border/50 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                    <Label htmlFor={`auto-refresh-${tileType}`} className="text-sm font-medium cursor-pointer">
                      Auto-refresh every {tileType === 'news_analysis' ? '15m' : '30s'}
                    </Label>
                    <Switch
                      id={`auto-refresh-${tileType}`}
                      checked={autoRefresh}
                      onCheckedChange={setAutoRefresh}
                    />
                  </div>
                  {autoRefresh && (
                    <div className="px-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Next refresh in {tileType === 'news_analysis' 
                            ? `${Math.floor(refreshCountdown / 60)}m ${refreshCountdown % 60}s` 
                            : `${refreshCountdown}s`}
                        </span>
                        <Progress value={(refreshInterval - refreshCountdown) * (100 / refreshInterval)} className="w-24 h-1.5" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {data.fromCache && (
                      <Badge variant="secondary" className="text-xs">
                        Cached Data
                      </Badge>
                    )}
                    {data.stale && (
                      <Badge variant="outline" className="text-xs">
                        May be outdated
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>

      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title} Details
            </SheetTitle>
            <SheetDescription>
              Complete data and insights for {title.toLowerCase()}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {data && (
              <>
                <div>
                  <h3 className="font-semibold mb-3">Metrics</h3>
                  <div className="space-y-3">
                    {data.metrics?.map((metric, idx) => (
                      <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{metric.name}</p>
                            <p className="text-lg font-semibold mt-1">
                              {metric.value}
                              {metric.unit && <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>}
                            </p>
                            {metric.explanation && (
                              <p className="text-sm text-muted-foreground mt-2">{metric.explanation}</p>
                            )}
                          </div>
                          {metric.confidence !== undefined && (
                            <Badge variant={metric.confidence > 0.7 ? 'default' : metric.confidence > 0.4 ? 'secondary' : 'outline'}>
                              {Math.round(metric.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {data.items && data.items.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Related Items</h3>
                    <div className="space-y-3">
                      {data.items.map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url || '#'}
                          target={item.url ? "_blank" : undefined}
                          rel={item.url ? "noopener noreferrer" : undefined}
                          className={`block p-4 bg-muted/10 rounded-lg border border-border/50 transition-all duration-200 ${
                            item.url ? 'hover:border-primary/50 hover:bg-muted/20 cursor-pointer group' : 'cursor-default'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className={`font-medium ${item.url ? 'group-hover:text-primary transition-colors' : ''}`}>
                                {item.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">{item.snippet}</p>
                              {item.source && (
                                <p className="text-xs text-muted-foreground/70 mt-3">Source: {item.source}</p>
                              )}
                              {item.published && (
                                <p className="text-xs text-muted-foreground/70 mt-1">Published: {item.published}</p>
                              )}
                            </div>
                            {item.url && (
                              <ExternalLink className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {data.insights && data.insights.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Insights</h3>
                    <ul className="space-y-2">
                      {data.insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {data.assumptions && data.assumptions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Assumptions</h3>
                    <ul className="space-y-2">
                      {data.assumptions.map((assumption, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {assumption}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!data) return;
                      const csvContent = [
                        ['Metric', 'Value', 'Unit', 'Confidence'],
                        ...(data.metrics?.map(m => [m.name, m.value, m.unit || '', m.confidence || '']) || [])
                      ].map(row => row.join(',')).join('\n');
                      
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${tileType}-${new Date().toISOString()}.csv`;
                      a.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Insights Dialog */}
      <TileInsightsDialog 
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}