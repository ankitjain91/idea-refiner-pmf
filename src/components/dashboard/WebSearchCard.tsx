import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import useSWR from 'swr';
import { 
  Search, TrendingUp, DollarSign, RefreshCw, ExternalLink, 
  ChevronRight, AlertCircle, Clock, Sparkles, Download, FileJson,
  Target, ShoppingCart, HelpCircle, AlertTriangle, BarChart3, Users
} from 'lucide-react';

interface WebSearchCardProps {
  idea: string;
  industry?: string;
  geography?: string;
  timeWindow?: string;
}

interface ProfitabilityData {
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: string;
    explanation: string;
    confidence: number;
  }>;
  top_queries: string[];
  items: Array<{
    title: string;
    snippet: string;
    url: string;
    source: string;
    evidence: string[];
    prices?: string[];
    hasPricing?: boolean;
  }>;
  competitors: Array<{
    domain: string;
    hasPricing: boolean;
    hasFreeTier: boolean;
    prices: string[];
  }>;
  citations: Array<{
    label: string;
    url: string;
  }>;
  insights?: any;
  unmet_needs?: string[];
  warnings?: string[];
  cost_estimate?: {
    serp_calls: number;
    firecrawl_urls: number;
    total_api_cost: string;
  };
  fromCache?: boolean;
  cacheTimestamp?: number;
}

export function WebSearchCard({ idea, industry, geography, timeWindow }: WebSearchCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<'off' | '15m'>('off');

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
    `websearch:${actualIdea}|${industry || ''}|${geography || ''}|${timeWindow || ''}` : null;

  const { data, error, isLoading, mutate } = useSWR<ProfitabilityData>(
    cacheKey,
    async (key) => {
      // Parse cache key
      const [, ...params] = key.split(':');
      const [ideaParam, industryParam, geoParam, timeParam] = params.join(':').split('|');
      
      // Check localStorage cache first (30 minute TTL)
      const cacheKeyStorage = `websearch-profitability-cache:${key}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const THIRTY_MINUTES = 30 * 60 * 1000;
        
        if (cacheAge < THIRTY_MINUTES) {
          return { ...parsed.data, fromCache: true, cacheTimestamp: parsed.timestamp };
        }
      }

      // Fetch fresh data
      const { data, error } = await supabase.functions.invoke('web-search-profitability', {
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
      refreshInterval: autoRefresh === '15m' ? 900000 : undefined, // 15 min if enabled
      shouldRetryOnError: true,
      errorRetryCount: 2,
      revalidateOnMount: false
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
      const cacheKeyStorage = `websearch-profitability-cache:${cacheKey}`;
      localStorage.removeItem(cacheKeyStorage);
      
      // Force fresh fetch
      await mutate(undefined, { revalidate: true });
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
    a.download = `profitability-analysis-${new Date().toISOString()}.json`;
    a.click();
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value', 'Details'],
      ...data.metrics.map(m => [m.name, m.value, m.explanation]),
      [''],
      ['Top Queries'],
      ...data.top_queries.map(q => [q]),
      [''],
      ['Competitors', 'Has Pricing', 'Prices'],
      ...data.competitors.map(c => [c.domain, c.hasPricing ? 'Yes' : 'No', c.prices.join(', ')])
    ];
    
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profitability-analysis-${new Date().toISOString()}.csv`;
    a.click();
  };

  // Get metric colors
  const getIntensityColor = (value: string) => {
    switch(value) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getPotentialColor = (value: string) => {
    switch(value) {
      case 'high': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
      case 'low': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  // Unloaded state
  if (!hasLoadedOnce) {
    return (
      <Card className="col-span-4 border-border/50 shadow-2xl hover:shadow-3xl transition-all duration-300 animate-fade-in bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 animate-scale-in">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Web Search (Profitability)
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Analyze commercial intent & competition
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!actualIdea ? (
            <div className="text-center py-8 animate-fade-in">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground">
                No idea configured. Please enter an idea first.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
                <Target className="h-16 w-16 text-primary relative" />
              </div>
              <p className="text-base text-muted-foreground font-medium">
                Discover monetization opportunities
              </p>
              <Button 
                onClick={handleInitialLoad} 
                variant="default" 
                size="lg"
                className="hover-scale bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Market Profitability
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <Card className="col-span-4 border-border/50 shadow-2xl bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm animate-fade-in">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 animate-pulse">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Web Search (Profitability)
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Analyzing commercial signals...
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full rounded-lg" />
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-6 w-5/6 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className="col-span-4 border-destructive/20 shadow-2xl bg-gradient-to-br from-destructive/5 via-card to-background animate-fade-in">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-destructive/10 animate-scale-in">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-2xl">Web Search (Profitability)</CardTitle>
                <CardDescription className="text-sm mt-1 text-destructive">
                  {error || 'Failed to load profitability data'}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handleRefresh}
              className="hover-scale"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const competitionIntensity = data?.metrics?.[0]?.value || 'unknown';
  const monetizationPotential = data?.metrics?.[1]?.value || 'unknown';
  const marketMaturity = data?.metrics?.[2]?.value || 'unknown';
  const topQueries = data?.top_queries || [];
  const competitors = data?.competitors || [];
  const marketInsights = (data as any)?.market_insights || {};
  const totalDataPoints = (data as any)?.cost_estimate?.data_points || 0;

  return (
    <>
      <Card 
        className="col-span-4 border-border/30 shadow-2xl hover:shadow-3xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 animate-fade-in group backdrop-blur-sm relative overflow-hidden min-h-[400px]"
        onClick={() => setSheetOpen(true)}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50 animate-pulse" />
        <div className="relative z-10">
        <CardHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 animate-scale-in group-hover:from-primary/30 group-hover:to-primary/15 transition-all duration-300">
                <DollarSign className="h-10 w-10 text-primary" />
              </div>
              <div className="flex flex-col space-y-1">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  Web Search (Profitability)
                </CardTitle>
                <CardDescription className="text-base">
                  {totalDataPoints > 0 ? `${totalDataPoints} data points analyzed` : 'Commercial intent & competition analysis'}
                </CardDescription>
                {/* Cache/Fresh indicator */}
                <div className="mt-2">
                  {data?.fromCache ? (
                    <Badge 
                      variant="secondary" 
                      className="text-xs py-1 px-2 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-700 dark:text-yellow-300"
                    >
                      <div className="h-2 w-2 rounded-full bg-yellow-500 mr-1.5 animate-pulse" />
                      Cached • {(() => {
                        if (!data.cacheTimestamp) return 'cached';
                        const age = Date.now() - data.cacheTimestamp;
                        const minutes = Math.floor(age / (1000 * 60));
                        if (minutes < 1) return 'just now';
                        if (minutes < 60) return `${minutes}m ago`;
                        return `${Math.floor(minutes / 60)}h ago`;
                      })()}
                    </Badge>
                  ) : (
                    <Badge 
                      variant="secondary" 
                      className="text-xs py-1 px-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300"
                    >
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5" />
                      Fresh data
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                disabled={isRefreshing}
                className="hover-scale"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metrics Cards - Beautiful grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl ${getIntensityColor(competitionIntensity)} backdrop-blur-sm border border-border/30 animate-scale-in shadow-lg hover:shadow-xl transition-all`} style={{animationDelay: '100ms'}}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-semibold">Competition</span>
              </div>
              <div className="text-2xl font-bold capitalize">{competitionIntensity}</div>
              {data?.metrics?.[0]?.explanation && (
                <p className="text-xs mt-2 opacity-80">{data.metrics[0].explanation.substring(0, 60)}...</p>
              )}
            </div>
            <div className={`p-4 rounded-xl ${getPotentialColor(monetizationPotential)} backdrop-blur-sm border border-border/30 animate-scale-in shadow-lg hover:shadow-xl transition-all`} style={{animationDelay: '200ms'}}>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-sm font-semibold">Monetization</span>
              </div>
              <div className="text-2xl font-bold capitalize">{monetizationPotential}</div>
              {data?.metrics?.[1]?.explanation && (
                <p className="text-xs mt-2 opacity-80">{data.metrics[1].explanation.substring(0, 60)}...</p>
              )}
            </div>
            {marketMaturity !== 'unknown' && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 backdrop-blur-sm border border-indigo-200/30 dark:border-indigo-800/30 animate-scale-in shadow-lg hover:shadow-xl transition-all" style={{animationDelay: '300ms'}}>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Market</span>
                </div>
                <div className="text-2xl font-bold capitalize text-indigo-700 dark:text-indigo-300">{marketMaturity}</div>
                {data?.metrics?.[2]?.explanation && (
                  <p className="text-xs mt-2 text-indigo-600/80 dark:text-indigo-400/80">{data.metrics[2].explanation.substring(0, 60)}...</p>
                )}
              </div>
            )}
          </div>

          {/* Top Commercial Queries - Beautiful tags */}
          {topQueries.length > 0 && (
            <div className="space-y-3 animate-fade-in" style={{animationDelay: '400ms'}}>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">
                  Top {topQueries.length} Money Keywords
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {topQueries.slice(0, 12).map((query: string, idx: number) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="py-1.5 px-3 hover-scale cursor-pointer bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-900/40 dark:hover:to-amber-900/40 transition-all border-orange-200/50 dark:border-orange-800/50 text-orange-700 dark:text-orange-300"
                    style={{animationDelay: `${500 + idx * 50}ms`}}
                  >
                    {query}
                  </Badge>
                ))}
                {topQueries.length > 12 && (
                  <Badge variant="secondary" className="py-1.5 px-3 bg-orange-100 dark:bg-orange-900/50">
                    +{topQueries.length - 12} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Price Ranges - Beautiful pricing display */}
          {marketInsights.pricing_ranges && marketInsights.pricing_ranges.length > 0 && (
            <div className="space-y-3 animate-fade-in" style={{animationDelay: '600ms'}}>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-sm font-semibold">Market Pricing</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {marketInsights.pricing_ranges.slice(0, 4).map((price: string, idx: number) => (
                  <Badge 
                    key={idx} 
                    className="py-1.5 px-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 font-mono font-semibold"
                  >
                    {price}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Competitor Display */}
          {competitors.length > 0 && (
            <div className="space-y-3 animate-fade-in" style={{animationDelay: '700ms'}}>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-semibold">
                  Top {competitors.length} Competitors
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {competitors.slice(0, 6).map((comp: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 transition-all border border-blue-200/30 dark:border-blue-800/30"
                  >
                    <span className="font-medium text-sm">{comp.domain}</span>
                    <Badge variant="secondary" className="ml-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {comp.appearances}x
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Insights Summary */}
          {data?.insights && (
            <div className="space-y-3 animate-fade-in" style={{animationDelay: '800ms'}}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <p className="text-sm font-semibold">AI Market Insights</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200/30 dark:border-purple-800/30">
                <div className="space-y-3">
                  {data.insights.market_gap && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Market Gap</p>
                      <p className="text-sm text-purple-900 dark:text-purple-100">{data.insights.market_gap}</p>
                    </div>
                  )}
                  {data.insights.pricing_strategy && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Pricing Strategy</p>
                      <p className="text-sm text-purple-900 dark:text-purple-100">{data.insights.pricing_strategy}</p>
                    </div>
                  )}
                  {data.insights.competitive_advantage && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Competitive Edge</p>
                      <p className="text-sm text-purple-900 dark:text-purple-100">{data.insights.competitive_advantage}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom actions bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {data?.items?.length || 0} results
              </Badge>
              {data?.cost_estimate && (
                <Badge variant="outline" className="text-xs">
                  Cost: {data.cost_estimate.total_api_cost}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs hover-scale"
              onClick={(e) => {
                e.stopPropagation();
                setAutoRefresh(autoRefresh === 'off' ? '15m' : 'off');
              }}
            >
              {autoRefresh === 'off' ? (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Enable Auto-refresh
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Auto-refresh: 15m
                </>
              )}
            </Button>
          </div>
        </CardContent>
        </div>
      </Card>

      {/* Detailed View Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Profitability Deep Dive
            </SheetTitle>
            <SheetDescription>
              Commercial intent analysis and competitor insights
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            <div className="space-y-6 pr-4">
              {/* Tabs for different views */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="queries">Queries</TabsTrigger>
                  <TabsTrigger value="competitors">Competitors</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    {data?.metrics?.map((metric, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-2xl font-bold capitalize">{metric.value}</div>
                            <div className="text-xs text-muted-foreground mt-1">{metric.name}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {(metric.confidence * 100).toFixed(0)}% conf
                          </Badge>
                        </div>
                        <div className="text-xs mt-2">{metric.explanation}</div>
                      </div>
                    ))}
                  </div>

                  {/* Warnings */}
                  {data?.warnings && data.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {data.warnings.join('. ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Export buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportJSON}>
                      <FileJson className="h-3 w-3 mr-1" />
                      Export JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="h-3 w-3 mr-1" />
                      Export CSV
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="queries" className="space-y-4 mt-4">
                  {/* Commercial Intent Queries */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Commercial Intent Queries</h3>
                    <div className="flex flex-wrap gap-2">
                      {topQueries.map((query: string, idx: number) => (
                        <Badge 
                          key={idx} 
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')}
                        >
                          {query}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Unmet Needs */}
                  {data?.unmet_needs && data.unmet_needs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
                        <HelpCircle className="h-4 w-4" />
                        Unmet Needs (Opportunities)
                      </h3>
                      <div className="space-y-2">
                        {data.unmet_needs.map((need, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 text-sm">
                            {need}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="competitors" className="space-y-4 mt-4">
                  {/* Competitor Evidence */}
                  {data?.items && data.items.length > 0 && (
                    <div className="space-y-3">
                      {data.items.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-card">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
<div className="font-medium text-sm">{item.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">{
                                (item as any).source || (item as any).domain || (() => { try { return new URL(item.url).hostname.replace('www.',''); } catch { return '' } })()
                              }</div>
                            </div>
                            {item.hasPricing && (
                              <Badge variant="default" className="text-xs ml-2">
                                Has Pricing
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {item.snippet}
                          </div>
                          {item.prices && item.prices.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {item.prices.map((price: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {price}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto mt-2 text-xs"
                            onClick={() => window.open(item.url, '_blank')}
                          >
                            View Full Page <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="insights" className="space-y-4 mt-4">
                  {/* AI Insights */}
                  {data?.insights && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
                      <h3 className="text-sm font-semibold mb-2">AI Analysis</h3>
                      <div className="text-sm space-y-2">
                        {data.insights.insight && (
                          <div>
                            <span className="font-medium">Insight:</span> {data.insights.insight}
                          </div>
                        )}
                        {data.insights.opportunity && (
                          <div>
                            <span className="font-medium">Opportunity:</span> {data.insights.opportunity}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Why This Matters */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Why This Matters</h3>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• High competition intensity indicates proven demand but may require more budget</p>
                      <p>• High monetization potential suggests customers are willing to pay</p>
                      <p>• Unmet needs represent gaps you can fill</p>
                      <p>• Competitor pricing reveals market expectations</p>
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Recommended Next Steps</h3>
                    <div className="text-xs space-y-1">
                      {competitionIntensity === 'high' && (
                        <p>📊 Competition is fierce - differentiate with unique features or niche targeting</p>
                      )}
                      {monetizationPotential === 'high' && (
                        <p>💰 Strong monetization signals - consider premium pricing strategy</p>
                      )}
                      {competitors.some(c => c.hasFreeTier) && (
                        <p>🎯 Competitors offer free tiers - consider freemium model</p>
                      )}
                      {data?.unmet_needs && data.unmet_needs.length > 0 && (
                        <p>🔍 Address unmet needs in your value proposition</p>
                      )}
                    </div>
                  </div>

                  {/* Citations */}
                  <Separator />
                  {data?.citations && data.citations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Sources</h3>
                      <div className="space-y-1">
                        {data.citations.map((citation, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="truncate flex-1">{citation.label}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => window.open(citation.url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}