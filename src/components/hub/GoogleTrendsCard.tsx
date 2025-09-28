import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Globe, 
  Map,
  ChevronRight,
  Search,
  AlertCircle,
  Sparkles,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { cn } from '@/lib/utils';

interface GoogleTrendsCardProps {
  filters: {
    idea_keywords?: string[];
    geo?: string;
    time_window?: string;
  };
  className?: string;
}

interface TrendData {
  series?: Array<{ name: string; points: Array<[string, number]> }>;
  metrics?: Array<{ name: string; value: string; confidence: number; explanation: string }>;
  top_queries?: Array<string | { query: string; value?: number; change?: string; type?: 'rising' | 'top' }>;
  updatedAt?: string;
  warnings?: string[];
  continentData?: Record<string, any>;
  type?: 'single' | 'continental';
}

const CONTINENT_COLORS = {
  'North America': '#3b82f6',
  'Europe': '#10b981',
  'Asia': '#f59e0b',
  'South America': '#8b5cf6',
  'Africa': '#ef4444',
  'Oceania': '#06b6d4'
};

export function GoogleTrendsCard({ filters, className }: GoogleTrendsCardProps) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'global' | 'single'>('single');
  const [selectedContinent, setSelectedContinent] = useState<string>('North America');

  // Get the idea from filters or fallback to localStorage
  const ideaKeywords = filters.idea_keywords || [];
  const ideaText = ideaKeywords.length > 0 
    ? ideaKeywords.join(' ')
    : (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
  
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

  const fetchTrendsData = async (fetchContinents = false) => {
    if (keywords.length === 0) return;
    
    // Use simplified keywords for better Google Trends results
    const trendsKeywords = keywords.slice(0, 1); // Use the strongest single keyword for accuracy
    console.log('[GoogleTrendsCard] Using keywords:', trendsKeywords);
    
    setLoading(true);
    setError(null);
    
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
      
      console.log('[GoogleTrendsCard] Data received:', {
        type: trendsData?.type,
        hasData: !!trendsData,
        hasContinentData: !!trendsData?.continentData,
        continents: trendsData?.continentData ? Object.keys(trendsData.continentData) : []
      });
      
      setData(trendsData);
    } catch (err: any) {
      console.error('[GoogleTrendsCard] Error:', err);
      setError(err.message || 'Failed to fetch trends data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (keywords.length > 0) {
      fetchTrendsData(viewMode === 'global');
    }
  }, [ideaText, geo, timeWindow]);

  const handleViewModeChange = (mode: 'global' | 'single') => {
    console.log('[GoogleTrendsCard] Changing view mode to:', mode);
    setViewMode(mode);
    fetchTrendsData(mode === 'global');
  };

  const handleRefresh = () => {
    console.log('[GoogleTrendsCard] Manual refresh, viewMode:', viewMode);
    fetchTrendsData(viewMode === 'global');
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
              {data.top_queries.map((query, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline"
                  className="py-1 px-2.5 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-colors text-xs"
                >
                  {typeof query === 'string'
                    ? query
                    : (typeof (query as any)?.query === 'string'
                        ? (query as any).query
                        : (typeof (query as any)?.value === 'number' || typeof (query as any)?.value === 'string'
                            ? String((query as any).value)
                            : ''))}
                  {typeof query === 'object' && (query as any)?.change && (
                    <span className="ml-1 text-green-500">{(query as any).change}</span>
                  )}
                </Badge>
              ))}
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
          
          <Badge variant="outline" className="gap-1 text-xs">
            <Map className="h-3 w-3" />
            {continents.length} Continents
          </Badge>
        </div>

        {/* Continental Comparison */}
        <div className="bg-card/50 rounded-xl p-4 border">
          <h3 className="text-sm font-semibold mb-3">Interest by Continent</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="continent" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
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
              <Bar dataKey="interest" radius={[6, 6, 0, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CONTINENT_COLORS[entry.continent as keyof typeof CONTINENT_COLORS]} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Selected Continent Details */}
        {selectedData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/20">
                <p className="text-xs font-medium text-muted-foreground">Trend Direction</p>
                <div className="flex items-center gap-2 mt-1">
                  {getTrendIcon(selectedData.metrics?.[0]?.value || 'flat')}
                  <span className="text-lg font-bold capitalize">
                    {selectedData.metrics?.[0]?.value || 'No data'}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-xl p-3 border border-secondary/20">
                <p className="text-xs font-medium text-muted-foreground">Countries Analyzed</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedData.countries_analyzed?.map((country: string) => (
                    <Badge key={country} variant="secondary" className="text-xs py-0">
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Trend Chart for Selected Continent */}
            {selectedData.series?.[0]?.points && (
              <div className="bg-card/50 rounded-xl p-4 border">
                <h3 className="text-sm font-semibold mb-3">
                  {selectedContinent} Search Interest
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart 
                    data={selectedData.series[0].points.map(([date, value]: [string, number]) => ({
                      date: typeof date === 'string' ? (date.split('–')[0]?.trim() || date) : String(date),
                      value
                    }))}
                  >
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
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={CONTINENT_COLORS[selectedContinent as keyof typeof CONTINENT_COLORS]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Related Queries for Continent */}
            {selectedData.top_queries && selectedData.top_queries.length > 0 && (
              <div className="bg-card/50 rounded-xl p-4 border">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Top Searches in {selectedContinent}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedData.top_queries.map((query: any, idx: number) => (
                    <Badge 
                      key={idx} 
                      variant="outline"
                      className="py-1 px-2.5 text-xs"
                      style={{ 
                        borderColor: CONTINENT_COLORS[selectedContinent as keyof typeof CONTINENT_COLORS] + '40',
                        backgroundColor: CONTINENT_COLORS[selectedContinent as keyof typeof CONTINENT_COLORS] + '10'
                      }}
                    >
                      {typeof query === 'string'
                        ? query
                        : (typeof query?.query === 'string'
                            ? query.query
                            : (typeof query?.value === 'number' || typeof query?.value === 'string'
                                ? String(query.value)
                                : ''))}
                      {typeof query === 'object' && query?.change && (
                        <span className="ml-1 text-green-500">{query.change}</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (!ideaText) {
    return (
      <Card className={cn("h-full overflow-hidden", className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            Google Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-500/20 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription>
              No idea configured. Please enter an idea in the Idea Chat first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden bg-gradient-to-br from-background to-muted/10", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-bold">Google Trends Analysis</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => handleViewModeChange(v as 'global' | 'single')}>
              <TabsList className="h-8">
                <TabsTrigger value="single" className="text-xs">Single</TabsTrigger>
                <TabsTrigger value="global" className="text-xs">Global</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 hover:bg-primary/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {data?.updatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            {(() => {
              const minutesAgo = Math.floor((Date.now() - new Date(data.updatedAt).getTime()) / 60000);
              const isStale = minutesAgo > 5;
              const isMockData = data.warnings?.some(w => w.toLowerCase().includes('mock data'));
              return (
                <>
                  <div className="flex items-center gap-1">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      isMockData ? "bg-slate-500" : 
                      isStale ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                    )} />
                    <span className={cn(
                      "font-medium",
                      isMockData ? "text-slate-600 dark:text-slate-400" :
                      isStale ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {isMockData ? 'Mock' : isStale ? 'Stale' : 'Live'}
                    </span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <Clock className="h-3 w-3" />
                  <span>
                    {minutesAgo === 0 ? 'Just now' : 
                     minutesAgo === 1 ? '1 minute ago' :
                     minutesAgo < 60 ? `${minutesAgo} minutes ago` :
                     new Date(data.updatedAt).toLocaleString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true,
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </>
              );
            })()}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Fetching trends data...</p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && data && (
          <>
            {console.log('[Render] ViewMode:', viewMode, 'DataType:', data?.type)}
            {data.type === 'continental' ? renderContinentalView() : renderSingleRegionView()}
          </>
        )}

        {data?.warnings && data.warnings.length > 0 && (
          <Alert className="mt-3 border-amber-500/20 bg-amber-500/5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <AlertDescription className="text-xs text-amber-600">
              {data.warnings[0]}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}