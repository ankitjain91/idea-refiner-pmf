import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  TrendingUp, 
  BarChart3, 
  ExternalLink, 
  Sparkles, 
  Info, 
  ChartLine,
  ChevronRight,
  ChevronDown,
  Target,
  Zap,
  Lightbulb
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DrillDownLevel {
  title: string;
  description?: string;
  data: any;
  insights?: string[];
  subLevels?: DrillDownLevel[];
}

interface AITileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data?: any;
  chartData?: any[];
  sources?: any[];
  metrics?: Record<string, any>;
  metricExplanations?: Record<string, any>;
  insights?: string[];
  rawData?: any;
  chartType?: 'line' | 'bar' | 'area' | 'pie';
  accentColor?: string;
  children?: React.ReactNode;
}

export function AITileDialog({
  open,
  onOpenChange,
  title,
  description,
  data,
  chartData = [],
  sources = [],
  metrics = {},
  metricExplanations = {},
  insights = [],
  rawData,
  chartType = 'line',
  accentColor = 'hsl(var(--primary))',
  children
}: AITileDialogProps) {

  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [selectedDrillDown, setSelectedDrillDown] = useState<string | null>(null);

  const toggleMetric = (key: string) => {
    const newExpanded = new Set(expandedMetrics);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMetrics(newExpanded);
  };

  // Generate drill-down levels based on metric data
  const generateDrillDownLevels = (metricKey: string, metricValue: any): DrillDownLevel[] => {
    const explanation = metricExplanations[metricKey];
    
    // Level 1: Overview
    const level1: DrillDownLevel = {
      title: 'Overview',
      description: explanation?.definition || 'Metric overview',
      data: { value: metricValue },
      insights: [
        explanation?.definition || 'Current metric value',
        'This provides a high-level view of performance'
      ]
    };

    // Level 2: Breakdown
    const level2: DrillDownLevel = {
      title: 'Detailed Breakdown',
      description: 'How this metric is calculated and what influences it',
      data: {
        calculation: explanation?.calculation || 'Direct measurement',
        components: generateMetricComponents(metricKey, metricValue)
      },
      insights: [
        explanation?.calculation || 'Calculated from multiple data points',
        'Understanding these components helps optimize performance',
        'Each component contributes differently to the final value'
      ]
    };

    // Level 3: Deep Analysis
    const level3: DrillDownLevel = {
      title: 'Strategic Analysis',
      description: 'Actionable insights and recommendations',
      data: {
        usefulness: explanation?.usefulness || 'Helps make informed decisions',
        recommendations: generateRecommendations(metricKey, metricValue),
        benchmarks: generateBenchmarks(metricKey, metricValue)
      },
      insights: [
        explanation?.usefulness || 'This metric guides strategic decisions',
        'Compare against industry benchmarks for context',
        'Use these recommendations to improve performance',
        'Monitor trends over time for early warning signals'
      ]
    };

    return [level1, level2, level3];
  };

  const generateMetricComponents = (key: string, value: any) => {
    // Generate realistic components based on metric type
    const components: any = {};
    
    if (key.includes('market') || key.includes('tam') || key.includes('sam')) {
      components.market_research = 'Industry reports and analysis';
      components.customer_surveys = 'Direct customer feedback';
      components.competitor_analysis = 'Market positioning data';
      components.trend_analysis = 'Historical growth patterns';
    } else if (key.includes('competition') || key.includes('competitor')) {
      components.direct_competitors = 'Companies offering similar solutions';
      components.indirect_competitors = 'Alternative solutions';
      components.market_barriers = 'Entry and exit costs';
      components.competitive_advantages = 'Unique value propositions';
    } else if (key.includes('sentiment') || key.includes('score')) {
      components.positive_signals = 'Favorable mentions and reviews';
      components.neutral_feedback = 'Mixed or informational content';
      components.negative_signals = 'Concerns and criticisms';
      components.volume_trends = 'Conversation frequency over time';
    } else {
      components.primary_data = 'Core measurement';
      components.secondary_factors = 'Influencing variables';
      components.market_context = 'Industry environment';
      components.temporal_trends = 'Time-based patterns';
    }
    
    return components;
  };

  const generateRecommendations = (key: string, value: any) => {
    const recommendations: string[] = [];
    
    if (key.includes('market') || key.includes('tam')) {
      recommendations.push(
        'Focus on the most accessible market segments first',
        'Validate assumptions with customer interviews',
        'Track market size changes quarterly',
        'Identify underserved niches for differentiation'
      );
    } else if (key.includes('competition')) {
      recommendations.push(
        'Differentiate on unique value propositions',
        'Monitor competitor pricing and positioning',
        'Build barriers to entry (network effects, IP)',
        'Focus on customer satisfaction over market share initially'
      );
    } else if (key.includes('sentiment') || key.includes('score')) {
      recommendations.push(
        'Address negative feedback promptly and publicly',
        'Amplify positive testimonials in marketing',
        'Engage with community to build advocates',
        'Track sentiment trends to predict issues'
      );
    } else {
      recommendations.push(
        'Monitor this metric regularly for trends',
        'Set specific targets and milestones',
        'Compare against industry benchmarks',
        'Adjust strategy based on performance'
      );
    }
    
    return recommendations;
  };

  const generateBenchmarks = (key: string, value: any) => {
    return {
      industry_average: 'Typical performance in your sector',
      top_quartile: 'Best-in-class performance',
      your_position: 'Current standing',
      growth_target: 'Recommended improvement goal'
    };
  };

  const renderChart = () => {
    if (!chartData || chartData.length === 0) return null;

    const chartProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="value" fill={accentColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...chartProps}>
              <defs>
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                stroke={accentColor} 
                fillOpacity={1} 
                fill="url(#colorArea)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7'];
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                stroke={accentColor} 
                strokeWidth={3}
                dot={{ fill: accentColor, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: accentColor, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderDrillDownLevel = (level: DrillDownLevel, depth: number = 0) => {
    return (
      <div className={cn("space-y-3", depth > 0 && "ml-4 mt-3 border-l-2 border-primary/20 pl-4")}>
        <div className="flex items-start gap-2">
          <div className={cn(
            "p-1.5 rounded-full mt-0.5",
            depth === 0 && "bg-primary/20",
            depth === 1 && "bg-blue-500/20",
            depth === 2 && "bg-purple-500/20"
          )}>
            {depth === 0 && <Target className="h-3 w-3 text-primary" />}
            {depth === 1 && <Zap className="h-3 w-3 text-blue-500" />}
            {depth === 2 && <Lightbulb className="h-3 w-3 text-purple-500" />}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{level.title}</h4>
            {level.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{level.description}</p>
            )}
          </div>
        </div>

        {level.insights && level.insights.length > 0 && (
          <div className="space-y-1.5">
            {level.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs bg-muted/30 p-2 rounded">
                <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}

        {level.data && typeof level.data === 'object' && (
          <div className="text-xs space-y-1">
            {Object.entries(level.data).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-2 bg-background/60 rounded border border-border/50">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        {/* AI-Inspired Header */}
        <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">AI Deep Analysis</span>
            </div>
          </div>
          
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  {title}
                </DialogTitle>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* AI Insights Section */}
            {insights.length > 0 && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Key AI-Generated Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-background/60 rounded-lg border border-border/50">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">{index + 1}</span>
                      </div>
                      <p className="text-sm leading-relaxed flex-1">{insight}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Multi-Level Drill-Down Metrics */}
            {Object.keys(metrics).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Multi-Level Analysis</CardTitle>
                  <CardDescription>
                    Click on any metric to explore 3 levels of insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(metrics).map(([key, value]) => {
                    const drillDownLevels = generateDrillDownLevels(key, value);
                    const isExpanded = expandedMetrics.has(key);
                    
                    return (
                      <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleMetric(key)}>
                        <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                          <CollapsibleTrigger asChild>
                            <div className="p-4 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm capitalize flex items-center gap-2">
                                    {key.replace(/_/g, ' ')}
                                    <Badge variant="outline" className="text-xs">
                                      {isExpanded ? '3 Levels' : 'Expand for insights'}
                                    </Badge>
                                  </h4>
                                  <div className="text-2xl font-bold text-primary mt-1">
                                    {typeof value === 'number' ? value.toLocaleString() : value}
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
                              {drillDownLevels.map((level, idx) => (
                                <div key={idx}>
                                  {renderDrillDownLevel(level, idx)}
                                  {idx < drillDownLevels.length - 1 && (
                                    <Separator className="my-4" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Visualization */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Visualization</CardTitle>
                  <CardDescription>
                    Interactive chart showing trends and patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderChart()}
                </CardContent>
              </Card>
            )}

            {/* Data Sources */}
            {sources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Sources & Reliability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sources.map((source, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{source.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
                        <Badge variant="outline" className="text-xs mt-2">
                          Reliability: {source.reliability}
                        </Badge>
                      </div>
                      {source.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => window.open(source.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Summary Content */}
            {children && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary View</CardTitle>
                </CardHeader>
                <CardContent>
                  {children}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}