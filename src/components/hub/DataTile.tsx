import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ExternalLink, Info, AlertCircle, Clock, Download, 
  ChevronRight, RefreshCw, Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DataTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  className?: string;
  description?: string;
}

interface TileData {
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: number | string;
    unit: string;
    explanation: string;
    method: string;
    confidence: number;
  }>;
  items: Array<{
    title: string;
    snippet: string;
    url: string;
    canonicalUrl: string;
    published: string;
    source: string;
    evidence: string[];
  }>;
  assumptions: string[];
  notes: string;
  citations: Array<{
    url: string;
    label: string;
    published: string;
  }>;
  fromCache?: boolean;
  stale?: boolean;
}

export function DataTile({ 
  title, 
  icon: Icon, 
  tileType, 
  filters,
  className,
  description 
}: DataTileProps) {
  const [data, setData] = useState<TileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const toTileData = (payload: any): TileData => {
      const now = new Date().toISOString();
      return {
        updatedAt: payload.updatedAt || now,
        filters,
        metrics: payload.metrics || [],
        items: payload.items || [],
        assumptions: payload.assumptions || [],
        notes: payload.notes || '',
        citations: payload.citations || [],
        fromCache: !!payload.fromCache,
        stale: !!payload.stale,
      } as TileData;
    };

    const transformFallback = (type: string, res: any): TileData => {
      const now = new Date().toISOString();
      try {
        switch (type) {
          case 'market_trends': {
            const t = res.trends || {};
            const sv = t.searchVolume || {};
            return {
              updatedAt: res.timestamp || now,
              filters,
              metrics: [
                { name: 'Trend', value: sv.trend || 'unknown', unit: '', explanation: 'Overall search trend', method: 'groq+serper', confidence: 0.6 },
                { name: 'Monthly Volume', value: sv.monthlyVolume || 0, unit: 'searches/mo', explanation: 'Estimated search volume', method: 'groq+serper', confidence: 0.5 },
                { name: 'Growth Rate', value: sv.growthRate || 0, unit: '%', explanation: 'Estimated growth', method: 'groq+serper', confidence: 0.5 },
                { name: 'Sentiment', value: t.marketSentiment || 'neutral', unit: '', explanation: 'Estimated market sentiment', method: 'groq', confidence: 0.5 },
              ],
              items: [],
              assumptions: t.insights || [],
              notes: 'Synthesized from market-trends',
              citations: [],
            } as TileData;
          }
          case 'google_trends': {
            const t = res.trends || {};
            return {
              updatedAt: now,
              filters,
              metrics: [
                { name: 'Trend Score', value: t.trendScore || 0, unit: '/100', explanation: 'Relative search interest', method: 'groq+serper', confidence: 0.5 },
                { name: 'Direction', value: t.trending || 'stable', unit: '', explanation: 'Trend direction', method: 'groq', confidence: 0.5 },
                { name: 'Growth Rate', value: t.growthRate || 0, unit: '%', explanation: 'Estimated growth', method: 'groq', confidence: 0.5 },
              ],
              items: [],
              assumptions: t.insights || [],
              notes: 'Synthesized from google-trends',
              citations: [],
            } as TileData;
          }
          case 'reddit_sentiment': {
            const d = res.data || {};
            return {
              updatedAt: now,
              filters,
              metrics: [
                { name: 'Mentions', value: d.mentions || 0, unit: '', explanation: 'Total Reddit mentions', method: 'groq', confidence: 0.5 },
                { name: 'Positive', value: d.sentiment?.positive || 0, unit: '%', explanation: 'Positive sentiment', method: 'groq', confidence: 0.5 },
              ],
              items: (d.topSubreddits || []).slice(0, 3).map((s: string) => ({ title: s, snippet: 'Top subreddit', url: `https://reddit.com/${s}`, canonicalUrl: `https://reddit.com/${s}`, published: 'unknown', source: 'reddit', evidence: [] })),
              assumptions: d.insights || [],
              notes: 'Synthesized from reddit-search',
              citations: [],
            } as TileData;
          }
          case 'youtube_analytics': {
            const d = res.data || {};
            return {
              updatedAt: now,
              filters,
              metrics: [
                { name: 'Search Volume', value: d.searchVolume || 0, unit: '', explanation: 'Estimated video search volume', method: 'groq', confidence: 0.5 },
                { name: 'Avg Views', value: d.averageViews || 0, unit: '', explanation: 'Average views for top videos', method: 'groq', confidence: 0.5 },
              ],
              items: (d.topVideos || []).slice(0, 3).map((v: any) => ({ title: v.title, snippet: `Views: ${v.views}`, url: '#', canonicalUrl: '#', published: 'unknown', source: 'youtube', evidence: [] })),
              assumptions: d.insights || [],
              notes: 'Synthesized from youtube-search',
              citations: [],
            } as TileData;
          }
          case 'twitter_buzz': {
            const d = res.data || {};
            return {
              updatedAt: now,
              filters,
              metrics: [
                { name: 'Mentions', value: d.mentions || 0, unit: '', explanation: 'Total mentions on X', method: 'groq', confidence: 0.5 },
                { name: 'Reach', value: d.reach || 0, unit: '', explanation: 'Estimated reach', method: 'groq', confidence: 0.5 },
              ],
              items: (d.trendingHashtags || []).slice(0, 3).map((h: string) => ({ title: h, snippet: 'Trending hashtag', url: '#', canonicalUrl: '#', published: 'unknown', source: 'x', evidence: [] })),
              assumptions: d.insights || [],
              notes: 'Synthesized from twitter-search',
              citations: [],
            } as TileData;
          }
          case 'amazon_reviews': {
            const d = res.data || {};
            return {
              updatedAt: now,
              filters,
              metrics: [
                { name: 'Avg Rating', value: d.averageRating || 0, unit: '/5', explanation: 'Average product rating', method: 'groq', confidence: 0.5 },
                { name: 'Total Reviews', value: d.totalReviews || 0, unit: '', explanation: 'Total review count', method: 'groq', confidence: 0.5 },
              ],
              items: (d.topProducts || []).slice(0, 3).map((p: any) => ({ title: p.name, snippet: `Rating ${p.rating} • ${p.reviews} reviews`, url: '#', canonicalUrl: '#', published: 'unknown', source: 'amazon', evidence: [] })),
              assumptions: d.commonComplaints || [],
              notes: 'Synthesized from amazon-public',
              citations: [],
            } as TileData;
          }
          default:
            return {
              updatedAt: now,
              filters,
              metrics: [],
              items: [],
              assumptions: [],
              notes: 'No data available',
              citations: [],
            } as TileData;
        }
      } catch (e) {
        console.error('transformFallback error', e);
        return {
          updatedAt: now,
          filters,
          metrics: [],
          items: [],
          assumptions: [],
          notes: 'Transformation error',
          citations: [],
        } as TileData;
      }
    };

    try {
      // Get current idea from multiple sources
      const currentIdea = filters?.idea_keywords?.join(' ') || 
        (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
      
      if (!currentIdea) {
        throw new Error('No idea configured');
      }
      
      // Primary path: consolidated AI search
      const { data: response, error: fetchError } = await supabase.functions.invoke('web-search-ai', {
        body: { tileType, filters, query: currentIdea }
      });
      
      if (fetchError) {
        console.warn(`web-search-ai failed for ${tileType}, trying fallback:`, fetchError);
        throw fetchError;
      }
      if (response?.error) throw new Error(response.message || response.error);
      setData(toTileData(response));
      setLastUpdate(new Date());
      setRetryCount(0);
      return;
    } catch (primaryErr) {
      console.warn(`[DataTile] web-search-ai failed for ${tileType}`, primaryErr);
    }

    // Fallback: hit specific functions based on tile type
    try {
      const fnMap: Record<string, { name: string; body: any }> = {
        market_trends: { name: 'market-trends', body: { idea: (filters?.idea_keywords || []).join(' ') } },
        google_trends: { name: 'google-trends', body: { query: (filters?.idea_keywords || []).join(' ') } },
        reddit_sentiment: { name: 'reddit-search', body: { query: (filters?.idea_keywords || []).join(' ') } },
        youtube_analytics: { name: 'youtube-search', body: { query: (filters?.idea_keywords || []).join(' ') } },
        twitter_buzz: { name: 'twitter-search', body: { query: (filters?.idea_keywords || []).join(' ') } },
        amazon_reviews: { name: 'amazon-public', body: { query: (filters?.idea_keywords || []).join(' ') } },
      };
      const entry = fnMap[tileType];
      if (!entry) throw new Error('No fallback available');

      const { data: resp, error: fnErr } = await supabase.functions.invoke(entry.name, { body: entry.body });
      if (fnErr) throw fnErr;
      if (resp?.error) throw new Error(resp.message || resp.error);
      setData(transformFallback(tileType, resp));
      setLastUpdate(new Date());
      setRetryCount(0);
    } catch (err: any) {
      console.error(`Error fetching ${tileType} data:`, err);
      setError('Cannot fetch AI responses');
    } finally {
      setLoading(false);
    }
  }, [tileType, filters, retryCount]);

  // Set up real-time subscriptions for updates
  useEffect(() => {
    // Create a channel for real-time updates specific to this tile
    const channel = supabase
      .channel(`tile-updates-${tileType}`)
      .on(
        'broadcast',
        { event: 'data-update' },
        (payload) => {
          if (payload.payload.tileType === tileType) {
            console.log(`Real-time update for ${tileType}:`, payload.payload);
            setData(payload.payload.data);
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tileType]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Auto-refresh disabled to prevent excessive requests
  // useEffect(() => {
  //   // More frequent refresh for real-time insights
  //   const refreshInterval = 30000; // 30 seconds for all tiles to get latest AI insights
  //   
  //   const interval = setInterval(() => {
  //     console.log(`Auto-refreshing ${tileType} for real-time data`);
  //     fetchData();
  //   }, refreshInterval);
  //   
  //   return () => clearInterval(interval);
  // }, [tileType, fetchData]);
  
  const exportTileData = () => {
    if (!data) return;
    
    const csvContent = [
      ['Metric', 'Value', 'Unit', 'Confidence', 'Method'],
      ...data.metrics.map(m => [m.name, m.value, m.unit, m.confidence, m.method])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tileType}-${new Date().toISOString()}.csv`;
    a.click();
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  if (loading && !data) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Cannot fetch AI responses. Service is currently unavailable.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <>
      <Card 
        className={cn(
          "p-6 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
          className,
          data?.stale && "border-yellow-500/50"
        )}
        onClick={() => setShowDetails(true)}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Fetching real-time data...</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!loading && lastUpdate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs">
                        Live
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Real-time data • Updated {lastUpdate.toLocaleTimeString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {data?.fromCache && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>From cache • Updated {new Date(data.updatedAt).toLocaleTimeString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {data?.stale && (
                <Badge variant="outline" className="text-yellow-600">
                  Stale Data
                </Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          
          {data && (
            <div className="space-y-3">
              {data.metrics.slice(0, 2).map((metric, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{metric.explanation}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Method: {metric.method}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">
                      {metric.value}{metric.unit && ` ${metric.unit}`}
                    </span>
                    <span className={cn("text-xs", getConfidenceColor(metric.confidence))}>
                      {(metric.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
              
              {data.citations.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {data.citations.slice(0, 2).map((citation, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {citation.label}
                    </Badge>
                  ))}
                  {data.citations.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{data.citations.length - 2} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
          
          {lastUpdate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Updated {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </Card>
      
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              {title}
            </SheetTitle>
            <SheetDescription>
              {description || `Detailed analysis and data sources for ${title.toLowerCase()}`}
            </SheetDescription>
          </SheetHeader>
          
          {data && (
            <div className="mt-6 space-y-6">
              {/* Metrics */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground">Metrics</h4>
                {data.metrics.map((metric, idx) => (
                  <div key={idx} className="p-4 bg-secondary/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{metric.name}</span>
                      <span className="text-lg font-bold">
                        {metric.value}{metric.unit && ` ${metric.unit}`}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{metric.explanation}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span>Method: {metric.method}</span>
                      <span className={getConfidenceColor(metric.confidence)}>
                        Confidence: {(metric.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Sources */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground">Sources</h4>
                {data.items.map((item, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium text-sm">{item.title}</h5>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.snippet}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{item.source}</Badge>
                      {item.published !== 'unknown' && (
                        <span>Published: {item.published}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Assumptions */}
              {data.assumptions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Assumptions</h4>
                  <ul className="space-y-1">
                    {data.assumptions.map((assumption, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">
                        • {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Notes */}
              {data.notes && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm">{data.notes}</p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={exportTileData} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={fetchData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              {/* Raw JSON (collapsible) */}
              <details className="text-xs">
                <summary className="cursor-pointer font-medium text-muted-foreground">
                  View Raw Data
                </summary>
                <pre className="mt-2 p-4 bg-secondary/50 rounded-lg overflow-x-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}