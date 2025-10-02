import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart3, TrendingUp, TrendingDown, AlertCircle, 
  CheckCircle, XCircle, ExternalLink, Sparkles, Target,
  Users, DollarSign, Activity, Brain, Lightbulb, Shield,
  Zap, Clock, Globe, MessageSquare, Star, Loader2
} from "lucide-react";
import { TileData } from "@/lib/data-hub-orchestrator";
import { cn } from "@/lib/utils";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area
} from "recharts";
import { useState, useEffect } from "react";
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { useSession } from "@/contexts/SimpleSessionContext";

interface EnhancedTileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tileType: string;
  data: TileData | null;
  icon?: React.ReactNode;
}

interface GroqAnalysis {
  keyInsights: Array<{
    type: 'opportunity' | 'risk' | 'strength' | 'weakness';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
  }>;
  strategicRecommendations: string[];
  marketInterpretation: string;
  competitivePosition: string;
  criticalSuccessFactors: string[];
  nextSteps: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    timeline: 'immediate' | 'short-term' | 'long-term';
  }>;
  pmfSignals: {
    positive: string[];
    negative: string[];
    overallAssessment: string;
  };
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

export function EnhancedTileDialog({ 
  open, 
  onOpenChange, 
  title, 
  tileType,
  data,
  icon 
}: EnhancedTileDialogProps) {
  const [analysis, setAnalysis] = useState<GroqAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  // Using useSession from SimpleSessionContext, not useSessionStorage
  const { currentSession } = useSession();
  const ideaContext = currentSession?.data?.currentIdea || localStorage.getItem('current_idea') || '';
  
  useEffect(() => {
    if (open && data && !analysis && !loadingAnalysis) {
      fetchGroqAnalysis();
    }
  }, [open, data]);

  const fetchGroqAnalysis = async () => {
    if (!data || !ideaContext) return;
    
    setLoadingAnalysis(true);
    try {
      const result = await optimizedQueue.invokeFunction('analyze-tile-insight', { 
        tileType,
        tileData: data,
        ideaContext 
      });

      
      if (result?.success && result.analysis) {
        setAnalysis(result.analysis);
      }
    } catch (error) {
      console.error('Failed to fetch Groq analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (!data) return null;

  const getInsightIcon = (type: string) => {
    const icons: Record<string, any> = {
      growth: TrendingUp,
      decline: TrendingDown,
      warning: AlertCircle,
      success: CheckCircle,
      opportunity: Sparkles,
      risk: Shield,
      strength: Zap,
      weakness: AlertCircle,
      speed: Zap,
      users: Users,
      money: DollarSign,
      activity: Activity
    };
    return icons[type] || Lightbulb;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const renderChart = () => {
    if (!data.charts || data.charts.length === 0) {
      // Generate default charts based on available metrics
      if (data.metrics) {
        const chartData = Object.entries(data.metrics)
          .filter(([key, value]) => typeof value === 'number' && key !== 'score')
          .map(([key, value]) => ({
            name: key.replace(/_/g, ' '),
            value: value as number
          }));

        if (chartData.length > 0) {
          return (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))"
                  }}
                />
                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          );
        }
      }
    }

    const chart = data.charts[0];
    if (!chart) return null;

    switch (chart.type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chart.labels?.map((label, i) => ({
                  name: label,
                  value: chart.series[i]
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill={CHART_COLORS[0]}
                dataKey="value"
              >
                {chart.labels?.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'line':
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chart.series[0]?.data?.map((val: any, i: number) => ({
              name: chart.labels?.[i] || i,
              value: val
            }))}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))"
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={CHART_COLORS[0]} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart.labels?.map((label, i) => ({
              name: label,
              value: chart.series[i] || (chart.series[0]?.data?.[i] ?? 0)
            }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))"
                }}
              />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                data.dataQuality === 'high' && "border-green-600 text-green-600",
                data.dataQuality === 'medium' && "border-yellow-600 text-yellow-600",
                data.dataQuality === 'low' && "border-red-600 text-red-600"
              )}
            >
              {data.dataQuality} quality
            </Badge>
            <Badge variant="outline" className="text-xs">
              {data.confidence}% confidence
            </Badge>
            <Badge variant="outline" className="text-xs">
              {data.citations?.length || 0} sources
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <Brain className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="ai-analysis">
              <Sparkles className="h-4 w-4 mr-1" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Lightbulb className="h-4 w-4 mr-1" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="metrics">
              <BarChart3 className="h-4 w-4 mr-1" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="evidence">
              <Shield className="h-4 w-4 mr-1" />
              Evidence
            </TabsTrigger>
            <TabsTrigger value="actions">
              <Target className="h-4 w-4 mr-1" />
              Actions
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[calc(90vh-250px)] mt-4">
            <TabsContent value="overview" className="space-y-6">
              {/* Main Score/Value Display */}
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Primary Metric</p>
                      <p className="text-4xl font-bold">
                        {formatPrimaryValue(data.metrics, tileType)}
                      </p>
                    </div>
                    {renderChart()}
                  </div>
                </CardContent>
              </Card>
              
              {/* Explanation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How We Calculated This</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{data.explanation}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-analysis" className="space-y-4">
              {loadingAnalysis && (
                <Card>
                  <CardContent className="pt-6 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Analyzing data with AI...</span>
                  </CardContent>
                </Card>
              )}
              
              {analysis && (
                <>
                  {/* Market Interpretation */}
                  <Card className="border-2 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        What This Means For Your Idea
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-relaxed">{analysis.marketInterpretation}</p>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Competitive Position</h4>
                        <p className="text-sm">{analysis.competitivePosition}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* PMF Signals */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Product-Market Fit Signals
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-green-600">Positive Signals</h4>
                          {analysis.pmfSignals.positive.map((signal, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                              <p className="text-sm">{signal}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-red-600">Challenges</h4>
                          {analysis.pmfSignals.negative.map((signal, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                              <p className="text-sm">{signal}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm font-medium">{analysis.pmfSignals.overallAssessment}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Critical Success Factors */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        Critical Success Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysis.criticalSuccessFactors.map((factor, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                            <p className="text-sm">{factor}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4">
              {analysis?.keyInsights.map((insight, i) => {
                const Icon = getInsightIcon(insight.type);
                return (
                  <Card key={i} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className={cn(
                          "p-3 rounded-lg",
                          insight.type === 'opportunity' && "bg-blue-500/10",
                          insight.type === 'risk' && "bg-red-500/10",
                          insight.type === 'strength' && "bg-green-500/10",
                          insight.type === 'weakness' && "bg-yellow-500/10"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            insight.type === 'opportunity' && "text-blue-600",
                            insight.type === 'risk' && "text-red-600",
                            insight.type === 'strength' && "text-green-600",
                            insight.type === 'weakness' && "text-yellow-600"
                          )} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{insight.title}</h4>
                            <Badge className={cn("text-xs", getImpactColor(insight.impact))}>
                              {insight.impact} impact
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {insight.confidence}% confidence
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Strategic Recommendations */}
              {analysis && (
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Strategic Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.strategicRecommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(data.metrics || {}).map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-2xl font-semibold mt-1">
                            {formatMetricValue(value)}
                          </p>
                        </div>
                        <div className="text-right">
                          {typeof value === 'number' && (
                            <Progress value={Math.min(100, value)} className="w-20" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="evidence" className="space-y-3">
              {data.citations?.map((citation, i) => (
                <Card key={i} className="hover:shadow-md transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1 line-clamp-2">
                          {citation.title}
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {citation.source}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(citation.relevance * 100)}% relevant
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {(citation as any).snippet || ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={citation.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="actions" className="space-y-4">
              {analysis?.nextSteps.map((step, i) => (
                <Card key={i} className={cn("hover:shadow-md transition-all", getPriorityColor(step.priority))}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{step.action}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {step.priority} priority
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {step.timeline}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function formatPrimaryValue(metrics: any, tileType: string): string {
  if (!metrics) return 'N/A';
  
  const primaryKeys: Record<string, string> = {
    pmf_score: 'score',
    market_size: 'tam',
    competition: 'total',
    sentiment: 'score',
    market_trends: 'velocity',
    growth_potential: 'score'
  };
  
  const key = primaryKeys[tileType];
  let value = metrics[key];
  
  // Handle object metrics like { name, value }
  if (value && typeof value === 'object' && 'value' in value) {
    value = (value as any).value;
  }
  
  if (typeof value === 'number') {
    if (tileType === 'market_size' && value > 1000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    }
    if (tileType.includes('score')) {
      return `${value}/100`;
    }
    return value.toFixed(1);
  }
  
  return String(value || 'N/A');
}

function formatMetricValue(value: any): string {
  if (value && typeof value === 'object') {
    if ('value' in value && typeof (value as any).value === 'number') {
      return formatMetricValue((value as any).value);
    }
    // Fallback to JSON string for complex objects
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  if (typeof value === 'number') {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (value > 100) return value.toFixed(0);
    return value.toFixed(1);
  }
  return String(value);
}