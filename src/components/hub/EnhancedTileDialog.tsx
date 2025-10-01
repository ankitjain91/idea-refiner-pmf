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
  Zap, Clock, Globe, MessageSquare, Star
} from "lucide-react";
import { TileData } from "@/lib/data-hub-orchestrator";
import { cn } from "@/lib/utils";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area
} from "recharts";

interface EnhancedTileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tileType: string;
  data: TileData | null;
  icon?: React.ReactNode;
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
  if (!data) return null;

  const getInsightIcon = (type: string) => {
    const icons: Record<string, any> = {
      growth: TrendingUp,
      decline: TrendingDown,
      warning: AlertCircle,
      success: CheckCircle,
      opportunity: Sparkles,
      risk: Shield,
      speed: Zap,
      users: Users,
      money: DollarSign,
      activity: Activity
    };
    return icons[type] || Lightbulb;
  };

  const generateInsights = () => {
    const insights = [];
    
    // Generate insights based on metrics
    if (data.metrics?.score !== undefined) {
      const score = data.metrics.score;
      insights.push({
        type: score > 70 ? 'success' : score < 40 ? 'warning' : 'info',
        icon: score > 70 ? 'success' : score < 40 ? 'warning' : 'activity',
        title: `${score > 70 ? 'Strong' : score < 40 ? 'Weak' : 'Moderate'} Performance`,
        description: `Current score of ${score}/100 indicates ${
          score > 70 ? 'excellent market fit potential' : 
          score < 40 ? 'significant improvement needed' : 
          'room for optimization'
        }`
      });
    }

    if (data.metrics?.tam) {
      const tam = data.metrics.tam;
      insights.push({
        type: 'opportunity',
        icon: 'money',
        title: 'Market Opportunity',
        description: `Total addressable market of $${(tam / 1000000000).toFixed(1)}B presents ${
          tam > 10000000000 ? 'massive' : tam > 1000000000 ? 'significant' : 'moderate'
        } growth potential`
      });
    }

    if (data.metrics?.velocity) {
      insights.push({
        type: 'info',
        icon: 'speed',
        title: 'Market Velocity',
        description: `${data.metrics.velocity.toFixed(2)} news articles per day shows ${
          data.metrics.velocity > 1 ? 'high market activity' : 'steady market interest'
        }`
      });
    }

    if (data.metrics?.competitors) {
      const count = data.metrics.total || data.metrics.competitors;
      insights.push({
        type: count > 10 ? 'warning' : 'info',
        icon: 'users',
        title: 'Competitive Landscape',
        description: `${count} competitors identified. ${
          count > 10 ? 'Highly competitive market requires strong differentiation' :
          count > 5 ? 'Moderate competition allows for positioning opportunities' :
          'Low competition suggests early market opportunity'
        }`
      });
    }

    return insights;
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

  const insights = generateInsights();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Brain className="h-4 w-4 mr-1" />
              Overview
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
            
            <TabsContent value="insights" className="space-y-4">
              {insights.map((insight, i) => {
                const Icon = getInsightIcon(insight.icon);
                return (
                  <Card key={i} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className={cn(
                          "p-3 rounded-lg",
                          insight.type === 'success' && "bg-green-500/10",
                          insight.type === 'warning' && "bg-yellow-500/10",
                          insight.type === 'opportunity' && "bg-blue-500/10",
                          insight.type === 'info' && "bg-muted"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            insight.type === 'success' && "text-green-600",
                            insight.type === 'warning' && "text-yellow-600",
                            insight.type === 'opportunity' && "text-blue-600"
                          )} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* AI-Generated Strategic Recommendations */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Strategic Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {generateRecommendations(data, tileType).map((rec, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
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
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {citation.url}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(citation.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {generateActionItems(data, tileType).map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="mt-0.5">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {action.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {action.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {action.effort}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
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

function generateRecommendations(data: TileData, tileType: string): string[] {
  const recommendations = [];
  
  if (data.metrics?.score !== undefined) {
    const score = data.metrics.score;
    if (score < 40) {
      recommendations.push("Consider pivoting your value proposition to better align with market needs");
      recommendations.push("Conduct user interviews to identify unmet pain points");
    } else if (score < 70) {
      recommendations.push("Focus on differentiating features to stand out from competitors");
      recommendations.push("Optimize pricing strategy based on market analysis");
    } else {
      recommendations.push("Accelerate go-to-market strategy to capture market opportunity");
      recommendations.push("Consider raising capital to scale faster than competitors");
    }
  }
  
  if (data.metrics?.competitors > 5) {
    recommendations.push("Develop a unique positioning strategy to differentiate from competitors");
  }
  
  if (data.metrics?.velocity > 1) {
    recommendations.push("Capitalize on high market momentum with aggressive marketing");
  }
  
  return recommendations;
}

function generateActionItems(data: TileData, tileType: string): any[] {
  return [
    {
      title: "Validate with target customers",
      description: "Run surveys or interviews with 20-30 potential users",
      priority: "High",
      effort: "Low"
    },
    {
      title: "Build MVP",
      description: "Create a minimal version to test core value proposition",
      priority: "High",
      effort: "Medium"
    },
    {
      title: "Analyze competitor strategies",
      description: "Deep dive into top 3 competitors' pricing and features",
      priority: "Medium",
      effort: "Low"
    },
    {
      title: "Develop go-to-market strategy",
      description: "Create launch plan with marketing channels and budget",
      priority: "Medium",
      effort: "High"
    }
  ];
}