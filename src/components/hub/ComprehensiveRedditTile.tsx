import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, ExternalLink, TrendingUp, Hash, Users, AlertCircle, Clock, ThumbsUp, MessageCircle } from 'lucide-react';
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
            Reddit Deep Research
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

  if (!data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Reddit Deep Research
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

  const summary = data.summary || {};
  const insights = data.insights || {};
  const posts = data.posts || [];

  const sentimentData = [
    { name: 'Positive', value: insights.sentiment_distribution?.positive || 0, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: insights.sentiment_distribution?.neutral || 0, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: insights.sentiment_distribution?.negative || 0, color: SENTIMENT_COLORS.negative }
  ];

  const painCategoryData = insights.top_pain_categories 
    ? Object.entries(insights.top_pain_categories).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }))
    : [];

  const stageData = insights.stage_breakdown
    ? Object.entries(insights.stage_breakdown).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value
      }))
    : [];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Reddit Deep Research
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {summary.total_posts_analyzed || 0} posts
            </Badge>
            <Badge variant="secondary">
              {summary.top_subreddits?.length || 0} subreddits
            </Badge>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-muted-foreground">
            Competitor mentions: {summary.competitor_mentions || 0} | Time window: {summary.time_window || 'N/A'}
          </p>
          <div className="flex flex-wrap gap-1">
            <span className="text-xs font-medium">Keywords:</span>
            {summary.keywords_used?.core?.map((kw: string) => (
              <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
            ))}
            {summary.keywords_used?.synonyms?.slice(0, 3).map((kw: string) => (
              <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="posts">All Posts</TabsTrigger>
            <TabsTrigger value="pain">Pain Points</TabsTrigger>
            <TabsTrigger value="subreddits">Subreddits</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="stages">Stages</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px]">
            {/* Overview */}
            <TabsContent value="overview" className="px-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Sentiment Distribution</h4>
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
                  <h4 className="text-sm font-medium mb-3">Journey Stages</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stageData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Pain Categories</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={painCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Top Subreddits</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {summary.top_subreddits?.map((sub: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <span className="font-medium">r/{sub.subreddit}</span>
                      <Badge variant="outline">{sub.posts}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* All Posts */}
            <TabsContent value="posts" className="px-4 space-y-3">
              {posts.map((post: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">r/{post.subreddit}</Badge>
                          {post.flair && <Badge variant="secondary" className="text-xs">{post.flair}</Badge>}
                          <Badge className="text-xs">{post.jtbd}</Badge>
                          <Badge variant={post.sentiment > 0.2 ? 'default' : post.sentiment < -0.2 ? 'destructive' : 'secondary'}>
                            {post.stage}
                          </Badge>
                        </div>
                        <h4 className="font-semibold">{post.title}</h4>
                        <p className="text-sm text-muted-foreground">{post.summary}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge>Score: {post.relevance_score}</Badge>
                        <span className="text-xs text-muted-foreground">{post.age_days}d ago</span>
                      </div>
                    </div>

                    {post.pain_points?.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Pain Points:</span>
                        {post.pain_points.map((pain: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs mt-1">
                            <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{pain}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {post.score} upvotes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post.comments} comments
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.age_days} days ago
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto" asChild>
                        <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Reddit
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Pain Points */}
            <TabsContent value="pain" className="px-4 space-y-3">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Common Pain Points</h4>
                <div className="space-y-2">
                  {summary.common_pain_points?.map((pain: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{pain}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Pain Point Categories Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={painCategoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* Subreddits */}
            <TabsContent value="subreddits" className="px-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.top_subreddits?.map((sub: any, idx: number) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">r/{sub.subreddit}</span>
                      </div>
                      <Badge>{sub.posts} posts</Badge>
                    </div>
                    <Progress value={(sub.posts / summary.total_posts_analyzed) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {((sub.posts / summary.total_posts_analyzed) * 100).toFixed(1)}% of total posts
                    </p>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Sentiment */}
            <TabsContent value="sentiment" className="px-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Overall Sentiment</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Sentiment Breakdown</h4>
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
              </div>
            </TabsContent>

            {/* Stages */}
            <TabsContent value="stages" className="px-4 space-y-4">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Customer Journey Stage Distribution</h4>
                <div className="space-y-3">
                  {stageData.map((stage: any) => (
                    <div key={stage.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{stage.name}</span>
                        <span>{stage.value} posts</span>
                      </div>
                      <Progress value={(stage.value / posts.length) * 100} className="h-2" />
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
