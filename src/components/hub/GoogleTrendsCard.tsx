import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, 
  ExternalLink, Search, ChevronRight, CheckCircle, XCircle,
  HelpCircle
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
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (isLoading && !data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Trends
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
            Google Trends
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
            Google Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load Google Trends data'}
            </AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4" variant="outline" size="sm">
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
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Google Trends
              </CardTitle>
              {/* Data source indicator */}
              {data && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant={hasRealData ? "secondary" : "destructive"} className="h-5">
                      {hasRealData ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mini line chart */}
          {chartData.length > 0 && (
            <ChartContainer config={{
              searchInterest: {
                label: "Search Interest",
                color: "hsl(var(--primary))",
              }
            }} className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                  <Line 
                    type="monotone" 
                    dataKey="searchInterest" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Search Interest"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}

          {/* Trend direction badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {getTrendIcon()}
                Trend: {trendDirection}
              </Badge>
              <Badge variant="secondary">
                Confidence: {Math.round(confidence * 100)}%
              </Badge>
            </div>
          </div>
          
          {/* Top rising queries */}
          {data && data.top_queries && data.top_queries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top Related Queries
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.top_queries.map((query, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {query}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {data?.warnings && data.warnings.length > 0 && !hasRealData && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                {data.warnings[0]}
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