import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Youtube, Play, Eye, ThumbsUp, MessageCircle, ExternalLink, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';

interface Props {
  data: any;
  loading?: boolean;
}

export function ComprehensiveYouTubeTile({ data, loading }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube Deep Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.youtube_insights) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube Deep Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No YouTube data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const videos = data.youtube_insights || [];
  const summary = data.summary || {};
  const meta = data.meta || {};
  const topChannels = summary.top_channels || [];

  const relevanceData = [
    { name: 'High (>60%)', value: videos.filter((v: any) => v.relevance > 0.6).length, color: '#10b981' },
    { name: 'Medium (40-60%)', value: videos.filter((v: any) => v.relevance >= 0.4 && v.relevance <= 0.6).length, color: '#f59e0b' },
    { name: 'Low (<40%)', value: videos.filter((v: any) => v.relevance < 0.4).length, color: '#ef4444' }
  ];

  const channelData = topChannels.map((ch: any) => ({
    channel: ch.channel,
    videos: ch.video_count
  }));

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube Deep Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{summary.total_videos || 0} videos</Badge>
            <Badge variant="secondary">{meta.confidence || 'Medium'}</Badge>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-muted-foreground">
            Region: {summary.region || 'US'} | Time: {summary.time_window || 'year'}
          </p>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <p className="font-medium">{summary.total_views?.toLocaleString() || 0}</p>
              <p className="text-muted-foreground">Views</p>
            </div>
            <div>
              <p className="font-medium">{summary.total_likes?.toLocaleString() || 0}</p>
              <p className="text-muted-foreground">Likes</p>
            </div>
            <div>
              <p className="font-medium">{Math.round(summary.avg_relevance * 100) || 0}%</p>
              <p className="text-muted-foreground">Avg Relevance</p>
            </div>
            <div>
              <p className="font-medium">{topChannels.length || 0}</p>
              <p className="text-muted-foreground">Channels</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="relevance">Relevance</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px]">
            {/* Overview */}
            <TabsContent value="overview" className="px-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Relevance Distribution</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={relevanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {relevanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 text-xs mt-2">
                    {relevanceData.map(item => (
                      <span key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                        <span>{item.name}: {item.value} videos</span>
                      </span>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Top Channels</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={channelData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="channel" angle={-45} textAnchor="end" height={80} fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Bar dataKey="videos" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Summary Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{summary.total_videos || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Videos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(summary.total_views || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(summary.total_likes || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Likes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Math.round((summary.avg_relevance || 0) * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Avg Relevance</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Videos */}
            <TabsContent value="videos" className="px-4 space-y-3">
              {videos.map((video: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="flex gap-3">
                    {video.thumbnail && (
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-32 h-20 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm line-clamp-2">{video.title}</h4>
                        <Badge variant={video.relevance > 0.6 ? 'default' : video.relevance < 0.4 ? 'destructive' : 'secondary'}>
                          {Math.round(video.relevance * 100)}%
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span className="font-medium">{video.channel}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {video.views?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {video.likes?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {video.comments?.toLocaleString() || 0}
                        </span>
                        <span>{new Date(video.published_at).toLocaleDateString()}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto" asChild>
                          <a href={video.url} target="_blank" rel="noopener noreferrer">
                            <Play className="h-3 w-3 mr-1" />
                            Watch
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Channels */}
            <TabsContent value="channels" className="px-4 space-y-3">
              {topChannels.map((channel: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{channel.channel}</span>
                    </div>
                    <Badge>{channel.video_count} videos</Badge>
                  </div>
                  <Progress value={(channel.video_count / summary.total_videos) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {((channel.video_count / summary.total_videos) * 100).toFixed(1)}% of total videos
                  </p>
                </Card>
              ))}
            </TabsContent>

            {/* Relevance */}
            <TabsContent value="relevance" className="px-4 space-y-4">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Relevance Score Distribution</h4>
                <div className="space-y-3">
                  {relevanceData.map(item => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span>{item.value} videos ({((item.value / videos.length) * 100).toFixed(1)}%)</span>
                      </div>
                      <Progress value={(item.value / videos.length) * 100} className="h-3" style={{ '--progress-background': item.color } as any} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Videos by Relevance Score</h4>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {videos
                      .sort((a: any, b: any) => b.relevance - a.relevance)
                      .map((video: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                          <span className="truncate flex-1">{video.title}</span>
                          <Badge variant={video.relevance > 0.6 ? 'default' : video.relevance < 0.4 ? 'destructive' : 'secondary'}>
                            {Math.round(video.relevance * 100)}%
                          </Badge>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Engagement */}
            <TabsContent value="engagement" className="px-4 space-y-4">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Views vs Likes</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="views" name="Views" />
                    <YAxis dataKey="likes" name="Likes" />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Videos" data={videos} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Top Performing Videos</h4>
                <div className="space-y-2">
                  {videos
                    .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
                    .slice(0, 5)
                    .map((video: any, idx: number) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded space-y-1">
                        <p className="text-sm font-medium line-clamp-1">{video.title}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {video.views?.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {video.likes?.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {video.comments?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </TabsContent>

            {/* Raw Data */}
            <TabsContent value="raw" className="px-4">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Complete API Response</h4>
                <ScrollArea className="h-[400px]">
                  <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </ScrollArea>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
