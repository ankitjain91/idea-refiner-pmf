import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  AlertCircle, TrendingUp, Users, MessageCircle, Hash, BarChart3,
  Clock, HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import useSWR from 'swr';
import { TileInsightsDialog } from './TileInsightsDialog';

interface RedditSentimentTileProps {
  idea: string;
  industry?: string;
  geography?: string;
  timeWindow?: string;
  className?: string;
}

interface RedditData {
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    explanation: string;
    confidence: number;
  }>;
  themes: string[];
  pain_points: string[];
  items: Array<{
    title: string;
    snippet: string;
    url: string;
    published: string;
    source: string;
    evidence: string[];
    score: number;
    num_comments: number;
  }>;
  citations: Array<{
    label: string;
    url: string;
  }>;
  warnings: string[];
  totalPosts: number;
}

export function RedditSentimentTile({ idea, industry, geography, timeWindow, className }: RedditSentimentTileProps) {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const actualIdea = idea || localStorage.getItem('pmfCurrentIdea') || localStorage.getItem('userIdea') || '';
  const cacheKey = hasLoadedOnce && actualIdea ? `reddit-sentiment:${actualIdea}:${industry}:${geography}:${timeWindow}` : null;

  const { data, error, isLoading, mutate } = useSWR<RedditData>(
    cacheKey,
    async () => {
      const cacheKeyStorage = `reddit-cache:${actualIdea}|${industry}|${geography}|${timeWindow}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const FIFTEEN_MINUTES = 15 * 60 * 1000;
        
        if (cacheAge < FIFTEEN_MINUTES) {
          return { ...parsed.data, fromCache: true, cacheTimestamp: parsed.timestamp };
        }
      }
      
      const { data, error } = await supabase.functions.invoke('reddit-sentiment', {
        body: { 
          idea: actualIdea,
          industry: industry || '',
          geography: geography || '',
          timeWindow: timeWindow || 'month'
        }
      });
      
      if (error) throw error;
      
      if (data) {
        localStorage.setItem(cacheKeyStorage, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
      
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 900000, // 15 minutes
      shouldRetryOnError: true,
      errorRetryCount: 2,
      revalidateOnMount: false,
      refreshInterval: autoRefresh ? 900000 : 0 // Auto-refresh every 15 minutes if enabled
    }
  );

  // Auto-load on mount
  useEffect(() => {
    if (!hasLoadedOnce && actualIdea) {
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, actualIdea]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const cacheKeyStorage = `reddit-cache:${actualIdea}|${industry}|${geography}|${timeWindow}`;
      localStorage.removeItem(cacheKeyStorage);
      await mutate(undefined, { revalidate: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  const analyzeComments = async () => {
    if (!data || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('reddit-sentiment', {
        body: {
          idea: actualIdea,
          industry,
          geography,
          timeWindow,
          analyzeType: 'comments'
        }
      });

      if (error) throw error;
      
      toast({
        title: "Comment Analysis Complete",
        description: "Deep comment sentiment analysis has been performed",
      });
      
      await mutate(response);
    } catch (error) {
      console.error('Error analyzing comments:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze comments at this time",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCPSColor = (value: number) => {
    if (value >= 70) return 'text-green-600 dark:text-green-400';
    if (value >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCPSGaugeColor = (value: number) => {
    if (value >= 70) return 'bg-green-500';
    if (value >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSentimentBadgeVariant = (sentiment: string) => {
    if (sentiment === 'positive') return 'default';
    if (sentiment === 'negative') return 'destructive';
    return 'secondary';
  };


  if (isLoading && !data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reddit Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reddit Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load Reddit data: {error?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Extract metrics from data
  const cpsMetric = data?.metrics?.find(m => m.name === 'community_positivity_score');
  const positiveMetric = data?.metrics?.find(m => m.name === 'sentiment_positive');
  const negativeMetric = data?.metrics?.find(m => m.name === 'sentiment_negative');
  const neutralMetric = data?.metrics?.find(m => m.name === 'sentiment_neutral');
  const engagementMetric = data?.metrics?.find(m => m.name === 'engagement_score');

  const cps = cpsMetric?.value || 0;
  const positive = positiveMetric?.value || 0;
  const negative = negativeMetric?.value || 0;
  const neutral = neutralMetric?.value || 0;
  const engagement = engagementMetric?.value || 0;

  return (
    <>
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Reddit Sentiment
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-refresh" className="text-xs">Auto</Label>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  className="scale-75"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 w-7"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {data && (
            <>
              {/* CPS Gauge and Sentiment Donut */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Community Positivity</p>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-2xl font-bold", getCPSColor(cps))}>
                      {cps}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                  <Progress 
                    value={cps} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sentiment Mix</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="default" className="text-xs">
                      {positive}% 😊
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {neutral}% 😐
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
                      {negative}% 😔
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Engagement: {engagement}/100
                  </Badge>
                </div>
              </div>

              {/* Warnings */}
              {data.warnings && data.warnings.length > 0 && (
                <Alert className="py-2">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    {data.warnings.join('. ')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Expanded Content */}
              {isExpanded && (
                <div className="space-y-4 pt-2 border-t">
                  {/* Themes */}
                  {data.themes && data.themes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Top Themes
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {data.themes.map((theme, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pain Points */}
                  {data.pain_points && data.pain_points.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        Pain Points
                      </p>
                      <ul className="space-y-1">
                        {data.pain_points.slice(0, 3).map((pain, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground">
                            • {pain}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Top Posts */}
                  {data.items && data.items.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        Top Posts ({data.totalPosts} total)
                      </p>
                      <div className="space-y-2">
                        {data.items.slice(0, 3).map((post, idx) => (
                          <Card key={idx} className="p-2">
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <a 
                                  href={post.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium hover:underline line-clamp-2 flex-1"
                                >
                                  {post.title}
                                </a>
                                <Badge 
                                  variant={getSentimentBadgeVariant(post.evidence[0])}
                                  className="text-xs shrink-0"
                                >
                                  {post.evidence[0]}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{post.source}</span>
                                <span>⬆ {post.score}</span>
                                <span>💬 {post.num_comments}</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Updated */}
                  {data.updatedAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last updated: {new Date(data.updatedAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeComments}
                  disabled={isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4 mr-2" />
                  )}
                  Analyze Comments
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInsights(true)}
                  className="flex-1"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  How this works
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Insights Dialog */}
      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType="reddit_sentiment"
      />
    </>
  );
}