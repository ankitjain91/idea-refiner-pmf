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
  RefreshCw, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import useSWR from 'swr';

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
  cost_estimates?: {
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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded to show all details
  const { toast } = useToast();

  const actualIdea = idea || localStorage.getItem('pmfCurrentIdea') || localStorage.getItem('userIdea') || '';
  const cacheKey = hasLoadedOnce && actualIdea ? `web-search-profitability:${actualIdea}:${industry}:${geography}` : null;

  const { data, error, isLoading, mutate } = useSWR<ProfitabilityData>(
    cacheKey,
    async (key) => {
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
          industry,
          geography,
          timeWindow 
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

  const handleInitialLoad = async () => {
    setHasLoadedOnce(true);
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

  const getMetricStyle = (value: number | string, type: string) => {
    if (type === 'profitability_score' || type === 'market_sentiment') {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (numValue >= 70) return { color: 'text-green-600 dark:text-green-400', icon: <TrendingUp className="h-3 w-3" /> };
      if (numValue >= 40) return { color: 'text-yellow-600 dark:text-yellow-400', icon: <Minus className="h-3 w-3" /> };
      return { color: 'text-red-600 dark:text-red-400', icon: <TrendingDown className="h-3 w-3" /> };
    }
    if (type === 'competition_level') {
      if (value === 'Low') return { color: 'text-green-600 dark:text-green-400' };
      if (value === 'Medium') return { color: 'text-yellow-600 dark:text-yellow-400' };
      return { color: 'text-red-600 dark:text-red-400' };
    }
    return { color: 'text-muted-foreground', icon: null };
  };

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
                          <span className={`text-sm font-bold ${getMetricStyle(data.metrics.market_sentiment, 'market_sentiment').color}`}>
                            {data.metrics.market_sentiment}%
                          </span>
                        </div>
                        <Progress value={data.metrics.market_sentiment} className="h-1 mt-1" />
                      </Card>
                      
                      <Card className="p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Competition</span>
                          <Badge variant={data.metrics.competition_level === 'Low' ? 'default' : 
                                        data.metrics.competition_level === 'Medium' ? 'secondary' : 'destructive'}
                                 className="text-xs">
                            {data.metrics.competition_level}
                          </Badge>
                        </div>
                      </Card>
                    </div>

                    {/* Market Size & Unmet Needs */}
                    <div className="grid grid-cols-2 gap-2">
                      <Card className="p-2">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Unmet Needs</p>
                            <p className="text-xs font-medium">{data.metrics.unmet_needs} found</p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-2">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Size</p>
                            <p className="text-xs font-medium truncate">{data.metrics.market_size_estimate}</p>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Top Search Queries */}
                    {data.top_queries && data.top_queries.length > 0 && (
                      <Card className="p-2">
                        <p className="text-xs font-medium mb-1">Top Searches</p>
                        <div className="space-y-0.5">
                          {data.top_queries.slice(0, 3).map((query, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground truncate flex-1 mr-1">
                                {query.query}
                              </span>
                              <Badge 
                                variant={query.difficulty === 'Low' ? 'default' : 
                                        query.difficulty === 'Medium' ? 'secondary' : 'destructive'}
                                className="text-xs h-4 px-1"
                              >
                                {query.difficulty}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="competitors" className="space-y-2 mt-3">
                    {data.competitors && data.competitors.map((competitor, idx) => (
                      <Card key={idx} className="p-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-medium">{competitor.name}</h4>
                            <Badge variant="outline" className="text-xs h-4 px-1">{competitor.pricing}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{competitor.domain}</p>
                          <div className="flex flex-wrap gap-1">
                            {competitor.features.slice(0, 3).map((feature, fidx) => (
                              <Badge key={fidx} variant="secondary" className="text-xs h-4 px-1">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="insights" className="space-y-2 mt-3">
                    {/* Summary */}
                    <Card className="p-2">
                      <p className="text-xs text-muted-foreground mb-1">Summary</p>
                      <p className="text-xs line-clamp-3">{data.insights.summary}</p>
                    </Card>

                    {/* Opportunities */}
                    {data.insights.opportunities.length > 0 && (
                      <Card className="p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <p className="text-xs font-medium">Opportunities</p>
                        </div>
                        <ul className="space-y-0.5">
                          {data.insights.opportunities.slice(0, 2).map((opp, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground">• {opp}</li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {/* Challenges */}
                    {data.insights.challenges.length > 0 && (
                      <Card className="p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                          <p className="text-xs font-medium">Challenges</p>
                        </div>
                        <ul className="space-y-0.5">
                          {data.insights.challenges.slice(0, 2).map((challenge, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground">• {challenge}</li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {data.insights.recommendations.length > 0 && (
                      <Card className="p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Lightbulb className="h-3 w-3 text-blue-500" />
                          <p className="text-xs font-medium">Recommendations</p>
                        </div>
                        <ul className="space-y-0.5">
                          {data.insights.recommendations.slice(0, 2).map((rec, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground">• {rec}</li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="costs" className="space-y-2 mt-3">
                    {data.cost_estimates && (
                      <>
                        <Card className="p-2">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">MVP Cost</p>
                              <p className="text-xs font-medium">{data.cost_estimates.mvp_cost || 'N/A'}</p>
                            </div>
                          </div>
                        </Card>
                        
                        <Card className="p-2">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Monthly Operating</p>
                              <p className="text-xs font-medium">{data.cost_estimates.monthly_operating || 'N/A'}</p>
                            </div>
                          </div>
                        </Card>
                        
                        <Card className="p-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Time to Market</p>
                              <p className="text-xs font-medium">{data.cost_estimates.time_to_market || 'N/A'}</p>
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
                          {data.citations.slice(0, 2).map((citation, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <a 
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline line-clamp-1"
                              >
                                {citation.title}
                              </a>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {citation.snippet}
                              </p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}