import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  RefreshCw, AlertCircle, ExternalLink, Clock, HelpCircle,
  TrendingUp, TrendingDown, Minus, CheckCircle, Newspaper,
  Globe, Target, DollarSign, BarChart3, Activity, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TileInsightsDialog } from './TileInsightsDialog';

interface MarketTrendsTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  className?: string;
  description?: string;
  currentIdea?: string;
}

interface TileData {
  type?: 'single' | 'continental';
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: number | string;
    unit?: string;
    explanation?: string;
    confidence?: number;
    change?: string;
    trend?: 'up' | 'down' | 'stable';
  }>;
  series?: Array<{
    name: string;
    data: number[];
    labels?: string[];
  }>;
  chart?: {
    data: Array<{ label: string; value: number; secondary?: number }>;
  };
  items?: Array<{
    title: string;
    snippet: string;
    url?: string;
    source?: string;
    published?: string;
  }>;
  insights?: string[];
  warnings?: string[];
  top_queries?: Array<{
    query?: string;
    text?: string;
    term?: string;
    value?: number;
    change?: string;
  }>;
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  competitors?: Array<{
    name: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  segments?: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  projections?: {
    revenue?: number[];
    users?: number[];
    timeline?: string[];
  };
  citations?: Array<{
    url: string;
    label: string;
    published?: string;
  }>;
  fromCache?: boolean;
  cacheTimestamp?: number;
  stale?: boolean;
  error?: string;
  score?: number;
  factors?: Record<string, any>;
}

export function MarketTrendsTile({ 
  title, 
  icon: Icon, 
  tileType, 
  filters,
  className,
  description,
  currentIdea
}: MarketTrendsTileProps) {
  const [data, setData] = useState<TileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  // Get the current idea
  const ideaText = currentIdea || 
    filters?.idea_keywords?.join(' ') || 
    (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
  
  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!ideaText) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check localStorage for cached data first
      const cacheKeyStorage = `${tileType}-cache:${ideaText}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData && !isRefreshing) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
        
        if (cacheAge < CACHE_DURATION) {
          setData({ ...parsed.data, fromCache: true, cacheTimestamp: parsed.timestamp });
          setIsLoading(false);
          return;
        }
      }
      
      // Fetch fresh data based on tile type
      let response, fetchError;
      
      if (['pmf_score', 'market_size', 'competition', 'sentiment'].includes(tileType)) {
        // Quick stats tiles
        const functionMap: Record<string, string> = {
          'pmf_score': 'smoothbrains-score',
          'market_size': 'market-size',
          'competition': 'competition',
          'sentiment': 'sentiment'
        };
        
        const result = await supabase.functions.invoke(functionMap[tileType], {
          body: { idea: ideaText }
        });
        response = result.data;
        fetchError = result.error;
      } else if (tileType === 'news_analysis') {
        const result = await supabase.functions.invoke('news-analysis', {
          body: { 
            idea: ideaText,
            industry: filters?.industry || '',
            geo: filters?.geography || 'global',
            time_window: filters?.time_window || 'last_90_days'
          }
        });
        response = result.data;
        fetchError = result.error;
      } else if (tileType === 'market_trends') {
        const result = await supabase.functions.invoke('market-trends', {
          body: { 
            idea: ideaText,
            keywords: ideaText.split(' ').filter(w => w.length > 2)
          }
        });
        response = result.data;
        fetchError = result.error;
      } else {
        // Try web-search-ai first, then fallback to specific functions
        try {
          const result = await supabase.functions.invoke('web-search-ai', {
            body: { tileType, filters, query: ideaText }
          });
          response = result.data;
          fetchError = result.error;
          
          if (fetchError) throw fetchError;
        } catch (primaryError) {
          // Fallback to specific edge functions
          const fallbackFunctions: Record<string, string> = {
            'google_trends': 'google-trends',
            'web_search': 'web-search',
            'reddit_sentiment': 'reddit-search',
            'youtube_analytics': 'youtube-search',
            'twitter_buzz': 'twitter-search',
            'amazon_reviews': 'amazon-public',
            'competitor_analysis': 'competitor-analysis',
            'target_audience': 'dashboard-insights',
            'pricing_strategy': 'dashboard-insights',
            'growth_projections': 'dashboard-insights',
            'user_engagement': 'dashboard-insights',
            'launch_timeline': 'dashboard-insights'
          };
          
          const fallbackFunction = fallbackFunctions[tileType] || 'dashboard-insights';
          const result = await supabase.functions.invoke(fallbackFunction, {
            body: { query: ideaText, filters, tileType }
          });
          response = result.data;
          fetchError = result.error;
        }
      }
      
      if (fetchError) throw new Error(fetchError.message || 'Failed to fetch data');
      
      // Transform response to standard format
      const standardizedData = transformToStandardFormat(tileType, response);
      
      // Store in localStorage with timestamp
      if (standardizedData) {
        localStorage.setItem(cacheKeyStorage, JSON.stringify({
          data: standardizedData,
          timestamp: Date.now()
        }));
        setData(standardizedData);
      }
    } catch (err) {
      console.error(`Error fetching ${tileType} data:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [ideaText, tileType, filters, isRefreshing]);



  // Transform response to standard format
  const transformToStandardFormat = useCallback((type: string, response: any): TileData => {
    const now = new Date().toISOString();
    
    // Base structure - preserve all original response properties
    let standardData: TileData = {
      ...response, // Preserve all original properties first
      updatedAt: response?.updatedAt || now,
      filters,
      metrics: [],
      insights: response?.insights || [],
      items: response?.items || [],
      fromCache: false,
      stale: false
    };

    // Type-specific transformations
    switch (type) {
      case 'pmf_score':
        const score = response?.score || 0;
        standardData.score = score;
        standardData.factors = response?.factors || {};
        standardData.metrics = [{
          name: 'PMF Score',
          value: `${score}%`,
          unit: '',
          explanation: score >= 70 ? 'Strong PMF' : score >= 40 ? 'Moderate PMF' : 'Needs Work',
          confidence: score / 100
        }];
        standardData.sentiment = {
          positive: score >= 70 ? 85 : score >= 40 ? 60 : 30,
          neutral: score >= 70 ? 10 : score >= 40 ? 30 : 40,
          negative: score >= 70 ? 5 : score >= 40 ? 10 : 30
        };
        break;
        
      case 'market_size':
        const tam = response?.tam || response?.market_size?.tam || 0;
        const sam = response?.sam || response?.market_size?.sam || 0;
        const som = response?.som || response?.market_size?.som || 0;
        standardData.metrics = [
          { name: 'TAM', value: formatCurrency(tam), explanation: 'Total Addressable Market' },
          { name: 'SAM', value: formatCurrency(sam), explanation: 'Serviceable Addressable Market' },
          { name: 'SOM', value: formatCurrency(som), explanation: 'Serviceable Obtainable Market' },
          { name: 'Market Maturity', value: response?.maturity || 'Medium', explanation: 'Market development stage' }
        ];
        break;
        
      case 'competition':
        standardData.metrics = [
          { name: 'Competition Level', value: response?.level || 'Medium', explanation: 'Market competition intensity' },
          { name: 'Key Players', value: response?.competitors?.length || 0, unit: 'companies', explanation: 'Major competitors identified' },
          { name: 'Market Share', value: response?.marketShare || 'N/A', explanation: 'Available market share' },
          { name: 'Barrier to Entry', value: response?.barrier || 'Medium', explanation: 'Difficulty entering market' }
        ];
        standardData.competitors = response?.competitors || [];
        break;
        
      case 'sentiment':
        const sentimentScore = response?.score || 0;
        standardData.metrics = [
          { name: 'Overall Sentiment', value: `${sentimentScore}%`, explanation: 'Positive sentiment score' },
          { name: 'Confidence', value: response?.confidence || 'Medium', explanation: 'Data confidence level' }
        ];
        standardData.sentiment = {
          positive: sentimentScore,
          neutral: Math.max(0, 100 - sentimentScore - (sentimentScore < 50 ? 50 - sentimentScore : 0)),
          negative: sentimentScore < 50 ? 50 - sentimentScore : Math.max(0, 100 - sentimentScore)
        };
        break;
        
      default:
        // For other tile types, preserve the response data structure
        standardData.metrics = response?.metrics || [];
        standardData.series = response?.series || [];
        standardData.chart = response?.chart || null;
        standardData.items = response?.items || [];
        standardData.insights = response?.insights || [];
        standardData.top_queries = response?.top_queries || [];
        standardData.sentiment = response?.sentiment || null;
        standardData.competitors = response?.competitors || [];
        standardData.segments = response?.segments || [];
        standardData.projections = response?.projections || null;
        standardData.citations = response?.citations || [];
        standardData.error = response?.error || null;
        
        // If no metrics exist, create a default one
        if (!standardData.metrics || standardData.metrics.length === 0) {
          standardData.metrics = [
            { name: 'Data Status', value: 'Available', explanation: 'Click to explore details' }
          ];
        }
        break;
    }

    // Ensure we always have some chart data if possible
    if (!standardData.series && !standardData.chart && standardData.metrics) {
      // Generate simple chart data from metrics
      const chartData = standardData.metrics
        .filter(m => {
          const val = String(m.value).replace(/[^\d.-]/g, ''); // Remove non-numeric chars except decimal and minus
          return val && !isNaN(parseFloat(val));
        })
        .slice(0, 4)
        .map((m, i) => {
          const cleanValue = String(m.value).replace(/[^\d.-]/g, '');
          return {
            label: m.name,
            value: parseFloat(cleanValue) || 0
          };
        });
      
      if (chartData.length > 0) {
        standardData.chart = { data: chartData };
      }
    }



    return standardData;
  }, [filters]);

  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
  };

  // Auto-load on mount
  useEffect(() => {
    if (!hasLoadedOnce && ideaText) {
      setHasLoadedOnce(true);
      fetchData();
    }
  }, [hasLoadedOnce, ideaText, fetchData]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache
      const cacheKeyStorage = `${tileType}-cache:${ideaText}`;
      localStorage.removeItem(cacheKeyStorage);
      
      // Force fresh fetch
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Prepare chart data
  const chartData = (() => {
    if (data?.chart?.data) {
      return data.chart.data;
    }
    
    if (data?.series && data.series.length > 0) {
      const primarySeries = data.series[0];
      const secondarySeries = data.series[1];
      
      if (primarySeries?.data && primarySeries.data.length > 0) {
        return primarySeries.data.map((value, i) => ({
          label: primarySeries.labels?.[i] || `Week ${i + 1}`,
          value: value,
          secondary: secondarySeries?.data?.[i] || 0
        }));
      }
    }
    
    return [];
  })();

  // Get trend info
  const trendDirection = data?.metrics?.find(m => m.name.toLowerCase().includes('trend'))?.value || 'stable';
  const getTrendIcon = () => {
    const direction = String(trendDirection).toLowerCase();
    if (direction.includes('up') || direction.includes('rising') || direction.includes('positive')) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (direction.includes('down') || direction.includes('declining') || direction.includes('negative')) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  if (!ideaText) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
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

  if (error) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || `Failed to load ${title.toLowerCase()}`}
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

  if (isLoading && !data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
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

  return (
    <>
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
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
                <Icon className="h-5 w-5" />
                {title}
              </CardTitle>
              {data && (
                <div>
                  {data.fromCache ? (
                    <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1 animate-pulse" />
                      Cached • {(() => {
                        if (!data.cacheTimestamp) return 'cached';
                        const age = Date.now() - data.cacheTimestamp;
                        const hours = Math.floor(age / (1000 * 60 * 60));
                        const days = Math.floor(hours / 24);
                        if (days > 0) return `${days}d ago`;
                        if (hours > 0) return `${hours}h ago`;
                        const minutes = Math.floor(age / (1000 * 60));
                        return `${minutes}m ago`;
                      })()}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                      Fresh data
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowInsights(true)}
                    className="h-8 w-8"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-semibold">What is {title} helpful for?</p>
                    <p className="text-sm">{description || `Analyze ${title.toLowerCase()} data for your startup idea.`}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                className="h-8"
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", (isLoading || isRefreshing) && "animate-spin")} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              {data && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {getTrendIcon()}
                  {trendDirection}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Chart Section */}
          {chartData.length > 0 && (
            <ChartContainer
              config={{
                value: { label: "Primary", color: "hsl(var(--primary))" },
                secondary: { label: "Secondary", color: "hsl(var(--secondary))" },
              }}
              className="h-48"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
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
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Primary"
                  />
                  {chartData.some(d => d.secondary !== undefined) && (
                    <Line 
                      type="monotone" 
                      dataKey="secondary" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      dot={false}
                      name="Secondary"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}

          {/* Key Metrics */}
          {data?.metrics && data.metrics.length > 0 && (
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
                  {metric.explanation && (
                    <p className="text-xs text-muted-foreground mt-1">{metric.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Special handling for PMF Score with factors */}
          {tileType === 'pmf_score' && data?.factors && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                PMF Factors
              </h4>
              <div className="space-y-2">
                {Object.entries(data.factors).slice(0, 3).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between text-xs bg-muted/5 rounded p-2">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{value.score || value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights */}
          {data?.insights && data.insights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key Insights
              </h4>
              <div className="space-y-1">
                {data.insights.slice(0, 3).map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latest Items/News */}
          {data?.items && data.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Latest Updates
              </h4>
              <div className="space-y-2">
                {data.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="p-2 bg-muted/10 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1">{item.title}</p>
                        {item.snippet && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.snippet}</p>
                        )}
                      </div>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 flex-shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {item.source && (
                      <div className="flex items-center gap-1 mt-1">
                        <Newspaper className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.source}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Analysis (for applicable tiles) */}
          {(data?.sentiment || (['pmf_score', 'sentiment'].includes(tileType) && data)) && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs font-medium">Positive</span>
                </div>
                <div className="text-lg font-bold text-green-600">
                  {data?.sentiment?.positive || 
                   (tileType === 'pmf_score' && data?.score >= 70 ? 85 : 
                    tileType === 'pmf_score' && data?.score >= 40 ? 60 : 30) ||
                   (tileType === 'sentiment' && data?.score) ||
                   'N/A'}%
                </div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <Minus className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-medium">Neutral</span>
                </div>
                <div className="text-lg font-bold text-yellow-600">
                  {data?.sentiment?.neutral || 
                   (tileType === 'pmf_score' && data?.score >= 70 ? 10 : 
                    tileType === 'pmf_score' && data?.score >= 40 ? 30 : 40) ||
                   Math.max(0, 100 - (data?.score || 0)) ||
                   'N/A'}%
                </div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-medium">Negative</span>
                </div>
                <div className="text-lg font-bold text-red-600">
                  {data?.sentiment?.negative || 
                   (tileType === 'pmf_score' && data?.score >= 70 ? 5 : 
                    tileType === 'pmf_score' && data?.score >= 40 ? 10 : 30) ||
                   Math.max(0, 100 - (data?.score || 0)) ||
                   'N/A'}%
                </div>
              </div>
            </div>
          )}

          {/* Top Queries (for search-related tiles) */}
          {data?.top_queries && data.top_queries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top Related Queries
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.top_queries.slice(0, 6).map((query, idx) => {
                  const queryText = query.query || query.text || query.term || '';
                  if (!queryText || /^\d+$/.test(String(queryText))) return null;
                  
                  return (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {String(queryText)}
                      {query.change && (
                        <span className="ml-1 text-green-500">{query.change}</span>
                      )}
                    </Badge>
                  );
                }).filter(Boolean)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Sheet */}
      <Sheet open={showSources} onOpenChange={setShowSources}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title} Details
            </SheetTitle>
            <SheetDescription>
              Complete data and insights for {title.toLowerCase()}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {data && (
              <>
                {data.metrics && data.metrics.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">All Metrics</h3>
                    <div className="space-y-3">
                      {data.metrics.map((metric, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{metric.name}</p>
                              <p className="text-lg font-semibold mt-1">
                                {metric.value}
                                {metric.unit && <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>}
                              </p>
                              {metric.explanation && (
                                <p className="text-sm text-muted-foreground mt-2">{metric.explanation}</p>
                              )}
                            </div>
                            {metric.confidence !== undefined && (
                              <Badge variant={metric.confidence > 0.7 ? 'default' : metric.confidence > 0.4 ? 'secondary' : 'outline'}>
                                {Math.round(metric.confidence * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {data.insights && data.insights.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">All Insights</h3>
                    <ul className="space-y-2">
                      {data.insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Insights Dialog */}
      <TileInsightsDialog 
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}