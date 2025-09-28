import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, 
  ExternalLink, Search, ChevronRight, CheckCircle, XCircle,
  HelpCircle, Sparkles, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { TileInsightsDialog } from './TileInsightsDialog';

interface GoogleTrendsCardProps {
  filters: {
    idea_keywords?: string[];
    geo?: string;
    time_window?: string;
  };
  className?: string;
}

interface GoogleTrendsData {
  updatedAt: string;
  filters: {
    idea: string;
    geo: string;
    time_window: string;
  };
  metrics: Array<{
    name: string;
    value: string;
    explanation?: string;
    confidence?: number;
  }>;
  series: Array<{
    name: string;
    points: [string, number][];
  }>;
  top_queries: string[];
  citations: Array<{
    url: string;
    label: string;
  }>;
  warnings?: string[];
}

export function GoogleTrendsCard({ filters, className }: GoogleTrendsCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get the idea from filters or fallback to localStorage
  const ideaKeywords = filters.idea_keywords || [];
  const ideaText = ideaKeywords.length > 0 
    ? ideaKeywords.join(' ')
    : (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
  
  const geo = filters.geo || 'US';
  const timeWindow = filters.time_window || 'last_12_months';
  
  const cacheKey = ideaText ? `google-trends:${ideaText}:${geo}:${timeWindow}` : null;
  
  const { data, error, isLoading, mutate } = useSWR<GoogleTrendsData>(
    cacheKey,
    async (key) => {
      const [_, idea, geoParam, timeParam] = key.split(':');
      const { data, error } = await supabase.functions.invoke('google-trends', {
        body: { 
          idea_keywords: idea.split(' ').filter(w => w.length > 2),
          geo: geoParam,
          time_window: timeParam
        }
      });
      
      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // 60m cache
      refreshInterval: 0, // No auto refresh
      shouldRetryOnError: true,
      errorRetryCount: 1
    }
  );
  
  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Load data on mount if we have an idea
  useEffect(() => {
    if (ideaText && !data && !isLoading) {
      mutate();
    }
  }, [ideaText]);

  // Prepare chart data
  const chartData = data?.series?.[0]?.points ? 
    data.series[0].points.map(([date, value]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      searchInterest: value
    })) : [];

  // Get trend direction
  const trendMetric = data?.metrics?.find(m => m.name === 'trend_direction');
  const trendDirection = trendMetric?.value || 'flat';
  const confidence = trendMetric?.confidence || 0.5;
  
  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trendDirection) {
      case 'up':
        return 'text-emerald-500';
      case 'down':
        return 'text-rose-500';
      default:
        return 'text-amber-500';
    }
  };

  const getTrendBgColor = () => {
    switch (trendDirection) {
      case 'up':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'down':
        return 'bg-rose-500/10 border-rose-500/20';
      default:
        return 'bg-amber-500/10 border-amber-500/20';
    }
  };

  if (isLoading && !data) {
    return (
      <Card className={cn("h-full overflow-hidden", className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            Google Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ideaText) {
    return (
      <Card className={cn("h-full overflow-hidden", className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            Google Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-500/20 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
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
      <Card className={cn("h-full overflow-hidden", className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            Google Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load Google Trends data'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleRefresh} 
            className="mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
            size="sm"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasRealData = !data?.warnings?.some(w => w.includes('mock data'));

  return (
    <>
      <Card className={cn("h-full overflow-hidden group hover:shadow-xl transition-all duration-300 relative", className)}>
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">Google Trends</CardTitle>
              
              {/* Data source indicator */}
              {data && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge 
                      variant={hasRealData ? "secondary" : "outline"} 
                      className={cn(
                        "h-5 animate-fade-in",
                        hasRealData 
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}
                    >
                      {hasRealData ? (
                        <Sparkles className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {hasRealData ? 'Live' : 'Mock'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasRealData 
                      ? 'Using real data from SerpApi Google Trends'
                      : 'Using mock data - SerpApi key required for real data'
                    }
                  </TooltipContent>
                </Tooltip>
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
                className="h-8 w-8 hover:bg-primary/10 transition-colors"
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
                className={cn(
                  "h-8 transition-all duration-200",
                  "hover:bg-primary/10 hover:border-primary/30",
                  (isLoading || isRefreshing) && "opacity-70"
                )}
                title={!ideaText ? "No idea configured" : "Refresh data"}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", (isLoading || isRefreshing) && "animate-spin")} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative">
          {/* Mini area chart with gradient */}
          {chartData.length > 0 && (
            <div className="rounded-xl bg-gradient-to-br from-background/50 to-muted/20 p-3 border border-border/50">
              <ChartContainer config={{
                searchInterest: {
                  label: "Search Interest",
                  color: "hsl(var(--primary))",
                }
              }} className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      domain={[0, 100]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="searchInterest" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#searchGradient)"
                      name="Search Interest"
                      className="animate-fade-in"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}

          {/* Trend metrics with enhanced styling */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/50">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", getTrendBgColor())}>
                <div className={cn("flex items-center gap-1", getTrendColor())}>
                  {getTrendIcon()}
                  <span className="font-semibold text-sm">
                    {trendDirection === 'up' ? 'Rising' : trendDirection === 'down' ? 'Declining' : 'Stable'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                      style={{ width: `${Math.round(confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{Math.round(confidence * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Top rising queries with enhanced badges */}
          {data && data.top_queries && data.top_queries.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Top Related Queries
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.top_queries.map((query, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className={cn(
                      "text-xs hover:scale-105 transition-transform cursor-default",
                      "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20",
                      "animate-fade-in"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {query}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Warnings with better styling */}
          {data?.warnings && data.warnings.length > 0 && !hasRealData && (
            <Alert className="border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                {data.warnings[0]}
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons with enhanced styling */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInsights(true)}
              className="flex-1 hover:bg-primary/10 hover:border-primary/30 transition-all group"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-2 group-hover:scale-110 transition-transform" />
              How This Helps
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSources(true)}
              className="flex-1 hover:bg-primary/10 hover:border-primary/30 transition-all group"
            >
              View Sources
              <ChevronRight className="h-3.5 w-3.5 ml-2 group-hover:translate-x-0.5 transition-transform" />
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
            {/* Filters */}
            {data?.filters && (
              <div>
                <h4 className="font-medium mb-2">Query Parameters</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Keywords:</span> {data.filters.idea}</p>
                  <p><span className="text-muted-foreground">Location:</span> {data.filters.geo}</p>
                  <p><span className="text-muted-foreground">Time Window:</span> {data.filters.time_window}</p>
                </div>
              </div>
            )}
            
            {/* Citations */}
            {data?.citations && data.citations.length > 0 && (
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
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Insights Dialog */}
      <TileInsightsDialog 
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType="google_trends"
      />
    </>
  );
}