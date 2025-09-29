import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Brain, TrendingUp, BarChart3, ExternalLink, Sparkles, Info, ChartLine } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {/* AI-Inspired Header */}
        <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">AI Analysis</span>
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
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="insights" className="h-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3 bg-muted/30">
                <TabsTrigger value="insights" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Insights
                </TabsTrigger>
                <TabsTrigger value="metrics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="data" className="gap-2">
                  <ChartLine className="h-4 w-4" />
                  Visualization
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 space-y-6">
              {/* AI Insights Tab */}
              <TabsContent value="insights" className="space-y-6 mt-0">
                {/* Key Insights */}
                {insights.length > 0 && (
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI-Generated Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-background/60 rounded-lg border border-border/50">
                          <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs font-semibold text-primary">{index + 1}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{insight}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Summary Content */}
                {children && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {children}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="space-y-6 mt-0">
                {Object.keys(metrics).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(metrics).map(([key, value]) => {
                      const explanation = metricExplanations[key];
                      return (
                        <Card key={key} className="relative overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm capitalize">
                                {key.replace(/_/g, ' ')}
                              </h4>
                              {explanation && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Info className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-primary mb-1">
                              {typeof value === 'number' ? value.toLocaleString() : value}
                            </div>
                            {explanation && (
                              <div className="space-y-2 mt-3">
                                <p className="text-xs text-muted-foreground">
                                  <strong>Definition:</strong> {explanation.definition}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  <strong>How it's calculated:</strong> {explanation.calculation}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  <strong>Why it matters:</strong> {explanation.usefulness}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Visualization Tab */}
              <TabsContent value="data" className="space-y-6 mt-0">
                {chartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Data Visualization</CardTitle>
                      <CardDescription>
                        Interactive chart showing key trends and patterns
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
                      <CardTitle className="text-lg">Data Sources</CardTitle>
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

                {/* Raw Data Export */}
                {rawData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Raw Data</CardTitle>
                      <CardDescription>
                        Complete dataset for further analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/30 p-4 rounded-lg max-h-64 overflow-y-auto">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {JSON.stringify(rawData, null, 2)}
                        </pre>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(rawData, null, 2)], {
                            type: 'application/json'
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_data.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Export Data
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}