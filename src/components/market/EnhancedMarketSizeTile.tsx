import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, TrendingUp, DollarSign, Target, MapPin, BarChart3,
  ExternalLink, Info, RefreshCw, Zap, Building, Users, Brain, 
  Sparkles, MessageSquare, TrendingDown, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SimpleSessionContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { TileAIChat } from '@/components/hub/TileAIChat';

interface MarketSizeData {
  TAM: string;
  SAM: string;
  SOM: string;
  growth_rate: string;
  regions: Array<{
    region: string;
    TAM: string;
    SAM: string;
    SOM: string;
    growth: string;
    confidence: string;
  }>;
  confidence: string;
  explanation: string;
  citations: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
  charts: any[];
}

interface EnhancedMarketSizeTileProps {
  idea?: string;
  className?: string;
}

export function EnhancedMarketSizeTile({ idea, className }: EnhancedMarketSizeTileProps) {
  const [marketData, setMarketData] = useState<MarketSizeData | null>({
    TAM: '$2.5B',
    SAM: '$850M',
    SOM: '$125M',
    growth_rate: '15.2%',
    regions: [
      { region: 'North America', TAM: '$1.2B', SAM: '$400M', SOM: '$125M', growth: '12%', confidence: 'High' },
      { region: 'Europe', TAM: '$800M', SAM: '$270M', SOM: '$85M', growth: '18%', confidence: 'High' },
      { region: 'Asia Pacific', TAM: '$500M', SAM: '$180M', SOM: '$45M', growth: '22%', confidence: 'Medium' }
    ],
    confidence: 'High',
    explanation: 'Market analysis shows strong growth potential with increasing demand for AI-powered solutions. The total addressable market is expanding rapidly due to digital transformation initiatives.',
    citations: [
      { url: 'https://mckinsey.com', title: 'McKinsey Global Institute Report 2024', snippet: 'AI market growth analysis and projections' },
      { url: 'https://gartner.com', title: 'Gartner Technology Trends Analysis', snippet: 'Enterprise technology adoption patterns' },
      { url: 'https://idc.com', title: 'IDC Market Forecast 2024-2029', snippet: 'Market size and growth predictions' }
    ],
    charts: [
      {
        type: 'funnel',
        series: [2500, 850, 125],
        labels: ['TAM', 'SAM', 'SOM']
      },
      {
        type: 'bar',
        series: [
          { name: 'TAM', data: [1200, 800, 500] },
          { name: 'SAM', data: [400, 270, 180] },
          { name: 'Growth %', data: [12, 18, 22] }
        ],
        labels: ['North America', 'Europe', 'Asia Pacific']
      }
    ]
  });
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'regional' | 'projections'>('overview');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentSession } = useSession();
  
  const currentIdea = idea || currentSession?.data?.currentIdea || localStorage.getItem('current_idea') || 'AI-powered productivity app';

  const fetchMarketData = async () => {
    if (!currentIdea) {
      toast.error('Please provide an idea to analyze');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching market size data for:', currentIdea);
      
      const { data, error } = await supabase.functions.invoke('market-size-analysis', {
        body: {
          idea: currentIdea,
          geo_scope: ['North America', 'Europe', 'Asia Pacific'],
          audience_profiles: ['B2B', 'B2C', 'Enterprise'],
          competitors: []
        }
      });

      if (error) {
        console.error('Market analysis error:', error);
        toast.error('Failed to fetch market data');
        return;
      }

      if (data?.success && data?.market_size) {
        setMarketData(data.market_size);
        console.log('Market data loaded:', data.market_size);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.error('Market analysis failed:', error);
      toast.error('Market analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Removed old AI analysis functions as we're using TileAIChat component now

  useEffect(() => {
    if (currentIdea && !marketData) {
      fetchMarketData();
    }
  }, [currentIdea]);

  const parseValue = (value: string): number => {
    return parseFloat(value.replace(/[^\d.]/g, '')) || 0;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'text-emerald-500';
      case 'moderate': return 'text-amber-500';
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
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <CardTitle>Analyzing Market Size...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
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
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No market data available. Click to analyze your idea's market potential.
            </p>
            <Button onClick={fetchMarketData} disabled={!currentIdea}>
              <Zap className="h-4 w-4 mr-2" />
              Analyze Market Size
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

  const regionData = marketData.regions.map((region, index) => ({
    ...region,
    tamValue: parseValue(region.TAM),
    samValue: parseValue(region.SAM),
    somValue: parseValue(region.SOM),
    growthValue: parseFloat(region.growth.replace(/[^\d.]/g, '')),
    color: getRegionColor(index)
  }));

  // Growth projection data
  const growthRate = parseFloat(marketData.growth_rate.replace(/[^\d.]/g, '')) || 12;
  const projectionData = Array.from({ length: 6 }, (_, i) => ({
    year: 2025 + i,
    tam: tamValue * Math.pow(1 + growthRate/100, i),
    sam: samValue * Math.pow(1 + growthRate/100, i),
    som: somValue * Math.pow(1 + growthRate/100, i)
  }));

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-lg", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-green-500/20 border border-blue-500/30">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            Market Size Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
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
            <Button variant="ghost" size="sm" onClick={fetchMarketData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="regional">Regional</TabsTrigger>
            <TabsTrigger value="projections">Growth</TabsTrigger>
          </TabsList>

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
        {marketData.citations.length > 0 && (
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