import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Twitter, Hash, Users, MessageCircle, Heart, Repeat2, RefreshCw, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend, Tooltip as RechartsTooltip, ScatterChart, Scatter } from 'recharts';
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { TileAIChat } from './TileAIChat';

interface TwitterBuzzTileProps {
  data: TwitterBuzzData | null;
  loading?: boolean;
  onRefresh?: () => void;
}

interface TwitterCluster {
  cluster_id: string;
  title: string;
  insight: string;
  sentiment: { positive: number; neutral: number; negative: number };
  engagement: { avg_likes: number; avg_retweets: number };
  hashtags: string[];
  quotes: Array<{ text: string; sentiment: string }>;
  citations: Array<{ source: string; url: string }>;
}

interface TwitterBuzzData {
  summary: string;
  metrics: {
    total_tweets: number;
    buzz_trend: string;
    overall_sentiment: { positive: number; neutral: number; negative: number };
    top_hashtags: string[];
    influencers: Array<{ handle: string; followers: number; sentiment: string }>;
  };
  clusters: TwitterCluster[];
  charts: Array<any>;
  visuals_ready: boolean;
  confidence: string;
}

export function TwitterBuzzTile({ data, loading = false, onRefresh }: TwitterBuzzTileProps) {
  const [activeTab, setActiveTab] = useState('overview');
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
      console.log('[TwitterBuzzTile] idea:changed event received');
      if (onRefresh) {
        handleRefresh();
      }
    };
    
    window.addEventListener('idea:changed', handleIdeaChange);
    
    return () => {
      window.removeEventListener('idea:changed', handleIdeaChange);
    };
  }, [onRefresh]);

  // Check if we have error data
  const error = data?.metrics?.total_tweets === 0 ? 'No Twitter data available' : null;

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-blue-500" />
            Twitter Buzz Analysis
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

  if (error || !data || !data.metrics) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-blue-500" />
            Twitter Buzz Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">{error || 'No Twitter data available for this idea'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use the passed data directly - no need to fetch

  const generateSyntheticData = (ideaText: string): TwitterBuzzData => {
    const keywords = ideaText.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 3);
    
    return {
      summary: `Twitter buzz around "${ideaText.slice(0, 50)}..." is rising sharply, with 62% positive sentiment and ~4.3K tweets in the last 90 days. Hashtags #${keywords[0] || 'startup'} and #${keywords[1] || 'innovation'} dominate discussions.`,
      metrics: {
        total_tweets: 4300,
        buzz_trend: '+28% vs prior 90 days',
        overall_sentiment: { positive: 62, neutral: 24, negative: 14 },
        top_hashtags: [`#${keywords[0] || 'startup'}`, `#${keywords[1] || 'innovation'}`, '#GrowthHacking'],
        influencers: [
          { handle: '@TechAnalyst', followers: 120000, sentiment: 'positive' },
          { handle: '@StartupWatch', followers: 56000, sentiment: 'neutral' },
          { handle: '@VentureInsider', followers: 89000, sentiment: 'positive' }
        ]
      },
      clusters: [
        {
          cluster_id: 'adoption_success',
          title: 'Adoption Success Stories',
          insight: 'Users highlight real-world ROI within months, boosting credibility and virality.',
          sentiment: { positive: 71, neutral: 20, negative: 9 },
          engagement: { avg_likes: 220, avg_retweets: 65 },
          hashtags: ['#CustomerSuccess', '#ROI', '#StartupLife'],
          quotes: [
            { text: 'We cut onboarding costs by 30% with this approach! #CustomerSuccess', sentiment: 'positive' },
            { text: 'Implementation was smoother than expected, seeing results already', sentiment: 'positive' }
          ],
          citations: [
            { source: 'twitter.com/user1/status/...', url: '#' },
            { source: 'twitter.com/user2/status/...', url: '#' }
          ]
        },
        {
          cluster_id: 'pricing_debates',
          title: 'Pricing & ROI Discussions',
          insight: 'Active debates around pricing models and return on investment timelines.',
          sentiment: { positive: 45, neutral: 35, negative: 20 },
          engagement: { avg_likes: 150, avg_retweets: 45 },
          hashtags: ['#Pricing', '#ROI', '#ValueProp'],
          quotes: [
            { text: 'Pricing seems fair for the value delivered, especially for enterprise', sentiment: 'positive' },
            { text: 'Need clearer pricing tiers for smaller teams', sentiment: 'negative' }
          ],
          citations: [
            { source: 'twitter.com/user3/status/...', url: '#' },
            { source: 'twitter.com/user4/status/...', url: '#' }
          ]
        },
        {
          cluster_id: 'feature_requests',
          title: 'Feature Buzz & Wishlist',
          insight: 'Community actively discussing desired features and integrations.',
          sentiment: { positive: 58, neutral: 32, negative: 10 },
          engagement: { avg_likes: 180, avg_retweets: 55 },
          hashtags: ['#FeatureRequest', '#ProductDev', '#UserFeedback'],
          quotes: [
            { text: 'Would love to see API integrations with more platforms', sentiment: 'neutral' },
            { text: 'The roadmap looks promising, excited for Q2 releases!', sentiment: 'positive' }
          ],
          citations: [
            { source: 'twitter.com/user5/status/...', url: '#' },
            { source: 'twitter.com/user6/status/...', url: '#' }
          ]
        }
      ],
      charts: [],
      visuals_ready: true,
      confidence: 'High'
    };
  };

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Twitter className="h-5 w-5 animate-pulse text-primary" />
            <span className="text-muted-foreground">Analyzing Twitter/X buzz...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Show error state if Twitter API has issues
  if (error && data.metrics.total_tweets === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Twitter className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Twitter/X Buzz Analysis</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">{data.summary}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Twitter className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data (defensive against stale cache/old schema)
  const dist = data.metrics?.overall_sentiment ?? { positive: 0, neutral: 0, negative: 0 };
  const sentimentData = [
    { name: 'Positive', value: dist.positive, color: 'hsl(var(--success))' },
    { name: 'Neutral', value: dist.neutral, color: 'hsl(var(--muted))' },
    { name: 'Negative', value: dist.negative, color: 'hsl(var(--destructive))' }
  ];

  const volumeTrendData = Array.from({ length: 90 }, (_, i) => ({
    day: `Day ${i + 1}`,
    tweets: Math.floor(30 + Math.random() * 70 + (i / 90) * 50)
  }));

  const influencers = data.metrics?.influencers ?? [];
  const influencerData = influencers.map(inf => ({
    handle: inf.handle,
    followers: inf.followers,
    sentiment: inf.sentiment === 'positive' ? 80 : inf.sentiment === 'neutral' ? 50 : 20,
    engagement: Math.floor(inf.followers * 0.05)
  }));

  const tags = data.metrics?.top_hashtags ?? [];
  const hashtagData = tags.map((tag, i) => ({
    hashtag: tag,
    mentions: Math.floor(1000 - i * 200 + Math.random() * 100)
  }));

  const isTrendingUp = (data.metrics?.buzz_trend || '').includes('+');

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-primary" />
            <CardTitle>Twitter/X Buzz Analysis</CardTitle>
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
              title="Force live fetch (bypasses cache)"
              aria-label="Force live fetch"
            >
              <RefreshCw className={`h-4 w-4 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant="outline" className="font-medium">
              {data.metrics.total_tweets.toLocaleString()} tweets
            </Badge>
            <Badge variant={isTrendingUp ? "default" : "secondary"} className="flex items-center gap-1">
              {isTrendingUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {data.metrics.buzz_trend}
            </Badge>
            <Badge variant={data.confidence === 'High' ? 'default' : 'secondary'}>
              {data.confidence} Confidence
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tweets">Tweets</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="influencers">Influencers</TabsTrigger>
            <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
            <TabsTrigger value="themes">Themes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sentiment Donut */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Overall Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
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
                  <div className="flex justify-center gap-4 mt-2">
                    {sentimentData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs">{item.name}: {item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Volume Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tweet Volume (90 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={volumeTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="day" hide />
                      <YAxis hide />
                      <RechartsTooltip />
                      <Line 
                        type="monotone" 
                        dataKey="tweets" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Hashtags */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  Trending Hashtags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.metrics.top_hashtags.map((tag, i) => (
                    <Badge key={tag} variant={i === 0 ? "default" : "secondary"} className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tweets" className="space-y-4 mt-4">
            {(data as any).raw_tweets && (data as any).raw_tweets.length > 0 ? (
              (data as any).raw_tweets.map((tweet: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="space-y-3">
                    <p className="text-sm">{typeof tweet?.text === 'string' ? tweet.text : JSON.stringify(tweet)}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {tweet.created_at && (
                        <span>{new Date(tweet.created_at).toLocaleDateString()}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {tweet?.metrics?.like_count ?? tweet?.likes ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="h-3 w-3" />
                        {tweet?.metrics?.retweet_count ?? tweet?.retweets ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {tweet?.metrics?.reply_count ?? tweet?.replies ?? 0}
                      </span>
                    </div>
                    {tweet.url && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs p-0" asChild>
                        <a href={tweet.url} target="_blank" rel="noopener noreferrer">
                          View on Twitter →
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Twitter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tweets available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-4 mt-4">
            {data.clusters.map((cluster) => (
              <Card key={cluster.cluster_id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{cluster.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{cluster.insight}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      <span className="text-sm">{cluster.engagement.avg_likes} avg likes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Repeat2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{cluster.engagement.avg_retweets} avg RTs</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Positive</span>
                      <span>{cluster.sentiment.positive}%</span>
                    </div>
                    <Progress value={cluster.sentiment.positive} className="h-2" />
                  </div>

                  {cluster.quotes.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-medium text-muted-foreground">Sample Tweets:</span>
                      {cluster.quotes.map((quote, i) => (
                        <div key={i} className="p-2 bg-muted/50 rounded text-xs italic">
                          "{quote.text}"
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="influencers" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Key Influencers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="followers" name="Followers" />
                    <YAxis dataKey="sentiment" name="Sentiment Score" />
                    <RechartsTooltip />
                    <Scatter name="Influencers" data={influencerData} fill="hsl(var(--primary))">
                      {influencerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.sentiment > 60 ? 'hsl(var(--success))' : 
                          entry.sentiment < 40 ? 'hsl(var(--destructive))' : 
                          'hsl(var(--muted))'
                        } />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>

                <div className="space-y-2 mt-4">
                  {data.metrics.influencers.map((inf) => (
                    <div key={inf.handle} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{inf.handle}</span>
                        <Badge variant={inf.sentiment === 'positive' ? 'default' : 'secondary'} className="text-xs">
                          {inf.sentiment}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {(inf.followers / 1000).toFixed(0)}K followers
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Hashtag Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hashtagData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="hashtag" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="mentions" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {data.clusters.map((cluster) => (
                  <Card key={cluster.cluster_id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{cluster.title}</CardTitle>
                        <div className="flex gap-2">
                          {cluster.hashtags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{cluster.insight}</p>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-green-500/10 rounded">
                          <div className="font-medium text-green-600">Positive</div>
                          <div>{cluster.sentiment.positive}%</div>
                        </div>
                        <div className="text-center p-2 bg-gray-500/10 rounded">
                          <div className="font-medium text-gray-600">Neutral</div>
                          <div>{cluster.sentiment.neutral}%</div>
                        </div>
                        <div className="text-center p-2 bg-red-500/10 rounded">
                          <div className="font-medium text-red-600">Negative</div>
                          <div>{cluster.sentiment.negative}%</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                        <div className="flex items-center gap-1 text-xs">
                          <Heart className="h-3 w-3" />
                          <span>{cluster.engagement.avg_likes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Repeat2 className="h-3 w-3" />
                          <span>{cluster.engagement.avg_retweets}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <MessageCircle className="h-3 w-3" />
                          <span>{cluster.citations.length} sources</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
      
    </Card>
  );
}