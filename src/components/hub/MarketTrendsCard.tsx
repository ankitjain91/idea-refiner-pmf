import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, 
  ExternalLink, Search, Newspaper, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import useSWR from 'swr';

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
  warnings?: string[];
}

const fetcher = async (key: string) => {
  const [, idea, industry, geo, time] = key.split(':');
  const { data, error } = await supabase.functions.invoke('market-trends', {
    body: { 
      idea,
      keywords: idea?.split(' '),
      filters: { industry, geography: geo, time_window: time }
    }
  });
  
  if (error) throw error;
  return data;
};

export function MarketTrendsCard({ filters, className }: MarketTrendsCardProps) {
  const [showSources, setShowSources] = useState(false);
  
  const cacheKey = `market-trends:${filters.idea_keywords?.join(' ')}:${filters.industry}:${filters.geography}:${filters.time_window}`;
  
  const { data, error, isLoading, mutate } = useSWR<TrendsData>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 60s for search data
      refreshInterval: 900000, // 15m for news data
      shouldRetryOnError: true,
      errorRetryCount: 2
    }
  );

  // Prepare chart data
  const chartData = data?.series ? (() => {
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
  })() : [];

  // Get trend direction
  const trendDirection = data?.metrics?.find(m => m.name === 'Trend Direction')?.value || 'flat';
  const momentum = data?.metrics?.find(m => m.name === 'News Momentum')?.value || '0';
  
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

  if (error || !data) {
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
          <Button onClick={handleRetry} className="mt-4" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
          {!filters.idea_keywords?.length && (
            <Alert className="mt-4">
              <AlertDescription>
                Tip: Set idea keywords in filters to get relevant trends
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Market Trends
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {getTrendIcon()}
                {trendDirection}
              </Badge>
              <Badge variant="secondary">
                Momentum: {momentum}%
              </Badge>
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
          <div className="grid grid-cols-2 gap-3">
            {data.metrics.slice(0, 4).map((metric, idx) => (
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

          {/* Top rising queries */}
          {data.top_queries && data.top_queries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top Rising Queries
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.top_queries.slice(0, 6).map((query, idx) => (
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

          {/* Warnings */}
          {data.warnings && data.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {data.warnings[0]}
              </AlertDescription>
            </Alert>
          )}

          {/* View sources button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSources(true)}
            className="w-full"
          >
            View Sources
            <ChevronRight className="h-3.5 w-3.5 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Sources drawer */}
      <Sheet open={showSources} onOpenChange={setShowSources}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Data Sources & Citations</SheetTitle>
            <SheetDescription>
              Last updated: {new Date(data.updatedAt).toLocaleString()}
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
    </>
  );
}