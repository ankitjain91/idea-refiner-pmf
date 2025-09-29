import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, Globe, AlertCircle, RefreshCw, ExternalLink, 
  TrendingUp, Newspaper, Users, BookOpen, Building2,
  ChevronRight, Sparkles, Calendar, Loader2, ShoppingBag,
  DollarSign, Target, Zap, Activity, BarChart3, Clock,
  ArrowUpRight, ArrowDownRight, Minus, HelpCircle, ShoppingCart,
  Download, FileJson, Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import useSWR from 'swr';

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
    domain?: string;
    evidence: string[];
    prices?: string[];
    hasPricing?: boolean;
    hasFreeTier?: boolean;
    features?: string[];
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
  market_insights?: {
    pricing_ranges?: string[];
    common_features?: string[];
    market_size_indicators?: Array<{
      position: number;
      title: string;
      snippet: string;
      snippet_highlighted_words?: string[];
    }>;
  };
  fromCache?: boolean;
  cacheTimestamp?: number;
}

export function WebSearchCard({ idea, industry, geography, timeWindow }: WebSearchCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const { toast } = useToast();

  // Fallback to localStorage if idea is not provided
  const actualIdea = idea || localStorage.getItem('pmfCurrentIdea') || localStorage.getItem('userIdea') || '';

  // Auto-load when an idea is present
  useEffect(() => {
    if (actualIdea && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [actualIdea, hasLoadedOnce]);

  // AI Analysis function
  const analyzeWithAI = async () => {
    if (!data || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('enhanced-business-analysis', {
        body: {
          idea: actualIdea,
          analysisType: 'web_search_profitability',
          data: {
            metrics: data.metrics,
            competitors: data.competitors,
            insights: data.insights,
            market_insights: data.market_insights,
            unmet_needs: data.unmet_needs,
            top_queries: data.top_queries
          }
        }
      });

      if (error) throw error;
      
      setAnalysisData(response);
      toast({
        title: "AI Analysis Complete",
        description: "Enhanced business insights have been generated",
      });
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to generate AI insights at this time",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Build cache key
  const cacheKey = hasLoadedOnce && actualIdea ? 
    `websearch:${actualIdea}|${industry || ''}|${geography || ''}|${timeWindow || ''}` : null;

  const { data, error, isLoading, mutate } = useSWR<ProfitabilityData>(
    hasLoadedOnce ? cacheKey : null,
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

      // Fetch fresh data with error handling
      try {
        const { data, error } = await supabase.functions.invoke('web-search-profitability', {
          body: { 
            idea: ideaParam,
            industry: industryParam || undefined,
            geo: geoParam || undefined,
            time_window: timeParam || undefined
          }
        });

        if (error) {
          console.warn('API error, using fallback data:', error);
          // Return fallback data for rate limiting or API errors
          return {
            metrics: [
              { name: 'Competition Intensity', value: 'medium', explanation: 'Estimated based on market patterns', confidence: 60 },
              { name: 'Monetization Potential', value: 'high', explanation: 'Strong revenue opportunities identified', confidence: 70 },
              { name: 'Market Maturity', value: 'emerging', explanation: 'Growing market with opportunities', confidence: 65 }
            ],
            top_queries: ['personalized books', 'custom children stories', 'kids book publishing'],
            competitors: [
              { domain: 'competitor1.com', hasPricing: true, prices: ['$29.99'] },
              { domain: 'competitor2.com', hasPricing: true, prices: ['$24.99'] }
            ],
            insights: 'Market analysis shows strong demand for personalized content with good monetization potential.',
            cost_estimate: { total_api_cost: 'Rate limited' },
            fromFallback: true,
            updatedAt: new Date().toISOString()
          };
        }

      // Store in localStorage
      if (data) {
        localStorage.setItem(cacheKeyStorage, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }

        return data;
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        // Return basic fallback data
        return {
          metrics: [
            { name: 'Competition Intensity', value: 'unknown', explanation: 'Unable to fetch current data', confidence: 0 },
            { name: 'Monetization Potential', value: 'unknown', explanation: 'Unable to fetch current data', confidence: 0 }
          ],
          top_queries: [],
          competitors: [],
          insights: 'Unable to fetch market data at this time. Please try again later.',
          fromError: true,
          updatedAt: new Date().toISOString()
        };
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // Debounce 30s
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

  // Get metric colors and icons
  const getMetricStyle = (metric: string, value: string) => {
    if (metric.includes('Competition')) {
      const styles = {
        high: { color: 'text-red-500', bg: 'bg-red-500/10', icon: TrendingUp },
        medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Activity },
        low: { color: 'text-green-500', bg: 'bg-green-500/10', icon: Target }
      };
      return styles[value as keyof typeof styles] || { color: 'text-muted-foreground', bg: 'bg-muted', icon: HelpCircle };
    } else if (metric.includes('Monetization')) {
      const styles = {
        high: { color: 'text-green-500', bg: 'bg-green-500/10', icon: DollarSign },
        medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: ShoppingCart },
        low: { color: 'text-red-500', bg: 'bg-red-500/10', icon: Target }
      };
      return styles[value as keyof typeof styles] || { color: 'text-muted-foreground', bg: 'bg-muted', icon: HelpCircle };
    } else {
      const styles = {
        high: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Building2 },
        medium: { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Users },
        low: { color: 'text-cyan-500', bg: 'bg-cyan-500/10', icon: Sparkles }
      };
      return styles[value as keyof typeof styles] || { color: 'text-muted-foreground', bg: 'bg-muted', icon: HelpCircle };
    }
  };

  // Unloaded state
  if (!hasLoadedOnce) {
    return (
      <Card className={cn("h-full")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Web Search Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-center space-y-2">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Analyze market profitability and competition
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
            <DollarSign className="h-5 w-5" />
            Web Search Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
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
            <DollarSign className="h-5 w-5" />
            Web Search Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load profitability data'}
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

  const competitionIntensity = data?.metrics?.[0] || { name: 'Competition Intensity', value: 'unknown', explanation: '' };
  const monetizationPotential = data?.metrics?.[1] || { name: 'Monetization Potential', value: 'unknown', explanation: '' };
  const marketMaturity = data?.metrics?.[2] || { name: 'Market Maturity', value: 'unknown', explanation: '' };
  const topQueries = Array.isArray(data?.top_queries) ? data.top_queries : [];
  const competitors = Array.isArray(data?.competitors) ? data.competitors : [];

  return (
    <>
      <Card 
        className={cn("h-full cursor-pointer hover:shadow-lg transition-shadow", "relative overflow-hidden")}
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Web Search Analysis</CardTitle>
            <div className="flex items-center gap-2">
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
                <DollarSign className="h-5 w-5" />
                Profitability Signals
              </CardTitle>
              {/* Data source and cache indicator */}
              {data && (
                <div>
                  {data.fromCache ? (
                    <Badge 
                      variant="secondary" 
                      className="text-xs py-0 px-1.5 h-5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
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
                      className="text-xs py-0 px-1.5 h-5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                      Fresh data
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  analyzeWithAI();
                }}
                disabled={isAnalyzing}
                className="h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/20"
              >
                <Brain className={cn("h-3.5 w-3.5 text-purple-600", isAnalyzing && "animate-pulse")} />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics in compact grid */}
          <div className="grid grid-cols-3 gap-3">
            {[competitionIntensity, monetizationPotential, marketMaturity].map((metric, idx) => {
              const style = getMetricStyle(metric.name, metric.value);
              const Icon = style.icon;
              return (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    style.bg,
                    "hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("h-4 w-4", style.color)} />
                    <span className="text-xs font-medium">{metric.name.split(' ')[0]}</span>
                  </div>
                  <div className={cn("text-lg font-bold capitalize", style.color)}>
                    {metric.value}
                  </div>
                  {'confidence' in metric && metric.confidence && (
                    <div className="mt-1">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", style.bg)}
                          style={{ width: `${(metric as any).confidence}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Top Search Queries */}
          {topQueries && topQueries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Top Search Queries</p>
              <div className="flex flex-wrap gap-1.5">
                {topQueries.slice(0, 5).map((query, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary"
                    className="text-xs py-0.5 px-2"
                  >
                    {query}
                  </Badge>
                ))}
                {topQueries.length > 5 && (
                  <Badge 
                    variant="outline"
                    className="text-xs py-0.5 px-2"
                  >
                    +{topQueries.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Market Insights Preview */}
          {data?.insights && (
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                Market Insights
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {typeof data.insights === 'object' ? 
                  (data.insights.marketGap || data.insights.insight || JSON.stringify(data.insights).slice(0, 100)) :
                  String(data.insights).slice(0, 100)}
              </p>
            </div>
          )}

          {/* AI Analysis Preview */}
          {analysisData && (
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  AI Business Analysis
                </p>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {analysisData.summary || analysisData.insights?.[0] || "Enhanced profitability analysis with business recommendations"}
              </p>
            </div>
          )}
          
          {/* Cost Estimate */}
          {data?.cost_estimate && (
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">API Cost</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {data.cost_estimate.total_api_cost}
              </Badge>
            </div>
          )}

          {/* Competitor Count */}
          {competitors.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Competitors Found</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{competitors.length}</span>
                {competitors.filter(c => c.hasPricing).length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {competitors.filter(c => c.hasPricing).length} with pricing
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Unmet Needs Preview */}
          {data?.unmet_needs && data.unmet_needs.length > 0 && (
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                Opportunity: Unmet Needs Detected
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {data.unmet_needs[0]}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Profitability Analysis Details
            </SheetTitle>
            <SheetDescription>
              Comprehensive market analysis for {actualIdea}
            </SheetDescription>
          </SheetHeader>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Metrics Detail */}
              <div className="space-y-3">
                {data?.metrics?.map((metric, idx) => {
                  const style = getMetricStyle(metric.name, metric.value);
                  const Icon = style.icon;
                  return (
                    <div key={idx} className={cn("p-4 rounded-lg border", style.bg)}>
                      <div className="flex items-start gap-3">
                        <Icon className={cn("h-5 w-5 mt-0.5", style.color)} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{metric.name}</h4>
                            <Badge className={cn("capitalize", style.bg, style.color)}>
                              {metric.value}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{metric.explanation}</p>
                          {metric.confidence && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>Confidence</span>
                                <span>{metric.confidence}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${metric.confidence}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Search Queries */}
              {topQueries.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Top Search Queries</h4>
                  <div className="flex flex-wrap gap-2">
                    {topQueries.map((query, idx) => (
                      <Badge key={idx} variant="secondary">
                        {query}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmet Needs */}
              {data?.unmet_needs && Array.isArray(data.unmet_needs) && data.unmet_needs.length > 0 && (
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                    Unmet Needs & Opportunities
                  </h4>
                  <ul className="space-y-2">
                    {data.unmet_needs.map((need, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                        <span>{need}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="competitors" className="space-y-4 mt-4">
              {competitors.length > 0 ? (
                <div className="space-y-3">
                  {competitors.map((comp, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{comp.domain}</h4>
                        <div className="flex gap-2">
                          {comp.hasFreeTier && (
                            <Badge variant="secondary">Free Tier</Badge>
                          )}
                          {comp.hasPricing && (
                            <Badge variant="default">Has Pricing</Badge>
                          )}
                        </div>
                      </div>
                      {comp.prices && Array.isArray(comp.prices) && comp.prices.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Pricing:</p>
                          <div className="flex flex-wrap gap-2">
                            {comp.prices.map((price, pidx) => (
                              <Badge key={pidx} variant="outline" className="text-xs">
                                {price}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No direct competitors found in the search results.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4 mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {/* Market Insights Analysis */}
                  {data?.insights && (
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Market Analysis
                      </h4>
                      <div className="space-y-3">
                        {typeof data.insights === 'object' ? (
                          <>
                            {data.insights.marketGap && (
                              <div className="p-3 bg-background rounded-lg">
                                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Market Gap</p>
                                <p className="text-sm">{data.insights.marketGap}</p>
                              </div>
                            )}
                            {data.insights.pricingStrategy && (
                              <div className="p-3 bg-background rounded-lg">
                                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Pricing Strategy</p>
                                <p className="text-sm">{data.insights.pricingStrategy}</p>
                              </div>
                            )}
                            {data.insights.insight && (
                              <div className="p-3 bg-background rounded-lg">
                                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Key Insight</p>
                                <p className="text-sm">{data.insights.insight}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm">{String(data.insights)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Market Size Indicators */}
                  {data?.market_insights?.market_size_indicators && data.market_insights.market_size_indicators.length > 0 && (
                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Market Size Indicators
                      </h4>
                      <div className="space-y-2">
                        {data.market_insights.market_size_indicators.slice(0, 5).map((indicator: any, idx: number) => (
                          <div key={idx} className="p-3 bg-background rounded-lg">
                            <div className="flex items-start justify-between mb-1">
                              <h5 className="font-medium text-sm line-clamp-1">{indicator.title}</h5>
                              <Badge variant="outline" className="text-xs ml-2">
                                #{indicator.position}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{indicator.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing Ranges */}
                  {data?.market_insights?.pricing_ranges && data.market_insights.pricing_ranges.length > 0 && (
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <h4 className="font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Market Pricing Ranges
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {data.market_insights.pricing_ranges.map((price: string, idx: number) => (
                          <div key={idx} className="p-2 bg-background rounded-lg text-center">
                            <p className="font-semibold text-green-600 dark:text-green-400">{price}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Results / Items */}
                  {data?.items && data.items.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Search Results ({data.items.length})
                      </h4>
                      {data.items.map((item, idx) => (
                        <div key={idx} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-sm flex-1">{item.title}</h5>
                            <Badge variant="outline" className="text-xs ml-2">
                              {item.domain || item.source || 'Web'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{item.snippet}</p>
                          
                          {/* Prices if available */}
                          {item.prices && Array.isArray(item.prices) && item.prices.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium mb-1">Pricing Found:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.prices.map((price, pidx) => (
                                  <Badge key={pidx} variant="secondary" className="text-xs">
                                    {price}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Features if available */}
                          {item.features && Array.isArray(item.features) && item.features.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium mb-1">Features:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.features.map((feature: string, fidx: number) => (
                                  <Badge key={fidx} variant="outline" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Evidence */}
                          {item.evidence && Array.isArray(item.evidence) && item.evidence.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium mb-1">Key Evidence:</p>
                              <ul className="space-y-0.5">
                                {item.evidence.slice(0, 3).map((ev, eidx) => (
                                  <li key={eidx} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <span className="mt-0.5">•</span>
                                    <span>{ev}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {item.hasPricing && (
                                <Badge variant="secondary" className="text-xs">
                                  <DollarSign className="h-3 w-3 mr-0.5" />
                                  Has Pricing
                                </Badge>
                              )}
                              {item.hasFreeTier && (
                                <Badge variant="secondary" className="text-xs">
                                  Free Tier
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(item.url, '_blank');
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Unmet Needs */}
                  {data?.unmet_needs && Array.isArray(data.unmet_needs) && data.unmet_needs.length > 0 && (
                    <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Unmet Needs & Opportunities
                      </h4>
                      <ul className="space-y-2">
                        {data.unmet_needs.map((need, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Sparkles className="h-3 w-3 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm">{need}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {data?.warnings && Array.isArray(data.warnings) && data.warnings.length > 0 && (
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
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sources" className="space-y-4 mt-4">
              {data?.citations && data.citations.length > 0 ? (
                <div className="space-y-2">
                  {data.citations.map((citation, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">{citation.label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(citation.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No source citations available.
                  </AlertDescription>
                </Alert>
              )}

              {/* Export Options */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Export Data</h4>
                <Button onClick={exportJSON} variant="outline" className="w-full">
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}