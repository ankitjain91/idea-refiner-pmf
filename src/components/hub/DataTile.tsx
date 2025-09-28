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
  ExternalLink, Download, Database, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
    unit: string;
    explanation?: string;
    method?: string;
    confidence?: number;
  }>;
  items?: Array<{
    title: string;
    snippet: string;
    url?: string;
    source?: string;
    published?: string;
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
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTileData = async (tileType: string, filters: any): Promise<TileData> => {
    try {
      // Get current idea from multiple sources
      const currentIdea = filters?.idea_keywords?.join(' ') || 
        (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
      
      if (!currentIdea) {
        throw new Error('No idea configured');
      }
      
      // Primary path: consolidated AI search
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
        news_analysis: 'gdelt-news',
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
      setRefreshCountdown(30);
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
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

      // Set up actual refresh interval
      intervalRef.current = setInterval(() => {
        fetchData();
      }, 30000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    } else {
      // Clear intervals when auto-refresh is disabled
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setRefreshCountdown(30);
    }
  }, [autoRefresh, fetchData, hasLoadedOnce]);

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
                  {item.source && (
                    <p className="text-xs text-muted-foreground/70 mt-2 font-medium">Source: {item.source}</p>
                  )}
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

  const renderTileContent = () => {
    const content = [];
    
    if (data?.metrics && data.metrics.length > 0) {
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
      <Card className={cn("h-full flex flex-col hover:shadow-lg transition-all duration-200 border-border/50", className)}>
        <CardHeader className="pb-4 px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold leading-none">{title}</CardTitle>
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {lastRefresh && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="hidden sm:inline">{lastRefresh.toLocaleTimeString()}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </TooltipContent>
                </Tooltip>
              )}
              {hasLoadedOnce && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchData}
                        disabled={loading}
                        className="h-7 w-7"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh data</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDetails(true)}
                        className="h-7 w-7"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View details</TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpanded(!expanded)}
                    className="h-7 w-7"
                  >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{expanded ? 'Collapse' : 'Expand'}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 px-4 pb-4 pt-0">
          {!hasLoadedOnce && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-muted/20">
                <Database className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">No data loaded</p>
                <p className="text-xs text-muted-foreground">Click to load {title.toLowerCase()} data</p>
                <Button onClick={fetchData} size="sm" disabled={loading} variant="secondary">
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      Load Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4 rounded-lg" />
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
                      Auto-refresh every 30s
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
                        <span className="text-xs text-muted-foreground">Next refresh in {refreshCountdown}s</span>
                        <Progress value={(30 - refreshCountdown) * 3.33} className="w-24 h-1.5" />
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
    </>
  );
}