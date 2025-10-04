import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, ExternalLink, TrendingUp, Hash, Users, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface RedditResearchData {
  summary: {
    total_posts_analyzed: number;
    top_subreddits: Array<{ subreddit: string; posts: number }>;
    common_pain_points: string[];
    competitor_mentions: number;
    time_window: string;
    keywords_used: {
      core: string[];
      synonyms: string[];
      painPhrases: string[];
      competitors: string[];
    };
  };
  posts: Array<{
    subreddit: string;
    title: string;
    score: number;
    comments: number;
    age_days: number;
    relevance_score: string;
    permalink: string;
    url: string;
    flair?: string;
    author: string;
    summary: string;
    pain_points: string[];
    jtbd: string;
    stage: string;
    sentiment: number;
  }>;
  insights: {
    top_pain_categories: Record<string, number>;
    sentiment_distribution: { positive: number; neutral: number; negative: number };
    stage_breakdown: Record<string, number>;
  };
}

interface Props {
  idea: string;
  className?: string;
}

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444'
};

export function EnhancedRedditTile({ idea, className }: Props) {
  const [data, setData] = useState<RedditResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    if (!idea) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await optimizedQueue.invokeFunction('reddit-research', {
        idea_text: idea,
        time_window: 'year'
      });
      
      if (response?.error) {
        throw new Error(response.error);
      }
      
      setData(response);
    } catch (err) {
      console.error('[EnhancedRedditTile] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Reddit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [idea]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (loading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reddit Research Analysis
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

  if (error || !data || !data.summary || !data.posts) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reddit Research Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error || 'No data available'}</span>
          </div>
          {data && !data.summary && (
            <div className="mt-2 text-xs text-muted-foreground">
              Received: {JSON.stringify(Object.keys(data))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Validate data structure - handle both nested and flat structures
  console.log('[EnhancedRedditTile] Received data structure:', Object.keys(data));
  const summary = (data.summary || data) as any; // If data.summary exists, use it; otherwise data itself is the summary
  const insights = (data.insights || {
    sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
    top_pain_categories: {}
  }) as any;
  const posts = (data.posts || []) as any[];

  // Ensure required fields exist with fallbacks
  const totalPosts = summary.total_posts_analyzed || 0;
  const topSubreddits = summary.top_subreddits || [];
  const commonPainPoints = summary.common_pain_points || [];
  const keywordsUsed = summary.keywords_used || { core: [] };
  
  console.log('[EnhancedRedditTile] Processed data - totalPosts:', totalPosts, 'topSubreddits count:', topSubreddits.length);

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

  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Reddit Research Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant="outline">
              {data.summary.total_posts_analyzed} posts analyzed
            </Badge>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-sm text-muted-foreground">
            Analyzed {data.summary.top_subreddits.reduce((sum, s) => sum + s.posts, 0)} relevant posts across {data.summary.top_subreddits.length} subreddits
          </p>
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Keywords:</span>
            {data.summary.keywords_used?.core?.map(kw => (
              <Badge key={kw} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            )) || <span className="text-xs text-muted-foreground">No keywords</span>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="posts">Top Posts</TabsTrigger>
            <TabsTrigger value="pain">Pain Points</TabsTrigger>
            <TabsTrigger value="subreddits">Subreddits</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px]">
            {/* Overview Tab */}
            <TabsContent value="overview" className="px-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sentiment Distribution */}
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Sentiment Distribution</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
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
                        {item.name}: {item.value}%
                      </span>
                    ))}
                  </div>
                </Card>

                {/* Stage Breakdown */}
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Customer Journey Stage</h4>
                  <div className="space-y-3">
                    {Object.entries(data.insights.stage_breakdown).map(([stage, count]) => (
                      <div key={stage} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{stage.replace('_', ' ')}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <Progress 
                          value={(count / data.posts.length) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Pain Categories */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Pain Point Categories</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={painCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>

            {/* Top Posts Tab */}
            <TabsContent value="posts" className="px-4 space-y-3">
              {data.posts.map((post, idx) => (
                <Card key={idx} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            r/{post.subreddit}
                          </Badge>
                          {post.flair && (
                            <Badge variant="secondary" className="text-xs">
                              {post.flair}
                            </Badge>
                          )}
                          <Badge 
                            variant={post.sentiment > 0.2 ? 'default' : post.sentiment < -0.2 ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {post.jtbd}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm">{post.title}</h4>
                      </div>
                      <Badge className="flex-shrink-0">
                        Relevance: {post.relevance_score}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {post.summary}
                    </p>

                    {post.pain_points.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-amber-500">Pain Points:</span>
                        {post.pain_points.map((pain, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{pain}</span>
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
                        <MessageSquare className="h-3 w-3" />
                        {post.comments} comments
                      </span>
                      <span>{post.age_days}d ago</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs p-0 ml-auto" asChild>
                        <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Pain Points Tab */}
            <TabsContent value="pain" className="px-4 space-y-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Common Pain Points</h4>
                {data.summary.common_pain_points.map((pain, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-muted/50 rounded">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{pain}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Subreddits Tab */}
            <TabsContent value="subreddits" className="px-4 space-y-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium mb-3">Top Subreddits by Signal</h4>
                {topSubreddits.map((sub, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">r/{sub.subreddit || 'unknown'}</span>
                    </div>
                    <Badge variant="outline">{sub.posts} posts</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="px-4 space-y-4">
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Key Insights</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-1" />
                    <div>
                      <p className="text-sm font-medium">Competitor Awareness</p>
                      <p className="text-xs text-muted-foreground">
                        Found {data.summary.competitor_mentions} mentions of alternatives or competitors
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-primary mt-1" />
                    <div>
                      <p className="text-sm font-medium">Market Signal</p>
                      <p className="text-xs text-muted-foreground">
                        {posts.length} high-relevance discussions identified across {topSubreddits.length} communities
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Keywords Tab */}
            <TabsContent value="keywords" className="px-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Core Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.summary.keywords_used?.core?.map(kw => (
                      <Badge key={kw} variant="default">{kw}</Badge>
                    )) || <span className="text-xs text-muted-foreground">No keywords</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Synonyms & Variants</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.summary.keywords_used?.synonyms?.map(kw => (
                      <Badge key={kw} variant="secondary">{kw}</Badge>
                    )) || <span className="text-xs text-muted-foreground">No synonyms</span>}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Pain Phrases</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.summary.keywords_used?.painPhrases?.slice(0, 6).map(kw => (
                      <Badge key={kw} variant="outline" className="text-amber-500 border-amber-500">
                        {kw}
                      </Badge>
                    )) || <span className="text-xs text-muted-foreground">No pain phrases</span>}
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
