import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Twitter, Hash, Users, Heart, Repeat2, MessageCircle, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
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

export function ComprehensiveTwitterTile({ data, loading }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-blue-500" />
            Twitter Deep Analysis
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
            <Twitter className="h-5 w-5 text-blue-500" />
            Twitter Deep Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No Twitter data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = data.metrics || {};
  const clusters = data.clusters || [];
  const rawTweets = data.raw_tweets || [];
  
  const sentimentData = [
    { name: 'Positive', value: metrics.overall_sentiment?.positive || 0, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: metrics.overall_sentiment?.neutral || 0, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: metrics.overall_sentiment?.negative || 0, color: SENTIMENT_COLORS.negative }
  ];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Twitter className="h-5 w-5 text-blue-500" />
            Twitter Deep Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{metrics.total_tweets || 0} tweets</Badge>
            <Badge variant="secondary">{data.confidence || 'Medium'}</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{data.summary}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">{metrics.buzz_trend}</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tweets">Tweets</TabsTrigger>
            <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
            <TabsTrigger value="influencers">Influencers</TabsTrigger>
            <TabsTrigger value="clusters">Clusters</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px]">
            {/* Overview */}
            <TabsContent value="overview" className="px-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Overall Sentiment</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-around text-xs mt-2">
                    {sentimentData.map(item => (
                      <span key={item.name} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                        {item.value}%
                      </span>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Top Hashtags</h4>
                  <div className="flex flex-wrap gap-2">
                    {metrics.top_hashtags?.slice(0, 10).map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{metrics.total_tweets || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Tweets</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.top_hashtags?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Hashtags</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics.influencers?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Influencers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{clusters.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Discussion Clusters</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tweets */}
            <TabsContent value="tweets" className="px-4 space-y-3">
              {rawTweets.map((tweet: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="space-y-3">
                    <p className="text-sm">{tweet.text}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {tweet.metrics?.like_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="h-3 w-3" />
                        {tweet.metrics?.retweet_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {tweet.metrics?.reply_count || 0}
                      </span>
                      <span className="ml-auto">{new Date(tweet.created_at).toLocaleDateString()}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                        <a href={tweet.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Hashtags */}
            <TabsContent value="hashtags" className="px-4 space-y-3">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">All Hashtags</h4>
                <div className="flex flex-wrap gap-2">
                  {metrics.top_hashtags?.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      <Hash className="h-3 w-3 mr-1" />
                      {tag.replace('#', '')}
                    </Badge>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Influencers */}
            <TabsContent value="influencers" className="px-4 space-y-3">
              {metrics.influencers?.map((inf: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{inf.handle}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{inf.followers?.toLocaleString()} followers</span>
                      </div>
                    </div>
                    <Badge variant={inf.sentiment === 'positive' ? 'default' : 'secondary'}>
                      {inf.sentiment}
                    </Badge>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Clusters */}
            <TabsContent value="clusters" className="px-4 space-y-3">
              {clusters.map((cluster: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{cluster.title}</h4>
                        <p className="text-sm text-muted-foreground">{cluster.insight}</p>
                      </div>
                      <Badge>
                        {cluster.sentiment.positive}% positive
                      </Badge>
                    </div>

                    {cluster.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {cluster.hashtags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    {cluster.quotes?.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <span className="text-xs font-medium">Sample Tweets:</span>
                        {cluster.quotes.map((quote: any, i: number) => (
                          <div key={i} className="text-xs italic border-l-2 border-muted pl-3 py-1">
                            "{quote.text}"
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs">
                      <span>Likes: {cluster.engagement?.avg_likes || 0}</span>
                      <span>Retweets: {cluster.engagement?.avg_retweets || 0}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Sentiment */}
            <TabsContent value="sentiment" className="px-4 space-y-4">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Sentiment Distribution</h4>
                <div className="space-y-4">
                  {sentimentData.map(item => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span>{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="h-3" style={{ '--progress-background': item.color } as any} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Sentiment by Cluster</h4>
                <div className="space-y-3">
                  {clusters.map((cluster: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-sm font-medium">{cluster.title}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: SENTIMENT_COLORS.positive }} />
                          {cluster.sentiment.positive}%
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: SENTIMENT_COLORS.neutral }} />
                          {cluster.sentiment.neutral}%
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: SENTIMENT_COLORS.negative }} />
                          {cluster.sentiment.negative}%
                        </div>
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
