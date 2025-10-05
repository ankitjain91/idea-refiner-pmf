import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, TrendingUp, DollarSign, Target, MapPin, BarChart3,
  ExternalLink, Info, RefreshCw, Building, Users, Brain, 
  ChevronDown, ChevronUp, Activity, AlertTriangle, Zap, Sparkles
} from 'lucide-react';
import { TileAIChat } from '@/components/hub/TileAIChat';
import { useSession } from '@/contexts/SimpleSessionContext';
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
import { recordIdeaValidation } from '@/utils/recordIdeaValidation';

interface ExecutiveMarketSizeTileProps {
  idea?: string;
  ideaContext?: string;
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
  idea, 
  ideaContext, 
  dataHub,
  className, 
  onRefresh 
}: ExecutiveMarketSizeTileProps) {
  const { currentSession } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'regional' | 'segments' | 'drivers'>('overview');
  const [marketData, setMarketData] = useState<MarketSizeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  
  const currentIdea = useMemo(() => 
    ideaContext || idea || currentSession?.data?.currentIdea || ''
  , [ideaContext, idea, currentSession?.data?.currentIdea]);

  const fetchMarketData = async () => {
    if (!currentIdea) {
      toast.error('No idea provided for market analysis');
      return;
    }

    setLoading(true);
    try {
      console.log('[ExecutiveMarketSizeTile] Fetching market size analysis');
      
      const { data, error } = await supabase.functions.invoke('market-size-analysis', {
        body: { 
          idea: currentIdea,
          idea_context: ideaContext || currentIdea,
          data_hub: dataHub 
        }
      });

      if (error) throw error;

      if (data?.market_size) {
        setMarketData(data.market_size);
        console.log('[ExecutiveMarketSizeTile] Market data loaded:', {
          tam: data.market_size.metrics.tam,
          confidence: data.market_size.confidence
        });
        
        // Record validation to live feed
        recordIdeaValidation(
          currentIdea,
          undefined,
          data.market_size.metrics.tam,
          { confidence: data.market_size.confidence }
        );
      }
    } catch (error) {
      console.error('[ExecutiveMarketSizeTile] Error fetching market data:', error);
      toast.error(`Failed to fetch market analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentIdea && !marketData && !loading) {
      fetchMarketData();
    }
  }, [currentIdea]);

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
          <div className="flex items-center justify-center py-8">
            <Button onClick={fetchMarketData} disabled={!currentIdea} size="sm" variant="outline">
              <Activity className="h-3 w-3 mr-1" />
              Analyze Market
            </Button>
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

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div 
              className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 cursor-pointer transition-all hover:scale-105"
              onMouseEnter={() => setHoveredMetric('tam')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">TAM</span>
                <DollarSign className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xl font-bold">{marketData.metrics.tam}</p>
              {hoveredMetric === 'tam' && (
                <p className="text-xs text-muted-foreground mt-1">Total Addressable Market</p>
              )}
            </div>

            <div 
              className="bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-lg p-3 cursor-pointer transition-all hover:scale-105"
              onMouseEnter={() => setHoveredMetric('sam')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">SAM</span>
                <Target className="h-3 w-3 text-secondary" />
              </div>
              <p className="text-xl font-bold">{marketData.metrics.sam}</p>
              {hoveredMetric === 'sam' && (
                <p className="text-xs text-muted-foreground mt-1">Serviceable Available Market</p>
              )}
            </div>

            <div 
              className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-lg p-3 cursor-pointer transition-all hover:scale-105"
              onMouseEnter={() => setHoveredMetric('som')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">SOM</span>
                <Zap className="h-3 w-3 text-accent" />
              </div>
              <p className="text-xl font-bold">{marketData.metrics.som}</p>
              {hoveredMetric === 'som' && (
                <p className="text-xs text-muted-foreground mt-1">Serviceable Obtainable Market</p>
              )}
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
        idea={currentIdea}
      />
    </Card>
  );
}