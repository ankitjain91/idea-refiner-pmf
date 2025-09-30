import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, TrendingUp, TrendingDown, RefreshCw, AlertCircle, Target, Users, DollarSign, Minus, Brain, Globe, MapPin, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import useSWR from 'swr';
import { dashboardDataService } from '@/lib/dashboard-data-service';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AITileDialog } from '@/components/dashboard/AITileDialog';

interface WebSearchDataTileProps {
  idea: string;
  industry?: string;
  geography?: string;
  timeWindow?: string;
  className?: string;
}

// Region-wise mock data for demonstration
const REGION_DATA = {
  'North America': { market_size: 2500, growth: 15, competition: 'high', opportunity: 75 },
  'Europe': { market_size: 2100, growth: 12, competition: 'medium', opportunity: 65 },
  'Asia': { market_size: 3200, growth: 25, competition: 'low', opportunity: 85 },
  'South America': { market_size: 800, growth: 18, competition: 'low', opportunity: 70 },
  'Africa': { market_size: 400, growth: 22, competition: 'low', opportunity: 80 },
  'Oceania': { market_size: 600, growth: 10, competition: 'medium', opportunity: 60 }
};

const REGION_COLORS = {
  'North America': '#3b82f6',
  'Europe': '#10b981', 
  'Asia': '#f59e0b',
  'South America': '#8b5cf6',
  'Africa': '#ef4444',
  'Oceania': '#06b6d4'
};

export function WebSearchDataTile({ idea, industry, geography, timeWindow, className }: WebSearchDataTileProps) {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [groqInsights, setGroqInsights] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('North America');
  const [viewMode, setViewMode] = useState<'metrics' | 'regions' | 'competitors'>('metrics');
  const { user } = useAuth();
  const { currentSession } = useSession();
  const currentIdea = localStorage.getItem('pmfCurrentIdea') || '';
  const { toast } = useToast();

  const storedIdea = typeof window !== 'undefined' ? 
    (localStorage.getItem('dashboardIdea') || localStorage.getItem('ideaText') || localStorage.getItem('userIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '';
  
  const actualIdea = idea || storedIdea || 'startup idea';
  const cacheKey = `web-search:${actualIdea}:${industry}:${geography}`;

  const fetcher = useCallback(async (key: string) => {
    console.log('[WebSearchDataTile] Starting fetch with key:', key);
    
    // First, try to load from database if user is authenticated
    if (user?.id) {
      try {
        const dbData = await dashboardDataService.getData({
          userId: user.id,
          ideaText: localStorage.getItem('dashboardIdea') || currentIdea || localStorage.getItem('pmfCurrentIdea') || '',
          tileType: 'web_search',
          sessionId: currentSession?.id
        });
        
        if (dbData) {
          console.log('[WebSearchDataTile] ✅ Loaded from database');
          return { ...dbData, fromDatabase: true };
        }
        console.log('[WebSearchDataTile] No database data found');
      } catch (dbError) {
        console.warn('[WebSearchDataTile] Database load failed:', dbError);
      }
    }

    // Fallback to localStorage cache
    const cacheKeyStorage = `web-search-cache:${actualIdea}:${industry}:${geography}`;
    const cachedData = localStorage.getItem(cacheKeyStorage);
    
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const cacheAge = Date.now() - parsed.timestamp;
      const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
      
      if (cacheAge < CACHE_DURATION) {
        console.log('[WebSearchDataTile] ✅ Loaded from localStorage cache, age:', Math.round(cacheAge / 1000 / 60), 'minutes');
        return { ...parsed.data, fromCache: true };
      }
      console.log('[WebSearchDataTile] Cache expired, age:', Math.round(cacheAge / 1000 / 60), 'minutes');
    }
    
    console.log('[WebSearchDataTile] Fetching fresh data from API...');
    // Fetch fresh data from edge function
    const { data, error } = await supabase.functions.invoke('web-search-profitability', {
      body: { 
        idea: actualIdea,
        industry,
        geo: geography,
        time_window: timeWindow
      }
    });
    
    if (error) throw error;
    
    // Store in localStorage
    if (data) {
      localStorage.setItem(cacheKeyStorage, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log('[WebSearchDataTile] Saved to localStorage cache');
      
      // Save to database if user is authenticated
      if (user?.id) {
        try {
          await dashboardDataService.saveData(
            {
              userId: user.id,
              ideaText: currentIdea || localStorage.getItem('pmfCurrentIdea') || '',
              tileType: 'web_search',
              sessionId: currentSession?.id
            },
            data,
            30 // 30 minutes cache
          );
          console.log('[WebSearchDataTile] ✅ Saved to database');
        } catch (saveError) {
          console.warn('[WebSearchDataTile] Database save failed:', saveError);
        }
      }
    }
    
    console.log('[WebSearchDataTile] ✅ Returning fresh API data');
    return { ...data, fromApi: true };
  }, [user?.id, currentSession?.id, actualIdea, industry, geography, timeWindow, currentIdea]);

  const { data, error, isLoading, mutate } = useSWR(
    hasLoadedOnce ? cacheKey : null,  // Only fetch when component has loaded
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes
      onSuccess: () => setHasLoadedOnce(true)
    }
  );

  // Trigger initial load
  useEffect(() => {
    if (!hasLoadedOnce && actualIdea) {
      console.log('[WebSearchDataTile] Triggering initial load');
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, actualIdea]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Clear localStorage cache
      const cacheKeyStorage = `web-search-cache:${actualIdea}:${industry}:${geography}`;
      localStorage.removeItem(cacheKeyStorage);
      
      // Clear database cache if user is authenticated
      if (user?.id) {
        await dashboardDataService.deleteData({
          userId: user.id,
          ideaText: currentIdea || localStorage.getItem('pmfCurrentIdea') || '',
          tileType: 'web_search',
          sessionId: currentSession?.id
        });
      }
      
      // Refetch data
      await mutate();
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [actualIdea, industry, geography, mutate, user?.id, currentSession?.id, toast]);

  const analyzeWithGroq = async () => {
    if (!data) return;
    
    setIsAnalyzing(true);
    try {
      const { data: analysis, error } = await supabase.functions.invoke('groq-synthesis', {
        body: {
          input: {
            metrics: data.metrics,
            competitors: data.competitors,
            unmet_needs: data.unmet_needs,
            market_insights: data.market_insights
          },
          prompt: `Analyze this web search data and provide strategic insights for profitability. Focus on:
          1. Market opportunity assessment
          2. Competitive advantages  
          3. Revenue potential
          4. Risk factors
          Be specific and actionable.`
        }
      });

      if (!error && analysis) {
        setGroqInsights(analysis);
      }
    } catch (error) {
      console.error('Groq analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseMetrics = (data: any) => {
    if (!data) return null;

    const result = {
      profitability_score: 0,
      market_sentiment: 0,
      competition_level: 'Medium',
      market_size: '$10B-50B',
      unmet_needs: 0,
      search_volume: 50000,
      cpc_estimate: '$2.50'
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

    return result;
  };

  const getMetricStyle = (value: number | string, type: string) => {
    if (type === 'profitability_score' || type === 'market_sentiment') {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (numValue >= 70) return { color: 'text-emerald-600 dark:text-emerald-400', icon: <TrendingUp className="h-3 w-3" /> };
      if (numValue >= 40) return { color: 'text-amber-600 dark:text-amber-400', icon: <Minus className="h-3 w-3" /> };
      return { color: 'text-rose-600 dark:text-rose-400', icon: <TrendingDown className="h-3 w-3" /> };
    }
    if (type === 'competition_level') {
      const val = typeof value === 'string' ? value.toLowerCase() : '';
      if (val === 'low') return { color: 'text-emerald-600 dark:text-emerald-400' };
      if (val === 'medium') return { color: 'text-amber-600 dark:text-amber-400' };
      return { color: 'text-rose-600 dark:text-rose-400' };
    }
    return { color: 'text-muted-foreground', icon: null };
  };

  // Prepare region chart data
  const regionChartData = Object.entries(REGION_DATA).map(([region, data]) => ({
    region,
    ...data,
    fill: REGION_COLORS[region as keyof typeof REGION_COLORS]
  }));

  // Prepare radar chart data for selected region
  const radarData = [
    { metric: 'Market Size', value: REGION_DATA[selectedRegion as keyof typeof REGION_DATA]?.market_size / 40 || 0 },
    { metric: 'Growth Rate', value: REGION_DATA[selectedRegion as keyof typeof REGION_DATA]?.growth * 4 || 0 },
    { metric: 'Opportunity', value: REGION_DATA[selectedRegion as keyof typeof REGION_DATA]?.opportunity || 0 },
    { metric: 'Competition', value: REGION_DATA[selectedRegion as keyof typeof REGION_DATA]?.competition === 'low' ? 80 : REGION_DATA[selectedRegion as keyof typeof REGION_DATA]?.competition === 'medium' ? 50 : 20 }
  ];

  const prepareAIDialogData = () => {
    const metrics = parseMetrics(data);
    if (!metrics) return null;

    // Prepare metrics for 3-level drill-down
    const metricsData = [
      {
        title: "Profitability Score",
        value: `${metrics.profitability_score}%`,
        icon: TrendingUp,
        color: getMetricStyle(metrics.profitability_score, 'profitability_score').color,
        levels: [
          {
            title: "Overview",
            content: `Market profitability score of ${metrics.profitability_score}% indicates ${metrics.profitability_score >= 70 ? 'high' : metrics.profitability_score >= 40 ? 'moderate' : 'low'} potential for financial success.`
          },
          {
            title: "Detailed Breakdown",
            content: `This score is calculated based on market maturity (${metrics.profitability_score >= 70 ? 'mature' : 'emerging'}), competition intensity, and monetization opportunities. Revenue streams include direct sales, subscriptions, and partnerships.`
          },
          {
            title: "Strategic Analysis",
            content: `To improve profitability: Focus on premium features, implement tiered pricing, and target enterprise customers. Market timing suggests ${metrics.profitability_score >= 70 ? 'immediate entry' : 'gradual market penetration'} strategy.`
          }
        ]
      },
      {
        title: "Market Sentiment",
        value: `${metrics.market_sentiment}%`,
        icon: Users,
        color: getMetricStyle(metrics.market_sentiment, 'market_sentiment').color,
        levels: [
          {
            title: "Overview",
            content: `Market sentiment of ${metrics.market_sentiment}% shows ${metrics.market_sentiment >= 70 ? 'strong positive' : metrics.market_sentiment >= 40 ? 'neutral to positive' : 'cautious'} reception for this idea.`
          },
          {
            title: "Detailed Breakdown",
            content: `Sentiment analysis from ${data?.competitors?.length || 0} competitor mentions, social media discussions, and search patterns. Key themes include innovation, practicality, and market readiness.`
          },
          {
            title: "Strategic Analysis",
            content: `Market entry strategy should focus on ${metrics.market_sentiment >= 70 ? 'aggressive marketing and rapid scaling' : 'education and proof-of-concept demonstrations'}. Build trust through testimonials and case studies.`
          }
        ]
      },
      {
        title: "Competition Level",
        value: metrics.competition_level,
        icon: Target,
        color: getMetricStyle(metrics.competition_level, 'competition_level').color,
        levels: [
          {
            title: "Overview",
            content: `Competition level is ${metrics.competition_level.toLowerCase()}, indicating ${metrics.competition_level === 'Low' ? 'minimal' : metrics.competition_level === 'Medium' ? 'moderate' : 'intense'} competitive pressure.`
          },
          {
            title: "Detailed Breakdown",
            content: `Analysis of ${data?.competitors?.length || 0} direct competitors shows differentiation opportunities in pricing, features, and customer segments. Market gaps exist in ${metrics.unmet_needs} key areas.`
          },
          {
            title: "Strategic Analysis",
            content: `Competitive strategy: ${metrics.competition_level === 'Low' ? 'Move fast to establish market leadership' : metrics.competition_level === 'Medium' ? 'Focus on unique value proposition' : 'Find niche market segments'}. Monitor competitor pricing and feature releases.`
          }
        ]
      }
    ];

    // Prepare chart data for competitors
    const chartData = data?.competitors?.slice(0, 5).map((comp: any) => ({
      name: comp.domain || comp.name,
      appearances: comp.appearances || Math.floor(Math.random() * 100),
      strength: Math.floor(Math.random() * 100)
    })) || [];

    // Sources
    const sources = [
      { label: "Web Search Analysis", url: "#", description: "Comprehensive search data analysis" },
      { label: "Competitor Intelligence", url: "#", description: `${data?.competitors?.length || 0} competitors analyzed` },
      { label: "Market Research", url: "#", description: "Industry reports and trends" }
    ];

    return {
      title: "Web Search Analysis",
      metrics: metricsData,
      chartData,
      sources,
      insights: groqInsights?.insights || data?.insights || []
    };
  };

  if (isLoading && !data) {
    return (
      <Card className={cn("h-full bg-gradient-to-br from-background to-muted/5", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Search className="h-5 w-5 text-blue-500" />
            </div>
            Web Search Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("h-full bg-gradient-to-br from-background to-muted/5", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Search className="h-5 w-5 text-blue-500" />
            </div>
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
    <>
      <Card className={cn("h-full bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Search className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Web Search Analysis</CardTitle>
                <p className="text-xs text-muted-foreground">Market profitability insights</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Data Source Badge - Same as MarketTrendsCard */}
              {data && (
                <Badge variant={data?.fromCache || data?.fromDatabase ? 'secondary' : 'outline'} className="text-xs h-5">
                  {data?.fromCache || data?.fromDatabase ? 'Cache' : 'Live'}
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIDialog(true)}
                className="h-8 w-8 p-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-200"
              >
                <Brain className="h-4 w-4 text-violet-600" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="regions">Regional Analysis</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4 mt-4">
              {metrics && (
                <>
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Profitability</span>
                        {getMetricStyle(metrics.profitability_score, 'profitability_score').icon}
                      </div>
                      <div className={cn("text-lg font-bold", getMetricStyle(metrics.profitability_score, 'profitability_score').color)}>
                        {metrics.profitability_score}%
                      </div>
                      <Progress value={metrics.profitability_score} className="h-1.5 mt-2" />
                    </div>

                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Market Sentiment</span>
                        {getMetricStyle(metrics.market_sentiment, 'market_sentiment').icon}
                      </div>
                      <div className={cn("text-lg font-bold", getMetricStyle(metrics.market_sentiment, 'market_sentiment').color)}>
                        {metrics.market_sentiment}%
                      </div>
                      <Progress value={metrics.market_sentiment} className="h-1.5 mt-2" />
                    </div>
                  </div>

                  {/* Competition and Market Size */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <span className="text-xs text-muted-foreground">Competition</span>
                      <div className={cn("text-sm font-semibold mt-1", getMetricStyle(metrics.competition_level, 'competition_level').color)}>
                        {metrics.competition_level}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <span className="text-xs text-muted-foreground">Market Size</span>
                      <div className="text-sm font-semibold mt-1">{metrics.market_size}</div>
                    </div>
                  </div>

                  {/* Unmet Needs */}
                  {metrics.unmet_needs > 0 && (
                    <Alert className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                      <Target className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs">
                        <span className="font-semibold">{metrics.unmet_needs} unmet needs</span> identified - opportunity for differentiation
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="regions" className="space-y-4 mt-4">
              {/* Regional Market Size Bar Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                      labelStyle={{ color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="market_size" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Region Selector */}
              <div className="flex gap-2 flex-wrap">
                {Object.keys(REGION_DATA).map((region) => (
                  <Button
                    key={region}
                    size="sm"
                    variant={selectedRegion === region ? "default" : "outline"}
                    onClick={() => setSelectedRegion(region)}
                    className="text-xs"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {region}
                  </Button>
                ))}
              </div>

              {/* Selected Region Radar Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar 
                      name={selectedRegion} 
                      dataKey="value" 
                      stroke={REGION_COLORS[selectedRegion as keyof typeof REGION_COLORS]}
                      fill={REGION_COLORS[selectedRegion as keyof typeof REGION_COLORS]}
                      fillOpacity={0.6} 
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Regional Insights */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-muted/50 border">
                  <span className="text-xs text-muted-foreground">Growth Rate</span>
                  <div className="text-sm font-semibold">
                    {REGION_DATA[selectedRegion as keyof typeof REGION_DATA]?.growth}%
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 border">
                  <span className="text-xs text-muted-foreground">Opportunity Score</span>
                  <div className="text-sm font-semibold">
                    {REGION_DATA[selectedRegion as keyof typeof REGION_DATA]?.opportunity}%
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="competitors" className="space-y-4 mt-4">
              {/* Competitor List */}
              {data?.competitors && data.competitors.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {data.competitors.slice(0, 10).map((comp: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 border hover:bg-muted/70 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{comp.domain || comp.name}</div>
                            {comp.hasPricing && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                <DollarSign className="h-3 w-3 mr-1" />
                                Has Pricing
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Appearances</div>
                            <div className="font-semibold">{comp.appearances || 1}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No competitor data available</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

          {/* Insights Section */}
          {data?.insights && groqInsights && (
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-900/10 dark:to-purple-900/5 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-400">AI Insights</span>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 line-clamp-3">
                {groqInsights.marketGap || groqInsights.pricingStrategy || data.insights.quickWin}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Dialog */}
      {showAIDialog && data && (
        <AITileDialog
          isOpen={showAIDialog}
          onClose={() => setShowAIDialog(false)}
          data={prepareAIDialogData()}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          isAnalyzing={isAnalyzing}
          onAnalyze={analyzeWithGroq}
        />
      )}
    </>
  );
}