import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, Search, Users, Target, DollarSign, AlertCircle, 
  Brain, TrendingDown, Minus, Clock, CheckCircle, Lightbulb,
  RefreshCw, Sparkles, ChevronDown, ChevronUp, HelpCircle
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

export function WebSearchDataTile({ idea, industry, geography, timeWindow, className }: WebSearchDataTileProps) {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const actualIdea = idea || localStorage.getItem('pmfCurrentIdea') || localStorage.getItem('userIdea') || '';
  const cacheKey = hasLoadedOnce && actualIdea ? `web-search-profitability:${actualIdea}:${industry}:${geography}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    async () => {
      const cacheKeyStorage = `web-search-cache:${actualIdea}:${industry}:${geography}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const THIRTY_MINUTES = 30 * 60 * 1000;
        
        if (cacheAge < THIRTY_MINUTES) {
          return { ...parsed.data, fromCache: true, cacheTimestamp: parsed.timestamp };
        }
      }
      
      const { data, error } = await supabase.functions.invoke('web-search-profitability', {
        body: { 
          idea: actualIdea,
          industry: industry || '',
          geography: geography || 'global',
          timeWindow: timeWindow || 'last_12_months'
        }
      });
      
      if (error) throw error;
      
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
      dedupingInterval: 300000,
      shouldRetryOnError: true,
      errorRetryCount: 2,
      revalidateOnMount: false
    }
  );

  // Auto-load on mount
  useEffect(() => {
    if (!hasLoadedOnce && actualIdea) {
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, actualIdea]);

  const analyzeWithGroq = async () => {
    if (!data || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('groq-synthesis', {
        body: {
          webSearchData: {
            idea: actualIdea,
            metrics: parseMetrics(data),
            competitors: data.competitors,
            insights: data.insights,
            cost_estimate: data.cost_estimate,
            top_queries: data.top_queries
          }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Analysis Complete",
        description: "AI insights have been generated successfully",
      });
      
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const cacheKeyStorage = `web-search-cache:${actualIdea}:${industry}:${geography}`;
      localStorage.removeItem(cacheKeyStorage);
      await mutate(undefined, { revalidate: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Parse metrics into more usable format
  const parseMetrics = (data: any) => {
    if (!data) return null;
    
    const result: any = {
      profitability_score: 0,
      market_sentiment: 0,
      competition_level: 'Unknown',
      market_size: 'Unknown',
      unmet_needs: 0
    };

    if (data.metrics && Array.isArray(data.metrics)) {
      data.metrics.forEach((metric: any) => {
        if (metric.name === 'Competition Intensity') {
          result.competition_level = metric.value;
        } else if (metric.name === 'Monetization Potential') {
          result.market_sentiment = metric.value === 'high' ? 85 : metric.value === 'medium' ? 60 : 35;
        } else if (metric.name === 'Market Maturity') {
          result.profitability_score = metric.value === 'mature' ? 75 : metric.value === 'emerging' ? 50 : 25;
        }
      });
    }

    if (data.unmet_needs) {
      result.unmet_needs = data.unmet_needs.length;
    }

    if (data.insights?.marketGap) {
      result.market_size = '$10B-50B'; // Default estimate
    }

    return result;
  };

  const getMetricStyle = (value: number | string, type: string) => {
    if (type === 'profitability_score' || type === 'market_sentiment') {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (numValue >= 70) return { color: 'text-green-600 dark:text-green-400', icon: <TrendingUp className="h-3 w-3" /> };
      if (numValue >= 40) return { color: 'text-yellow-600 dark:text-yellow-400', icon: <Minus className="h-3 w-3" /> };
      return { color: 'text-red-600 dark:text-red-400', icon: <TrendingDown className="h-3 w-3" /> };
    }
    if (type === 'competition_level') {
      const val = typeof value === 'string' ? value.toLowerCase() : '';
      if (val === 'low') return { color: 'text-green-600 dark:text-green-400' };
      if (val === 'medium') return { color: 'text-yellow-600 dark:text-yellow-400' };
      return { color: 'text-red-600 dark:text-red-400' };
    }
    return { color: 'text-muted-foreground', icon: null };
  };


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

  const metrics = parseMetrics(data);

  return (
    <Card className={cn("h-full", className)}>
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
                className="text-xs py-0 px-1.5 h-5"
              >
                Cached
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 w-7"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
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
      </CardHeader>
      
      <CardContent className="space-y-4">
        {data && metrics && (
          <>
            {/* Summary Metrics - Always visible */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Profitability</p>
                <div className="flex items-center gap-1">
                  <span className={cn("text-xl font-bold", getMetricStyle(metrics.profitability_score, 'profitability_score').color)}>
                    {metrics.profitability_score}%
                  </span>
                  {getMetricStyle(metrics.profitability_score, 'profitability_score').icon}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Market Size</p>
                <p className="text-sm font-medium truncate">{metrics.market_size}</p>
              </div>
            </div>

            {/* Expanded Content with Tabs */}
            {isExpanded && (
              <div className="pt-2 border-t">
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="competitors">Competitors</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                    <TabsTrigger value="costs">Costs</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-3 mt-3">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      <Card className="p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Sentiment</span>
                          <span className={`text-sm font-bold ${getMetricStyle(metrics.market_sentiment, 'market_sentiment').color}`}>
                            {metrics.market_sentiment}%
                          </span>
                        </div>
                        <Progress value={metrics.market_sentiment} className="h-1 mt-1" />
                      </Card>
                      
                      <Card className="p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Competition</span>
                          <Badge variant={metrics.competition_level === 'low' ? 'default' : 
                                        metrics.competition_level === 'medium' ? 'secondary' : 'destructive'}
                                 className="text-xs">
                            {metrics.competition_level}
                          </Badge>
                        </div>
                      </Card>
                    </div>

                    {/* Unmet Needs */}
                    <div className="grid grid-cols-2 gap-2">
                      <Card className="p-2">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Unmet Needs</p>
                            <p className="text-xs font-medium">{metrics.unmet_needs} found</p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-2">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Size</p>
                            <p className="text-xs font-medium truncate">{metrics.market_size}</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Top Search Queries */}
                    {data.top_queries && data.top_queries.length > 0 && (
                      <Card className="p-2">
                        <p className="text-xs font-medium mb-1">Top Searches</p>
                        <div className="space-y-0.5">
                          {data.top_queries.slice(0, 3).map((query: string, idx: number) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground truncate flex-1 mr-1">
                                {query}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="competitors" className="space-y-2 mt-3">
                    {data.competitors && data.competitors.map((competitor: any, idx: number) => (
                      <Card key={idx} className="p-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-medium">{competitor.domain}</h4>
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              {competitor.appearances} appearances
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {(!data.competitors || data.competitors.length === 0) && (
                      <Card className="p-2">
                        <p className="text-xs text-muted-foreground">No competitors found</p>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="insights" className="space-y-2 mt-3">
                    {/* Market Gap */}
                    {data.insights?.marketGap && (
                      <Card className="p-2">
                        <p className="text-xs text-muted-foreground mb-1">Market Gap</p>
                        <p className="text-xs line-clamp-3">{data.insights.marketGap}</p>
                      </Card>
                    )}

                    {/* Pricing Strategy */}
                    {data.insights?.pricingStrategy && (
                      <Card className="p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <DollarSign className="h-3 w-3 text-green-500" />
                          <p className="text-xs font-medium">Pricing Strategy</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{data.insights.pricingStrategy}</p>
                      </Card>
                    )}

                    {/* Differentiator */}
                    {data.insights?.differentiator && (
                      <Card className="p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Lightbulb className="h-3 w-3 text-blue-500" />
                          <p className="text-xs font-medium">Key Differentiator</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{data.insights.differentiator}</p>
                      </Card>
                    )}

                    {/* Quick Win */}
                    {data.insights?.quickWin && (
                      <Card className="p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <p className="text-xs font-medium">Quick Win</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{data.insights.quickWin}</p>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="costs" className="space-y-2 mt-3">
                    {data.cost_estimate && (
                      <>
                        <Card className="p-2">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">API Cost</p>
                              <p className="text-xs font-medium">{data.cost_estimate.total_api_cost}</p>
                            </div>
                          </div>
                        </Card>
                        
                        <Card className="p-2">
                          <div className="flex items-center gap-1">
                            <Search className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Data Points</p>
                              <p className="text-xs font-medium">{data.cost_estimate.data_points} collected</p>
                            </div>
                          </div>
                        </Card>
                      </>
                    )}

                    {/* Citations */}
                    {data.citations && data.citations.length > 0 && (
                      <Card className="p-2">
                        <p className="text-xs font-medium mb-1">Sources</p>
                        <div className="space-y-1">
                          {data.citations.slice(0, 2).map((citation: any, idx: number) => (
                            <div key={idx} className="space-y-0.5">
                              <a 
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline line-clamp-1"
                              >
                                {citation.label}
                              </a>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant="default"
                size="sm"
                onClick={analyzeWithGroq}
                disabled={isAnalyzing}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
              >
                {isAnalyzing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInsights(true)}
                className="flex-1"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                How this works
              </Button>
            </div>
          </>
        )}
      </CardContent>
      
      {/* Insights Dialog */}
      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType="web_search"
      />
    </Card>
  );
}