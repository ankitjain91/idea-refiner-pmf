import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  RefreshCw, AlertCircle, ExternalLink, Clock, HelpCircle, Info,
  TrendingUp, TrendingDown, Minus, CheckCircle, Newspaper,
  Globe, Target, DollarSign, BarChart3, Activity, Sparkles,
  Zap, Brain, Rocket, Users, ArrowUpRight, ArrowDownRight, Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TileInsightsDialog } from './TileInsightsDialog';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { dashboardDataService } from '@/lib/dashboard-data-service';
import { motion } from 'framer-motion';

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

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
];

const GRADIENT_THEMES = {
  market_size: 'from-blue-500/20 via-cyan-500/10 to-transparent',
  growth_projections: 'from-emerald-500/20 via-green-500/10 to-transparent',
  launch_timeline: 'from-violet-500/20 via-purple-500/10 to-transparent',
  pmf_score: 'from-amber-500/20 via-yellow-500/10 to-transparent',
  sentiment: 'from-pink-500/20 via-rose-500/10 to-transparent',
  competition: 'from-red-500/20 via-orange-500/10 to-transparent',
  default: 'from-primary/20 via-primary/10 to-transparent'
};

const METRIC_COLORS = {
  high: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
  neutral: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20'
};

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
    },
    'Market Maturity': {
      calculation: "Based on adoption curve position and competitor density",
      impact: "Determines strategy: education vs competition vs disruption",
      target: "Early/Growth stage markets offer best entry opportunities",
      action: "Early stage = educate market; Mature = differentiate or disrupt"
    }
  },
  growth_projections: {
    'Growth Rate': {
      calculation: "Year-over-year growth = ((Current - Previous) / Previous) × 100",
      impact: "Indicates market momentum and timing opportunity",
      target: ">20% YoY suggests high growth market",
      action: "High growth = aggressive expansion; Low growth = focus on differentiation"
    },
    'Revenue Projection': {
      calculation: "Based on market growth rate × target market share × pricing model",
      impact: "Sets realistic revenue expectations for investors and planning",
      target: "10x growth potential within 5 years for VC-scale opportunity",
      action: "Use projections to determine funding needs and milestone planning"
    }
  },
  launch_timeline: {
    'MVP Timeline': {
      calculation: "Based on feature complexity × team size × technical debt",
      impact: "Determines time to market and competitive advantage window",
      target: "MVP in <6 months for fast market validation",
      action: "Prioritize core features that solve the main pain point"
    },
    'Market Entry': {
      calculation: "MVP time + beta testing + initial marketing setup",
      impact: "When you can start generating revenue and market feedback",
      target: "Market entry within 9 months to maintain momentum",
      action: "Plan backwards from launch date to set development milestones"
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
  },
  competition: {
    'Competition Level': {
      calculation: "Number of competitors × Market share concentration × Feature overlap",
      impact: "Determines differentiation needs and market entry difficulty",
      target: "Medium competition with clear gaps is ideal for entry",
      action: "High competition: Find underserved niche; Low: Validate market exists"
    }
  }
};

const getMetricColor = (value: any, type: string) => {
  if (typeof value === 'number') {
    if (type === 'pmf_score' || type === 'sentiment') {
      return value >= 70 ? METRIC_COLORS.high : value >= 40 ? METRIC_COLORS.medium : METRIC_COLORS.low;
    }
    if (type === 'growth_projections') {
      return value >= 20 ? METRIC_COLORS.high : value >= 10 ? METRIC_COLORS.medium : METRIC_COLORS.low;
    }
  }
  return METRIC_COLORS.neutral;
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
  const [showInsights, setShowInsights] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [hoveredMetric, setHoveredMetric] = useState<number | null>(null);
  const { user } = useAuth();
  const { currentSession } = useSession();
  
  const gradientTheme = GRADIENT_THEMES[tileType as keyof typeof GRADIENT_THEMES] || GRADIENT_THEMES.default;
  
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
      // 1. Check localStorage cache first (fastest)
      const lsCacheKey = `tile-${tileType}-${ideaText}`;
      const cachedLocalData = localStorage.getItem(lsCacheKey);
      
      if (cachedLocalData && !isRefreshing) {
        try {
          const parsed = JSON.parse(cachedLocalData);
          const cacheAge = Date.now() - parsed.timestamp;
          const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
          
          if (cacheAge < CACHE_DURATION) {
            setData({
              ...parsed.data,
              fromCache: true,
              fromDatabase: false,
              fromApi: false,
              cacheTimestamp: parsed.timestamp
            });
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing localStorage cache:', e);
        }
      }
      
      // 2. Check database cache (if user is logged in)
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
            const dataWithSource = { 
              ...dbData, 
              fromCache: false,
              fromDatabase: true,
              fromApi: false,
              cacheTimestamp: new Date(dbData.timestamp).getTime() 
            };
            
            // Also update localStorage
            localStorage.setItem(lsCacheKey, JSON.stringify({
              data: dataWithSource,
              timestamp: Date.now()
            }));
            
            setData(dataWithSource);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // 3. Fetch fresh data from API
      const response = await fetchAdapter(filters);
      
      if (!response) {
        throw new Error('No data received');
      }
      
      // Transform and save data
      const transformedData = transformToStandardFormat(tileType, response);
      
      // Save to localStorage cache
      const storageCacheKey = `tile-${tileType}-${ideaText}`;
      localStorage.setItem(storageCacheKey, JSON.stringify({
        data: transformedData,
        timestamp: Date.now()
      }));
      
      // Save to database if user is logged in
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
      fromDatabase: false,
      fromApi: true, // Default to API if it's a fresh fetch
      stale: false
    };

    // Check data source flags
    if (response?.fromCache) standardData.fromCache = true;
    if (response?.fromDatabase) standardData.fromDatabase = true;
    if (response?.fromApi) standardData.fromApi = true;

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
    // Clear localStorage cache to force fresh fetch
    const cacheKeyToRemove = `tile-${tileType}-${ideaText}`;
    localStorage.removeItem(cacheKeyToRemove);
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

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
    if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-amber-500" />;
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <Card className={cn("h-full relative overflow-hidden", className)}>
        <div className={cn("absolute inset-0 bg-gradient-to-br", gradientTheme, "opacity-50")} />
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
      <Card className={cn("h-full relative overflow-hidden", className)}>
        <div className={cn("absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent")} />
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
      <Card className={cn("h-full relative overflow-hidden", className)}>
        <div className={cn("absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent")} />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-500/20 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              No idea configured. Please enter an idea in the Idea Chat first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("h-full relative overflow-hidden group transition-all duration-500 hover:shadow-xl", className)}>
        {/* Animated Gradient Background */}
        <motion.div 
          className={cn("absolute inset-0 bg-gradient-to-br", gradientTheme)}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className={cn("p-2 rounded-lg bg-gradient-to-br", gradientTheme)}>
                <Icon className="h-5 w-5" />
              </div>
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Subtle Data Source Indicator - Same as Overview */}
              {data && (
                <Badge variant={data?.fromDatabase || data?.fromCache ? 'secondary' : 'outline'} className="text-xs h-5">
                  {data?.fromDatabase || data?.fromCache ? 'Cache' : 'Live'}
                </Badge>
              )}
              
              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
              
              {/* Brain Icon for AI Insights - Purple and Square like Overview */}
              <TooltipProvider>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInsights(true)}
                  className="h-8 w-8 p-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-200"
                >
                  <Brain className="h-4 w-4 text-violet-600" />
                </Button>
              </TooltipProvider>
            </div>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4 relative">
          {/* Metrics with Beautiful Colors and Info Tooltips */}
          {data?.metrics && data.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {data.metrics.map((metric: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  onMouseEnter={() => setHoveredMetric(idx)}
                  onMouseLeave={() => setHoveredMetric(null)}
                  className={cn(
                    "relative p-4 rounded-xl border transition-all duration-300 cursor-pointer",
                    getMetricColor(metric.value, tileType),
                    hoveredMetric === idx && "shadow-lg ring-2 ring-primary/20"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                      {metric.label || metric.name}
                    </span>
                    {metric.info && (
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <button className="p-1 hover:bg-white/10 rounded transition-colors">
                              <Info className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm p-4 space-y-3 bg-card border-border">
                            <div>
                              <p className="font-semibold text-xs mb-1 text-primary">📊 How it's calculated:</p>
                              <p className="text-xs text-muted-foreground">{metric.info.calculation}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-xs mb-1 text-amber-600 dark:text-amber-400">🎯 Impact on your goal:</p>
                              <p className="text-xs text-muted-foreground">{metric.info.impact}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-xs mb-1 text-emerald-600 dark:text-emerald-400">✅ Target benchmark:</p>
                              <p className="text-xs text-muted-foreground">{metric.info.target}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-xs mb-1 text-blue-600 dark:text-blue-400">💡 Recommended action:</p>
                              <p className="text-xs text-muted-foreground">{metric.info.action}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {typeof metric.value === 'number' ? formatCurrency(metric.value) : metric.value}
                    </span>
                    {metric.trend && getTrendIcon(metric.trend)}
                  </div>
                  
                  {metric.change && (
                    <div className="mt-2">
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs",
                          metric.trend === 'up' ? "border-emerald-500/50 text-emerald-600" : 
                          metric.trend === 'down' ? "border-red-500/50 text-red-600" :
                          "border-amber-500/50 text-amber-600"
                        )}
                      >
                        {metric.change}
                      </Badge>
                    </div>
                  )}
                  
                  {metric.explanation && (
                    <p className="text-xs opacity-70 mt-2 line-clamp-2">
                      {metric.explanation}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Colorful Chart Section */}
          {data?.chart && data.chart.data && data.chart.data.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-xl bg-gradient-to-br from-background/50 to-muted/20 border border-border/50"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {data.chart.title || 'Trend Analysis'}
                </h4>
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button className="p-1 hover:bg-white/10 rounded transition-colors">
                        <Info className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm p-3 space-y-2 bg-card border-border">
                      <p className="font-semibold text-xs text-primary">📊 About this chart:</p>
                      <p className="text-xs text-muted-foreground">
                        {tileType === 'growth_projections' ? 
                          'Shows projected growth over time based on market trends and competitive analysis' :
                         tileType === 'market_size' ?
                          'Compares TAM, SAM, and SOM to show market opportunity at different scales' :
                          'Tracks key metrics over time to identify trends and patterns'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                {tileType === 'growth_projections' ? (
                  <AreaChart data={data.chart.data}>
                    <defs>
                      <linearGradient id={`gradient-${tileType}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981"
                      strokeWidth={2}
                      fill={`url(#gradient-${tileType})`}
                    />
                  </AreaChart>
                ) : tileType === 'market_size' ? (
                  <BarChart data={data.chart.data}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {data.chart.data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={data.chart.data}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Colorful Insights */}
          {data?.insights && data.insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-pink-500/10 border border-primary/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-semibold bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
                  Key Insights
                </span>
              </div>
              <div className="space-y-2">
                {data.insights.slice(0, 3).map((insight: string, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-lg">
                      {idx === 0 ? '🚀' : idx === 1 ? '💡' : '🎯'}
                    </span>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {insight}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </CardContent>
      </Card>

      {/* Fixed Dialog */}
      {showInsights && (
        <TileInsightsDialog
          open={showInsights}
          onOpenChange={(open) => setShowInsights(open)}
          tileType={tileType}
        />
      )}
    </>
  );
}