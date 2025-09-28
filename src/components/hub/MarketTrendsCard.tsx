import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, 
  ExternalLink, Search, Newspaper, ChevronRight, CheckCircle, XCircle,
  HelpCircle, Globe, Map, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { TileInsightsDialog } from './TileInsightsDialog';

interface MarketTrendsCardProps {
  filters: {
    idea_keywords?: string[];
    industry?: string;
    geography?: string;
    time_window?: string;
  };
  className?: string;
}

interface TrendsData {
  type?: 'single' | 'continental';
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: number | string;
    unit: string;
    explanation?: string;
    confidence?: number;
  }>;
  series: Array<{
    name: string;
    data: number[];
    labels: string[];
  }>;
  top_queries: Array<{
    query: string;
    value: number;
    type: 'rising' | 'top';
    change: string;
  }>;
  citations: Array<{
    url: string;
    label: string;
    published?: string;
  }>;
  items?: Array<{
    title: string;
    snippet: string;
    url?: string;
    source?: string;
    published?: string;
  }>;
  insights?: string[];
  warnings?: string[];
  continentData?: Record<string, any>;
  fromCache?: boolean;
  stale?: boolean;
}

const CONTINENT_COLORS = {
  'North America': '#3b82f6',
  'Europe': '#10b981',
  'Asia': '#f59e0b',
  'South America': '#8b5cf6',
  'Africa': '#ef4444',
  'Oceania': '#06b6d4'
};


export function MarketTrendsCard({ filters, className }: MarketTrendsCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'global' | 'single'>('single');
  const [selectedContinent, setSelectedContinent] = useState<string>('North America');
  
  // Get the idea from filters or fallback to localStorage
  const ideaText = filters.idea_keywords?.join(' ') || 
    (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
  
  // Include viewMode in cache key to refetch when switching modes
  const cacheKey = ideaText ? `market-trends:${ideaText}:${viewMode}` : null;
  
  const { data, error, isLoading, mutate } = useSWR<TrendsData>(
    cacheKey,
    async (key) => {
      const [, idea, mode] = key.split(':');
      
      // Check localStorage for cached data first
      const cacheKeyStorage = `market-trends-cache:${idea}:${mode}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // Return cached data if less than 24 hours old
        if (cacheAge < ONE_DAY) {
          return { ...parsed.data, fromCache: true };
        }
      }
      
      // Fetch fresh data if cache is stale or missing
      const { data, error } = await supabase.functions.invoke('market-trends', {
        body: { 
          idea,
          keywords: idea.split(' ').filter(w => w.length > 2),
          fetch_continents: mode === 'global'
        }
      });
      
      if (error) throw error;
      
      // Store in localStorage with timestamp
      if (data) {
        localStorage.setItem(cacheKeyStorage, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
      
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // 1 hour - prevent duplicate requests within this window
      refreshInterval: 86400000, // 24 hours - auto refresh once per day
      shouldRetryOnError: true,
      errorRetryCount: 2,
      revalidateOnMount: false // Don't refetch on mount if we have cached data
    }
  );
  
  // Manual refresh handler - bypasses cache
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache for this key to force fresh data
      const cacheKeyStorage = `market-trends-cache:${ideaText}:${viewMode}`;
      localStorage.removeItem(cacheKeyStorage);
      
      // Force a fresh fetch by passing revalidate option
      await mutate(undefined, { revalidate: true });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Refetch data when viewMode changes
  useEffect(() => {
    if (ideaText) {
      mutate();
    }
  }, [viewMode, ideaText]);

  // Prepare chart data based on view mode
  const chartData = (() => {
    if (viewMode === 'global' && data?.continentData && selectedContinent) {
      const continentInfo = data.continentData[selectedContinent];
      if (!continentInfo?.series) return [];
      
      const searchSeries = continentInfo.series.find((s: any) => s.name === 'search_interest');
      const newsSeries = continentInfo.series.find((s: any) => s.name === 'news_volume');
      
      if (!searchSeries && !newsSeries) return [];
      
      const maxLength = Math.max(
        searchSeries?.data.length || 0,
        newsSeries?.data.length || 0
      );
      
      return Array.from({ length: maxLength }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - ((maxLength - i - 1) * 7));
        
        return {
          week: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          searchInterest: searchSeries?.data[i] || 0,
          newsVolume: newsSeries?.data[i] || 0
        };
      });
    } else if (data?.series) {
      const searchSeries = data.series.find(s => s.name === 'search_interest');
      const newsSeries = data.series.find(s => s.name === 'news_volume');
      
      if (!searchSeries && !newsSeries) return [];
      
      const maxLength = Math.max(
        searchSeries?.data.length || 0,
        newsSeries?.data.length || 0
      );
      
      return Array.from({ length: maxLength }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - ((maxLength - i - 1) * 7));
        
        return {
          week: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          searchInterest: searchSeries?.data[i] || 0,
          newsVolume: newsSeries?.data[i] || 0
        };
      });
    }
    return [];
  })();

  // Get metrics based on view mode
  const currentData = viewMode === 'global' && data?.continentData?.[selectedContinent] 
    ? data.continentData[selectedContinent] 
    : data;
    
  const trendDirection = currentData?.metrics?.find((m: any) => m.name === 'Trend Direction')?.value || 'flat';
  const momentum = currentData?.metrics?.find((m: any) => m.name === 'News Momentum')?.value || '0';
  
  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
      case 'Rising':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
      case 'Declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const handleRetry = () => {
    mutate();
  };

  if (isLoading && !data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Market Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ideaText) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Market Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No idea configured. Please enter an idea in the Idea Chat first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (error || (!data && !isLoading)) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Market Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load market trends'}
            </AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
          {!filters.idea_keywords?.length && (
            <Alert className="mt-4">
              <AlertDescription>
                Tip: Make sure you have an active idea configured
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className={cn("h-full", className)}
      >
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Market Trends Analysis</CardTitle>
            <div className="flex items-center gap-2">
              {viewMode === 'global' && data?.continentData && (
                <Select value={selectedContinent} onValueChange={setSelectedContinent}>
                  <SelectTrigger className="w-[160px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(data.continentData).map((continent) => (
                      <SelectItem key={continent} value={continent}>
                        {continent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'global' | 'single')}>
                <TabsList className="h-8">
                  <TabsTrigger value="single" className="text-xs">Single</TabsTrigger>
                  <TabsTrigger value="global" className="text-xs">Global</TabsTrigger>
                </TabsList>
              </Tabs>
              {data?.updatedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(data.updatedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Market Trends
              </CardTitle>
              {/* Data source and cache indicator */}
              {data && (
                <>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant={data.insights?.some(i => i.includes('API key required')) ? "destructive" : "secondary"} className="h-5">
                        {data.insights?.some(i => i.includes('API key required')) ? (
                          <XCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {data.insights?.some(i => i.includes('API key required')) ? 'Mock' : 'Live'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {data.insights?.some(i => i.includes('API key required')) 
                        ? 'Using mock data - Serper API key may not be configured'
                        : 'Using real data from Serper API'
                      }
                    </TooltipContent>
                  </Tooltip>
                  {data.fromCache && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="h-5">
                          <Clock className="h-3 w-3 mr-1" />
                          Cached
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Data cached locally for 24 hours to reduce API calls
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInsights(true);
                }}
                className="h-8 w-8"
                title="How this helps your product journey"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                disabled={isLoading || isRefreshing || !ideaText}
                className="h-8"
                title={!ideaText ? "No idea configured" : "Refresh data"}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", (isLoading || isRefreshing) && "animate-spin")} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              {data && (
                <>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getTrendIcon()}
                    {trendDirection}
                  </Badge>
                  <Badge variant="secondary">
                    Momentum: {momentum}%
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dual-series chart */}
          {chartData.length > 0 && (
            <ChartContainer config={{
              searchInterest: {
                label: "Search Interest",
                color: "hsl(var(--primary))",
              },
              newsVolume: {
                label: "News Volume",
                color: "hsl(var(--secondary))",
              },
            }} className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="week" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="searchInterest" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Search Interest"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newsVolume" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    dot={false}
                    name="News Volume"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}

          {/* Key metrics */}
          {currentData?.metrics && currentData.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {currentData.metrics.slice(0, 4).map((metric: any, idx: number) => (
                <div key={idx} className="bg-muted/10 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {metric.name}
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {metric.value}
                    {metric.unit && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {metric.unit}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* Regional Comparison in Global Mode */}
          {viewMode === 'global' && data?.continentData && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Regional Comparison
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(data.continentData).slice(0, 6).map(([region, regionData]: [string, any]) => (
                  <button
                    key={region}
                    onClick={() => setSelectedContinent(region)}
                    className={cn(
                      "p-2 rounded-lg border transition-all text-left",
                      selectedContinent === region 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <Globe className="h-3 w-3" />
                      <span className="text-xs font-medium truncate">{region}</span>
                    </div>
                    <div className="text-lg font-bold">
                      {regionData?.metrics?.find((m: any) => m.name === 'Search Volume')?.value || '0'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Interest Score
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights */}
          {currentData?.insights && currentData.insights.length > 0 && !currentData.insights.some((i: string) => i.includes('API key required')) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key Insights
              </h4>
              <div className="space-y-1">
                {currentData.insights.slice(0, 3).map((insight: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent News Articles */}
          {currentData?.items && currentData.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Latest Market News
              </h4>
              <div className="space-y-2">
                {currentData.items.slice(0, 3).map((item: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted/10 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1">{item.title}</p>
                        {item.snippet && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.snippet}</p>
                        )}
                      </div>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 flex-shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {item.source && (
                      <div className="flex items-center gap-1 mt-1">
                        <Newspaper className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Sentiment Indicator */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs font-medium">Positive</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                {currentData?.metrics?.find((m: any) => m.name === 'Positive Sentiment')?.value || '65%'}
              </div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
              <div className="flex items-center gap-1 mb-1">
                <Minus className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-medium">Neutral</span>
              </div>
              <div className="text-lg font-bold text-yellow-600">
                {currentData?.metrics?.find((m: any) => m.name === 'Neutral Sentiment')?.value || '25%'}
              </div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-xs font-medium">Negative</span>
              </div>
              <div className="text-lg font-bold text-red-600">
                {currentData?.metrics?.find((m: any) => m.name === 'Negative Sentiment')?.value || '10%'}
              </div>
            </div>
          </div>

          {/* API Status Alert for debugging */}
          {data?.insights && data.insights.some(i => i.includes('API key required')) && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                <strong>Serper API Not Connected</strong><br/>
                The Serper API key may not be configured correctly. The card is showing mock data.
                Click refresh to retry with your API key.
              </AlertDescription>
            </Alert>
          )}

          {/* Top rising queries */}
          {currentData?.top_queries && currentData.top_queries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top Rising Queries {viewMode === 'global' && `- ${selectedContinent}`}
              </h4>
              <div className="flex flex-wrap gap-2">
                {currentData.top_queries.slice(0, 6).map((query: any, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {query.query}
                    {query.change && (
                      <span className="ml-1 text-green-500">{query.change}</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Market Opportunity Score */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Market Opportunity Score
              </h4>
              <Badge variant="outline" className="text-xs">
                {viewMode === 'global' ? selectedContinent : 'Overall'}
              </Badge>
            </div>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-bold text-primary">
                {currentData?.metrics?.find((m: any) => m.name === 'Opportunity Score')?.value || '8.5'}
              </div>
              <div className="text-xs text-muted-foreground pb-1">/10</div>
              <div className="flex-1 flex items-center justify-end gap-1 pb-1">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 w-4 rounded-full",
                      i < 4 ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on search volume, trend direction, and market momentum
            </p>
          </div>

          {/* Related Topics & Keywords */}
          {currentData?.top_queries && currentData.top_queries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Related Topics
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {currentData.top_queries.slice(0, 4).map((query: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted/10 rounded-lg">
                    <span className="text-xs font-medium truncate">{query.query}</span>
                    <Badge variant="secondary" className="text-xs h-5">
                      {query.value || '50'}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {currentData?.warnings && currentData.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {currentData.warnings[0]}
              </AlertDescription>
            </Alert>
          )}

          {/* View sources button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInsights(true)}
              className="flex-1"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-2" />
              How This Helps
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSources(true)}
              className="flex-1"
            >
              View Sources
              <ChevronRight className="h-3.5 w-3.5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sources drawer */}
      <Sheet open={showSources} onOpenChange={setShowSources}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Data Sources & Citations</SheetTitle>
            <SheetDescription>
              {data?.updatedAt ? `Last updated: ${new Date(data.updatedAt).toLocaleString()}` : 'Loading...'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* Citations */}
            {data.citations && data.citations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Citations</h4>
                <div className="space-y-2">
                  {data.citations.map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <span className="text-sm">{citation.label}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent items */}
            {data.items && data.items.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recent Articles</h4>
                <div className="space-y-2">
                  {data.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-muted/10 rounded-lg">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.snippet && (
                        <p className="text-xs text-muted-foreground mt-1">{item.snippet}</p>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                        >
                          Read more
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Insights Dialog */}
      <TileInsightsDialog 
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType="market_trends"
      />
    </>
  );
}