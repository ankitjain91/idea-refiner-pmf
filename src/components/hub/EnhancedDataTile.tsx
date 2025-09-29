import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  RefreshCw, AlertCircle, ExternalLink, Clock, HelpCircle, Info,
  TrendingUp, TrendingDown, Minus, CheckCircle, Newspaper,
  Globe, Target, DollarSign, BarChart3, Activity, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TileInsightsDialog } from './TileInsightsDialog';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { dashboardDataService } from '@/lib/dashboard-data-service';

interface EnhancedDataTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  className?: string;
  description?: string;
  fetchAdapter: (filters: any) => Promise<any>;
  currentIdea?: string;
}

interface MetricInfo {
  calculation: string;
  impact: string;
  target: string;
  action: string;
}

const metricInfoMap: Record<string, Record<string, MetricInfo>> = {
  market_size: {
    'TAM': {
      calculation: "Total Addressable Market = Total market demand × Average price point",
      impact: "Defines the maximum revenue opportunity if you captured 100% market share",
      target: "TAM > $1B indicates a large scalable opportunity",
      action: "Use TAM to justify investment and show growth potential to stakeholders"
    },
    'SAM': {
      calculation: "Serviceable Addressable Market = TAM × Geographic reach × Product fit percentage",
      impact: "Realistic market you can serve with current business model",
      target: "SAM should be 10-40% of TAM for focused go-to-market",
      action: "Target SAM segments first before expanding to full TAM"
    },
    'SOM': {
      calculation: "Serviceable Obtainable Market = SAM × Realistic market share (2-5% for new entrants)",
      impact: "Achievable revenue in next 3-5 years with current resources",
      target: "SOM > $10M validates initial market viability",
      action: "Set revenue targets based on SOM and work backwards to customer acquisition"
    }
  },
  growth_projections: {
    'Growth Rate': {
      calculation: "Year-over-year growth = ((Current - Previous) / Previous) × 100",
      impact: "Indicates market momentum and timing opportunity",
      target: ">20% YoY suggests high growth market",
      action: "High growth = aggressive expansion; Low growth = focus on differentiation"
    },
    'Market Maturity': {
      calculation: "Based on adoption curve position and competitor density",
      impact: "Determines strategy: education vs competition vs disruption",
      target: "Early/Growth stage markets offer best entry opportunities",
      action: "Early stage = educate market; Mature = differentiate or disrupt"
    }
  },
  pmf_score: {
    'PMF Score': {
      calculation: "Weighted average of: Market demand (40%) + Competition (20%) + Sentiment (20%) + Growth (20%)",
      impact: "Predicts likelihood of achieving product-market fit",
      target: ">70% indicates strong PMF potential",
      action: "Score <40%: Pivot idea; 40-70%: Refine positioning; >70%: Accelerate development"
    }
  },
  sentiment: {
    'Sentiment Score': {
      calculation: "Positive mentions / Total mentions × Sentiment strength factor",
      impact: "Indicates market receptiveness and pain point severity",
      target: ">60% positive sentiment shows market need",
      action: "Use negative feedback to improve product; positive to guide messaging"
    }
  }
};

export function EnhancedDataTile({ 
  title, 
  icon: Icon, 
  tileType, 
  filters,
  className,
  description,
  fetchAdapter,
  currentIdea
}: EnhancedDataTileProps) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();
  
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
      // Check database cache first
      if (user && !isRefreshing) {
        const dbData = await dashboardDataService.getData({
          userId: user.id,
          ideaText,
          tileType,
          sessionId: currentSession?.id
        });
        
        if (dbData) {
          const cacheAge = dbData.timestamp ? Date.now() - new Date(dbData.timestamp).getTime() : Infinity;
          const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
          
          if (cacheAge < CACHE_DURATION) {
            setData({ ...dbData, fromCache: true, cacheTimestamp: new Date(dbData.timestamp).getTime() });
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Fetch fresh data
      const response = await fetchAdapter(filters);
      
      if (!response) {
        throw new Error('No data received');
      }
      
      // Transform and save data
      const transformedData = transformToStandardFormat(tileType, response);
      
      if (transformedData && user) {
        await dashboardDataService.saveData(
          {
            userId: user.id,
            ideaText,
            tileType,
            sessionId: currentSession?.id
          },
          transformedData,
          30 // 30 minutes expiration
        );
      }
      
      setData(transformedData);
    } catch (err) {
      console.error(`Error fetching ${tileType} data:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [ideaText, tileType, filters, isRefreshing, fetchAdapter, user, currentSession]);

  // Transform response to standard format
  const transformToStandardFormat = useCallback((type: string, response: any): any => {
    const now = new Date().toISOString();
    
    // Base structure
    let standardData = {
      ...response,
      updatedAt: response?.updatedAt || now,
      filters,
      metrics: response?.metrics || [],
      insights: response?.insights || [],
      items: response?.items || [],
      fromCache: false,
      stale: false
    };

    // Add metric info to each metric
    if (standardData.metrics && metricInfoMap[type]) {
      standardData.metrics = standardData.metrics.map((metric: any) => ({
        ...metric,
        info: metricInfoMap[type][metric.name] || metricInfoMap[type][metric.label]
      }));
    }

    return standardData;
  }, [filters]);

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
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value}`;
  };

  const getTrendIcon = () => {
    const trend = data?.metrics?.find((m: any) => m.trend)?.trend;
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  // Loading state
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

  // Error state
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
              {error}
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

  // No idea state
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

  return (
    <>
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {data?.fromCache && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                disabled={isRefreshing}
                className="h-8 px-2"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Metrics with Info Tooltips */}
          {data?.metrics && data.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {data.metrics.map((metric: any, idx: number) => (
                <div
                  key={idx}
                  className="relative p-4 rounded-xl bg-muted/10 border border-border/50 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {metric.label || metric.name}
                    </span>
                    {metric.info && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm p-4 space-y-2">
                          <div>
                            <p className="font-semibold text-xs mb-1">How it's calculated:</p>
                            <p className="text-xs text-muted-foreground">{metric.info.calculation}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-xs mb-1">Impact on your goal:</p>
                            <p className="text-xs text-muted-foreground">{metric.info.impact}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-xs mb-1">Target benchmark:</p>
                            <p className="text-xs text-muted-foreground">{metric.info.target}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-xs mb-1">Recommended action:</p>
                            <p className="text-xs text-muted-foreground">{metric.info.action}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      {typeof metric.value === 'number' ? formatCurrency(metric.value) : metric.value}
                    </span>
                    {metric.change && (
                      <Badge 
                        variant={metric.trend === 'up' ? 'default' : 'secondary'}
                        className="text-xs h-5"
                      >
                        {metric.change}
                      </Badge>
                    )}
                  </div>
                  
                  {metric.explanation && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {metric.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Chart Section */}
          {data?.chart && data.chart.data && data.chart.data.length > 0 && (
            <div className="p-4 bg-muted/20 rounded-xl">
              <h4 className="text-sm font-medium mb-3">{data.chart.title || 'Trend Analysis'}</h4>
              <ResponsiveContainer width="100%" height={200}>
                {tileType === 'growth_projections' ? (
                  <AreaChart data={data.chart.data}>
                    <defs>
                      <linearGradient id={`gradient-${tileType}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill={`url(#gradient-${tileType})`}
                    />
                  </AreaChart>
                ) : tileType === 'market_size' ? (
                  <BarChart data={data.chart.data}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <LineChart data={data.chart.data}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {/* Insights */}
          {data?.insights && data.insights.length > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">Key Insights</span>
              </div>
              <ul className="space-y-1">
                {data.insights.slice(0, 2).map((insight: string, idx: number) => (
                  <li key={idx} className="text-xs text-muted-foreground">
                    • {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* View More Button */}
          <Button
            onClick={() => setShowInsights(true)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            View Details
            <ExternalLink className="h-3.5 w-3.5 ml-2" />
          </Button>
        </CardContent>
      </Card>

      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}