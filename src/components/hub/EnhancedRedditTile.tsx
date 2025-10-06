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
  data: RedditResearchData | null;
  loading?: boolean;
  className?: string;
  onRefresh?: () => void;
}

const SENTIMENT_COLORS = {
  positive: '#10b981',
  neutral: '#f59e0b',
  negative: '#ef4444'
};

export function EnhancedRedditTile({ data, loading = false, className, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const PAGE_SIZE = 12;
  const MAX_STORE_POSTS = 150;
  const [postPage, setPostPage] = useState(1);
  const [truncatedNote, setTruncatedNote] = useState<string | null>(null);

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
      console.log('[EnhancedRedditTile] idea:changed event received');
      if (onRefresh) {
        handleRefresh();
      }
    };
    
    window.addEventListener('idea:changed', handleIdeaChange);
    
    return () => {
      window.removeEventListener('idea:changed', handleIdeaChange);
    };
  }, [onRefresh]);

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

  if (!data || !data.summary || !data.posts) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reddit Research Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No Reddit data available for this idea</span>
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
  // Shallow trim & memoize to avoid re-renders with giant payloads
  console.log('[EnhancedRedditTile] Received data structure:', Object.keys(data));
  let trimmed = data;
  try {
    if (data.posts?.length || 0 > MAX_STORE_POSTS || (data.summary?.top_subreddits?.length || 0) > 25) {
      const original = {
        posts: data.posts?.length || 0,
        subs: data.summary?.top_subreddits?.length || 0,
        pains: data.summary?.common_pain_points?.length || 0
      };
      trimmed = {
        ...data,
        posts: (data.posts || []).slice(0, MAX_STORE_POSTS),
        summary: {
          ...data.summary,
          top_subreddits: (data.summary.top_subreddits || []).slice(0, 20),
          common_pain_points: (data.summary.common_pain_points || []).slice(0, 40)
        }
      };
      const notes: string[] = [];
      if (original.posts > (trimmed.posts?.length || 0)) notes.push(`posts ${(trimmed.posts?.length || 0)}/${original.posts}`);
      if (original.subs > (trimmed.summary.top_subreddits?.length || 0)) notes.push(`subs ${(trimmed.summary.top_subreddits?.length || 0)}/${original.subs}`);
      if (original.pains > (trimmed.summary.common_pain_points?.length || 0)) notes.push(`pains ${(trimmed.summary.common_pain_points?.length || 0)}/${original.pains}`);
      if (notes.length) setTruncatedNote(notes.join(', '));
    }
  } catch {}
  data = trimmed;
  const summary = (data.summary || data) as any; // If data.summary exists, use it; otherwise data itself is the summary
  const insights = (data.insights || {
    sentiment_distribution: { positive: 0, neutral: 0, negative: 0 },
    top_pain_categories: {}
  }) as any;
  // --- Post normalization & de-duplication ---
  const normalizeAndDedupePosts = React.useCallback((postsIn: any[]): any[] => {
    if (!Array.isArray(postsIn)) return [];
    console.log('[EnhancedReddit] Raw posts received:', postsIn.slice(0, 3).map(p => ({ title: p.title?.slice(0, 50), permalink: p.permalink, url: p.url })));
    const seen = new Set<string>();
    const cleaned: any[] = [];
    for (const p of postsIn) {
      if (!p) continue;
      // Try multiple dedup strategies
      const urlKey = (p.permalink || p.url || '')?.trim().toLowerCase();
      const titleKey = p.title?.trim().toLowerCase();
      const summaryKey = p.summary?.trim().toLowerCase();
      
      let key = '';
      if (urlKey && urlKey.length > 10) key = urlKey;
      else if (titleKey && titleKey.length > 5) key = titleKey;
      else if (summaryKey && summaryKey.length > 10) key = summaryKey;
      
      if (!key || seen.has(key)) {
        if (seen.has(key)) console.log('[EnhancedReddit] Skipping duplicate:', key.slice(0, 30));
        continue;
      }
      seen.add(key);
      cleaned.push({ ...p });
    }
    console.log('[EnhancedReddit] After dedup:', cleaned.length, 'from', postsIn.length);
    return cleaned;
  }, []);

  const collapseCrossPosts = React.useCallback((postsIn: any[]): any[] => {
    if (!Array.isArray(postsIn) || !postsIn.length) return postsIn;
    const norm = (t: string) => t
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const map = new Map<string, any>();
    for (const p of postsIn) {
      const key = norm(p.title || '');
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...p, _sources: [{ subreddit: p.subreddit, score: p.score, comments: p.comments }], _crosspostCount: 1 });
      } else {
        existing._sources.push({ subreddit: p.subreddit, score: p.score, comments: p.comments });
        existing._crosspostCount += 1;
        existing.score = Math.max(existing.score || 0, p.score || 0);
        existing.comments = Math.max(existing.comments || 0, p.comments || 0);
      }
    }
    return Array.from(map.values());
  }, []);

  // Prefer recency if age_days provided, else keep original order
  const rawPosts = (data.posts || []) as any[];
  const deduped = normalizeAndDedupePosts(rawPosts);
  const collapsed = collapseCrossPosts(deduped);
  let posts = collapsed;
  if (collapsed.some(p => typeof p.age_days === 'number')) {
    posts = [...collapsed].sort((a, b) => (a.age_days ?? 9999) - (b.age_days ?? 9999));
  }
  if (deduped.length !== rawPosts.length) console.log('[EnhancedRedditTile] De-duplicated posts', { before: rawPosts.length, after: deduped.length });
  if (collapsed.length !== deduped.length) console.log('[EnhancedRedditTile] Cross-post collapsed posts', { before: deduped.length, after: collapsed.length });

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
            {data.summary.keywords_used?.core?.length > 0 ? (
              data.summary.keywords_used.core.map(kw => (
                <Badge key={kw} variant="secondary" className="text-xs">
                  {kw}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No keywords</span>
            )}
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
              {posts.slice(0, postPage * PAGE_SIZE).map((post, idx) => (
                <Card key={(post.permalink || post.url || post.title || idx).toString()} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            r/{post.subreddit}
                          </Badge>
                          {post._crosspostCount > 1 && (
                            <>
                              <Badge variant="secondary" className="text-[10px]">
                                {post._crosspostCount}× cross-posts
                              </Badge>
                              {post._sources?.slice(1, 3).map((src: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px]">
                                  r/{src.subreddit}
                                </Badge>
                              ))}
                              {post._sources?.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{post._sources.length - 3}
                                </Badge>
                              )}
                            </>
                          )}
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
                        {post.age_days !== undefined && (
                          <span className="text-[10px] text-muted-foreground ml-1">{post.age_days}d</span>
                        )}
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
                      {post.age_days !== undefined && <span>{post.age_days}d ago</span>}
                      <Button variant="ghost" size="sm" className="h-6 text-xs p-0 ml-auto" asChild>
                        <a href={post.permalink?.startsWith('http') ? post.permalink : `https://reddit.com${post.permalink || post.url || ''}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {posts.length > postPage * PAGE_SIZE && (
                <div className="flex justify-center pb-4">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setPostPage(p => p + 1)}>
                    Load more ({posts.length - postPage * PAGE_SIZE} remaining)
                  </Button>
                </div>
              )}
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
                    {Array.isArray(data.summary.keywords_used?.core) && data.summary.keywords_used.core.length > 0 ? (
                      data.summary.keywords_used.core.map(kw => (
                        <Badge key={kw} variant="default">{kw}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No keywords</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Synonyms & Variants</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(data.summary.keywords_used?.synonyms) && data.summary.keywords_used.synonyms.length > 0 ? (
                      data.summary.keywords_used.synonyms.map(kw => (
                        <Badge key={kw} variant="secondary">{kw}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No synonyms</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Pain Phrases</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(data.summary.keywords_used?.painPhrases) && data.summary.keywords_used.painPhrases.length > 0 ? (
                      data.summary.keywords_used.painPhrases.slice(0, 6).map(kw => (
                        <Badge key={kw} variant="outline" className="text-amber-500 border-amber-500">
                          {kw}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No pain phrases</span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
      {truncatedNote && (
        <div className="px-4 pb-2 text-[10px] text-muted-foreground italic">Dataset trimmed: {truncatedNote}</div>
      )}
    </Card>
  );
}
