import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, TrendingUp, AlertCircle, Hash } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

interface Props {
  data: any;
  loading?: boolean;
}

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444'
};

export function ComprehensiveRedditTile({ data, loading }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Reddit Community Pulse
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

  if (!data || !data.metrics) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Reddit Community Pulse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No Reddit data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = data.metrics || {};
  const json = data.json || {};
  const topPosts = (json.items as any[]) || [];
  const themes = json.themes || [];
  const painPoints = json.pain_points || [];
  
  const positive = (metrics.positive ?? json.overall_sentiment?.positive) ?? 0;
  const neutral = (metrics.neutral ?? json.overall_sentiment?.neutral) ?? 0;
  const negative = (metrics.negative ?? json.overall_sentiment?.negative) ?? 0;
  const total = (metrics.total_posts ?? json.overall_sentiment?.total_posts) ?? (positive + neutral + negative);

  const sentimentData = [
    { name: 'Positive', value: positive, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: neutral, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: negative, color: SENTIMENT_COLORS.negative }
  ];

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case "negative":
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRelativeTime = (ts: number | string) => {
    let timestampSec: number;
    if (typeof ts === 'string') {
      const d = new Date(ts);
      timestampSec = isNaN(d.getTime()) ? Number(ts) : d.getTime() / 1000;
    } else {
      timestampSec = ts;
    }
    const now = Date.now() / 1000;
    const diff = now - timestampSec;
    
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestampSec * 1000).toLocaleDateString();
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Reddit Community Pulse
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{total || 0} posts</Badge>
            <Badge variant="secondary">{data.confidence ? Math.round(data.confidence * 100) + '%' : 'Medium'}</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{data.explanation || json.summary}</p>
        {metrics.engagement_score != null && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Engagement: {metrics.engagement_score}/100
            </Badge>
            {metrics.community_positivity_score != null && (
              <Badge variant="outline" className="text-xs">
                Positivity: {metrics.community_positivity_score}/100
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="pain">Pain Points</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-2xl font-bold text-green-500">{positive}</div>
                <div className="text-xs text-muted-foreground">Positive</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                <div className="text-2xl font-bold text-gray-500">{neutral}</div>
                <div className="text-xs text-muted-foreground">Neutral</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-2xl font-bold text-red-500">{negative}</div>
                <div className="text-xs text-muted-foreground">Negative</div>
              </div>
            </div>

            {sentimentData.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sentiment Bars */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    Positive
                  </span>
                  <span className="font-medium">{total > 0 ? Math.round((positive / total) * 100) : 0}%</span>
                </div>
                <Progress value={total > 0 ? (positive / total) * 100 : 0} className="h-2 bg-green-500/20" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-gray-500" />
                    Neutral
                  </span>
                  <span className="font-medium">{total > 0 ? Math.round((neutral / total) * 100) : 0}%</span>
                </div>
                <Progress value={total > 0 ? (neutral / total) * 100 : 0} className="h-2 bg-gray-500/20" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    Negative
                  </span>
                  <span className="font-medium">{total > 0 ? Math.round((negative / total) * 100) : 0}%</span>
                </div>
                <Progress value={total > 0 ? (negative / total) * 100 : 0} className="h-2 bg-red-500/20" />
              </div>
            </div>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="px-4 pb-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {topPosts.length > 0 ? (
                  topPosts.slice(0, 10).map((post: any, idx: number) => (
                    <a
                      key={idx}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-lg border hover:border-primary/40 hover:bg-accent/50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {getSentimentIcon((post as any).sentiment || (post as any).evidence?.[0] || 'neutral')}
                        <div className="flex-1 space-y-2">
                          <h4 className="text-sm font-medium line-clamp-2">{post.title}</h4>
                          {post.selftext && (
                            <p className="text-xs text-muted-foreground line-clamp-2 italic border-l-2 border-border pl-2">
                              {post.selftext.substring(0, 150)}...
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            {post.subreddit && (
                              <Badge variant="secondary" className="text-xs">
                                r/{post.subreddit}
                              </Badge>
                            )}
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {post.score}
                            </span>
                            {post.num_comments !== undefined && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {post.num_comments}
                              </span>
                            )}
                            <span>{getRelativeTime((post as any).created ?? (post as any).published)}</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No posts available
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Themes Tab */}
          <TabsContent value="themes" className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Key Discussion Themes</h4>
                {themes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {themes.map((theme: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-primary/5">
                        <Hash className="h-3 w-3 mr-1" />
                        {theme}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No themes identified</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Sentiment Tab */}
          <TabsContent value="sentiment" className="px-4 pb-4">
            <div className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sentimentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Pain Points Tab */}
          <TabsContent value="pain" className="px-4 pb-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Common Pain Points</h4>
                {painPoints.length > 0 ? (
                  <div className="space-y-2">
                    {painPoints.map((pain: string, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 border text-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span>{pain}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pain points identified</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
