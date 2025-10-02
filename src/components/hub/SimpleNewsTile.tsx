import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Newspaper, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Calendar,
  Hash,
  ExternalLink,
  BarChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewsArticle {
  title: string;
  url?: string;
  source?: string;
  publishedDate?: string;
  sentiment?: {
    score: number;
    positive: boolean;
  };
}

interface NewsTrend {
  trend_id: string;
  title: string;
  summary: string;
  metrics?: {
    article_count?: number;
    growth_rate?: string;
    sentiment?: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  entities?: string[];
  citations?: Array<{
    source: string;
    headline?: string;
    url?: string;
    date?: string;
  }>;
}

interface SimpleNewsTileProps {
  idea: string;
  className?: string;
}

export function SimpleNewsTile({ idea, className }: SimpleNewsTileProps) {
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<NewsTrend[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [overallSentiment, setOverallSentiment] = useState<any>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNewsData = async () => {
    if (!idea) {
      setError('No idea configured');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[SimpleNewsTile] Fetching news for:', idea);
      
      // Call the news-analysis edge function
      const { data, error: fetchError } = await supabase.functions.invoke('news-analysis', {
        body: { idea }
      });

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        console.log('[SimpleNewsTile] Received data:', data);
        
        // Extract news trends - handle multiple possible data structures
        const newsTrends = data.news_trends || 
                          data.trends || 
                          data.data?.news_trends ||
                          data.data?.trends ||
                          [];
        
        const totalCount = data.total_articles || 
                          data.totalArticles || 
                          data.data?.total_articles ||
                          newsTrends.reduce((sum: number, t: any) => 
                            sum + (t.metrics?.article_count || 0), 0) ||
                          0;
        
        const sentiment = data.overall_sentiment || 
                         data.sentiment ||
                         data.data?.overall_sentiment ||
                         { positive: 0, neutral: 0, negative: 0 };

        setTrends(newsTrends);
        setTotalArticles(totalCount);
        setOverallSentiment(sentiment);
        setLastFetch(new Date());
        
        if (newsTrends.length === 0) {
          toast.info('No news trends found for this idea. Try refreshing or modifying your search.');
        }
      }
    } catch (err) {
      console.error('[SimpleNewsTile] Error fetching news:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch news data');
      toast.error('Failed to fetch news data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (idea) {
      fetchNewsData();
    }
  }, [idea]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (idea && !loading) {
        fetchNewsData();
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [idea, loading]);

  const getSentimentColor = (sentiment: string | number) => {
    if (typeof sentiment === 'string' && sentiment.includes('+')) {
      return 'text-green-500';
    }
    if (typeof sentiment === 'number' && sentiment > 60) {
      return 'text-green-500';
    }
    if (typeof sentiment === 'number' && sentiment < 40) {
      return 'text-red-500';
    }
    return 'text-yellow-500';
  };

  const getTrendIcon = (growth: string | undefined) => {
    if (!growth) return null;
    const value = parseInt(growth.replace(/[^-\d]/g, ''));
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <BarChart className="h-4 w-4 text-yellow-500" />;
  };

  if (loading && trends.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchNewsData} 
            className="mt-4"
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            News Trends Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastFetch && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {lastFetch.toLocaleTimeString()}
              </Badge>
            )}
            <Button
              onClick={fetchNewsData}
              disabled={loading}
              size="sm"
              variant="ghost"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{totalArticles}</div>
            <div className="text-xs text-muted-foreground">Total Articles</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{trends.length}</div>
            <div className="text-xs text-muted-foreground">Key Trends</div>
          </div>
          
          {overallSentiment && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className={`text-2xl font-bold ${getSentimentColor(overallSentiment.positive)}`}>
                {Math.round(overallSentiment.positive || 0)}%
              </div>
              <div className="text-xs text-muted-foreground">Positive</div>
            </div>
          )}
        </div>

        {/* Trends List */}
        {trends.length > 0 ? (
          <div className="space-y-4">
            {trends.slice(0, 5).map((trend, index) => (
              <div key={trend.trend_id || index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {getTrendIcon(trend.metrics?.growth_rate)}
                    {trend.title}
                  </h3>
                  {trend.metrics?.growth_rate && (
                    <Badge variant="outline" className="text-xs">
                      {trend.metrics.growth_rate}
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {trend.summary}
                </p>
                
                {trend.metrics && (
                  <div className="flex gap-2 flex-wrap">
                    {trend.metrics.article_count && (
                      <Badge variant="secondary" className="text-xs">
                        {trend.metrics.article_count} articles
                      </Badge>
                    )}
                    {trend.metrics.sentiment && (
                      <Badge variant="secondary" className="text-xs">
                        Sentiment: {Math.round(trend.metrics.sentiment.positive)}% positive
                      </Badge>
                    )}
                  </div>
                )}
                
                {trend.entities && trend.entities.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    {trend.entities.slice(0, 5).map((entity, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {entity}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {trend.citations && trend.citations.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    {trend.citations.slice(0, 2).map((citation, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <ExternalLink className="h-3 w-3" />
                        {citation.url ? (
                          <a 
                            href={citation.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {citation.headline || citation.source}
                          </a>
                        ) : (
                          <span>{citation.source}</span>
                        )}
                        {citation.date && (
                          <span className="text-muted-foreground">
                            • {new Date(citation.date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No news trends available. Click refresh to fetch the latest data.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}