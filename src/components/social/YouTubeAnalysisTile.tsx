import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLockedIdea } from '@/lib/lockedIdeaManager';
import { supabase } from '@/integrations/supabase/client';
import {
  Youtube,
  RefreshCw,
  MessageCircle,
  ThumbsUp,
  Eye,
  ExternalLink,
  AlertCircle,
  Clock,
  Link2,
  BarChart3
} from 'lucide-react';

interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  url: string;
  thumbnailUrl: string;
  relevanceScore: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  topComments: Array<{
    text: string;
    likeCount: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
}

interface YouTubeData {
  videos: YouTubeVideo[];
  summary: {
    totalVideos: number;
    totalViews: number;
    averageSentiment: number;
    topChannels: string[];
    engagement: {
      total: number;
      average: number;
    };
  };
}

interface YouTubeAnalysisTileProps {
  idea?: string;
  className?: string;
  data?: any;
  loading?: boolean;
}

export function YouTubeAnalysisTile({ className = '', data: externalData, loading: externalLoading }: YouTubeAnalysisTileProps) {
  const { lockedIdea, hasLockedIdea } = useLockedIdea();
  const [internalData, setInternalData] = useState<YouTubeData | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
  // Use external data if provided, otherwise use internal state
  // Transform external data to match expected interface
  const transformExternalData = (ext: any): YouTubeData | null => {
    if (!ext) return null;
    const json = ext.json || ext;
    const metrics = ext.metrics || {};
    
    // Normalize top_channels into array of channel names (strings)
    const normalizedTopChannels: string[] = Array.isArray(metrics.top_channels)
      ? metrics.top_channels.map((c: any) => {
          if (typeof c === 'string') return c;
          if (c && typeof c === 'object' && 'channel' in c) return String(c.channel);
          return String(c ?? 'Unknown');
        })
      : [];
    
    return {
      videos: [],
      summary: {
        totalVideos: metrics.total_videos ?? 0,
        totalViews: metrics.total_views ?? 0,
        averageSentiment: 0,
        topChannels: normalizedTopChannels,
        engagement: {
          total: metrics.total_likes ?? 0,
          average: metrics.avg_relevance ?? 0
        },
        error: metrics.error || json.error
      } as any
    };
  };
  
  const data = externalData ? transformExternalData(externalData) : internalData;
  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  const fetchYouTubeData = useCallback(async (force: boolean = false) => {
    // Skip if external data is provided
    if (externalData) return;
    
    if (!hasLockedIdea || !lockedIdea) {
      console.warn('[YouTubeAnalysisTile] Fetch attempt without a locked idea');
      return;
    }

    // Check cache first unless force refresh
    if (!force) {
      const cacheKey = `youtube_analysis_${lockedIdea.slice(0, 50)}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setInternalData(cachedData);
          console.log('[YouTubeAnalysisTile] Loaded from cache');
          return;
        } catch (e) {
          console.warn('[YouTubeAnalysisTile] Failed to parse cache', e);
        }
      }
    }

    if (internalLoading && !force) {
      console.log('[YouTubeAnalysisTile] Fetch already in progress');
      return;
    }

    console.log('[YouTubeAnalysisTile] Starting YouTube analysis fetch:', {
      ideaPreview: lockedIdea.slice(0, 50),
      force,
      currentLoading: loading,
      hasExistingData: !!data
    });

    setInternalLoading(true);
    setFetchAttempted(true);
    setError(null);

    try {
      const { data: response, error: functionError } = await supabase.functions.invoke('youtube-ai-insights', {
        body: { idea_text: lockedIdea, idea: lockedIdea, time_window: 'year', regionCode: 'US' }
      });

      if (functionError) throw new Error(functionError.message);

      // Transform the response to match our interface
      const transformedData: YouTubeData = {
        videos: (response?.youtube_insights || []).map((video: any) => ({
          id: video.videoId || video.id || '',
          title: video.title || '',
          channelTitle: video.channel || '',
          description: '',
          publishedAt: video.published_at || '',
          viewCount: video.views || 0,
          likeCount: video.likes || 0,
          commentCount: video.comments || 0,
          url: video.url || '',
          thumbnailUrl: video.thumbnail || '',
          relevanceScore: video.relevance || 0,
          sentiment: (video.relevance || 0) > 0.6 ? 'positive' : (video.relevance || 0) < 0.4 ? 'negative' : 'neutral',
          topComments: []
        })),
        summary: {
          totalVideos: response?.summary?.total_videos || 0,
          totalViews: response?.summary?.total_views || 0,
          averageSentiment: response?.summary?.avg_relevance || 0,
          topChannels: response?.summary?.top_channels?.map((c: any) => c.channel) || [],
          engagement: {
            total: response?.summary?.total_likes || 0,
            average: response?.summary?.total_videos ? (response?.summary?.total_likes / response?.summary?.total_videos) : 0
          }
        }
      };
      // If no videos found, surface an actionable empty state instead of a blank UI
      if (!transformedData.summary.totalVideos) {
        const msg = response?.summary?.error || 'No relevant YouTube videos found. Try refining your idea keywords and refresh.';
        setError(msg);
        // Do not cache empty results to allow future successful fetches
        setInternalLoading(false);
        return;
      }

      setInternalData(transformedData);
      
      // Cache the result
      const cacheKey = `youtube_analysis_${lockedIdea.slice(0, 50)}`;
      localStorage.setItem(cacheKey, JSON.stringify(transformedData));
      
      console.log('[YouTubeAnalysisTile] Data fetched successfully and cached');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch YouTube data';
      console.error('[YouTubeAnalysisTile] Error:', message);
      setError(message);
      toast.error('Failed to fetch YouTube analysis');
    } finally {
      setInternalLoading(false);
    }
  }, [lockedIdea, hasLockedIdea, internalLoading, data, externalData]);

  useEffect(() => {
    if (hasLockedIdea && lockedIdea && !data && !fetchAttempted) {
      console.log('[YouTubeAnalysisTile] Triggering initial data fetch');
      fetchYouTubeData();
    }
  }, [lockedIdea, hasLockedIdea, data, fetchAttempted, fetchYouTubeData]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'negative': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    }
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!hasLockedIdea) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-muted-foreground" />
            YouTube Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Please lock an idea first using the "Lock My Idea" button.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-[#FF0000]" />
              <CardTitle>YouTube Analysis</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-[#FF0000]" />
            YouTube Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchYouTubeData(true)} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Show an informative empty state when no videos are available (e.g., API error)
  if ((data.summary?.totalVideos ?? 0) === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-[#FF0000]" />
            YouTube Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {(data as any)?.summary?.error || 'No relevant YouTube videos found. Try refining your idea keywords and refresh.'}
            </p>
            <Button onClick={() => fetchYouTubeData(true)} size="sm" variant="outline" disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-[#FF0000]" />
              YouTube Analysis
              {loading && (
                <div className="flex items-center gap-1 ml-2">
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Updating...</span>
                </div>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="font-normal">
                {data.summary.totalVideos} videos analyzed
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {formatNumber(data.summary.totalViews)} total views
              </Badge>
            </div>
          </div>
          <Button onClick={() => fetchYouTubeData(true)} size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top Channels */}
        {data.summary.topChannels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.summary.topChannels.map((channel, i) => (
              <Badge key={i} variant="outline">{channel}</Badge>
            ))}
          </div>
        )}

        {/* Videos List */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {data.videos
              .sort((a, b) => b.relevanceScore - a.relevanceScore)
              .map((video) => (
                <div
                  key={video.id}
                  className="p-4 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors space-y-3"
                >
                  <div className="flex gap-4">
                    {video.thumbnailUrl && (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-32 h-24 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium leading-tight">{video.title}</h4>
                          <p className="text-sm text-muted-foreground">{video.channelTitle}</p>
                        </div>
                        {video.url && (
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {formatNumber(video.viewCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {formatNumber(video.likeCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {formatNumber(video.commentCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {Math.round(video.relevanceScore * 100)}% relevant
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Comments */}
                  {video.topComments && video.topComments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Top Comments:</p>
                      {video.topComments.map((comment, idx) => (
                        <div
                          key={idx}
                          className="text-sm bg-muted/50 p-2 rounded-md flex items-start gap-2"
                        >
                          <Badge variant="outline" className={cn("shrink-0", getSentimentColor(comment.sentiment))}>
                            {comment.sentiment}
                          </Badge>
                          <p className="flex-1">{comment.text}</p>
                          {comment.likeCount > 0 && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              👍 {formatNumber(comment.likeCount)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}