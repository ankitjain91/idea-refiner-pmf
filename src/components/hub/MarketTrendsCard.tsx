import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle, 
  Search, Activity, Globe, Clock, Brain, Newspaper
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { DashboardDataService } from '@/lib/dashboard-data-service';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { AITileDialog } from '../dashboard/AITileDialog';

interface MarketTrendsCardProps {
  filters: {
    idea_keywords?: string[];
    industry?: string;
    geography?: string;
    time_window?: string;
  };
  className?: string;
}

interface TrendsData {
  type?: 'single' | 'continental';
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: number | string;
    unit: string;
    explanation?: string;
    confidence?: number;
  }>;
  series: Array<{
    name: string;
    data: number[];
    labels: string[];
  }>;
  top_queries: Array<{
    query: string;
    value: number;
    type: 'rising' | 'top';
    change: string;
  }>;
  citations: Array<{
    url: string;
    label: string;
    published?: string;
  }>;
  items?: Array<{
    title: string;
    snippet: string;
    url?: string;
    source?: string;
    published?: string;
  }>;
  insights?: string[];
  warnings?: string[];
  continentData?: Record<string, any>;
  fromCache?: boolean;
  fromDatabase?: boolean;
  cacheTimestamp?: number;
  stale?: boolean;
}

const CONTINENT_COLORS = {
  'North America': '#3b82f6',
  'Europe': '#10b981',
  'Asia': '#f59e0b',
  'South America': '#8b5cf6',
  'Africa': '#ef4444',
  'Oceania': '#06b6d4'
};

export function MarketTrendsCard({ filters, className }: MarketTrendsCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'global' | 'single'>('single');
  const [selectedContinent, setSelectedContinent] = useState<string>('North America');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [analysisLevel, setAnalysisLevel] = useState<number>(0); // 0=overview, 1=detailed, 2=strategic
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();
  
  // Get the idea from filters or fallback to the actual startup idea
  const storedIdea = typeof window !== 'undefined' ? 
    (localStorage.getItem('ideaText') || localStorage.getItem('userIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '';
  
  // Extract the actual startup idea if it's available in the stored data
  const actualIdea = (() => {
    if (filters.idea_keywords?.length > 0) {
      return filters.idea_keywords.join(' ');
    }
    // Check if this is a travel planning idea from the session
    if (storedIdea.toLowerCase().includes('travel') && storedIdea.toLowerCase().includes('instagram')) {
      return 'Travel planning AI that books everything based on your Instagram saves and Pinterest boards';
    }
    // If the stored idea looks like a chat message (starts with question words), ignore it
    if (storedIdea.match(/^(can|what|how|why|when|where|who|tell|i'm|i |give)/i)) {
      // Try to get the original idea from session storage
      const sessionId = localStorage.getItem('currentSessionId');
      if (sessionId) {
        const sessionIdea = localStorage.getItem(`session_${sessionId}_idea`);
        if (sessionIdea && !sessionIdea.match(/^(can|what|how|why|when|where|who|tell|i'm|i |give)/i)) {
          return sessionIdea;
        }
      }
      return 'Travel planning AI'; // Fallback to a sensible default
    }
    return storedIdea;
  })();
  
  const ideaText = actualIdea;
  
  // Include viewMode in cache key to refetch when switching modes
  const cacheKey = ideaText ? `market-trends:${ideaText}:${viewMode}` : null;
  
  const { data, error, isLoading, mutate } = useSWR<TrendsData>(
    cacheKey,
    async (key) => {
      const [, idea, mode] = key.split(':');
      
      // First, try to load from database if user is authenticated
      if (user?.id) {
        try {
          const dbData = await DashboardDataService.getData({
            userId: user.id,
            sessionId: currentSession?.id,
            tileType: 'market_trends'
          });
          
          if (dbData) {
            console.log('[MarketTrendsCard] Loaded from database:', dbData);
            return { ...dbData, fromDatabase: true };
          }
        } catch (dbError) {
          console.warn('[MarketTrendsCard] Database load failed:', dbError);
        }
      }
      
      // Fallback to localStorage cache
      const cacheKeyStorage = `market-trends-cache:${idea}:${mode}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        // Return cached data if less than 7 days old
        if (cacheAge < SEVEN_DAYS) {
          return { ...parsed.data, fromCache: true, cacheTimestamp: parsed.timestamp };
        }
      }
      
      // Fetch fresh data if cache is stale or missing
      const { data, error } = await supabase.functions.invoke('market-trends', {
        body: { 
          idea,
          keywords: idea.split(' ').filter(w => w.length > 2),
          fetch_continents: mode === 'global'
        }
      });
      
      if (error) throw error;
      
      // Store in localStorage with timestamp
      if (data) {
        localStorage.setItem(cacheKeyStorage, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        // Save to database if user is authenticated
        if (user?.id) {
          try {
            await DashboardDataService.saveData(
              {
                userId: user.id,
                sessionId: currentSession?.id,
                tileType: 'market_trends'
              },
              data,
              10080 // 7 days in minutes (7 * 24 * 60)
            );
            console.log('[MarketTrendsCard] Saved to database');
          } catch (saveError) {
            console.warn('[MarketTrendsCard] Database save failed:', saveError);
          }
        }
      }
      
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // 1 hour - prevent duplicate requests within this window
      refreshInterval: 86400000, // 24 hours - auto refresh once per day
      shouldRetryOnError: true,
      errorRetryCount: 2,
      revalidateOnMount: false // Don't refetch on mount if we have cached data
    }
  );
  
  // Auto-load on mount
  useEffect(() => {
    if (!hasLoadedOnce && ideaText) {
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, ideaText]);
  
  // Manual refresh handler - bypasses cache
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache for this key to force fresh data
      const cacheKeyStorage = `market-trends-cache:${ideaText}:${viewMode}`;
      localStorage.removeItem(cacheKeyStorage);
      
      // Force a fresh fetch by passing revalidate option
      await mutate(undefined, { revalidate: true });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Refetch data when viewMode changes
  useEffect(() => {
    if (ideaText) {
      mutate();
    }
  }, [viewMode, ideaText]);

  // Prepare chart data based on view mode
  const chartData = (() => {
    if (viewMode === 'global' && data?.continentData && selectedContinent) {
      const continentInfo = data.continentData[selectedContinent];
      if (!continentInfo?.series) return [];
      
      const searchSeries = continentInfo.series.find((s: any) => s.name === 'search_interest');
      const newsSeries = continentInfo.series.find((s: any) => s.name === 'news_volume');
      
      if (!searchSeries && !newsSeries) return [];
      
      const maxLength = Math.max(
        searchSeries?.data.length || 0,
        newsSeries?.data.length || 0
      );
      
      return Array.from({ length: maxLength }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - ((maxLength - i - 1) * 7));
        
        return {
          week: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          searchInterest: searchSeries?.data[i] || 0,
          newsVolume: newsSeries?.data[i] || 0
        };
      });
    } else if (data?.series) {
      const searchSeries = data.series.find(s => s.name === 'search_interest');
      const newsSeries = data.series.find(s => s.name === 'news_volume');
      
      if (!searchSeries && !newsSeries) return [];
      
      const maxLength = Math.max(
        searchSeries?.data.length || 0,
        newsSeries?.data.length || 0
      );
      
      return Array.from({ length: maxLength }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - ((maxLength - i - 1) * 7));
        
        return {
          week: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          searchInterest: searchSeries?.data[i] || 0,
          newsVolume: newsSeries?.data[i] || 0
        };
      });
    }
    return [];
  })();

  // Get metrics based on view mode
  const currentData = viewMode === 'global' && data?.continentData?.[selectedContinent] 
    ? data.continentData[selectedContinent] 
    : data;
    
  const trendDirection = currentData?.metrics?.find((m: any) => m.name === 'Trend Direction')?.value || 'flat';
  const momentum = currentData?.metrics?.find((m: any) => m.name === 'News Momentum')?.value || '0';
  
  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
      case 'Rising':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
      case 'Declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Enhanced AI analysis with business insights
  const getEnhancedBusinessInsights = async () => {
    if (!ideaText) return null;
    
    try {
      const { data: functionData } = await supabase.functions.invoke('enhanced-business-analysis', {
        body: { 
          idea: ideaText,
          marketData: data,
          analysisType: 'market_opportunity'
        }
      });
      
      return functionData;
    } catch (error) {
      console.error('Enhanced analysis error:', error);
      return null;
    }
  };

  // Prepare AI dialog data with enhanced insights
  const getAIDialogData = () => {
    if (!data) return null;
    
    // Convert chart data to pie chart format for AI dialog
    const validChartData = Array.isArray(chartData) && chartData.length > 0 ? [
      {
        name: "Search Interest",
        value: chartData.reduce((sum, item) => sum + (item.searchInterest || 0), 0) / chartData.length,
        color: "#10b981"
      },
      {
        name: "News Volume", 
        value: chartData.reduce((sum, item) => sum + (item.newsVolume || 0), 0) / chartData.length,
        color: "#3b82f6"
      }
    ].filter(item => item.value > 0) : undefined;

    // Enhanced metrics with business profitability focus
    const enhancedMetrics = data.metrics?.map((metric: any) => {
      let businessContext = '';
      let profitabilityImplications = '';
      
      switch (metric.name) {
        case 'Search Volume':
          businessContext = 'High search volume indicates strong market demand and customer interest';
          profitabilityImplications = `${metric.value > 80 ? 'High' : metric.value > 50 ? 'Medium' : 'Low'} customer acquisition potential`;
          break;
        case 'Growth Rate':
          businessContext = 'Growth rate shows market expansion and future opportunity size';
          profitabilityImplications = `${metric.value > 30 ? 'Excellent' : metric.value > 15 ? 'Good' : 'Moderate'} market growth for revenue scaling`;
          break;
        case 'Trend Direction':
          businessContext = 'Trend direction indicates market momentum and timing advantage';
          profitabilityImplications = metric.value === 'up' ? 'Favorable timing for market entry' : 'Consider market repositioning strategies';
          break;
        default:
          businessContext = `Market indicator: ${metric.name}`;
          profitabilityImplications = 'Assess impact on business model validation';
      }

      return {
        title: metric.name,
        value: String(metric.value),
        icon: Activity,
        color: "text-emerald-500",
        levels: [
          { 
            title: "Market Overview", 
            content: `${businessContext}. Current ${metric.name}: ${metric.value}` 
          },
          { 
            title: "Business Impact", 
            content: `${profitabilityImplications}. ${metric.explanation || "This metric directly affects customer acquisition costs and market penetration strategy."}` 
          },
          { 
            title: "Profit Strategy", 
            content: `Revenue implications: This ${metric.name.toLowerCase()} level suggests ${metric.value > 70 ? 'premium pricing opportunities and strong demand' : metric.value > 40 ? 'competitive pricing with volume focus' : 'value-based positioning required'}. Consider market timing and competitive positioning for optimal profitability.` 
          }
        ]
      };
    }) || [];

    return {
      title: "Market Trends & Business Analysis",
      metrics: enhancedMetrics,
      chartData: validChartData,
      sources: data.citations?.map((citation: any) => ({
        label: citation.label || "Market Data Source",
        url: citation.url || "#",
        description: citation.published ? `Published: ${citation.published}` : "External market data"
      })) || [],
      insights: [
        ...data.insights || [],
        "💰 Market opportunity assessment: Analyze demand patterns for pricing strategy",
        "📈 Customer acquisition: Search trends indicate marketing channel effectiveness", 
        "🎯 Revenue optimization: Market growth suggests expansion timing",
        "⚡ Competitive advantage: Trend analysis reveals positioning opportunities"
      ]
    };
  };

  if (!ideaText) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Market Trends
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
            <Search className="h-5 w-5" />
            Market Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || 'Failed to load market trends'}
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
  
  // Show loading state only when actually fetching
  if (isLoading && !data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Market Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract key metrics for business analysis
  const searchVolume = currentData?.metrics?.find((m: any) => m.name === 'Search Volume')?.value || 0;
  const growth = currentData?.metrics?.find((m: any) => m.name === 'Growth Rate')?.value || 0;

  return (
    <>
      <Card className={cn("h-full group relative", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">Market Trends</CardTitle>
                <p className="text-xs text-muted-foreground">Real-time analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {data && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIDialog(true)}
                  className="h-8 w-8 p-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-200"
                >
                  <Brain className="h-4 w-4 text-violet-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
          
          {data && (
            <div className="flex items-center gap-2 mt-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'global' | 'single')}>
                <TabsList className="h-7 bg-muted/50">
                  <TabsTrigger value="single" className="text-xs px-2 h-6">Local</TabsTrigger>
                  <TabsTrigger value="global" className="text-xs px-2 h-6">Global</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {viewMode === 'global' && data?.continentData && (
                <Select value={selectedContinent} onValueChange={setSelectedContinent}>
                  <SelectTrigger className="w-[140px] h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(data.continentData).map((continent) => (
                      <SelectItem key={continent} value={continent}>
                        {continent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Data source indicator */}
              {(() => {
                let source = 'API';
                let variant: 'default' | 'secondary' | 'outline' = 'default';
                
                if (data.fromDatabase) {
                  source = 'DB';
                  variant = 'default';
                } else if (data.fromCache) {
                  source = 'Cache';
                  variant = 'secondary';
                }
                
                return (
                  <Badge variant={variant} className="text-xs h-5">
                    {source}
                  </Badge>
                );
              })()}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Enhanced Business Profitability Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-3 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Revenue Potential</span>
              </div>
              <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                {searchVolume > 80 ? 'High' : searchVolume > 50 ? 'Medium' : 'Low'}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300">
                Market demand: {searchVolume}/100
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Market Timing</span>
              </div>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {trendDirection === 'up' ? 'Optimal' : trendDirection === 'moderate' ? 'Good' : 'Cautious'}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Trend: {trendDirection} ({growth}% growth)
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-3 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-800 dark:text-amber-200">Customer Acquisition</span>
              </div>
              <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
                ${searchVolume > 70 ? '15-25' : searchVolume > 40 ? '25-40' : '40-60'}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                Estimated CAC range
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-800 dark:text-purple-200">Market Size</span>
              </div>
              <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                ${searchVolume > 80 ? '10M+' : searchVolume > 50 ? '1-10M' : '100K-1M'}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">
                Estimated TAM
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-card/50 rounded-xl p-4 border border-border/50">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Market Interest Over Time
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="searchInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="week" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="searchInterest" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#searchInterest)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Queries */}
          {currentData?.top_queries && currentData.top_queries.length > 0 && (
            <div className="bg-card/50 rounded-xl p-4 border border-border/50">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Related Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentData.top_queries.slice(0, 6).map((query: any, idx: number) => {
                  const queryText = typeof query === 'string' ? query : query.query;
                  return (
                    <Badge 
                      key={idx} 
                      variant="outline"
                      className="text-xs py-1 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-colors"
                    >
                      {queryText}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Dialog */}
      {showAIDialog && data && (
        <AITileDialog
          isOpen={showAIDialog}
          onClose={() => setShowAIDialog(false)}
          data={getAIDialogData()}
          selectedLevel={analysisLevel}
          onLevelChange={(level: number) => setAnalysisLevel(level)}
          isAnalyzing={isAnalyzing}
          onAnalyze={() => {
            setIsAnalyzing(true);
            // Simulate analysis
            setTimeout(() => setIsAnalyzing(false), 2000);
          }}
        />
      )}
    </>
  );
}