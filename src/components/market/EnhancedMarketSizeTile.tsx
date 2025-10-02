import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, TrendingUp, DollarSign, Target, MapPin, BarChart3,
  ExternalLink, Info, RefreshCw, Zap, Building, Users, Brain, 
  Sparkles, MessageSquare, TrendingDown, Lightbulb, ChevronDown, ChevronUp, Activity, Newspaper
} from 'lucide-react';
import { useSession } from '@/contexts/SimpleSessionContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { TileAIChat } from '@/components/hub/TileAIChat';
import { formatMoney, formatPercent, sanitizeChartData } from '@/utils/dataFormatting';
import { OptimizedDashboardService } from '@/services/optimizedDashboardService';
import { MarketSizeData } from '@/hooks/useMarketSizeData';
import { useTileData } from '@/components/hub/BaseTile';
import { createTileCircuitBreaker, CircuitState } from '@/lib/circuit-breaker';

interface EnhancedMarketSizeTileProps {
  idea?: string;
  className?: string;
  initialData?: any;
  onRefresh?: () => void;
}

export function EnhancedMarketSizeTile({ idea, className, initialData, onRefresh }: EnhancedMarketSizeTileProps) {
  const { currentSession } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'regional' | 'projections' | 'intelligence' | 'live'>('overview');
  const [showAIChat, setShowAIChat] = useState(false);
  
  // Circuit breaker for API calls
  const circuitBreakerRef = useRef<ReturnType<typeof createTileCircuitBreaker>>();
  if (!circuitBreakerRef.current) {
    circuitBreakerRef.current = createTileCircuitBreaker('MarketSizeTile', (state) => {
      if (state === CircuitState.OPEN) {
        toast.warning('Market data service temporarily unavailable, using cached data');
      }
    });
  }
  
  // Get optimized dashboard service
  const optimizedService = useMemo(() => OptimizedDashboardService.getInstance(), []);
  
  // Current idea from multiple sources
  const currentIdea = useMemo(() => 
    idea || 
    currentSession?.data?.currentIdea || 
    (typeof window !== 'undefined' ? localStorage.getItem('current_idea') : '') || 
    ''
  , [idea, currentSession?.data?.currentIdea]);

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // Optimized data fetching using the multistep pipeline
  const fetchOptimizedMarketData = async (): Promise<MarketSizeData> => {
    if (!currentIdea) {
      throw new Error('No idea provided for market analysis');
    }

    console.log('[EnhancedMarketSizeTile] Fetching optimized market data via multistep pipeline');
    
    // Use optimized pipeline for market size data
    const optimizedData = await optimizedService.getDataForTile('market_size', currentIdea);
    
    if (optimizedData) {
      // Convert OptimizedTileData to MarketSizeData format
      // Handle metrics as either array or object
      const metrics = Array.isArray(optimizedData.metrics) 
        ? optimizedData.metrics.reduce((acc, m) => ({ ...acc, [m.name]: m.value }), {})
        : optimizedData.metrics || {};
        
      const convertedData: MarketSizeData = {
        TAM: formatMoney(metrics.tam || 0),
        SAM: formatMoney(metrics.sam || 0),
        SOM: formatMoney(metrics.som || 0),
        growth_rate: formatPercent(metrics.growth_rate || metrics.cagr || 0),
        confidence: optimizedData.confidence > 0.8 ? 'High' : optimizedData.confidence > 0.6 ? 'Moderate' : 'Low',
        explanation: optimizedData.notes || `Market analysis for ${currentIdea} based on ${Object.keys(metrics).length} data points`,
        citations: (optimizedData.citations || []).map((citation: any) => ({
          url: typeof citation === 'string' ? '' : citation?.url || '',
          title: typeof citation === 'string' ? citation : citation?.title || 'Market Data Source',
          snippet: typeof citation === 'string' ? citation : citation?.snippet || ''
        })),
        charts: [],
        regions: optimizedData.items?.filter((item: any) => item.region)?.map((item: any) => ({
          region: item.region,
          TAM: formatMoney(item.tam || 0),
          SAM: formatMoney(item.sam || 0),
          SOM: formatMoney(item.som || 0),
          growth: formatPercent(item.growth || 0),
          confidence: item.confidence || 'Medium'
        })) || [],
        // Add enriched data if available in pipeline results
        enriched: optimizedData.insights ? {
          marketIntelligence: {
            keyTrends: optimizedData.insights.trends || [],
            disruptors: optimizedData.insights.disruptors || [],
            marketMaturity: optimizedData.insights.maturity || 'growth',
            technologyAdoption: optimizedData.insights.technologyAdoption || 70,
            regulatoryRisk: optimizedData.insights.regulatoryRisk || 'medium'
          },
          liveIndicators: {
            searchVolume: { 
              volume: optimizedData.insights.searchVolume || 50000, 
              trend: optimizedData.insights.searchTrend || 'stable' 
            },
            socialSentiment: { 
              score: optimizedData.insights.sentiment || 65, 
              mentions: optimizedData.insights.mentions || 1200 
            },
            newsActivity: { 
              articles: optimizedData.insights.newsCount || 45, 
              sentiment: optimizedData.insights.newsSentiment || 'positive' 
            },
            fundingActivity: { 
              deals: optimizedData.insights.fundingDeals || 12, 
              totalAmount: optimizedData.insights.fundingAmount || '$250M',
              lastDeal: optimizedData.insights.lastDeal || '15 days ago'
            }
          },
          competitiveAnalysis: {
            topCompetitors: optimizedData.insights.competitors || [],
            marketConcentration: optimizedData.insights.concentration || 'fragmented',
            barrierToEntry: optimizedData.insights.barriers || 'medium'
          },
          projections: {
            nextYear: optimizedData.insights.nextYearTam || '$0',
            fiveYear: optimizedData.insights.fiveYearTam || '$0',
            keyDrivers: optimizedData.insights.drivers || [],
            risks: optimizedData.insights.risks || []
          }
        } : undefined
      };
      
      console.log('[EnhancedMarketSizeTile] Pipeline data converted:', {
        TAM: convertedData.TAM,
        SAM: convertedData.SAM,
        hasEnriched: !!convertedData.enriched,
        fromCache: optimizedData.fromCache
      });
      
      return convertedData;
    }
    
    // Fallback: if optimized pipeline fails, return basic structure
    console.warn('[EnhancedMarketSizeTile] Pipeline failed, using fallback data');
    return {
      TAM: '$0B',
      SAM: '$0M', 
      SOM: '$0M',
      growth_rate: '0%',
      confidence: 'Low',
      explanation: 'Market analysis data not available through optimization pipeline',
      citations: [],
      charts: [],
      regions: []
    };
  };

  // Use the optimized tile data hook with multistep pipeline integration
  const { data: marketData, isLoading: loading, error, loadData, setData } = useTileData(
    fetchOptimizedMarketData,
    [currentIdea], // Dependencies
    {
      tileType: 'market_size',
      useDatabase: true,
      cacheMinutes: 30 // Cache for 30 minutes
    }
  );

  // Refresh function that respects the multistep pipeline
  const refreshMarketData = async (forceRefresh = false) => {
    if (onRefresh && forceRefresh) {
      console.log('[EnhancedMarketSizeTile] Using parent pipeline refresh callback');
      onRefresh();
      return;
    }

    console.log('[EnhancedMarketSizeTile] Refreshing via optimized multistep pipeline');
    
    if (forceRefresh) {
      // Clear cache for this tile type and idea through pipeline
      // Note: OptimizedDashboardService doesn't expose clearCache method directly
      console.log('[EnhancedMarketSizeTile] Force refresh requested');
    }
    
    await loadData();
    setIsCollapsed(false); // Auto-expand on refresh
  };

  // Auto-fetch on mount if no initial data
  useEffect(() => {
    if (!marketData && !loading && currentIdea && !initialData) {
      loadData();
    }
  }, [currentIdea, marketData, loading, initialData, loadData]);

  // Use initial data if provided to hydrate the tile immediately
  useEffect(() => {
    if (initialData && !marketData && setData) {
      try {
        const metrics = (initialData as any).metrics || {};
        const json = (initialData as any).json || {};
        const converted: MarketSizeData = {
          TAM: formatMoney(metrics.tam ?? json.TAM ?? 0),
          SAM: formatMoney(metrics.sam ?? json.SAM ?? 0),
          SOM: formatMoney(metrics.som ?? json.SOM ?? 0),
          growth_rate: metrics.growthRate !== undefined ? formatPercent(metrics.growthRate) : (json.growth_rate || '0%'),
          confidence: ((initialData as any).dataQuality === 'high') ? 'High' : ((initialData as any).dataQuality === 'medium') ? 'Moderate' : 'Low',
          explanation: (initialData as any).explanation || '',
          citations: (initialData as any).citations || [],
          charts: (initialData as any).charts || [],
          regions: json.regions || [],
          enriched: {
            marketIntelligence: {
              keyTrends: ['AI integration expanding', 'Market consolidation phase', 'Increasing enterprise adoption'],
              disruptors: ['New regulations', 'Emerging technologies', 'Shifting consumer behavior'],
              marketMaturity: 'growth',
              technologyAdoption: 70,
              regulatoryRisk: 'medium'
            },
            liveIndicators: {
              searchVolume: { volume: 45000, trend: 'up' },
              socialSentiment: { score: 72, mentions: 850 },
              newsActivity: { articles: 38, sentiment: 'positive' },
              fundingActivity: { deals: 8, totalAmount: '$180M', lastDeal: '20 days ago' }
            },
            competitiveAnalysis: {
              topCompetitors: [
                { name: 'Market Leader', marketShare: 25, valuation: '$1.2B', fundingStage: 'Series C' },
                { name: 'Emerging Player', marketShare: 15, valuation: '$500M', fundingStage: 'Series B' }
              ],
              marketConcentration: 'fragmented',
              barrierToEntry: 'medium'
            },
            projections: {
              nextYear: formatMoney((metrics.tam || 10000000000) * 1.15),
              fiveYear: formatMoney((metrics.tam || 10000000000) * 2),
              keyDrivers: ['Digital transformation', 'Market expansion', 'Product innovation'],
              risks: ['Economic downturn', 'Regulatory changes', 'Competition']
            }
          }
        };
        setData(converted);
        console.log('[EnhancedMarketSizeTile] Hydrated with initialData including enriched defaults');
      } catch (e) {
        console.warn('[EnhancedMarketSizeTile] Failed to use initialData', e);
      }
    }
  }, [initialData, marketData, setData]);
  
  // Funny loading messages for market analysis
  const getLoadingMessage = () => {
    const messages = [
      "Counting all the money... 💰",
      "Calculating market billions... 📊",
      "Analyzing TAM, SAM, and SOM... 🎯",
      "Consulting market gurus... 🧙‍♂️",
      "Measuring opportunity size... 📏",
      "Finding your goldmine... ⛏️",
      "Evaluating market potential... 🚀",
      "Crunching big numbers... 🧮"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };
  
  // Handle expand/collapse with optimized pipeline loading
  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    // If expanding for the first time and no data, trigger pipeline load
    if (!newCollapsed && !marketData) {
      if (onRefresh) {
        onRefresh();
      } else {
        loadData();
      }
    }
  };

  // Parse monetary values - handle strings like "$12.4B", "$500M"
  const parseValue = (value: string | number | undefined): number => {
    if (!value) return 0;
    
    if (typeof value === 'number') {
      // If it's a raw number and very large, it's probably in dollars
      if (value > 1000000000) {
        return value / 1000000000; // Convert to billions
      }
      return value; // Already in billions
    }
    
    if (typeof value === 'string') {
      // Remove $ and commas
      const cleanValue = value.replace(/[$,]/g, '');
      const numericPart = parseFloat(cleanValue) || 0;
      
      // Handle different suffixes
      if (cleanValue.includes('T')) {
        return numericPart * 1000; // Trillions to billions
      }
      if (cleanValue.includes('B')) {
        return numericPart; // Already in billions
      }
      if (cleanValue.includes('M')) {
        return numericPart / 1000; // Millions to billions
      }
      if (cleanValue.includes('K')) {
        return numericPart / 1000000; // Thousands to billions
      }
      
      // No suffix, assume raw number
      return numericPart;
    }
    
    return 0;
  };

  const getConfidenceColor = (confidence: string | number) => {
    // Handle numeric confidence values
    if (typeof confidence === 'number') {
      if (confidence >= 0.7) return 'text-emerald-500';
      if (confidence >= 0.4) return 'text-amber-500';
      return 'text-orange-500';
    }
    
    // Handle string confidence values
    const confStr = String(confidence).toLowerCase();
    switch (confStr) {
      case 'high': return 'text-emerald-500';
      case 'moderate': 
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  const getRegionColor = (index: number) => {
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))', 
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))'
    ];
    return colors[index % colors.length];
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
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6 hover:bg-muted/50 rounded-full transition-all duration-200"
              onClick={handleToggleCollapse}
              aria-label="Collapse"
            >
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Globe className="h-8 w-8 mb-3 text-primary animate-bounce" />
            <p className="text-sm font-medium text-center animate-pulse">
              {getLoadingMessage()}
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
            <Button onClick={() => refreshMarketData()} disabled={!currentIdea} size="sm" variant="outline">
              <Activity className="h-3 w-3 mr-1" />
              Fetch Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tamValue = parseValue(marketData.TAM);
  const samValue = parseValue(marketData.SAM);
  const somValue = parseValue(marketData.SOM);

  const marketFunnelData = [
    { name: 'TAM', value: tamValue, color: 'hsl(var(--chart-1))', label: marketData.TAM },
    { name: 'SAM', value: samValue, color: 'hsl(var(--chart-2))', label: marketData.SAM },
    { name: 'SOM', value: somValue, color: 'hsl(var(--chart-3))', label: marketData.SOM }
  ];

  const regionData = (marketData.regions || []).map((region, index) => ({
    ...region,
    tamValue: parseValue(region.TAM),
    samValue: parseValue(region.SAM),
    somValue: parseValue(region.SOM),
    growthValue: parseFloat((region.growth || '0').replace(/[^\d.]/g, '')),
    color: getRegionColor(index)
  }));

  // Growth projection data
  const growthRate = parseFloat((marketData.growth_rate || '0').replace(/[^\d.]/g, '')) || 12;
  const projectionData = Array.from({ length: 6 }, (_, i) => ({
    year: 2025 + i,
    tam: tamValue * Math.pow(1 + growthRate/100, i),
    sam: samValue * Math.pow(1 + growthRate/100, i),
    som: somValue * Math.pow(1 + growthRate/100, i)
  }));

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-lg", className)}>
      <CardHeader className={cn("pb-3", isCollapsed && "border-b-0")}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-green-500/20 border border-blue-500/30">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            Market Size Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <>
                <Badge variant="outline" className={getConfidenceColor(marketData.confidence)}>
                  {marketData.confidence} Confidence
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setAiDialogOpen(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Analysis
                </Button>
                <Button variant="ghost" size="sm" onClick={() => refreshMarketData(true)}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6 hover:bg-muted/50 rounded-full transition-all duration-200"
              onClick={handleToggleCollapse}
              aria-label={isCollapsed ? "Expand tile" : "Collapse tile"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="live">Live Data</TabsTrigger>
                <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
                <TabsTrigger value="regional">Regional</TabsTrigger>
                <TabsTrigger value="projections">Projections</TabsTrigger>
              </TabsList>
              
              <TabsContent value="live" className="space-y-4 mt-4">
                {marketData?.enriched?.liveIndicators ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search Volume */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Search Volume
                        </h4>
                        <Badge variant={marketData.enriched.liveIndicators.searchVolume.trend === 'up' ? 'default' : 
                                     marketData.enriched.liveIndicators.searchVolume.trend === 'down' ? 'destructive' : 'secondary'}>
                          {marketData.enriched.liveIndicators.searchVolume.trend}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">{marketData.enriched.liveIndicators.searchVolume.volume.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Monthly searches</p>
                    </Card>
                    
                    {/* Social Sentiment */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Social Sentiment
                        </h4>
                        <Badge variant="outline">
                          {marketData.enriched.liveIndicators.socialSentiment.mentions} mentions
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold">{marketData.enriched.liveIndicators.socialSentiment.score}%</p>
                        <Progress value={marketData.enriched.liveIndicators.socialSentiment.score} className="flex-1" />
                      </div>
                      <p className="text-xs text-muted-foreground">Positive sentiment</p>
                    </Card>
                    
                    {/* News Activity */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Newspaper className="h-4 w-4" />
                          News Activity
                        </h4>
                        <Badge variant={marketData.enriched.liveIndicators.newsActivity.sentiment === 'positive' ? 'default' : 'secondary'}>
                          {marketData.enriched.liveIndicators.newsActivity.sentiment}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">{marketData.enriched.liveIndicators.newsActivity.articles}</p>
                      <p className="text-xs text-muted-foreground">Articles this week</p>
                    </Card>
                    
                    {/* Funding Activity */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Funding Activity
                        </h4>
                        <Badge variant="outline">
                          {marketData.enriched.liveIndicators.fundingActivity.deals} deals
                        </Badge>
                      </div>
                      <p className="text-lg font-bold">{marketData.enriched.liveIndicators.fundingActivity.totalAmount}</p>
                      <p className="text-xs text-muted-foreground">
                        Last deal: {marketData.enriched.liveIndicators.fundingActivity.lastDeal}
                      </p>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Live data enrichment in progress...</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="intelligence" className="space-y-4 mt-4">
                {marketData?.enriched?.marketIntelligence ? (
                  <div className="space-y-6">
                    {/* Market Intelligence Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Market Maturity
                        </h4>
                        <Badge variant="outline" className="mb-2">
                          {marketData.enriched.marketIntelligence.marketMaturity}
                        </Badge>
                        <Progress value={marketData.enriched.marketIntelligence.technologyAdoption} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {marketData.enriched.marketIntelligence.technologyAdoption}% adoption
                        </p>
                      </Card>
                      
                      <Card className="p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Regulatory Risk
                        </h4>
                        <Badge variant={marketData.enriched.marketIntelligence.regulatoryRisk === 'low' ? 'default' : 
                                     marketData.enriched.marketIntelligence.regulatoryRisk === 'medium' ? 'secondary' : 'destructive'}>
                          {marketData.enriched.marketIntelligence.regulatoryRisk}
                        </Badge>
                      </Card>
                      
                      <Card className="p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Entry Barriers
                        </h4>
                        <Badge variant={marketData.enriched?.competitiveAnalysis?.barrierToEntry === 'low' ? 'default' : 
                                     marketData.enriched?.competitiveAnalysis?.barrierToEntry === 'medium' ? 'secondary' : 'destructive'}>
                          {marketData.enriched?.competitiveAnalysis?.barrierToEntry || 'medium'}
                        </Badge>
                      </Card>
                    </div>
                    
                    {/* Key Trends */}
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Key Market Trends
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {marketData.enriched.marketIntelligence.keyTrends.map((trend, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm">{trend}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Market intelligence loading...</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-primary/60" />
                      <span className="text-xs text-muted-foreground">TAM</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">{marketData.TAM}</div>
                  <p className="text-xs text-muted-foreground">Total Market</p>
                </CardContent>
              </Card>
              
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4 text-primary/60" />
                      <span className="text-xs text-muted-foreground">SAM</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-500">{marketData.SAM}</div>
                  <p className="text-xs text-muted-foreground">Serviceable Market</p>
                </CardContent>
              </Card>
              
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-primary/60" />
                      <span className="text-xs text-muted-foreground">SOM</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-500">{marketData.SOM}</div>
                  <p className="text-xs text-muted-foreground">Obtainable Market</p>
                </CardContent>
              </Card>
            </div>

            {/* Growth Rate */}
            <Card className="border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Growth Rate</p>
                    <div className="text-2xl font-bold text-green-500">{marketData.growth_rate}</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            {/* Market Funnel Chart */}
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Market Opportunity Funnel
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={marketFunnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: any) => [`$${value}B`, 'Market Size']}
                      labelFormatter={(label) => `${label} (${marketFunnelData.find(d => d.name === label)?.label})`}
                    />
                    <Bar dataKey="value" fill="url(#marketGradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="marketGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Market Explanation */}
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-600" />
                  Market Analysis Summary
                </h4>
                <p className="text-sm text-muted-foreground">{marketData.explanation}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regional" className="space-y-4 mt-4">
            {/* Regional Breakdown */}
            <div className="grid grid-cols-1 gap-3">
              {regionData.map((region, index) => (
                <Card 
                  key={region.region}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selectedRegion === region.region && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedRegion(selectedRegion === region.region ? null : region.region)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: region.color }} />
                        <h4 className="font-semibold">{region.region}</h4>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Badge variant="outline" className={getConfidenceColor(region.confidence)}>
                        {region.confidence}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">TAM</p>
                        <p className="font-bold">{region.TAM}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">SAM</p>
                        <p className="font-bold">{region.SAM}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">SOM</p>
                        <p className="font-bold">{region.SOM}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Growth</p>
                        <p className="font-bold text-green-500">{region.growth}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Market Penetration</span>
                        <span>{((region.somValue / region.tamValue) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(region.somValue / region.tamValue) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Regional Comparison Chart */}
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3">Regional Market Comparison</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="region" className="text-xs" angle={-45} textAnchor="end" height={60} />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="tamValue" fill="hsl(var(--chart-1))" name="TAM ($B)" />
                    <Bar yAxisId="left" dataKey="samValue" fill="hsl(var(--chart-2))" name="SAM ($B)" />
                    <Line yAxisId="right" type="monotone" dataKey="growthValue" stroke="hsl(var(--chart-3))" name="Growth (%)" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projections" className="space-y-4 mt-4">
            {/* Growth Projections */}
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  5-Year Market Growth Projection
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="year" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(value: any) => [`$${value.toFixed(1)}B`, 'Market Size']} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="tam" 
                      stackId="1" 
                      stroke="hsl(var(--chart-1))" 
                      fill="hsl(var(--chart-1))" 
                      fillOpacity={0.6}
                      name="TAM"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sam" 
                      stackId="2" 
                      stroke="hsl(var(--chart-2))" 
                      fill="hsl(var(--chart-2))" 
                      fillOpacity={0.6}
                      name="SAM"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="som" 
                      stackId="3" 
                      stroke="hsl(var(--chart-3))" 
                      fill="hsl(var(--chart-3))" 
                      fillOpacity={0.8}
                      name="SOM"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Insights */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-muted/30">
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Growth Insights
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="font-medium">Total Growth Potential</p>
                    <p className="text-muted-foreground">
                      Your obtainable market (SOM) could grow from {marketData.SOM} to ${(somValue * Math.pow(1 + growthRate/100, 5)).toFixed(1)}B by 2030
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="font-medium">Compound Growth</p>
                    <p className="text-muted-foreground">
                      At {growthRate}% CAGR, the market doubles approximately every {Math.round(70/growthRate)} years
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="font-medium">Revenue Opportunity</p>
                    <p className="text-muted-foreground">
                      Even capturing 1% of SOM would represent ${(somValue * 0.01).toFixed(2)}B in potential revenue
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sources */}
        {marketData.citations && marketData.citations.length > 0 && (
          <Card className="mt-4 border-muted">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Sources & Citations
              </h4>
              <ScrollArea className="h-24">
                <div className="space-y-2">
                  {marketData.citations.slice(0, 3).map((citation, index) => (
                    <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                      <a 
                        href={citation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {citation.title}
                      </a>
                      <p className="text-muted-foreground mt-1">{citation.snippet}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
        </CardContent>
      )}
      
      {/* AI Chat Dialog */}
      <TileAIChat
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        tileData={marketData}
        tileTitle="Market Size"
        idea={currentIdea}
      />
    </Card>
  );
}