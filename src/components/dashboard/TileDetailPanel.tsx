import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Info,
  TrendingUp,
  Calculator,
  BookOpen,
  ChartBar,
  Database,
  ExternalLink,
  Lightbulb,
  Target,
  AlertCircle,
  ChevronRight,
  Activity,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetricExplanation {
  definition: string;
  calculation: string;
  usefulness: string;
  benchmarks?: string;
  tips?: string[];
}

interface DataSource {
  name: string;
  url?: string;
  description: string;
  lastUpdated?: string;
  reliability?: 'high' | 'medium' | 'low';
}

interface TileDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: any;
  chartData?: any[];
  sources?: DataSource[];
  metrics?: Record<string, any>;
  metricExplanations?: Record<string, MetricExplanation>;
  insights?: string[];
  rawData?: any;
  children?: React.ReactNode;
  chartType?: 'line' | 'bar' | 'area' | 'pie';
  accentColor?: string;
}

export function TileDetailPanel({
  open,
  onOpenChange,
  title,
  description,
  data,
  chartData,
  sources = [],
  metrics = {},
  metricExplanations = {},
  insights = [],
  rawData,
  children,
  chartType = 'line',
  accentColor = 'hsl(var(--primary))'
}: TileDetailPanelProps) {
  const renderChart = () => {
    if (!chartData || chartData.length === 0) return null;

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="value" fill={accentColor} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                fill={accentColor}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                strokeWidth={2}
                dot={{ fill: accentColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-hidden p-0">
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <SheetTitle className="text-xl font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-sm text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <Tabs defaultValue="overview" className="h-[calc(100vh-120px)]">
          <TabsList className="w-full justify-start rounded-none border-b h-12 p-0 bg-transparent">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="charts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <ChartBar className="h-4 w-4 mr-2" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="sources" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <BookOpen className="h-4 w-4 mr-2" />
              Sources
            </TabsTrigger>
            <TabsTrigger value="raw" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              <Database className="h-4 w-4 mr-2" />
              Raw Data
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100%-48px)]">
            <TabsContent value="overview" className="p-6 space-y-6 mt-0">
              {/* Key Metrics with Explanations */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Key Metrics & What They Mean
                </h3>
                <div className="grid gap-4">
                  {Object.entries(metrics).map(([key, value]) => {
                    const explanation = metricExplanations[key];
                    return (
                      <Card key={key} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-sm font-medium capitalize">
                                {key.replace(/_/g, ' ')}
                              </CardTitle>
                              <div className="text-2xl font-bold mt-1">
                                {typeof value === 'number' ? value.toLocaleString() : value}
                              </div>
                            </div>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardHeader>
                        {explanation && (
                          <CardContent className="space-y-3">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">What it means:</div>
                              <p className="text-sm">{explanation.definition}</p>
                            </div>
                            <Separator />
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Calculator className="h-3 w-3" />
                                How it's calculated:
                              </div>
                              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {explanation.calculation}
                              </p>
                            </div>
                            <Separator />
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                <Lightbulb className="h-3 w-3" />
                                Why it's useful:
                              </div>
                              <p className="text-sm">{explanation.usefulness}</p>
                            </div>
                            {explanation.benchmarks && (
                              <>
                                <Separator />
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Industry Benchmarks:</div>
                                  <p className="text-sm">{explanation.benchmarks}</p>
                                </div>
                              </>
                            )}
                            {explanation.tips && explanation.tips.length > 0 && (
                              <>
                                <Separator />
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Pro Tips:</div>
                                  <ul className="text-sm space-y-1">
                                    {explanation.tips.map((tip, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        <span>{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* AI Insights */}
              {insights.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    AI-Powered Insights
                  </h3>
                  <div className="space-y-3">
                    {insights.map((insight, index) => (
                      <Card key={index} className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-4">
                          <p className="text-sm">{insight}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Content */}
              {children}
            </TabsContent>

            <TabsContent value="charts" className="p-6 mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Data Visualization</h3>
                  {renderChart()}
                </div>
                
                {/* Additional chart analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Chart Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span>Trend Direction: Upward</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span>Volatility: Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <span>Forecast: Positive outlook</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sources" className="p-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Data Sources & References
                </h3>
                {sources.map((source, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{source.name}</h4>
                            {source.reliability && (
                              <Badge
                                variant={
                                  source.reliability === 'high'
                                    ? 'default'
                                    : source.reliability === 'medium'
                                    ? 'secondary'
                                    : 'outline'
                                }
                                className="text-xs"
                              >
                                {source.reliability} reliability
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{source.description}</p>
                          {source.lastUpdated && (
                            <p className="text-xs text-muted-foreground">
                              Last updated: {source.lastUpdated}
                            </p>
                          )}
                        </div>
                        {source.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="raw" className="p-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Raw Data Export
                  </h3>
                  <Button variant="outline" size="sm">
                    Export JSON
                  </Button>
                </div>
                <Card>
                  <CardContent className="pt-4">
                    <pre className="text-xs overflow-x-auto bg-muted p-4 rounded-lg">
                      {JSON.stringify(rawData || data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}