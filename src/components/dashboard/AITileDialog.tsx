import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, Sparkles, BarChart3, ExternalLink, 
  ChevronLeft, ChevronRight, Target, Lightbulb,
  TrendingUp, Users, DollarSign, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, AreaChart, Area } from 'recharts';

interface AITileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    title: string;
    metrics: Array<{
      title: string;
      value: string;
      icon: React.ComponentType<any>;
      color: string;
      levels: Array<{
        title: string;
        content: string;
      }>;
    }>;
    chartData?: any[];
    barChartData?: any[];
    sources: Array<{
      label: string;
      url: string;
      description: string;
    }>;
    insights: string[];
  } | null;
  selectedLevel: number;
  onLevelChange: (level: number) => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

const LEVEL_NAMES = ['Overview', 'Detailed', 'Strategic'];
const LEVEL_ICONS = [Target, BarChart3, Lightbulb];

export function AITileDialog({ 
  isOpen, 
  onClose, 
  data, 
  selectedLevel, 
  onLevelChange, 
  isAnalyzing, 
  onAnalyze 
}: AITileDialogProps) {
  const [selectedMetric, setSelectedMetric] = useState(0);

  if (!data) return null;

  const currentMetric = data.metrics[selectedMetric];
  const currentLevel = currentMetric?.levels[selectedLevel];
  const LevelIcon = LEVEL_ICONS[selectedLevel];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{data.title}</h3>
              <p className="text-sm text-muted-foreground">AI-powered insights and analysis</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[70vh] overflow-auto">
          {/* Left Panel - Metrics Selection */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Key Metrics
              </h4>
              <div className="space-y-2">
                {data.metrics.map((metric, idx) => {
                  const Icon = metric.icon;
                  return (
                    <Card 
                      key={idx} 
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        selectedMetric === idx ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedMetric(idx)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", metric.color)} />
                            <div>
                              <p className="text-sm font-medium">{metric.title}</p>
                              <p className="text-xs text-muted-foreground">{metric.value}</p>
                            </div>
                          </div>
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            selectedMetric === idx ? "rotate-90" : ""
                          )} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Chart Visualization */}
            {(data.chartData || data.barChartData) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Data Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={150}>
                    {data.chartData && Array.isArray(data.chartData) && data.chartData.length > 0 && 
                     data.chartData.some(d => d && typeof d === 'object' && d.value !== undefined && d.value !== null) ? (
                      <PieChart>
                        <Pie
                          data={data.chartData.filter(d => d && typeof d === 'object' && d.value !== undefined && d.value !== null)}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={55}
                          dataKey="value"
                        >
                          {data.chartData
                            .filter(d => d && typeof d === 'object' && d.value !== undefined && d.value !== null)
                            .map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 45}, 70%, 60%)`} />
                            ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : data.barChartData && Array.isArray(data.barChartData) && data.barChartData.length > 0 ? (
                      <BarChart data={data.barChartData.filter(d => d && typeof d === 'object')}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="mentions" fill="hsl(var(--primary))" />
                      </BarChart>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                        No chart data available
                      </div>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center Panel - Detailed Analysis */}
          <div className="lg:col-span-2 space-y-4">
            {/* Level Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LevelIcon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">{LEVEL_NAMES[selectedLevel]} Analysis</h4>
              </div>
              <div className="flex items-center gap-1">
                {LEVEL_NAMES.map((name, idx) => (
                  <Button
                    key={idx}
                    variant={selectedLevel === idx ? "default" : "outline"}
                    size="sm"
                    onClick={() => onLevelChange(idx)}
                    className="text-xs px-2 py-1 h-7"
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Current Metric Analysis */}
            {currentMetric && currentLevel && (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <currentMetric.icon className={cn("h-5 w-5", currentMetric.color)} />
                      <div>
                        <CardTitle className="text-base">{currentMetric.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{currentLevel.title}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Level {selectedLevel + 1}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{currentLevel.content}</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMetric(Math.max(0, selectedMetric - 1))}
                disabled={selectedMetric === 0}
                className="text-xs"
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {data.metrics.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      selectedMetric === idx ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMetric(Math.min(data.metrics.length - 1, selectedMetric + 1))}
                disabled={selectedMetric === data.metrics.length - 1}
                className="text-xs"
              >
                Next
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            {/* AI Insights */}
            {data.insights && data.insights.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      AI Insights
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAnalyze}
                      disabled={isAnalyzing}
                      className="text-xs"
                    >
                      {isAnalyzing ? (
                        <>
                          <Brain className="h-3 w-3 mr-1 animate-pulse" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-3 w-3 mr-1" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.insights.slice(0, 3).map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sources */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Data Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.sources.map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-xs font-medium">{source.label}</p>
                        <p className="text-xs text-muted-foreground">{source.description}</p>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}