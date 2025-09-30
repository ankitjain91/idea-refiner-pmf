/**
 * Interactive Data Card Component
 * Displays real-time data with loading, refresh, and drill-down capabilities
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCardData } from '@/hooks/useCardData';
import { CardType } from '@/lib/dashboard-data-fetcher';
import { 
  RefreshCw, 
  Info, 
  Clock, 
  Download, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  FileJson,
  FileText,
  Image
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InteractiveDataCardProps {
  cardType: CardType;
  title: string;
  description: string;
  idea: string;
  industry?: string;
  geo?: string;
  time_window?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'metric';
  className?: string;
}

export function InteractiveDataCard({
  cardType,
  title,
  description,
  idea,
  industry,
  geo,
  time_window,
  chartType = 'metric',
  className = '',
}: InteractiveDataCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  
  const {
    data,
    loading,
    error,
    status,
    lastUpdated,
    cacheAge,
    load,
    refresh,
    setAutoRefresh,
    isAutoRefreshOn,
  } = useCardData({
    cardType,
    idea,
    industry,
    geo,
    time_window,
  });

  // Format cache age
  const formatCacheAge = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Handle auto-refresh change
  const handleAutoRefreshChange = (value: string) => {
    const interval = parseInt(value, 10);
    setAutoRefresh(interval);
  };

  // Export functions
  const exportAsJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cardType}-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    if (!data) return;
    
    // Convert metrics to CSV
    let csv = 'Metric,Value,Unit,Confidence,Explanation\n';
    data.metrics.forEach(m => {
      csv += `"${m.name}","${m.value}","${m.unit || ''}",${m.confidence},"${m.explanation}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cardType}-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPNG = async () => {
    if (!cardRef.current) return;
    
    const canvas = await html2canvas(cardRef.current);
    const link = document.createElement('a');
    link.download = `${cardType}-${new Date().toISOString()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Render chart based on type
  const renderChart = () => {
    if (!data || data.series.length === 0) return null;
    
    const chartData = data.series[0]?.points.map(([date, value]) => ({
      date: format(new Date(date), 'MMM dd'),
      value,
    })) || [];

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = data.metrics.filter(m => typeof m.value === 'number').map(m => ({
          name: m.name,
          value: m.value as number,
        }));
        const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];
        
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'metric':
      default:
        return (
          <div className="grid grid-cols-2 gap-4">
            {data.metrics.slice(0, 4).map((metric, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-xs text-muted-foreground">{metric.name}</p>
                <p className="text-2xl font-bold">
                  {metric.value}
                  {metric.unit && <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {Math.round(metric.confidence * 100)}% confidence
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <Card ref={cardRef} className={`relative overflow-hidden ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {title}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            {lastUpdated && (
              <div className="space-y-1">
                <CardDescription className="text-xs">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </CardDescription>
                {cacheAge !== undefined && (
                  <div className="flex items-center gap-1">
                    {cacheAge === 0 ? (
                      <Badge 
                        variant="secondary" 
                        className="text-xs py-0 px-1.5 h-5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                        Fresh data
                      </Badge>
                    ) : (
                      <Badge 
                        variant="secondary" 
                        className="text-xs py-0 px-1.5 h-5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1 animate-pulse" />
                        Cached • {formatCacheAge(cacheAge)} old
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {status === 'ready' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Select
                value={isAutoRefreshOn ? '300000' : '0'}
                onValueChange={handleAutoRefreshChange}
              >
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Off</SelectItem>
                  <SelectItem value="300000">5m</SelectItem>
                  <SelectItem value="900000">15m</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Unloaded State */}
        {status === 'unloaded' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground">No data loaded</p>
            <Button onClick={() => load()} variant="default">
              Load Data
            </Button>
          </div>
        )}

        {/* Loading State */}
        {status === 'loading' && (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error || 'Failed to load data'}</p>
            <Button onClick={refresh} variant="outline">
              Retry
            </Button>
          </div>
        )}

        {/* Ready State */}
        {status === 'ready' && data && (
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <div className="cursor-pointer space-y-4">
                {renderChart()}
                
                {/* Show warnings */}
                {data.warnings.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                    <p className="text-xs text-warning">{data.warnings[0]}</p>
                  </div>
                )}

                {/* Show items if available */}
                {data.items.length > 0 && (
                  <div className="space-y-2">
                    {data.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="p-2 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SheetTrigger>

            <SheetContent className="w-[600px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{title} - Detailed View</SheetTitle>
                <SheetDescription>{description}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Export Options */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={exportAsJSON}>
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportAsCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportAsPNG}>
                    <Image className="h-4 w-4 mr-2" />
                    PNG
                  </Button>
                </div>

                {/* Structured Data - Formatted Display */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Detailed Data Analysis</h3>
                  <div className="space-y-3">
                    {data.metrics && data.metrics.length > 0 && (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <h4 className="text-sm font-medium">Metrics & Calculations</h4>
                        {data.metrics.map((metric: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-primary/20 pl-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{metric.name}</span>
                              <span className="text-sm font-bold">
                                {metric.value}{metric.unit ? ` ${metric.unit}` : ''}
                              </span>
                            </div>
                            {metric.explanation && (
                              <p className="text-xs text-muted-foreground mt-1">{metric.explanation}</p>
                            )}
                            {metric.confidence && (
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={metric.confidence * 100} className="h-1 flex-1" />
                                <span className="text-xs">{Math.round(metric.confidence * 100)}%</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {data.items && data.items.length > 0 && (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <h4 className="text-sm font-medium">Related Items</h4>
                        {data.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.snippet}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Technical Details (collapsed by default) */}
                    <details className="p-4 bg-muted/30 rounded-lg">
                      <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
                      <pre className="mt-3 p-3 bg-background rounded text-xs overflow-x-auto">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>

                {/* Citations */}
                {data.citations.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Sources</h3>
                    {data.citations.map((citation, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <ExternalLink className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <a 
                            href={citation.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline text-primary"
                          >
                            {citation.label}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {citation.published !== 'unknown' 
                              ? format(new Date(citation.published), 'PPP')
                              : 'Date unknown'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Why This Matters */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Why This Matters</h3>
                  <p className="text-sm text-muted-foreground">
                    {data.metrics[0]?.explanation || 'This data provides insights into market dynamics and user behavior patterns.'}
                  </p>
                </div>

                {/* Next Steps */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Next Steps</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Analyze trends to identify opportunities</li>
                    <li>Compare with competitor data</li>
                    <li>Validate assumptions with user research</li>
                    <li>Adjust strategy based on insights</li>
                  </ul>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </CardContent>
    </Card>
  );
}