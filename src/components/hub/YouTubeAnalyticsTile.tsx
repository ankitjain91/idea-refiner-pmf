import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Youtube, Play, ThumbsUp, MessageSquare, Eye, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Cell
} from 'recharts';
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { TileAIChat } from './TileAIChat';
import { formatDistanceToNow } from 'date-fns';

interface YouTubeAnalyticsTileProps {
  data: YouTubeData | null;
  loading?: boolean;
  onRefresh?: () => void;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  channel: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string;
  relevance: number;
  url: string;
  thumbnail?: string;
}

interface YouTubeData {
  idea: string;
  youtube_insights: YouTubeVideo[];
  summary: {
    total_videos: number;
    total_views: number;
    total_likes: number;
    avg_relevance: number;
    top_channels: Array<{ channel: string; video_count: number }>;
    time_window: string;
    region: string;
    error?: string;
  };
  meta: {
    confidence: string;
    cached_until: string;
    error?: string;
  };
}

export function YouTubeAnalyticsTile({ data, loading = false, onRefresh }: YouTubeAnalyticsTileProps) {
  const [activeTab, setActiveTab] = useState('videos');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Listen for idea:changed event
  useEffect(() => {
    const handleIdeaChange = () => {
      console.log('[YouTubeAnalyticsTile] idea:changed event received');
      if (onRefresh) {
        handleRefresh();
      }
    };
    
    window.addEventListener('idea:changed', handleIdeaChange);
    
    return () => {
      window.removeEventListener('idea:changed', handleIdeaChange);
    };
  }, [onRefresh]);

  const error = data?.summary?.error || data?.meta?.error;

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !data.youtube_insights) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">{error || 'No YouTube data available for this idea'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatViews = (views: number | undefined) => {
    if (!views || isNaN(views)) return '0';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Youtube className="h-5 w-5 animate-pulse text-destructive" />
            <span className="text-muted-foreground">Analyzing YouTube content...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || error) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            {error || 'No YouTube data available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const videos = data.youtube_insights || [];
  const summary = data.summary;
  const topChannels = summary.top_channels || [];
  
  // Prepare channel chart data
  const channelChartData = topChannels.slice(0, 5).map(ch => ({
    channel: ch.channel.length > 20 ? ch.channel.substring(0, 20) + '...' : ch.channel,
    videos: ch.video_count
  }));

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-destructive" />
            <CardTitle>YouTube Insights</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIChat(true)}
              className="gap-1 px-3 py-1.5 h-auto whitespace-nowrap text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Analysis</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              title="Refresh data"
              aria-label="Refresh YouTube insights"
            >
              <RefreshCw className={`h-4 w-4 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant="outline" className="font-medium">
              <Play className="h-3 w-3 mr-1" />
              {summary.total_videos} videos
            </Badge>
            <Badge variant="outline" className="font-medium">
              <Eye className="h-3 w-3 mr-1" />
              {formatViews(summary.total_views)} views
            </Badge>
            <Badge variant={(data.meta?.confidence ?? 'Unknown') === 'High' ? 'default' : 'secondary'}>
              {(data.meta?.confidence ?? 'Unknown')} Confidence
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Videos</span>
              </div>
              <p className="text-2xl font-bold mt-1">{summary.total_videos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Views</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatViews(summary.total_views)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Likes</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatViews(summary.total_likes)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Avg Relevance</span>
              </div>
              <p className="text-2xl font-bold mt-1">{(summary.avg_relevance * 100).toFixed(0)}%</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
            <TabsTrigger value="channels">Channels ({topChannels.length})</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4 mt-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {videos.map((video, idx) => (
                  <Card key={video.videoId} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        {video.thumbnail && (
                          <div className="flex-shrink-0">
                            <img 
                              src={video.thumbnail} 
                              alt={video.title}
                              className="w-40 h-24 object-cover rounded"
                            />
                          </div>
                        )}
                        
                        {/* Video Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <a 
                                href={video.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-medium hover:text-destructive flex items-center gap-1 group"
                              >
                                <span className="line-clamp-2">{video.title}</span>
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </a>
                              <p className="text-sm text-muted-foreground mt-1">{video.channel}</p>
                            </div>
                            <Badge variant="outline" className="flex-shrink-0">
                              #{idx + 1}
                            </Badge>
                          </div>
                          
                          {/* Metrics */}
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatViews(video.views)}
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {formatViews(video.likes)}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {formatViews(video.comments)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {(video.relevance * 100).toFixed(0)}% relevant
                            </div>
                            <div>
                              {formatDistanceToNow(new Date(video.published_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {videos.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No videos found for this idea
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Channels by Video Count</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="videos" fill="hsl(var(--destructive))" name="Video Count" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {topChannels.map((ch, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Youtube className="h-4 w-4 text-destructive" />
                          <span className="font-medium">{ch.channel}</span>
                        </div>
                        <Badge variant="outline">{ch.video_count} videos</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Engagement Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Avg Views per Video</span>
                        <span className="font-medium">{formatViews(summary.total_views / summary.total_videos)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Avg Likes per Video</span>
                        <span className="font-medium">{formatViews(summary.total_likes / summary.total_videos)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Engagement Rate</span>
                        <span className="font-medium">{((summary.total_likes / summary.total_views) * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Research Meta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time Window</span>
                      <span className="font-medium">{summary.time_window}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region</span>
                      <span className="font-medium">{summary.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence</span>
                      <Badge variant={(data.meta?.confidence ?? 'Unknown') === 'High' ? 'default' : 'secondary'}>
                        {data.meta?.confidence ?? 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Performing Videos by Relevance</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {videos.slice(0, 10).map((video, idx) => (
                      <div key={video.videoId} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <div className="flex-1 min-w-0">
                          <a 
                            href={video.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-destructive truncate block"
                          >
                            {idx + 1}. {video.title}
                          </a>
                          <div className="text-xs text-muted-foreground">{video.channel}</div>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {(video.relevance * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      
    </Card>
  );
}