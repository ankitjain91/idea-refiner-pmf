import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, TrendingUp, DollarSign, Target, MapPin, BarChart3,
  ExternalLink, Info, RefreshCw, Building, Users, Brain, 
  ChevronDown, ChevronUp, Activity, AlertTriangle, AlertCircle,
  Zap, Sparkles
} from 'lucide-react';
import { TileAIChat } from '@/components/hub/TileAIChat';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useLockedIdea } from '@/lib/lockedIdeaManager';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, Treemap, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { formatMoney, formatPercent } from '@/utils/dataFormatting';
import { supabase } from '@/integrations/supabase/client';

interface ExecutiveMarketSizeTileProps {
  dataHub?: any;
  className?: string;
  onRefresh?: () => void;
}

interface MarketSizeData {
  summary: string;
  metrics: {
    tam: string;
    sam: string;
    som: string;
    growth_rate_cagr: string;
    regional_split: Record<string, string>;
    segment_split: Record<string, string>;
    drivers: string[];
    constraints: string[];
  };
  charts: Array<{
    type: string;
    title: string;
    series: any[];
  }>;
  citations: Array<{
    source: string;
    title: string;
    url: string;
  }>;
  visuals_ready: boolean;
  confidence: 'High' | 'Moderate' | 'Low';
}

export function ExecutiveMarketSizeTile({ 
  dataHub,
  className, 
  onRefresh 
}: ExecutiveMarketSizeTileProps) {
  const { currentSession } = useSession();
  const { lockedIdea, hasLockedIdea } = useLockedIdea();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'regional' | 'segments' | 'drivers'>('overview');
  const [marketData, setMarketData] = useState<MarketSizeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
  useEffect(() => {
    console.log('[ExecutiveMarketSizeTile] State Debug:', {
      hasLockedIdea,
      ideaExists: !!lockedIdea,
      ideaLength: lockedIdea?.length || 0,
      ideaPreview: lockedIdea?.slice(0, 50),
      loading,
      hasData: !!marketData,
      fetchAttempted,
      allKeys: localStorage ? Object.keys(localStorage).filter(key => key.includes('idea')) : [],
      currentIdeaValue: localStorage?.getItem('pmfCurrentIdea')?.slice(0, 50)
    });
  }, [hasLockedIdea, lockedIdea, loading, marketData, fetchAttempted]);

  const fetchMarketData = useCallback(async (force: boolean = false) => {
    console.log('[ExecutiveMarketSizeTile] Attempting fetch:', {
      hasLockedIdea,
      ideaExists: !!lockedIdea,
      ideaLength: lockedIdea?.length || 0,
      force,
      loading,
      ideaPreview: lockedIdea?.slice(0, 50)
    });

    if (!hasLockedIdea || !lockedIdea) {
      console.warn('[ExecutiveMarketSizeTile] Fetch validation failed:', {
        hasLockedIdea,
        ideaExists: !!lockedIdea,
        ideaLength: lockedIdea?.length || 0
      });
      toast.error('Please lock an idea first using the "Lock My Idea" button.');
      return;
    }

    // Check cache first unless force refresh
    if (!force) {
      const cacheKey = `market_size_${lockedIdea.slice(0, 50)}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setMarketData(cachedData);
          console.log('[ExecutiveMarketSizeTile] Loaded from cache');
          return;
        } catch (e) {
          console.warn('[ExecutiveMarketSizeTile] Failed to parse cache', e);
        }
      }
    }

    if (loading && !force) {
      console.log('[ExecutiveMarketSizeTile] Fetch already in progress');
      return;
    }

    console.log('[ExecutiveMarketSizeTile] Starting market analysis fetch:', {
      ideaPreview: lockedIdea.slice(0, 50),
      force,
      currentLoading: loading,
      hasExistingData: !!marketData
    });

    setLoading(true);
    setFetchAttempted(true);

    try {
      const { data, error } = await supabase.functions.invoke('market-size-analysis', {
        body: { 
          idea: lockedIdea,
          idea_context: lockedIdea,
          data_hub: dataHub 
        }
      });

      if (error) throw error;

      console.log('[ExecutiveMarketSizeTile] RAW API RESPONSE:', JSON.stringify(data, null, 2));
      
      if (data?.market_size) {
        setMarketData(data.market_size);
        
        // Cache the result
        const cacheKey = `market_size_${lockedIdea.slice(0, 50)}`;
        localStorage.setItem(cacheKey, JSON.stringify(data.market_size));
        
        console.log('[ExecutiveMarketSizeTile] Market data successfully loaded, set, and cached.');
      } else {
        console.warn('[ExecutiveMarketSizeTile] API response did not contain market_size object.');
        toast.warning("Market analysis response was incomplete.");
      }
    } catch (error) {
      console.error('[ExecutiveMarketSizeTile] Error fetching market data:', error);
      toast.error(`Failed to fetch market analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      console.log('[ExecutiveMarketSizeTile] Fetch process finished.');
    }
  }, [lockedIdea, hasLockedIdea, dataHub, loading, marketData]);

  // Effect for handling idea changes and initial load
  useEffect(() => {
    if (hasLockedIdea && lockedIdea) {
      if (!marketData && !fetchAttempted) {
        console.log('[ExecutiveMarketSizeTile] Triggering initial data fetch');
        fetchMarketData();
      }
    } else {
      setMarketData(null);
      setFetchAttempted(false);
    }
  }, [lockedIdea, hasLockedIdea, marketData, fetchAttempted]);

  // Effect for handling tab switches - removed auto-fetch to prevent constant refetching
  // Data will be loaded from cache or fetched once on initial mount

  const parseValue = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.replace(/[$,]/g, '');
    const numericPart = parseFloat(cleanValue) || 0;
    
    if (cleanValue.includes('T')) return numericPart * 1000;
    if (cleanValue.includes('B')) return numericPart;
    if (cleanValue.includes('M')) return numericPart / 1000;
    return numericPart;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'text-emerald-500';
      case 'Moderate': return 'text-amber-500';
      case 'Low': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      'High': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'Moderate': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Low': 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    };
    return colors[confidence as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <CardTitle>Market Size Analysis</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Globe className="h-8 w-8 mb-3 text-primary animate-bounce" />
            <p className="text-sm font-medium text-center animate-pulse">
              Analyzing market opportunity...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketData) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            Market Size Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {!hasLockedIdea ? (
              <div className="text-center space-y-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {lockedIdea 
                      ? "Your current idea is too short. Please provide a more detailed description and lock it using the 'Lock My Idea' button."
                      : "Please lock an idea first using the 'Lock My Idea' button."}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Idea state: {lockedIdea ? `${lockedIdea.length} chars` : 'empty'}
                    {lockedIdea && ` (preview: ${lockedIdea.slice(0, 30)}...)`}
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    console.log('[ExecutiveMarketSizeTile] Debug Info:', {
                      hasLockedIdea,
                      ideaExists: !!lockedIdea,
                      ideaLength: lockedIdea?.length || 0,
                      ideaPreview: lockedIdea?.slice(0, 50),
                      localStorage: localStorage ? Object.keys(localStorage).filter(key => key.includes('idea')).reduce((acc, key) => {
                        acc[key] = localStorage.getItem(key)?.slice(0, 50);
                        return acc;
                      }, {} as Record<string, string | undefined>) : {}
                    });
                    toast.info('Check console for debug info');
                  }} 
                  variant="ghost" 
                  size="sm"
                  className="text-xs"
                >
                  <Info className="h-3 w-3 mr-1" />
                  Debug Info
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <Globe className="h-8 w-8 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground mb-2">Ready to analyze market size for your idea</p>
                <Button 
                  onClick={() => fetchMarketData(true)} 
                  disabled={loading} 
                  size="sm" 
                  variant="default"
                  className="min-w-[150px]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Activity className="h-3 w-3 mr-2" />
                      Analyze Market
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare visualization data
  const treemapData = marketData.charts.find(c => c.type === 'treemap')?.series || 
    Object.entries(marketData.metrics.regional_split).map(([name, value]) => ({
      name,
      value: parseValue(value),
      tam: value,
      sam: `$${(parseValue(value) * 0.4).toFixed(1)}B`,
      som: `$${(parseValue(value) * 0.04).toFixed(1)}B`
    }));

  const segmentData = marketData.charts.find(c => c.type === 'bar')?.series ||
    Object.entries(marketData.metrics.segment_split).map(([name, value]) => ({
      name,
      sam: parseValue(value) * 0.4,
      som: parseValue(value) * 0.04
    }));

  const projectionData = marketData.charts.find(c => c.type === 'line')?.series || [];
  const fundingData = marketData.charts.find(c => c.type === 'bubble')?.series || [];

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))'
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-lg", className)}>
      <CardHeader className={cn("pb-3", isCollapsed && "border-b-0")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Market Size Analysis</CardTitle>
            <Badge 
              variant="outline" 
              className={cn("text-xs", getConfidenceBadge(marketData.confidence))}
            >
              {marketData.confidence} Confidence
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {!isCollapsed && marketData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIChat(true)}
                className="gap-1 px-3 py-1.5 h-auto whitespace-nowrap text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI Analysis</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchMarketData()}
              className="h-7 px-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-7 px-2"
            >
              {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Executive Summary */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm leading-relaxed">{marketData.summary}</p>
          </div>

          {/* Key Metrics Cards - TAM SAM SOM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="relative overflow-hidden bg-gradient-to-br from-chart-1/10 via-chart-1/5 to-transparent border-2 border-chart-1/20 rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group"
              onMouseEnter={() => setHoveredMetric('tam')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-chart-1/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Addressable</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-chart-1 to-chart-1/70 bg-clip-text text-transparent">TAM</p>
                  </div>
                  <div className="p-2.5 bg-chart-1/10 rounded-lg">
                    <Globe className="h-5 w-5 text-chart-1" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold mb-1 text-foreground">{marketData.metrics.tam}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {hoveredMetric === 'tam' ? 'Entire market opportunity across all segments and regions' : 'Global market size'}
                </p>
              </div>
            </div>

            <div 
              className="relative overflow-hidden bg-gradient-to-br from-chart-2/10 via-chart-2/5 to-transparent border-2 border-chart-2/20 rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group"
              onMouseEnter={() => setHoveredMetric('sam')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-chart-2/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Serviceable Available</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-chart-2 to-chart-2/70 bg-clip-text text-transparent">SAM</p>
                  </div>
                  <div className="p-2.5 bg-chart-2/10 rounded-lg">
                    <Target className="h-5 w-5 text-chart-2" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold mb-1 text-foreground">{marketData.metrics.sam}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {hoveredMetric === 'sam' ? 'Market you can serve with your current/planned capabilities' : `~${((parseValue(marketData.metrics.sam) / parseValue(marketData.metrics.tam)) * 100).toFixed(0)}% of TAM`}
                </p>
              </div>
            </div>

            <div 
              className="relative overflow-hidden bg-gradient-to-br from-chart-3/10 via-chart-3/5 to-transparent border-2 border-chart-3/20 rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group"
              onMouseEnter={() => setHoveredMetric('som')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-chart-3/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Serviceable Obtainable</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-chart-3 to-chart-3/70 bg-clip-text text-transparent">SOM</p>
                  </div>
                  <div className="p-2.5 bg-chart-3/10 rounded-lg">
                    <Zap className="h-5 w-5 text-chart-3" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold mb-1 text-foreground">{marketData.metrics.som}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {hoveredMetric === 'som' ? 'Realistic market share you can capture in 3-5 years' : `~${((parseValue(marketData.metrics.som) / parseValue(marketData.metrics.sam)) * 100).toFixed(0)}% of SAM`}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs for Different Views */}
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="regional">Regional</TabsTrigger>
              <TabsTrigger value="segments">Segments</TabsTrigger>
              <TabsTrigger value="drivers">Drivers</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Growth Projection Chart */}
              {projectionData.length > 0 && (
                <div className="bg-muted/10 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Growth Projection ({marketData.metrics.growth_rate_cagr} CAGR)
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={projectionData}>
                      <defs>
                        <linearGradient id="colorSom" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="year" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorSom)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>

            <TabsContent value="regional" className="space-y-4">
              {/* Regional Treemap */}
              <div className="bg-muted/10 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Regional TAM Distribution
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <Treemap
                    data={treemapData}
                    dataKey="value"
                    aspectRatio={4/3}
                    stroke="#fff"
                    fill="hsl(var(--primary))"
                  >
                    <Tooltip content={<CustomTooltip />} />
                  </Treemap>
                </ResponsiveContainer>
              </div>

              {/* Regional Details */}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(marketData.metrics.regional_split).map(([region, value], index) => (
                  <div key={region} className="bg-muted/10 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{region}</span>
                      <Badge variant="outline" className="text-xs">
                        {value}
                      </Badge>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ 
                          width: `${(parseValue(value) / parseValue(marketData.metrics.tam)) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="segments" className="space-y-4">
              {/* Segment Analysis */}
              <div className="bg-muted/10 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  SAM vs SOM by Segment
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={segmentData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sam" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="som" fill="hsl(var(--chart-3))" />
                    <Legend className="text-xs" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Segment Split */}
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(marketData.metrics.segment_split).map(([segment, value]) => (
                  <div key={segment} className="bg-muted/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{segment}</span>
                      <span className="text-sm font-bold">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="drivers" className="space-y-4">
              {/* Market Drivers */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                  Key Market Drivers
                </h4>
                <div className="space-y-2">
                  {marketData.metrics.drivers.map((driver, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                      <p className="text-sm">{driver}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Constraints */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  Market Constraints
                </h4>
                <div className="space-y-2">
                  {marketData.metrics.constraints.map((constraint, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5" />
                      <p className="text-sm">{constraint}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Funding Activity */}
              {fundingData.length > 0 && (
                <div className="bg-muted/10 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Funding Activity by Region
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" dataKey="x" name="Region Index" className="text-xs" />
                      <YAxis type="number" dataKey="y" name="Activity" className="text-xs" />
                      <ZAxis type="number" dataKey="size" range={[50, 400]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                      <Scatter name="Funding" data={fundingData} fill="hsl(var(--primary))" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Citations */}
          {marketData.citations.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Sources</h4>
              <div className="space-y-1">
                {marketData.citations.slice(0, 3).map((citation, index) => (
                  <a
                    key={index}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{citation.source}: {citation.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
      
      {/* AI Chat Dialog */}
      <TileAIChat
        open={showAIChat}
        onOpenChange={setShowAIChat}
        tileData={marketData as any}
        tileTitle="Market Size Analysis"
        idea={lockedIdea}
      />
    </Card>
  );
}