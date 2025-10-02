import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Activity, BarChart3, 
  RefreshCw, DollarSign, Users, Target, AlertTriangle,
  Zap, Shield, Globe, Calendar, ChevronRight, Info,
  LineChart, PieChart, AreaChart
} from "lucide-react";
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { toast } from "sonner";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  Area,
  AreaChart as RechartsAreaChart,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

interface MarketTrendsTileProps {
  idea: string;
  className?: string;
}

interface TrendMetrics {
  growth_rate: { yoy: string; qoq: string };
  funding: { volume_usd: string; deals: number; notables: string[] };
  adoption_stage: string;
  competition_intensity: string;
  sentiment: { positive: number; neutral: number; negative: number; delta_pos_neg: string };
  relevance_to_idea: number;
  impact_score: number;
}

interface MarketTrend {
  trend_id: string;
  title: string;
  summary: string;
  metrics: TrendMetrics;
  visuals: any[];
  drivers: string[];
  risks: string[];
  citations: Array<{ source: string; title: string; url: string }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function MarketTrendsTile({ idea, className }: MarketTrendsTileProps) {
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTrend, setSelectedTrend] = useState<MarketTrend | null>(null);
  const [confidence, setConfidence] = useState<string>("Moderate");
  const [crossLinks, setCrossLinks] = useState<any>({});

  const fetchMarketTrends = async () => {
    if (!idea) {
      setError("No idea provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await optimizedQueue.invokeFunction('market-trends', { idea });
      
      console.log('[MarketTrends] Response:', {
        hasData: !!data,
        keys: data ? Object.keys(data) : [],
        hasMarketTrends: !!data?.market_trends,
        hasTrends: !!data?.trends,
        hasDataTrends: !!data?.data?.trends,
        fullData: data
      });
      
      // Check multiple possible data locations
      const trendsData = data?.market_trends || data?.trends || data?.data?.trends || data?.data?.market_trends || [];
      
      if (trendsData && trendsData.length > 0) {
        setTrends(trendsData);
        setSelectedTrend(trendsData[0] || null);
        setConfidence(data.confidence || "Moderate");
        setCrossLinks(data.cross_links || {});
      } else {
        console.warn('[MarketTrends] No trends data found in response');
        setError('No market trends data available');
      }
    } catch (err) {
      console.error('Error fetching market trends:', err);
      setError('Failed to fetch market trends');
      toast.error('Failed to fetch market trends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketTrends();
    
    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchMarketTrends, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [idea]);

  const getAdoptionColor = (stage: string) => {
    switch (stage) {
      case 'early': return 'text-blue-500';
      case 'growth': return 'text-green-500';
      case 'mature': return 'text-yellow-500';
      case 'declining': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getCompetitionColor = (intensity: string) => {
    switch (intensity) {
      case 'low': return 'bg-green-500/20 text-green-700';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-700';
      case 'high': return 'bg-red-500/20 text-red-700';
      default: return 'bg-muted';
    }
  };

  const getConfidenceBadge = () => {
    const colors = {
      'High': 'bg-green-500/20 text-green-700',
      'Moderate': 'bg-yellow-500/20 text-yellow-700',
      'Low': 'bg-red-500/20 text-red-700'
    };
    return colors[confidence as keyof typeof colors] || colors.Moderate;
  };

  const renderVisualization = (visual: any, index: number) => {
    if (!visual.series || visual.series.length === 0) return null;

    switch (visual.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <RechartsAreaChart data={visual.series}>
              <defs>
                <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={COLORS[index % COLORS.length]}
                fillOpacity={1}
                fill={`url(#gradient-${index})`}
              />
            </RechartsAreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <RechartsBarChart data={visual.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={COLORS[index % COLORS.length]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'bubble':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" type="number" name="Time" />
              <YAxis dataKey="y" type="number" name="Stage" />
              <ZAxis dataKey="size" type="number" range={[50, 400]} name="Amount" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Funding" data={visual.series} fill={COLORS[index % COLORS.length]}>
                {visual.series.map((entry: any, idx: number) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        // Simplified heatmap as a grid
        return (
          <div className="grid grid-cols-3 gap-2">
            {visual.series.map((cell: any, idx: number) => (
              <div
                key={idx}
                className={`p-2 rounded text-xs text-center ${
                  cell.active ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
                style={{ opacity: cell.value / 100 }}
              >
                {cell.adoption} / {cell.competition}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || trends.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || "No market trends data available"}
            </AlertDescription>
          </Alert>
          <Button onClick={fetchMarketTrends} variant="outline" size="sm" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Trends Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getConfidenceBadge()}>
              {confidence} Confidence
            </Badge>
            <Button
              onClick={fetchMarketTrends}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="funding">Funding</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Trend Cards */}
            <div className="grid gap-4">
              {trends.map((trend, idx) => (
                <div
                  key={trend.trend_id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTrend?.trend_id === trend.trend_id ? 'border-primary bg-muted/50' : ''
                  }`}
                  onClick={() => setSelectedTrend(trend)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      {trend.title}
                      <Badge variant="outline" className="text-xs">
                        #{idx + 1}
                      </Badge>
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge className={getCompetitionColor(trend.metrics.competition_intensity)}>
                        {trend.metrics.competition_intensity} competition
                      </Badge>
                      <span className={`text-sm font-medium ${getAdoptionColor(trend.metrics.adoption_stage)}`}>
                        {trend.metrics.adoption_stage}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {trend.summary}
                  </p>
                  
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold flex items-center justify-center gap-1">
                        {trend.metrics.growth_rate.yoy}
                        {parseInt(trend.metrics.growth_rate.yoy) > 0 ? 
                          <TrendingUp className="h-4 w-4 text-green-500" /> :
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">YoY Growth</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{trend.metrics.funding.volume_usd}</div>
                      <div className="text-xs text-muted-foreground">Funding</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{trend.metrics.relevance_to_idea}%</div>
                      <div className="text-xs text-muted-foreground">Relevance</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{(trend.metrics.impact_score * 100).toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Impact</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {selectedTrend && (
              <>
                <div className="space-y-4">
                  <h3 className="font-semibold">{selectedTrend.title} - Detailed Analysis</h3>
                  
                  {/* Visualizations */}
                  {selectedTrend.visuals.map((visual, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <LineChart className="h-4 w-4" />
                        {visual.title}
                      </h4>
                      {renderVisualization(visual, idx)}
                    </div>
                  ))}
                  
                  {/* Sentiment Analysis */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Sentiment Distribution</h4>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Progress 
                          value={selectedTrend.metrics.sentiment.positive} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Positive: {selectedTrend.metrics.sentiment.positive}%
                        </div>
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={selectedTrend.metrics.sentiment.neutral} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Neutral: {selectedTrend.metrics.sentiment.neutral}%
                        </div>
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={selectedTrend.metrics.sentiment.negative} 
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Negative: {selectedTrend.metrics.sentiment.negative}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="funding" className="space-y-4">
            {selectedTrend && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 mb-2 text-primary" />
                    <div className="text-2xl font-bold">{selectedTrend.metrics.funding.volume_usd}</div>
                    <div className="text-sm text-muted-foreground">Total Volume</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <Users className="h-5 w-5 mb-2 text-primary" />
                    <div className="text-2xl font-bold">{selectedTrend.metrics.funding.deals}</div>
                    <div className="text-sm text-muted-foreground">Number of Deals</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Notable Funding Rounds</h4>
                  {selectedTrend.metrics.funding.notables.map((deal, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{deal}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            {selectedTrend && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      Key Drivers
                    </h4>
                    <div className="space-y-2">
                      {selectedTrend.drivers.map((driver, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
                          <span className="text-sm">{driver}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      Risk Factors
                    </h4>
                    <div className="space-y-2">
                      {selectedTrend.risks.map((risk, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                          <span className="text-sm">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Citations */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Sources</h4>
                  <div className="space-y-1">
                    {selectedTrend.citations.map((citation, idx) => (
                      <a
                        key={idx}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        {citation.source}: {citation.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}