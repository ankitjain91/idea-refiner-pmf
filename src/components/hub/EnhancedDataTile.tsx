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
  TrendingUp, TrendingDown, Minus, ExternalLink, HelpCircle, Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TileInsightsDialog } from './TileInsightsDialog';

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
  const maxRetries = 2;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

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
      
      // Exponential backoff retry
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData();
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, tileType, fetchAdapter, loading, retryCount]);

  // Don't auto-fetch on mount - let user trigger it
  const [hasInitialized, setHasInitialized] = useState(false);

  const handleAnalyze = async () => {
    if (!data || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const { data: analysis, error } = await supabase.functions.invoke('groq-synthesis', {
        body: {
          tileType,
          tileData: data,
          context: {
            idea: filters?.idea || '',
            industry: filters?.industry || '',
            geography: filters?.geography || ''
          }
        }
      });

      if (error) throw error;
      setGroqInsights(analysis);
      setShowInsights(true);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!data) {
      fetchData();
    }
  }, []);

  const renderMetric = (metric: any) => {
    const trend = metric.trend || metric.change;
    const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground';

    return (
      <div key={metric.name} className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{metric.name}</span>
          {trend !== undefined && (
            <TrendIcon className={cn("h-3 w-3", trendColor)} />
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold">
            {metric.value}{metric.unit || ''}
          </span>
          {trend !== undefined && (
            <span className={cn("text-xs", trendColor)}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        {metric.explanation && (
          <p className="text-xs text-muted-foreground">{metric.explanation}</p>
        )}
      </div>
    );
  };

  const getDefaultContent = () => {
    if (!data) return null;

    return (
      <div className="space-y-4">
        {/* Metrics */}
        {data.metrics && data.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {data.metrics.slice(0, 4).map(renderMetric)}
          </div>
        )}

        {/* Themes */}
        {data.themes && data.themes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Key Themes
            </h4>
            <div className="flex flex-wrap gap-1">
              {data.themes.slice(0, 6).map((theme: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {theme}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Items */}
        {data.items && data.items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Activity
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.items.slice(0, 3).map((item: any, idx: number) => (
                <div key={idx} className="p-2 bg-muted/10 rounded-lg">
                  <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                  {item.snippet && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.snippet}
                    </p>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchData(true)}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
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
              <AlertDescription className="text-xs">
                {error}
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 h-auto p-0 text-xs"
                  onClick={() => fetchData(true)}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : !data ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {!hasInitialized ? 'Click to load real-time data' : 'No data available'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setHasInitialized(true);
                  fetchData();
                }}
              >
                <Database className="h-4 w-4 mr-2" />
                Load Data
              </Button>
            </div>
          ) : (
            renderContent ? renderContent(data) : getDefaultContent()
          )}

          {/* Action buttons - reusing Market Trends pattern */}
          {data && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1 relative overflow-hidden group bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800 hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-950/30 dark:hover:to-yellow-950/30 transition-all duration-300"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin text-amber-600" />
                    <span className="text-amber-700 dark:text-amber-400">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-2 text-yellow-500 animate-pulse" />
                    <span className="text-amber-700 dark:text-amber-400 font-medium">Analyze</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInsights(true)}
                className="flex-1"
              >
                How this works
                <HelpCircle className="h-3.5 w-3.5 ml-2" />
              </Button>
            </div>
          )}

          {/* Last updated */}
          {lastRefresh && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Dialog - reusing TileInsightsDialog */}
      <TileInsightsDialog 
        open={showInsights && !groqInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />

      {/* Groq Analysis Sheet */}
      {groqInsights && (
        <Sheet open={showInsights} onOpenChange={setShowInsights}>
          <SheetContent className="w-[600px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold">AI Analysis: {title}</SheetTitle>
              <SheetDescription>
                Deep insights and recommendations based on real-time data
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {/* Display groq insights here */}
              <div className="prose dark:prose-invert">
                {JSON.stringify(groqInsights, null, 2)}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}