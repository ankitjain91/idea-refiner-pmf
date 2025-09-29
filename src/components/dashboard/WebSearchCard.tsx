import { useState } from 'react';
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
  Target, ShoppingCart, HelpCircle, AlertTriangle
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

  // Build cache key
  const cacheKey = hasLoadedOnce && idea ? 
    `websearch:${idea}|${industry || ''}|${geography || ''}|${timeWindow || ''}` : null;

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
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Web Search (Profitability)</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Analyze commercial intent & competition
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <Target className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Discover monetization opportunities
            </p>
            <Button onClick={handleInitialLoad} variant="default" size="sm">
              <Sparkles className="h-3 w-3 mr-1" />
              Load Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Web Search (Profitability)</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Analyzing commercial signals...
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">Web Search (Profitability)</CardTitle>
                <CardDescription className="text-xs mt-1 text-destructive">
                  {error || 'Failed to load profitability data'}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 px-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const competitionIntensity = data?.metrics?.[0]?.value || 'unknown';
  const monetizationPotential = data?.metrics?.[1]?.value || 'unknown';
  const topQueries = data?.top_queries || [];
  const competitors = data?.competitors || [];

  return (
    <>
      <Card 
        className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <CardTitle className="text-lg">Web Search (Profitability)</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Commercial intent analysis
                </CardDescription>
                {/* Cache/Fresh indicator */}
                <div className="mt-1">
                  {data?.fromCache ? (
                    <Badge 
                      variant="secondary" 
                      className="text-xs py-0 px-1.5 h-5 w-fit bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1 animate-pulse" />
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
                      className="text-xs py-0 px-1.5 h-5 w-fit bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                      Fresh data
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                disabled={isRefreshing}
                className="h-8 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant="secondary" 
              className={`font-medium ${getIntensityColor(competitionIntensity)}`}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Competition: {competitionIntensity}
            </Badge>
            <Badge 
              variant="secondary"
              className={`font-medium ${getPotentialColor(monetizationPotential)}`}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Monetization: {monetizationPotential}
            </Badge>
          </div>

          {/* Top Commercial Queries Chips */}
          {topQueries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Top Money Keywords:</p>
              <div className="flex flex-wrap gap-1">
                {topQueries.slice(0, 6).map((query: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs py-0.5">
                    {query}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mini Competitor Table */}
          {competitors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Competitor Pricing:</p>
              <div className="space-y-1 text-xs">
                {competitors.slice(0, 3).map((comp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="truncate flex-1">{comp.domain}</span>
                    <div className="flex gap-1">
                      {comp.hasPricing && (
                        <Badge variant="secondary" className="text-xs">
                          ${comp.prices?.[0] || 'Pricing'}
                        </Badge>
                      )}
                      {comp.hasFreeTier && (
                        <Badge variant="outline" className="text-xs">
                          Free tier
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost estimate */}
          {data?.cost_estimate && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>API cost: {data.cost_estimate.total_api_cost}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoRefresh(autoRefresh === 'off' ? '15m' : 'off');
                }}
              >
                Auto-refresh: {autoRefresh === 'off' ? '🔁 Off' : '🔁 15m'}
              </Button>
            </div>
          )}
        </CardContent>
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
                              <div className="text-xs text-muted-foreground mt-1">{item.source}</div>
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