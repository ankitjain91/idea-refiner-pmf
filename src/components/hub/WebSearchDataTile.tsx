import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, Search, Users, Target, DollarSign, AlertCircle, 
  ChevronRight, RefreshCw, Sparkles, Brain, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Minus, HelpCircle, ShoppingCart,
  Download, FileJson, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import useSWR from 'swr';
import { TileInsightsDialog } from './TileInsightsDialog';

interface WebSearchDataTileProps {
  idea: string;
  industry?: string;
  geography?: string;
  timeWindow?: string;
  className?: string;
}

interface ProfitabilityData {
  updatedAt: string;
  filters: any;
  metrics: {
    profitability_score: number;
    market_sentiment: number;
    competition_level: string;
    market_size_estimate: string;
    unmet_needs: number;
  };
  top_queries: Array<{
    query: string;
    impressions: number;
    difficulty: string;
  }>;
  competitors: Array<{
    name: string;
    domain: string;
    pricing: string;
    features: string[];
  }>;
  citations: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  insights: {
    summary: string;
    opportunities: string[];
    challenges: string[];
    recommendations: string[];
  };
  cost_estimates: {
    mvp_cost: string;
    monthly_operating: string;
    time_to_market: string;
  };
  search_results?: {
    unmet_needs: Array<{
      title: string;
      url: string;
      snippet: string;
      snippet_highlighted_words?: string[];
    }>;
  };
  fromCache?: boolean;
  cacheTimestamp?: number;
}

export function WebSearchDataTile({ idea, industry, geography, timeWindow, className }: WebSearchDataTileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [groqInsights, setGroqInsights] = useState<any>(null);
  const { toast } = useToast();

  // Fallback to localStorage if idea is not provided
  const actualIdea = idea || localStorage.getItem('pmfCurrentIdea') || localStorage.getItem('userIdea') || '';

  // Cache key for SWR
  const cacheKey = hasLoadedOnce && actualIdea ? `web-search-profitability:${actualIdea}:${industry}:${geography}` : null;

  const { data, error, isLoading, mutate } = useSWR<ProfitabilityData>(
    cacheKey,
    async (key) => {
      // Check localStorage for cached data first
      const cacheKeyStorage = `web-search-cache:${actualIdea}:${industry}:${geography}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const THIRTY_MINUTES = 30 * 60 * 1000;
        
        // Return cached data if less than 30 minutes old
        if (cacheAge < THIRTY_MINUTES) {
          return { ...parsed.data, fromCache: true, cacheTimestamp: parsed.timestamp };
        }
      }
      
      // Fetch fresh data if cache is stale or missing
      const { data, error } = await supabase.functions.invoke('web-search-profitability', {
        body: { 
          idea: actualIdea,
          industry,
          geography,
          timeWindow 
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
      dedupingInterval: 300000, // 5 minutes
      shouldRetryOnError: true,
      errorRetryCount: 2,
      revalidateOnMount: false
    }
  );

  // Initial load handler
  const handleInitialLoad = async () => {
    setHasLoadedOnce(true);
  };

  // Manual refresh handler - bypasses cache
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache for this key to force fresh data
      const cacheKeyStorage = `web-search-cache:${actualIdea}:${industry}:${geography}`;
      localStorage.removeItem(cacheKeyStorage);
      
      // Force a fresh fetch by passing revalidate option
      await mutate(undefined, { revalidate: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Analyze with Groq
  const analyzeWithGroq = async () => {
    if (!data || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('groq-synthesis', {
        body: {
          webSearchData: {
            idea: actualIdea,
            metrics: data.metrics,
            competitors: data.competitors,
            insights: data.insights,
            cost_estimates: data.cost_estimates,
            top_queries: data.top_queries
          }
        }
      });

      if (error) throw error;
      
      setGroqInsights(response.analysis);
      setShowInsights(true);
    } catch (error) {
      console.error('Error analyzing with Groq:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to generate insights at this time",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportJSON = () => {
    if (!data) return;
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `web-search-analysis-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Export Successful",
      description: "Analysis data exported as JSON",
    });
  };

  const getMetricStyle = (value: number | string, type: string) => {
    if (type === 'profitability_score' || type === 'market_sentiment') {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (numValue >= 70) return { color: 'text-green-600 dark:text-green-400', icon: <TrendingUp className="h-3 w-3" /> };
      if (numValue >= 40) return { color: 'text-yellow-600 dark:text-yellow-400', icon: <Minus className="h-3 w-3" /> };
      return { color: 'text-red-600 dark:text-red-400', icon: <TrendingDown className="h-3 w-3" /> };
    }
    if (type === 'competition_level') {
      if (value === 'Low') return { color: 'text-green-600 dark:text-green-400', icon: <ArrowDownRight className="h-3 w-3" /> };
      if (value === 'Medium') return { color: 'text-yellow-600 dark:text-yellow-400', icon: <Minus className="h-3 w-3" /> };
      return { color: 'text-red-600 dark:text-red-400', icon: <ArrowUpRight className="h-3 w-3" /> };
    }
    return { color: 'text-muted-foreground', icon: null };
  };

  // Show Load Data button if not loaded once
  if (!hasLoadedOnce) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Web Search Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-center space-y-2">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto" />
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

  if (isLoading && !data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Web Search Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Web Search Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load analysis: {error?.message || 'Unknown error'}
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

  return (
    <>
      <Card 
        className={cn("h-full cursor-pointer hover:shadow-lg transition-all duration-300", className)}
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Web Search Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              {data?.fromCache && (
                <Badge 
                  variant="secondary" 
                  className="text-xs py-0 px-1.5 h-5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1 animate-pulse" />
                  Cached
                </Badge>
              )}
              {data?.updatedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(data.updatedAt).toLocaleTimeString()}</span>
                </div>
              )}
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        analyzeWithGroq();
                      }}
                      disabled={isAnalyzing}
                      className="h-7 w-7"
                    >
                      {isAnalyzing ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Analyze with AI</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowInsights(true);
                      }}
                      className="h-7 w-7"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>How this works</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefresh();
                      }}
                      disabled={isRefreshing}
                      className="h-7 w-7"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="h-7 w-7"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {data && (
            <>
              {/* Summary Metrics - Always visible */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Profitability</p>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-xl font-bold", getMetricStyle(data.metrics.profitability_score, 'profitability_score').color)}>
                      {data.metrics.profitability_score}%
                    </span>
                    {getMetricStyle(data.metrics.profitability_score, 'profitability_score').icon}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Market Size</p>
                  <p className="text-sm font-medium truncate">{data.metrics.market_size_estimate}</p>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="space-y-4 pt-2 border-t animate-fade-in">
                  {/* Top Search Queries */}
                  {data.top_queries && data.top_queries.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Top Search Queries</p>
                      <div className="space-y-1">
                        {data.top_queries.slice(0, 3).map((query, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate flex-1 mr-2">{query.query}</span>
                            <Badge variant={query.difficulty === 'Low' ? 'default' : query.difficulty === 'Medium' ? 'secondary' : 'destructive'} className="text-xs">
                              {query.difficulty}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Insights */}
                  {data.insights && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Key Insights</p>
                      <p className="text-xs text-muted-foreground line-clamp-3">{data.insights.summary}</p>
                    </div>
                  )}

                  {/* Cost Estimates */}
                  {data.cost_estimates && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">MVP Cost</p>
                        <p className="font-medium">{data.cost_estimates.mvp_cost || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Monthly</p>
                        <p className="font-medium">{data.cost_estimates.monthly_operating || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Timeline</p>
                        <p className="font-medium">{data.cost_estimates.time_to_market || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{data.competitors?.length || 0} Competitors</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span>{data.metrics.unmet_needs} Unmet Needs</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detailed Sheet View */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Web Search Analysis</span>
              <Button
                variant="outline"
                size="sm"
                onClick={exportJSON}
              >
                <FileJson className="h-4 w-4 mr-2" />
                Export
              </Button>
            </SheetTitle>
            <SheetDescription>
              Comprehensive market analysis based on web search data
            </SheetDescription>
          </SheetHeader>
          
          {data && (
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="competitors">Competitors</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Detailed Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Profitability Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-2xl font-bold", getMetricStyle(data.metrics.profitability_score, 'profitability_score').color)}>
                        {data.metrics.profitability_score}%
                      </span>
                      {getMetricStyle(data.metrics.profitability_score, 'profitability_score').icon}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Market Sentiment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-2xl font-bold", getMetricStyle(data.metrics.market_sentiment, 'market_sentiment').color)}>
                        {data.metrics.market_sentiment}%
                      </span>
                      {getMetricStyle(data.metrics.market_sentiment, 'market_sentiment').icon}
                    </div>
                  </div>
                </div>
                
                {/* Market Analysis */}
                <div className="space-y-3">
                  <h3 className="font-medium">Market Analysis</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Competition Level</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("font-medium", getMetricStyle(data.metrics.competition_level, 'competition_level').color)}>
                          {data.metrics.competition_level}
                        </span>
                        {getMetricStyle(data.metrics.competition_level, 'competition_level').icon}
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Market Size</p>
                      <p className="font-medium mt-1">{data.metrics.market_size_estimate}</p>
                    </div>
                  </div>
                </div>
                
                {/* Cost Estimates */}
                {data.cost_estimates && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Development Estimates</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">MVP Cost</p>
                        <p className="font-medium mt-1">{data.cost_estimates.mvp_cost || 'N/A'}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Monthly Operating</p>
                        <p className="font-medium mt-1">{data.cost_estimates.monthly_operating || 'N/A'}</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Time to Market</p>
                        <p className="font-medium mt-1">{data.cost_estimates.time_to_market || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="competitors" className="space-y-4 mt-4">
                {data.competitors && data.competitors.length > 0 ? (
                  <div className="space-y-3">
                    {data.competitors.map((competitor, idx) => (
                      <div key={idx} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{competitor.name}</h4>
                          <a 
                            href={`https://${competitor.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {competitor.domain}
                          </a>
                        </div>
                        <p className="text-sm text-muted-foreground">Pricing: {competitor.pricing}</p>
                        {competitor.features && competitor.features.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {competitor.features.slice(0, 5).map((feature, fIdx) => (
                              <Badge key={fIdx} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No competitor data available</p>
                )}
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4 mt-4">
                {groqInsights ? (
                  <div className="space-y-4">
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        AI-generated insights based on market analysis
                      </AlertDescription>
                    </Alert>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{groqInsights}</p>
                    </div>
                  </div>
                ) : data.insights ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Summary</h3>
                      <p className="text-sm text-muted-foreground">{data.insights.summary}</p>
                    </div>
                    
                    {data.insights.opportunities && data.insights.opportunities.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Opportunities</h3>
                        <ul className="space-y-1">
                          {data.insights.opportunities.map((opp, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-500" />
                              <span>{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {data.insights.challenges && data.insights.challenges.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Challenges</h3>
                        <ul className="space-y-1">
                          {data.insights.challenges.map((challenge, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-yellow-500" />
                              <span>{challenge}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No insights generated yet</p>
                    <Button onClick={analyzeWithGroq} disabled={isAnalyzing}>
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate AI Insights
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sources" className="space-y-4 mt-4">
                {data.citations && data.citations.length > 0 ? (
                  <div className="space-y-3">
                    {data.citations.map((citation, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-1">
                        <a 
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:underline text-blue-600 dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {citation.title}
                        </a>
                        <p className="text-xs text-muted-foreground line-clamp-2">{citation.snippet}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No sources available</p>
                )}
                
                {data.search_results?.unmet_needs && data.search_results.unmet_needs.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-medium">Unmet Needs</h3>
                    {data.search_results.unmet_needs.slice(0, 5).map((result, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-1">
                        <a 
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:underline text-blue-600 dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {result.title}
                        </a>
                        <p className="text-xs text-muted-foreground">{result.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Insights Dialog */}
      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType="web_search"
      />
    </>
  );
}