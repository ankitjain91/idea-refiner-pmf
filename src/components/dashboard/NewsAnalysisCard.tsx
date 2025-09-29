import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Newspaper, AlertCircle, RefreshCw, ExternalLink, 
  TrendingUp, TrendingDown, Minus, ChevronRight, 
  Calendar, Loader2, BarChart3, Clock, Download,
  ArrowUpRight, ArrowDownRight, Sparkles, Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import useSWR from 'swr';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface NewsAnalysisCardProps {
  idea: string;
  industry?: string;
  geography?: string;
  timeWindow?: string;
}

interface NewsData {
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: string | number;
    unit?: string;
    explanation: string;
    confidence: number;
  }>;
  series: Array<{
    name: string;
    points: Array<[string, number]>;
  }>;
  items: Array<{
    title: string;
    snippet: string;
    url: string;
    published: string;
    source: string;
    evidence?: string[];
  }>;
  top_outlets: string[];
  themes: string[];
  cleanedArticles?: Array<{
    url: string;
    title: string;
    summary: string;
  }>;
  citations: Array<{
    label: string;
    url: string;
    published: string;
  }>;
  warnings?: string[];
  cost_estimate?: {
    serp_calls: number;
    firecrawl_urls: number;
    total_api_cost: string;
  };
  fromCache?: boolean;
  cacheTimestamp?: number;
}

export function NewsAnalysisCard({ idea, industry, geography, timeWindow }: NewsAnalysisCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const { toast } = useToast();

  // Fallback to localStorage if idea is not provided
  const actualIdea = idea || localStorage.getItem('pmfCurrentIdea') || localStorage.getItem('userIdea') || '';

  // Auto-load when an idea is present
  useEffect(() => {
    if (actualIdea && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [actualIdea, hasLoadedOnce]);

  // Build cache key
  const cacheKey = hasLoadedOnce && actualIdea ? 
    `news:${actualIdea}|${industry || ''}|${geography || ''}|${timeWindow || ''}` : null;

  const { data, error, isLoading, mutate } = useSWR<NewsData>(
    cacheKey,
    async (key) => {
      // Parse cache key
      const [, ...params] = key.split(':');
      const [ideaParam, industryParam, geoParam, timeParam] = params.join(':').split('|');
      
      // Check localStorage cache first (15 minute TTL)
      const cacheKeyStorage = `news-analysis-cache:${key}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const FIFTEEN_MINUTES = 15 * 60 * 1000;
        
        if (cacheAge < FIFTEEN_MINUTES) {
          return { ...parsed.data, fromCache: true, cacheTimestamp: parsed.timestamp };
        }
      }

      // Fetch fresh data
      const { data, error } = await supabase.functions.invoke('news-analysis', {
        body: { 
          idea: ideaParam,
          industry: industryParam || undefined,
          geo: geoParam || undefined,
          time_window: timeParam || undefined
        }
      });

      if (error) throw error;

      // Store in localStorage
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
      dedupingInterval: 30000, // Debounce 30s
      shouldRetryOnError: true,
      errorRetryCount: 2,
      revalidateOnMount: false,
      refreshInterval: autoRefresh ? 15 * 60 * 1000 : 0 // 15 minutes if auto-refresh is on
    }
  );

  // Initial load handler
  const handleInitialLoad = async () => {
    setHasLoadedOnce(true);
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    if (isRefreshing) return; // Debounce
    
    setIsRefreshing(true);
    try {
      // Clear cache for this key
      const cacheKeyStorage = `news-analysis-cache:${cacheKey}`;
      localStorage.removeItem(cacheKeyStorage);
      
      // Force fresh fetch
      await mutate(undefined, { revalidate: true });
      
      toast({
        title: "News data refreshed",
        description: "Latest news analysis has been loaded",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export functions
  const exportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `news-analysis-${new Date().toISOString()}.json`;
    a.click();
  };

  // Get direction icon and style
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

  // Get momentum level
  const getMomentumLevel = (zScore: number): { label: string; color: string; bg: string } => {
    if (zScore >= 1.0) return { label: 'High', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (zScore >= 0.5) return { label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Low', color: 'text-blue-500', bg: 'bg-blue-500/10' };
  };

  // Unloaded state
  if (!hasLoadedOnce) {
    return (
      <Card className={cn("h-full")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-center space-y-2">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Analyze news momentum and sentiment
            </p>
          </div>
          <Button onClick={handleInitialLoad} variant="default">
            <Sparkles className="h-4 w-4 mr-2" />
            Load Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <Card className={cn("h-full")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className={cn("h-full")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load news data'}
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

  const momentumMetric = data?.metrics?.find(m => m.name === 'momentum_z');
  const directionMetric = data?.metrics?.find(m => m.name === 'direction');
  const sentimentMetric = data?.metrics?.find(m => m.name === 'sentiment_pos');
  
  const momentum = momentumMetric ? getMomentumLevel(Number(momentumMetric.value)) : null;
  const direction = directionMetric ? getDirectionStyle(String(directionMetric.value)) : null;

  // Prepare chart data
  const chartData = data?.series?.[0]?.points?.map(([week, count]) => ({
    week: week.replace('2025-W', 'W'),
    count
  })) || [];

  return (
    <>
      <Card 
        className={cn("h-full cursor-pointer hover:shadow-lg transition-shadow", "relative overflow-hidden")}
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              News Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              {data?.updatedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(data.updatedAt).toLocaleTimeString()}</span>
                </div>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Momentum Badges */}
          <div className="flex gap-2 flex-wrap">
            {direction && (
              <Badge className={cn("gap-1", direction.bg, direction.color)} variant="secondary">
                <direction.icon className="h-3 w-3" />
                {String(directionMetric?.value).toUpperCase()}
              </Badge>
            )}
            {momentum && (
              <Badge className={cn(momentum.bg, momentum.color)} variant="secondary">
                Momentum: {momentum.label}
              </Badge>
            )}
            {sentimentMetric && (
              <Badge variant="outline" className="text-xs">
                {Number(sentimentMetric.value).toFixed(0)}% Positive
              </Badge>
            )}
          </div>

          {/* Mini Chart */}
          {chartData.length > 0 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <XAxis dataKey="week" hide />
                  <YAxis hide />
                  <Tooltip />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Themes */}
          {data?.themes && data.themes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Key Themes</p>
              <div className="flex flex-wrap gap-1.5">
                {data.themes.slice(0, 4).map((theme, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Top Outlets */}
          {data?.top_outlets && data.top_outlets.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Top Sources</span>
              <div className="flex -space-x-2">
                {data.top_outlets.slice(0, 3).map((outlet, idx) => (
                  <div 
                    key={idx}
                    className="h-8 w-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                    title={outlet}
                  >
                    <span className="text-xs font-semibold">
                      {outlet.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                ))}
                {data.top_outlets.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs">+{data.top_outlets.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Article Count */}
          {data?.items && (
            <div className="text-center text-2xl font-bold">
              {data.items.length} <span className="text-sm font-normal text-muted-foreground">articles found</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              News Analysis Details
            </SheetTitle>
            <SheetDescription>
              Comprehensive news analysis for {actualIdea}
            </SheetDescription>
          </SheetHeader>

          {/* Controls */}
          <div className="flex items-center justify-between mt-6 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isRefreshing && "animate-spin")} />
                Refresh now
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-refresh" className="text-sm">
                  Auto-refresh
                </Label>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                {autoRefresh && (
                  <span className="text-xs text-muted-foreground">15m</span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={exportJSON}>
              <Download className="h-3.5 w-3.5 mr-2" />
              Export
            </Button>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Metrics */}
              <div className="space-y-3">
                {data?.metrics?.map((metric, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold capitalize">
                        {metric.name.replace(/_/g, ' ')}
                      </h4>
                      <Badge variant="outline">
                        {metric.value}{metric.unit || ''}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{metric.explanation}</p>
                    {metric.confidence && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Confidence</span>
                          <span>{(metric.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${metric.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Full Chart */}
              {chartData.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">News Volume Trend</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Articles"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Themes */}
              {data?.themes && data.themes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Emerging Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.themes.map((theme, idx) => (
                      <Badge key={idx} variant="secondary">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="articles" className="space-y-4 mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {data?.items?.map((item, idx) => (
                    <div key={idx} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm flex-1">{item.title}</h4>
                        <Badge variant="outline" className="text-xs ml-2">
                          {item.source}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.snippet}</p>
                      {item.published && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(item.published).toLocaleDateString()}</span>
                        </div>
                      )}
                      {item.evidence && item.evidence.length > 0 && (
                        <div className="mt-3 p-3 bg-muted/50 rounded">
                          <p className="text-xs font-medium mb-1">Article Summary:</p>
                          <p className="text-xs text-muted-foreground">
                            {item.evidence[0]}
                          </p>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Read Full Article
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4 mt-4">
              {/* Cleaned Articles */}
              {data?.cleanedArticles && data.cleanedArticles.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Deep Analysis (Top Articles)</h4>
                  {data.cleanedArticles.map((article, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2">{article.title}</h5>
                      <p className="text-sm text-muted-foreground mb-3">
                        {article.summary}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(article.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Source
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Outlets Analysis */}
              {data?.top_outlets && data.top_outlets.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Media Coverage by Outlet</h4>
                  <div className="space-y-2">
                    {data.top_outlets.map((outlet, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-medium">{outlet}</span>
                        <Badge variant="outline" className="text-xs">
                          #{idx + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost Estimate */}
              {data?.cost_estimate && (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                    API Usage
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>News API Calls:</span>
                      <span>{data.cost_estimate.serp_calls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Articles Analyzed:</span>
                      <span>{data.cost_estimate.firecrawl_urls}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total Cost:</span>
                      <span>{data.cost_estimate.total_api_cost}</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sources" className="space-y-4 mt-4">
              {data?.citations && data.citations.length > 0 && (
                <div className="space-y-2">
                  {data.citations.map((citation, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{citation.label}</p>
                        <p className="text-xs text-muted-foreground">{citation.published}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(citation.url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {data?.warnings && data.warnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="space-y-1 mt-2">
                      {data.warnings.map((warning, idx) => (
                        <li key={idx} className="text-xs">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}