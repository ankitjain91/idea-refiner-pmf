import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { 
  RefreshCw, AlertCircle, Clock, Sparkles, ChevronRight,
  TrendingUp, TrendingDown, Minus, ExternalLink, HelpCircle, Database,
  Activity, Target, Rocket, Calendar, Users, Globe2, DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TileInsightsDialog } from './TileInsightsDialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface EnhancedDataTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  className?: string;
  description?: string;
  fetchAdapter: (ctx: any) => Promise<any>;
  renderContent?: (data: any) => React.ReactNode;
}

export function EnhancedDataTile({ 
  title, 
  icon: Icon, 
  tileType, 
  filters, 
  className,
  description,
  fetchAdapter,
  renderContent
}: EnhancedDataTileProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [groqInsights, setGroqInsights] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);
  const maxRetries = 2;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setHasInitialized(true);

    try {
      // Get current idea
      const currentIdea = filters?.idea || 
        (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
      
      if (!currentIdea) {
        throw new Error('No idea configured');
      }

      const ctx = {
        idea: currentIdea,
        query: currentIdea,
        industry: filters?.industry || '',
        geography: filters?.geography || 'global',
        timeWindow: filters?.time_window || 'last_90_days',
        category: filters?.category
      };

      console.log(`[${tileType}] Fetching data with context:`, ctx);
      const result = await fetchAdapter(ctx);
      
      if (result?.error) {
        throw new Error(result.error);
      }

      console.log(`[${tileType}] Data fetched successfully:`, result);
      setData(result);
      setLastRefresh(new Date());
      setRetryCount(0);
    } catch (err) {
      console.error(`[${tileType}] Fetch error:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      
      // Don't auto-retry - let user decide
      setRetryCount(0);
    } finally {
      setLoading(false);
    }
  }, [tileType, filters, fetchAdapter, loading]);

  // Auto-load data on mount
  useEffect(() => {
    if (!data && !loading && !hasInitialized) {
      fetchData();
    }
  }, [data, loading, hasInitialized, fetchData]);

  const renderBeautifulContent = () => {
    if (!data) return null;

    return (
      <TooltipProvider>
        <div className="space-y-4 animate-fade-in">
          {/* Primary Metrics - Beautiful Cards */}
          {data.metrics && data.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {data.metrics.slice(0, 4).map((metric: any, idx: number) => (
                <div 
                  key={idx} 
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4 hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {metric.name}
                      </span>
                      {metric.confidence && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(metric.confidence * 100)}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Confidence Level</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                      </span>
                      {metric.unit && (
                        <span className="text-sm text-muted-foreground">{metric.unit}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Interactive Chart with Multiple Series */}
          {data.series && data.series.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-primary/10 shadow-sm">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Trend Analysis
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={
                  data.series[0].labels?.map((label: string, idx: number) => ({
                    name: label,
                    ...data.series.reduce((acc: any, series: any) => {
                      acc[series.name] = series.data[idx];
                      return acc;
                    }, {})
                  }))
                }>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  {data.series.map((series: any, idx: number) => (
                    <Line 
                      key={series.name}
                      type="monotone" 
                      dataKey={series.name} 
                      stroke={idx === 0 ? 'hsl(var(--primary))' : idx === 1 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))'} 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Market Segments - Visual Representation */}
          {data.segments && data.segments.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-primary/10">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Market Segments
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {data.segments.map((segment: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="relative p-3 rounded-lg bg-gradient-to-br from-background to-secondary/20 border border-secondary/20 hover:border-primary/30 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                        {segment.name}
                      </div>
                      <div className="text-2xl font-bold text-primary mb-1">
                        {segment.share}%
                      </div>
                      <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>{segment.growth}% growth</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Growth Drivers - Visual Impact */}
          {data.drivers && data.drivers.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-primary/10">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                Growth Drivers
              </h4>
              <div className="space-y-3">
                {data.drivers.map((driver: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg border border-secondary/20 hover:border-primary/30 transition-all">
                    <span className="text-sm font-medium">{driver.factor}</span>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={driver.impact === 'positive' ? 'default' : driver.impact === 'negative' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {driver.impact === 'positive' ? '↑' : driver.impact === 'negative' ? '↓' : '→'} {driver.impact}
                      </Badge>
                      <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            driver.impact === 'positive' ? 'bg-green-500' :
                            driver.impact === 'negative' ? 'bg-red-500' :
                            'bg-gray-500'
                          )}
                          style={{ width: `${driver.strength * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Project Milestones - Timeline View */}
          {data.milestones && data.milestones.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-primary/10">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Project Timeline
              </h4>
              <div className="space-y-3">
                {data.milestones.map((milestone: any, idx: number) => (
                  <div key={idx} className="p-3 bg-background rounded-lg border border-secondary/20 hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">{milestone.phase}</h5>
                      <Badge 
                        variant={
                          milestone.status === 'completed' ? 'default' :
                          milestone.status === 'in_progress' ? 'secondary' :
                          'outline'
                        }
                      >
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Progress value={milestone.completion} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{milestone.completion}% complete</span>
                      {milestone.end_date && (
                        <span>Due: {new Date(milestone.end_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Conversion Funnel - Visual Hierarchy */}
          {data.funnel && data.funnel.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-primary/10">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Conversion Funnel
              </h4>
              <div className="space-y-2">
                {data.funnel.map((stage: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div 
                      className="flex items-center justify-between p-3 rounded-lg border border-secondary/20 hover:border-primary/30 transition-all"
                      style={{
                        background: `linear-gradient(to right, hsl(var(--primary) / ${0.1 - idx * 0.02}) 0%, transparent ${stage.rate}%)`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{stage.stage}</span>
                        <Badge variant="secondary" className="text-xs">
                          {stage.rate}%
                        </Badge>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {stage.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Search Results / Items */}
          {data.items && data.items.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-primary/10">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-primary" />
                Latest Insights
              </h4>
              <div className="space-y-2">
                {data.items.slice(0, 3).map((item: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-background rounded-lg border border-secondary/20 hover:border-primary/30 transition-all hover:shadow-sm"
                  >
                    <h5 className="font-medium text-sm mb-1 line-clamp-1">{item.title}</h5>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.snippet}</p>
                    {item.source && (
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {item.source}
                        </Badge>
                        {item.published && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.published).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Empty State - Engaging Design */}
          {data.empty_state && (
            <Card className="p-6 bg-gradient-to-br from-secondary/5 to-secondary/10 border-dashed border-2 border-primary/20">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">{data.empty_state.message}</h4>
                {data.empty_state.instructions && (
                  <p className="text-sm text-muted-foreground mb-3">{data.empty_state.instructions}</p>
                )}
                {data.empty_state.suggested_trackers && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {data.empty_state.suggested_trackers.map((tracker: string) => (
                      <Badge key={tracker} variant="secondary" className="text-xs">
                        {tracker}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Profit Link Insights */}
          {data.profitLink && (
            <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                <DollarSign className="h-4 w-4" />
                Profit Insights
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(data.profitLink).slice(0, 4).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-medium">
                      {typeof value === 'number' ? value.toLocaleString() : 
                       Array.isArray(value) ? `${value.length} items` : 
                       typeof value === 'object' && value !== null ? JSON.stringify(value) :
                       value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Last Updated with Refresh */}
          {lastRefresh && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Updated {lastRefresh.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <>
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              {renderContent ? renderContent(data) : renderBeautifulContent()}
            </>
          )}

          {/* Action Buttons */}
          {data && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInsights(true)}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Analyze
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}