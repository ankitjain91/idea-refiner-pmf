import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  RefreshCw, 
  Globe, 
  Search,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { dashboardDataService } from '@/lib/dashboard-data-service';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { AITileDialog } from '../dashboard/AITileDialog';

interface GoogleTrendsCardProps {
  filters: {
    idea_keywords?: string[];
    geo?: string;
    time_window?: string;
  };
  className?: string;
  batchedData?: any; // Optional pre-fetched data from batched endpoint
}

interface TrendData {
  series?: Array<{ name: string; points: Array<[string, number]> }>;
  metrics?: Array<{ name: string; value: string; confidence: number; explanation: string }>;
  top_queries?: Array<string | { query: string; value?: number; change?: string; type?: 'rising' | 'top' }>;
  updatedAt?: string;
  warnings?: string[];
  continentData?: Record<string, any>;
  type?: 'single' | 'continental';
  fromDatabase?: boolean;
  fromCache?: boolean;
}

const CONTINENT_COLORS = {
  'North America': '#3b82f6',
  'Europe': '#10b981',
  'Asia': '#f59e0b',
  'South America': '#8b5cf6',
  'Africa': '#ef4444',
  'Oceania': '#06b6d4'
};

export function GoogleTrendsCard({ filters, className, batchedData }: GoogleTrendsCardProps) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'global' | 'single'>('single');
  const [selectedContinent, setSelectedContinent] = useState<string>('North America');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [analysisLevel, setAnalysisLevel] = useState<number>(0); // 0=overview, 1=detailed, 2=strategic
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();
  const currentIdea = localStorage.getItem('dashboardIdea') || localStorage.getItem('pmfCurrentIdea') || '';

  // Get the idea from filters or fallback to localStorage
  const ideaKeywords = filters.idea_keywords || [];
  const ideaText = ideaKeywords.length > 0 
    ? ideaKeywords.join(' ')
    : (typeof window !== 'undefined' ? (localStorage.getItem('dashboardIdea') || localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
  
  // Extract key concepts for better Google Trends results
  let keywords: string[] = [];
  if (ideaText.toLowerCase().includes('mental wellness') || ideaText.toLowerCase().includes('mental health')) {
    keywords = ['mental health', 'remote work', 'burnout'];
  } else if (ideaText.toLowerCase().includes('wellness')) {
    keywords = ['employee wellness', 'remote teams'];
  } else {
    // Fallback to simplified keywords
    keywords = ideaText.split(' ')
      .filter(w => w.length > 3 && !['with', 'that', 'this', 'from', 'have'].includes(w.toLowerCase()))
      .slice(0, 2);
  }
  
  console.log('[GoogleTrendsCard] Simplified keywords for trends:', keywords);
  const geo = filters.geo || 'US';
  const timeWindow = filters.time_window || 'last_12_months';
  
  // Auto-load on mount or use batched data if available
  useEffect(() => {
    // If batched data is available, use it instead of fetching
    if (batchedData && !hasLoadedOnce) {
      setHasLoadedOnce(true);
      setData(batchedData);
      setLoading(false);
      console.log('[GoogleTrendsCard] Using batched data, skipping individual API call');
    } else if (!hasLoadedOnce && keywords.length > 0 && !batchedData) {
      setHasLoadedOnce(true);
      fetchTrendsData(viewMode === 'global');
    }
  }, [hasLoadedOnce, keywords, batchedData]);

  // Prepare AI dialog data
  // Enhanced business analysis
  const getEnhancedBusinessInsights = async () => {
    if (!ideaText) return null;
    
    try {
      const { data: functionData } = await supabase.functions.invoke('enhanced-business-analysis', {
        body: { 
          idea: ideaText,
          trendsData: data,
          analysisType: 'profitability'
        }
      });
      
      return functionData;
    } catch (error) {
      console.error('Enhanced trends analysis error:', error);
      return null;
    }
  };

  const getAIDialogData = () => {
    if (!data) return null;
    
    const chartData = data.series?.[0]?.points?.map(([date, value]) => ({
      date: typeof date === 'string' ? (date.split('–')[0]?.trim() || date) : String(date),
      value
    })) || [];
    
    // Convert chart data to pie chart format for AI dialog
    const validChartData = Array.isArray(chartData) && chartData.length > 0 ? [
      {
        name: "Search Trend",
        value: chartData.reduce((sum, item) => sum + (item.value || 0), 0) / chartData.length,
        color: "#3b82f6"
      }
    ].filter(item => item.value > 0) : undefined;

    // Enhanced metrics with profitability insights
    const enhancedMetrics = data.metrics?.map((metric: any) => {
      let businessImplication = '';
      let revenueImpact = '';
      
      switch (metric.name) {
        case 'trend_direction':
          businessImplication = 'Search trend direction indicates market momentum and customer interest timing';
          revenueImpact = metric.value === 'rising' ? 'Optimal timing for product launch and premium pricing' : 
                         metric.value === 'declining' ? 'Focus on differentiation and value positioning' :
                         'Stable market - emphasize consistent customer acquisition';
          break;
        default:
          businessImplication = `Search pattern analysis: ${metric.name}`;
          revenueImpact = 'Monitor search trends for demand forecasting and pricing optimization';
      }

      return {
        title: metric.name.replace('_', ' ').toUpperCase(),
        value: String(metric.value),
        icon: TrendingUp,
        color: "text-blue-500",
        levels: [
          { 
            title: "Trend Overview", 
            content: `${businessImplication}. Current trend: ${metric.value}` 
          },
          { 
            title: "Revenue Analysis", 
            content: `${revenueImpact}. ${metric.explanation || "Search trends directly correlate with customer demand and market timing for revenue optimization."}` 
          },
          { 
            title: "Profit Strategy", 
            content: `Market positioning: ${metric.value === 'rising' ? 'Capitalize on growing demand with strategic pricing and rapid customer acquisition' : metric.value === 'declining' ? 'Focus on customer retention and market repositioning for sustained profitability' : 'Maintain steady growth with optimized conversion strategies'}. Time market entry for maximum ROI.` 
          }
        ]
      };
    }) || [];

    return {
      title: "Search Trends & Profitability Analysis",
      metrics: enhancedMetrics,
      chartData: validChartData,
      sources: [
        {
          label: "Google Trends API",
          url: "https://trends.google.com",
          description: "Real-time search trend data for market demand analysis"
        }
      ],
      insights: [
        "🔍 Search volume trends indicate customer demand intensity and market timing",
        "💡 Rising search interest suggests premium pricing opportunities and market entry timing",
        "📊 Trend analysis helps optimize marketing spend and customer acquisition costs",
        "⏰ Search patterns reveal seasonal demand for revenue forecasting and inventory planning",
        "🎯 Geographic search data identifies high-value market segments for targeted expansion"
      ]
    };
  };

  const fetchTrendsData = async (fetchContinents = false, forceRefresh = false) => {
    if (keywords.length === 0) return;
    
    // Use simplified keywords for better Google Trends results
    const trendsKeywords = keywords.slice(0, 1); // Use the strongest single keyword for accuracy
    console.log('[GoogleTrendsCard] Starting fetch, keywords:', trendsKeywords, 'forceRefresh:', forceRefresh);
    
    // First, try to load from database if user is authenticated and not forcing refresh
    if (user?.id && !forceRefresh) {
      console.log('[GoogleTrendsCard] Checking database...');
      try {
        // Try with session ID first, then without if that fails
        let dbData = await dashboardDataService.getData({
          userId: user.id,
          ideaText: currentIdea || localStorage.getItem('pmfCurrentIdea') || '',
          tileType: 'google_trends',
          sessionId: currentSession?.id
        });
        
        // If no data with session ID, try without it
        if (!dbData && currentSession?.id) {
          dbData = await dashboardDataService.getData({
            userId: user.id,
            ideaText: currentIdea || localStorage.getItem('pmfCurrentIdea') || '',
            tileType: 'google_trends'
          });
        }
        
        if (dbData) {
          console.log('[GoogleTrendsCard] ✅ Loaded from database');
          setData(dbData);
          return;
        }
        console.log('[GoogleTrendsCard] No database data found');
      } catch (dbError) {
        console.warn('[GoogleTrendsCard] Database load failed:', dbError);
      }
    }
    
    // Fallback to localStorage cache
    const cacheKey = `google-trends:${trendsKeywords.join(',')}:${geo}:${timeWindow}:${fetchContinents}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData && !forceRefresh) { // Don't use cache if forcing refresh
      const parsed = JSON.parse(cachedData);
      const cacheAge = Date.now() - parsed.timestamp;
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      
      // Return cached data if less than 7 days old
      if (cacheAge < SEVEN_DAYS) {
        console.log('[GoogleTrendsCard] ✅ Loaded from localStorage cache, age:', Math.round(cacheAge / 1000 / 60 / 60 / 24), 'days');
        setData({ ...parsed.data, fromCache: true });
        return;
      }
      console.log('[GoogleTrendsCard] Cache expired, age:', Math.round(cacheAge / 1000 / 60 / 60 / 24), 'days');
    }
    
    setLoading(true);
    setError(null);
    
    console.log('[GoogleTrendsCard] Fetching fresh data from API...');
    try {
      const { data: trendsData, error: trendsError } = await supabase.functions.invoke('google-trends', {
        body: { 
          idea_keywords: trendsKeywords,
          geo,
          time_window: timeWindow,
          fetch_continents: fetchContinents
        }
      });

      if (trendsError) {
        console.error('[GoogleTrendsCard] Error from edge function:', trendsError);
        throw trendsError;
      }
      
      console.log('[GoogleTrendsCard] ✅ Data received from API');
      
      setData(trendsData);
      
      // Cache the data in localStorage
      localStorage.setItem(cacheKey, JSON.stringify({
        data: trendsData,
        timestamp: Date.now()
      }));
      console.log('[GoogleTrendsCard] Saved to localStorage cache');
      
      // Save to database if user is authenticated
      if (user?.id && trendsData) {
        try {
          await dashboardDataService.saveData(
            {
              userId: user.id,
              ideaText: currentIdea || localStorage.getItem('pmfCurrentIdea') || '',
              tileType: 'google_trends',
              sessionId: currentSession?.id
            },
            trendsData,
            10080 // 7 days in minutes (7 * 24 * 60)
          );
          console.log('[GoogleTrendsCard] ✅ Saved to database');
        } catch (saveError) {
          console.warn('[GoogleTrendsCard] Database save failed:', saveError);
        }
      }
      
      setHasLoadedOnce(true);
    } catch (err: any) {
      console.error('[GoogleTrendsCard] Error:', err);
      setError(err.message || 'Failed to fetch trends data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = (mode: 'global' | 'single') => {
    console.log('[GoogleTrendsCard] Changing view mode to:', mode);
    setViewMode(mode);
    fetchTrendsData(mode === 'global', true); // Force refresh on mode change
  };

  const handleRefresh = () => {
    console.log('[GoogleTrendsCard] Manual refresh, viewMode:', viewMode);
    fetchTrendsData(viewMode === 'global', true); // Force refresh on manual trigger
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
      case 'down': return <ArrowDownRight className="h-4 w-4 text-rose-500" />;
      default: return <Minus className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-emerald-500';
      case 'down': return 'text-rose-500';
      default: return 'text-amber-500';
    }
  };

  const renderSingleRegionView = () => {
    if (!data || data.type === 'continental') return null;

    const chartData = data.series?.[0]?.points?.map(([date, value]) => ({
      date: typeof date === 'string' ? (date.split('–')[0]?.trim() || date) : String(date),
      value
    })) || [];

    const trendMetric = data.metrics?.find(m => m.name === 'trend_direction');

    return (
      <div className="space-y-4">
        {/* Trend Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Search Trend</p>
                <div className="flex items-center gap-2 mt-1">
                  {getTrendIcon(trendMetric?.value || 'flat')}
                  <span className="text-xl font-bold capitalize">{trendMetric?.value || 'No data'}</span>
                </div>
                {trendMetric?.confidence && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {Math.round(trendMetric.confidence * 100)}% confidence
                  </Badge>
                )}
              </div>
              <Activity className="h-6 w-6 text-primary/50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-4 border border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Region</p>
                <p className="text-xl font-bold mt-1">{geo}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeWindow.replace(/_/g, ' ')}</p>
              </div>
              <Globe className="h-6 w-6 text-secondary/50" />
            </div>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-card/50 rounded-xl p-4 border">
            <h3 className="text-sm font-semibold mb-3">Search Interest Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Related Queries */}
        {data.top_queries && data.top_queries.length > 0 && (
          <div className="bg-card/50 rounded-xl p-4 border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Top Related Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.top_queries.map((query: any, idx: number) => {
                let queryText = '';
                let changeText = '';
                
                // Handle both string and object formats
                if (typeof query === 'string') {
                  queryText = query;
                } else if (query && typeof query === 'object') {
                  queryText = String(query.query || query.text || query.term || '');
                  changeText = query.change || '';
                }
                
                // Skip if no valid text found or if it's just a number
                if (!queryText || /^\d+$/.test(queryText)) return null;
                
                return (
                  <Badge 
                    key={idx} 
                    variant="outline"
                    className="py-1 px-2.5 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-colors text-xs"
                  >
                    {queryText}
                    {changeText && (
                      <span className="ml-1 text-green-500">{changeText}</span>
                    )}
                  </Badge>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContinentalView = () => {
    console.log('[renderContinentalView] Data:', {
      hasData: !!data,
      type: data?.type,
      hasContinentData: !!data?.continentData,
      continentKeys: data?.continentData ? Object.keys(data.continentData) : []
    });
    
    if (!data || !data.continentData || Object.keys(data.continentData).length === 0) {
      return (
        <div className="text-center py-8">
          <Globe className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No continental data available</p>
          <Button onClick={() => fetchTrendsData(true)} className="mt-4" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Continental Data
          </Button>
        </div>
      );
    }

    const continents = Object.keys(data.continentData);
    const selectedData = data.continentData[selectedContinent];

    // Prepare comparison data for bar chart
    const comparisonData = continents.map(continent => {
      const continentData = data.continentData![continent];
      const latestValue = continentData?.series?.[0]?.points?.slice(-1)[0]?.[1] || 0;
      return {
        continent,
        interest: latestValue,
        trend: continentData?.metrics?.[0]?.value || 'flat'
      };
    });

    return (
      <div className="space-y-4">
        {/* Continent Selector */}
        <div className="flex items-center justify-between">
          <Select value={selectedContinent} onValueChange={setSelectedContinent}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {continents.map(continent => (
                <SelectItem key={continent} value={continent}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CONTINENT_COLORS[continent as keyof typeof CONTINENT_COLORS] }}
                    />
                    {continent}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Continental Comparison Bar Chart */}
        <div className="bg-card/50 rounded-xl p-4 border">
          <h3 className="text-sm font-semibold mb-3">Continental Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="continent" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="interest" radius={[4, 4, 0, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CONTINENT_COLORS[entry.continent as keyof typeof CONTINENT_COLORS] || '#8884d8'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Selected Continent Details */}
        {selectedData && (
          <div className="bg-card/50 rounded-xl p-4 border">
            <h3 className="text-sm font-semibold mb-3">{selectedContinent} Details</h3>
            {selectedData.series?.[0]?.points && selectedData.series[0].points.length > 0 && (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart 
                  data={selectedData.series[0].points.map(([date, value]: [string, number]) => ({
                    date: typeof date === 'string' ? (date.split('–')[0]?.trim() || date) : String(date),
                    value
                  }))}
                >
                  <defs>
                    <linearGradient id={`color${selectedContinent}`} x1="0" y1="0" x2="0" y2="1">
                      <stop 
                        offset="5%" 
                        stopColor={CONTINENT_COLORS[selectedContinent as keyof typeof CONTINENT_COLORS]} 
                        stopOpacity={0.3}
                      />
                      <stop 
                        offset="95%" 
                        stopColor={CONTINENT_COLORS[selectedContinent as keyof typeof CONTINENT_COLORS]} 
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={CONTINENT_COLORS[selectedContinent as keyof typeof CONTINENT_COLORS]}
                    strokeWidth={2}
                    fill={`url(#color${selectedContinent})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!ideaText) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Google Trends
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
            <TrendingUp className="h-5 w-5" />
            Google Trends
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

  return (
    <>
      <Card className={cn("h-full group relative", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">Google Trends</CardTitle>
                <p className="text-xs text-muted-foreground">Search analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Data source indicator */}
              {data && (
                <Badge 
                  variant={data.fromDatabase ? 'default' : data.fromCache ? 'secondary' : 'outline'} 
                  className="text-xs h-5"
                >
                  {data.fromDatabase ? 'DB' : data.fromCache ? 'Cache' : 'API'}
                </Badge>
              )}
              
              {/* Refresh button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
              
              {/* Brain AI button */}
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
            </div>
          </div>
          
          {data && (
            <div className="flex items-center gap-2 mt-2">
              <Tabs value={viewMode} onValueChange={handleViewModeChange}>
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
                    {Object.keys(data.continentData).map(continent => (
                      <SelectItem key={continent} value={continent}>
                        {continent}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Loading State */}
          {loading && !data && (
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-32 bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-20 bg-muted animate-pulse rounded" />
                <div className="h-20 bg-muted animate-pulse rounded" />
              </div>
            </div>
          )}

          {/* Data Content */}
          {data && viewMode === 'single' && renderSingleRegionView()}
          {data && viewMode === 'global' && renderContinentalView()}
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