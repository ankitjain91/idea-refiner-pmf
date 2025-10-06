import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  MessageSquare, TrendingUp, TrendingDown, Users, 
  ThumbsUp, AlertCircle, Quote, Activity, Hash,
  Calendar, ChevronRight, ExternalLink, Sparkles, RefreshCw, Brain
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter,
  RadialBarChart, RadialBar, Treemap
} from 'recharts';
import { cn } from '@/lib/utils';
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { TileAIChat } from './TileAIChat';
import { useLockedIdea } from '@/lib/lockedIdeaManager';

interface RedditSentimentTileProps {
  className?: string;
}

interface RedditCluster {
  cluster_id: string;
  title: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  metrics: {
    engagement: {
      avg_upvotes: number;
      avg_comments: number;
    };
    recency_days_median: number;
    subreddit_distribution: Record<string, number>;
  };
  insight: string;
  quotes: Array<{
    text: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    subreddit?: string;
    upvotes?: number;
  }>;
  citations: Array<{
    source: string;
    url: string;
  }>;
}

interface RedditItem {
  title: string;
  snippet?: string;
  url: string;
  published?: string;
  source: string;
  evidence?: string[];
  score?: number;
  num_comments?: number;
}

interface RedditMetric {
  name: string;
  value: number;
  unit?: string;
  explanation?: string;
  confidence?: number;
}

interface RedditSentimentData {
  summary: string;
  clusters: RedditCluster[];
  items?: RedditItem[];
  themes?: string[];
  pain_points?: string[];
  metrics?: RedditMetric[];
  citations?: Array<{ label?: string; url: string }>;
  totalPosts?: number;
  charts: Array<{
    type: string;
    title: string;
    series: any[];
    labels?: string[];
  }>;
  visuals_ready: boolean;
  confidence: 'High' | 'Moderate' | 'Low';
  overall_sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
    total_posts: number;
    total_comments: number;
  };
  top_subreddits?: Array<{
    name: string;
    posts: number;
    sentiment_score: number;
  }>;
  sentiment_trend?: Array<{
    date: string;
    positive: number;
    negative: number;
  }>;
}

const SENTIMENT_COLORS = {
  positive: 'hsl(var(--chart-2))',
  neutral: 'hsl(var(--chart-3))',
  negative: 'hsl(var(--chart-1))'
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export function RedditSentimentTile({ className }: RedditSentimentTileProps) {
  const { lockedIdea, hasLockedIdea } = useLockedIdea();
  
  console.log('[Reddit] Component mounted with locked idea:', lockedIdea?.slice(0, 50));
  
  const [data, setData] = useState<RedditSentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<RedditCluster | null>(null);
  // Pagination / trimming state for large payloads
  const POST_PAGE_SIZE = 15;
  const MAX_POSTS_STORE = 120; // cap retained posts in state
  const [postPage, setPostPage] = useState(1);
  const [truncatedInfo, setTruncatedInfo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    if (lockedIdea && hasLockedIdea) {
      fetchRedditSentiment();
    } else {
      console.log('[Reddit] No locked idea available, showing empty state');
      setLoading(false);
      setError('No idea locked. Please use "Lock My Idea" button first.');
    }
  }, [lockedIdea, hasLockedIdea]);

  const fetchRedditSentiment = async () => {
    if (!lockedIdea || !hasLockedIdea) {
      setError('No locked idea available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsRefreshing(false);
    setError(null);

    try {
      // Use the new reddit-research endpoint for comprehensive analysis
      console.log('[Reddit] Calling reddit-research function with locked idea:', lockedIdea.slice(0, 50));
      
      // DEBUGGING: Add cache bypass for now to see fresh data
      const debugForceRefresh = new URLSearchParams(window.location.search).get('debug') === '1';
      if (debugForceRefresh) {
        console.log('[Reddit] DEBUG MODE: Bypassing cache');
      }
      
      const response = await optimizedQueue.invokeFunction('reddit-research', {
        idea_text: lockedIdea,
        time_window: 'year',
        ...(debugForceRefresh && { _cache_bypass: Date.now() }) // Force cache miss
      });
      
      console.log('[Reddit] Backend response received:', {
        hasResponse: !!response,
        hasRedditSentiment: !!response?.reddit_sentiment,
        hasData: !!response?.data,
        responseKeys: response ? Object.keys(response) : [],
        responseType: typeof response,
        fullResponse: response // TEMPORARY: Log full response to see structure
      });

      // Helper: shallow de-duplicate posts (by url then title) and clone to prevent shared refs
      const dedupePosts = (items: RedditItem[] | undefined): RedditItem[] => {
        if (!items || !items.length) return [];
        console.log('[Reddit] Raw items received:', items.slice(0, 3).map(it => ({ title: it.title?.slice(0, 50), url: it.url, source: it.source })));
        const seen = new Set<string>();
        const result: RedditItem[] = [];
        for (const it of items) {
          // Try multiple dedup strategies: URL first, then title, then snippet
          const urlKey = it.url?.trim().toLowerCase();
          const titleKey = it.title?.trim().toLowerCase();
          const snippetKey = it.snippet?.trim().toLowerCase();
          
          let key = '';
          if (urlKey && urlKey.length > 10) key = urlKey; // Prefer URL if meaningful
          else if (titleKey && titleKey.length > 5) key = titleKey;
          else if (snippetKey && snippetKey.length > 10) key = snippetKey;
          
          if (!key) continue;
          if (seen.has(key)) {
            console.log('[Reddit] Skipping duplicate:', key.slice(0, 30));
            continue;
          }
          seen.add(key);
          // Shallow clone to avoid accidental shared mutation from backend reuse
          result.push({ ...it });
        }
        console.log('[Reddit] After dedup:', result.length, 'from', items.length);
        return result;
      };

      // Collapse cross-posts: group identical titles (case/spacing/punct insensitive) across different subreddits
      const collapseCrossPosts = (items: RedditItem[]): RedditItem[] => {
        if (!items.length) return items;
        const norm = (t: string) => t
          .toLowerCase()
          .replace(/https?:\/\/\S+/g, '') // strip raw links
          .replace(/[^a-z0-9\s]/g, ' ') // remove punctuation
          .replace(/\s+/g, ' ') // collapse whitespace
          .trim();
        const map = new Map<string, RedditItem & { _sources?: any[]; _crosspostCount?: number }>();
        for (const it of items) {
          const key = norm(it.title || '');
          if (!key) continue;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, { ...it, _sources: [{ subreddit: (it as any).subreddit || it.source, score: it.score, comments: it.num_comments }], _crosspostCount: 1 });
          } else {
            existing._sources!.push({ subreddit: (it as any).subreddit || it.source, score: it.score, comments: it.num_comments });
            existing._crosspostCount = (existing._crosspostCount || 1) + 1;
            // Aggregate metrics (simple max / sum heuristics)
            if (typeof it.score === 'number') existing.score = Math.max(existing.score || 0, it.score);
            if (typeof it.num_comments === 'number') existing.num_comments = Math.max(existing.num_comments || 0, it.num_comments);
          }
        }
        return Array.from(map.values());
      };

      // Groq-based relevance filtering
      const filterByGroqRelevance = async (posts: RedditItem[], idea: string): Promise<RedditItem[]> => {
        if (!posts.length) return posts;
        
        try {
          console.log('[Reddit] Filtering', posts.length, 'posts with Groq for relevance to:', idea.slice(0, 50));
          
          // Batch posts for Groq analysis (max 10 at a time to avoid token limits)
          const batchSize = 10;
          const filteredPosts: RedditItem[] = [];
          
          for (let i = 0; i < posts.length; i += batchSize) {
            const batch = posts.slice(i, i + batchSize);
            
            const response = await optimizedQueue.invokeFunction('groq-data-extraction', {
              tileType: 'reddit_relevance_filter',
              idea: idea,
              groqQuery: `
Analyze each Reddit post below and determine if it's HIGHLY RELEVANT to the business idea: "${idea}"

For each post, respond with ONLY a JSON array containing relevance scores:
[{"index": 0, "relevant": true, "confidence": 0.85, "reason": "specific reason"}, ...]

Rules:
- relevant: true only if the post discusses problems, solutions, or experiences directly related to the idea
- confidence: 0.0-1.0 (how sure you are)
- Only include posts with confidence > 0.7
- Focus on genuine user problems, feedback, or discussions about similar solutions

Posts to analyze:
${batch.map((post, idx) => `${idx}. Title: "${post.title}"
   Content: "${(post.snippet || '').slice(0, 200)}..."
   Source: ${post.source}`).join('\n\n')}
              `,
              rawData: batch.map((post, idx) => ({
                index: idx,
                title: post.title,
                snippet: post.snippet || '',
                source: post.source,
                score: post.score,
                url: post.url
              }))
            });
            
            if (response?.extractedData) {
              try {
                const relevanceResults = Array.isArray(response.extractedData) 
                  ? response.extractedData 
                  : JSON.parse(response.extractedData);
                
                relevanceResults.forEach((result: any) => {
                  if (result.relevant && result.confidence > 0.7 && result.index < batch.length) {
                    const originalPost = batch[result.index];
                    filteredPosts.push({
                      ...originalPost,
                      _groqRelevance: result.confidence,
                      _groqReason: result.reason
                    } as any);
                  }
                });
              } catch (parseError) {
                console.warn('[Reddit] Groq parse error for batch, including all:', parseError);
                filteredPosts.push(...batch); // Include all if parsing fails
              }
            } else {
              console.warn('[Reddit] No Groq response for batch, including all');
              filteredPosts.push(...batch); // Include all if Groq fails
            }
            
            // Rate limiting between batches
            if (i + batchSize < posts.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          console.log('[Reddit] Groq filtered:', filteredPosts.length, 'relevant posts from', posts.length, 'total');
          return filteredPosts;
          
        } catch (error) {
          console.error('[Reddit] Groq filtering error, returning all posts:', error);
          return posts; // Fallback to showing all posts if Groq fails
        }
      };

      if (response?.reddit_sentiment) {
        const raw = response.reddit_sentiment as RedditSentimentData;
        const originalCounts = {
          clusters: raw.clusters?.length || 0,
          items: raw.items?.length || 0,
          themes: raw.themes?.length || 0,
          pain: raw.pain_points?.length || 0,
          subreddits: raw.top_subreddits?.length || 0
        };
        // De-dupe items BEFORE trimming so we keep max variety
        const dedupedItems = dedupePosts(raw.items);
        const afterCross = collapseCrossPosts(dedupedItems);
        
        // GROQ FILTERING: Only show relevant posts
        const groqFiltered = await filterByGroqRelevance(afterCross, lockedIdea);
        
        const duplicatesRemoved = (raw.items?.length || 0) - dedupedItems.length;
        const crossCollapsed = dedupedItems.length - afterCross.length;
        const groqFiltered_count = afterCross.length - groqFiltered.length;
        
        // Create trimmed shallow copy
        const trimmed: RedditSentimentData = {
          ...raw,
          clusters: (raw.clusters || []).slice(0, 8),
          items: groqFiltered.slice(0, MAX_POSTS_STORE),
          themes: (raw.themes || []).slice(0, 20),
            pain_points: (raw.pain_points || []).slice(0, 20),
          top_subreddits: (raw.top_subreddits || []).slice(0, 10)
        };
        // Build truncation summary
        const notes: string[] = [];
        if (originalCounts.clusters > trimmed.clusters.length) notes.push(`clusters ${trimmed.clusters.length}/${originalCounts.clusters}`);
        if (originalCounts.items > (trimmed.items?.length || 0)) notes.push(`posts ${(trimmed.items?.length || 0)}/${originalCounts.items}`);
        if (duplicatesRemoved > 0) notes.push(`dedup -${duplicatesRemoved}`);
        if (crossCollapsed > 0) notes.push(`cross -${crossCollapsed}`);
        if (groqFiltered_count > 0) notes.push(`groq -${groqFiltered_count}`);
        if (originalCounts.themes > (trimmed.themes?.length || 0)) notes.push(`themes ${(trimmed.themes?.length || 0)}/${originalCounts.themes}`);
        if (originalCounts.pain > (trimmed.pain_points?.length || 0)) notes.push(`pain ${(trimmed.pain_points?.length || 0)}/${originalCounts.pain}`);
        if (originalCounts.subreddits > (trimmed.top_subreddits?.length || 0)) notes.push(`subs ${(trimmed.top_subreddits?.length || 0)}/${originalCounts.subreddits}`);
        if (originalCounts.subreddits > (trimmed.top_subreddits?.length || 0)) notes.push(`subs ${(trimmed.top_subreddits?.length || 0)}/${originalCounts.subreddits}`);
        if (notes.length) setTruncatedInfo(notes.join(', '));
        console.log('[Reddit] trimmed payload', notes);
        setData(trimmed);
        if (trimmed.clusters?.length > 0) setSelectedCluster(trimmed.clusters[0]);
      } else if (response?.data) {
        // Try alternate response structure
        const alt = response.data as RedditSentimentData;
        const deduped = dedupePosts(alt.items);
        const afterCross = collapseCrossPosts(deduped);
        if (deduped.length !== (alt.items?.length || 0)) {
          console.log('[Reddit] de-duplicated alt items', { before: alt.items?.length, after: deduped.length });
        }
        if (afterCross.length !== deduped.length) {
          console.log('[Reddit] cross-post collapsed alt items', { before: deduped.length, after: afterCross.length });
        }
        alt.items = afterCross.slice(0, MAX_POSTS_STORE);
        setData(alt);
      } else if (response) {
        // Try direct response
        const direct = response as RedditSentimentData;
        const deduped = dedupePosts(direct.items);
        const afterCross = collapseCrossPosts(deduped);
        if (deduped.length !== (direct.items?.length || 0)) {
          console.log('[Reddit] de-duplicated direct items', { before: direct.items?.length, after: deduped.length });
        }
        if (afterCross.length !== deduped.length) {
          console.log('[Reddit] cross-post collapsed direct items', { before: deduped.length, after: afterCross.length });
        }
        direct.items = afterCross.slice(0, MAX_POSTS_STORE);
        setData(direct);
      } else {
        // No valid response data
        console.error('[Reddit] Backend returned no usable data:', response);
        setError('Backend returned no Reddit data. The reddit-research function may be unavailable or returning empty results.');
        setData(null);
      }
    } catch (err) {
      console.error('Error fetching Reddit sentiment:', err);
      setError(`Failed to fetch Reddit sentiment data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isRefreshing) {
      setIsRefreshing(true);
      await fetchRedditSentiment();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const generateSyntheticData = (idea: string): RedditSentimentData => {
    const clusters: RedditCluster[] = [
      {
        cluster_id: 'adoption_success',
        title: 'Adoption Stories & Early Wins',
        sentiment: { positive: 72, neutral: 18, negative: 10 },
        metrics: {
          engagement: { avg_upvotes: 54, avg_comments: 12 },
          recency_days_median: 24,
          subreddit_distribution: {
            'r/startups': 40,
            'r/Entrepreneur': 30,
            'r/SaaS': 20,
            'r/technology': 10
          }
        },
        insight: `Founders share success stories implementing ${idea.slice(0, 30)}... with ROI within 3 months. Integration challenges mentioned but overall positive.`,
        quotes: [
          { text: "We rolled this out and cut costs by 25% in Q1. Game changer!", sentiment: 'positive', subreddit: 'r/startups', upvotes: 87 },
          { text: "Integration wasn't trivial, but the results speak for themselves.", sentiment: 'neutral', subreddit: 'r/SaaS', upvotes: 43 }
        ],
        citations: [
          { source: 'reddit.com/r/startups/adoption_thread', url: '#' },
          { source: 'reddit.com/r/Entrepreneur/success_story', url: '#' }
        ]
      },
      {
        cluster_id: 'cost_concerns',
        title: 'Cost & ROI Debates',
        sentiment: { positive: 35, neutral: 40, negative: 25 },
        metrics: {
          engagement: { avg_upvotes: 32, avg_comments: 18 },
          recency_days_median: 15,
          subreddit_distribution: {
            'r/smallbusiness': 45,
            'r/Entrepreneur': 35,
            'r/startups': 20
          }
        },
        insight: 'Mixed discussions on pricing models and ROI timelines. Small businesses express budget concerns while acknowledging potential value.',
        quotes: [
          { text: "The pricing seems steep for early-stage startups. Need more transparent tiers.", sentiment: 'negative', subreddit: 'r/smallbusiness', upvotes: 62 },
          { text: "If you calculate the time savings, it pays for itself in 2 months.", sentiment: 'positive', subreddit: 'r/Entrepreneur', upvotes: 51 }
        ],
        citations: [
          { source: 'reddit.com/r/smallbusiness/pricing_discussion', url: '#' },
          { source: 'reddit.com/r/startups/roi_analysis', url: '#' }
        ]
      },
      {
        cluster_id: 'feature_requests',
        title: 'Feature Wishlists & Gaps',
        sentiment: { positive: 55, neutral: 35, negative: 10 },
        metrics: {
          engagement: { avg_upvotes: 41, avg_comments: 22 },
          recency_days_median: 18,
          subreddit_distribution: {
            'r/ProductManagement': 30,
            'r/SaaS': 35,
            'r/webdev': 35
          }
        },
        insight: 'Active community requesting API integrations, mobile apps, and advanced analytics. High engagement indicates strong product-market interest.',
        quotes: [
          { text: "Would love to see Zapier integration and better mobile support.", sentiment: 'neutral', subreddit: 'r/ProductManagement', upvotes: 78 },
          { text: "The core features are solid, just needs more third-party connectors.", sentiment: 'positive', subreddit: 'r/SaaS', upvotes: 56 }
        ],
        citations: [
          { source: 'reddit.com/r/ProductManagement/feature_thread', url: '#' },
          { source: 'reddit.com/r/SaaS/wishlist_mega', url: '#' }
        ]
      }
    ];

    const overallSentiment = {
      positive: 58,
      neutral: 27,
      negative: 15,
      total_posts: 342,
      total_comments: 1847
    };

    return {
      summary: `Reddit shows moderate-positive momentum around ${idea.slice(0, 50)}... with 58% positive sentiment led by adoption stories in r/startups and r/Entrepreneur. Main concerns center on pricing and feature gaps.`,
      clusters,
      overall_sentiment: overallSentiment,
      top_subreddits: [
        { name: 'r/startups', posts: 89, sentiment_score: 0.68 },
        { name: 'r/Entrepreneur', posts: 76, sentiment_score: 0.62 },
        { name: 'r/SaaS', posts: 54, sentiment_score: 0.55 },
        { name: 'r/smallbusiness', posts: 43, sentiment_score: 0.45 }
      ],
      sentiment_trend: generateTrendData(),
      charts: generateCharts(clusters, overallSentiment),
      visuals_ready: true,
      confidence: 'High'
    };
  };

  const generateTrendData = () => {
    const dates = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      if (i % 7 === 0) {
        dates.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          positive: 45 + Math.random() * 20,
          negative: 10 + Math.random() * 10
        });
      }
    }
    return dates;
  };

  const generateCharts = (clusters: RedditCluster[], overall: any) => {
    return [
      {
        type: 'donut',
        title: 'Overall Sentiment',
        series: [
          { name: 'Positive', value: overall.positive, color: SENTIMENT_COLORS.positive },
          { name: 'Neutral', value: overall.neutral, color: SENTIMENT_COLORS.neutral },
          { name: 'Negative', value: overall.negative, color: SENTIMENT_COLORS.negative }
        ]
      },
      {
        type: 'bar',
        title: 'Sentiment by Cluster',
        series: clusters.map(c => ({
          name: c.title,
          positive: c.sentiment.positive,
          neutral: c.sentiment.neutral,
          negative: c.sentiment.negative
        }))
      }
    ];
  };

  const renderSentimentBadge = (sentiment: { positive: number; neutral: number; negative: number }) => {
    const dominant = sentiment.positive > 50 ? 'positive' : 
                    sentiment.negative > 30 ? 'negative' : 'neutral';
    
    return (
      <Badge variant={dominant === 'positive' ? 'default' : dominant === 'negative' ? 'destructive' : 'secondary'}>
        {sentiment.positive}% positive
      </Badge>
    );
  };

  const renderQuoteCard = (quote: any, index: number) => (
    <Card key={index} className={cn(
      "p-4 border-l-4",
      quote.sentiment === 'positive' && "border-l-green-500",
      quote.sentiment === 'neutral' && "border-l-yellow-500",
      quote.sentiment === 'negative' && "border-l-red-500"
    )}>
      <div className="flex items-start gap-3">
        <Quote className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm italic">"{quote.text}"</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {quote.subreddit && <span>{quote.subreddit}</span>}
            {quote.upvotes && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {quote.upvotes}
              </span>
            )}
            <Badge variant="outline" className="text-xs">
              {quote.sentiment}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <Card className={cn("h-full relative border-0 bg-gradient-to-br from-orange-50/50 via-white/80 to-red-50/30 dark:from-orange-950/20 dark:via-background/90 dark:to-red-950/10 backdrop-blur-sm shadow-xl", className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg animate-pulse">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-bold">
                Reddit Sentiment
              </span>
              <div className="h-0.5 w-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mt-1 animate-pulse" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gradient-to-r from-orange-100/50 to-red-100/50 animate-pulse rounded-xl border border-orange-200/30" />
            ))}
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-orange-600">
                <Activity className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Analyzing Reddit discussions...</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className={cn("h-full relative border-0 bg-gradient-to-br from-red-50/50 via-white/80 to-orange-50/30 dark:from-red-950/20 dark:via-background/90 dark:to-orange-950/10 backdrop-blur-sm shadow-xl", className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent font-bold">
                Reddit Sentiment
              </span>
              <div className="h-0.5 w-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mt-1" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200/50">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Reddit Analysis Unavailable</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
              <details className="mt-2">
                <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">Technical Details</summary>
                <p className="text-[10px] text-red-500 mt-1 font-mono bg-red-50 dark:bg-red-900/10 p-2 rounded border">
                  Check browser console for backend response details. 
                  Likely causes: reddit-research function not deployed, rate limits, or API issues.
                </p>
              </details>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="flex-shrink-0 border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const summaryText = typeof (data as any).summary === 'string'
    ? (data as any).summary
    : (() => {
        const s: any = (data as any).summary || {};
        const bits: string[] = [];
        if (typeof s.total_posts_analyzed === 'number') bits.push(`${s.total_posts_analyzed} posts analyzed`);
        if (Array.isArray(s.top_subreddits)) bits.push(`${s.top_subreddits.length} top subreddits`);
        if (s.time_window) bits.push(`window: ${s.time_window}`);
        return bits.length ? bits.join(' • ') : 'Reddit research summary';
      })();

  return (
    <Card className={cn("h-full overflow-hidden animate-fade-in relative border-0 bg-gradient-to-br from-orange-50/50 via-white/80 to-red-50/30 dark:from-orange-950/20 dark:via-background/90 dark:to-red-950/10 backdrop-blur-sm shadow-xl", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 pointer-events-none" />
      <CardHeader className="pb-3 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-bold">
                Reddit Sentiment Analysis
              </span>
              <div className="h-0.5 w-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mt-1" />
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIChat(true)}
              className="gap-1 px-3 py-1.5 h-auto whitespace-nowrap text-xs bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200/50 transition-all duration-200"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span className="hidden sm:inline text-purple-700 font-medium">AI Analysis</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="hover:bg-orange-50 transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 text-orange-600 ${(isRefreshing || loading) ? 'animate-spin' : ''}`} />
            </Button>
            {/* DEBUGGING: Test button */}
            {new URLSearchParams(window.location.search).get('debug') === '1' && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log('[Reddit] MANUAL TEST: Calling reddit-research directly');
                  try {
                    const testResponse = await optimizedQueue.invokeFunction('reddit-research', {
                      idea_text: 'AI chatbot for customer service',
                      time_window: 'month'
                    });
                    console.log('[Reddit] MANUAL TEST RESULT:', testResponse);
                    alert('Check console for test result');
                  } catch (err) {
                    console.error('[Reddit] MANUAL TEST ERROR:', err);
                    alert('Test failed - check console');
                  }
                }}
                className="text-xs bg-yellow-50 border-yellow-300"
              >
                🧪 Test API
              </Button>
            )}
            <Badge 
              variant={data.confidence === 'High' ? 'default' : 'secondary'}
              className={cn(
                "shadow-sm border-0 font-medium",
                data.confidence === 'High' 
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" 
                  : "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
              )}
            >
              {data.confidence} Confidence
            </Badge>
          </div>
        </div>
        {truncatedInfo && (
          <div className="px-4 pb-2">
            <div className="text-[10px] text-orange-600/70 bg-orange-50/50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-200/30">
              ℹ️ Dataset optimized: {truncatedInfo}
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-2 px-4">{summaryText}</p>
      </CardHeader>

      <CardContent className="p-0 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pb-2">
            <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-orange-100/50 to-red-100/50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200/30 rounded-xl p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200">Overview</TabsTrigger>
              <TabsTrigger value="posts" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200">Posts</TabsTrigger>
              <TabsTrigger value="themes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200">Themes</TabsTrigger>
              <TabsTrigger value="clusters" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200">Clusters</TabsTrigger>
              <TabsTrigger value="quotes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200">Quotes</TabsTrigger>
              <TabsTrigger value="trends" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200">Trends</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[400px]">
            <TabsContent value="overview" className="px-4 space-y-4">
              {/* Overall sentiment donut */}
              {data.overall_sentiment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-gradient-to-br from-white/80 to-purple-50/30 dark:from-background/80 dark:to-purple-950/20 border-0 shadow-lg backdrop-blur-sm">
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                      Overall Sentiment Distribution
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Positive', value: data.overall_sentiment.positive },
                            { name: 'Neutral', value: data.overall_sentiment.neutral },
                            { name: 'Negative', value: data.overall_sentiment.negative }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill={SENTIMENT_COLORS.positive} />
                          <Cell fill={SENTIMENT_COLORS.neutral} />
                          <Cell fill={SENTIMENT_COLORS.negative} />
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-around text-xs mt-2">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: SENTIMENT_COLORS.positive }} />
                        Positive {data.overall_sentiment.positive}%
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: SENTIMENT_COLORS.neutral }} />
                        Neutral {data.overall_sentiment.neutral}%
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: SENTIMENT_COLORS.negative }} />
                        Negative {data.overall_sentiment.negative}%
                      </span>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-br from-white/80 to-blue-50/30 dark:from-background/80 dark:to-blue-950/20 border-0 shadow-lg backdrop-blur-sm">
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                      Engagement Analytics
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5" />
                          Total Posts
                        </span>
                        <span className="font-bold text-blue-800 dark:text-blue-200">{data.overall_sentiment.total_posts.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                        <span className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Total Comments
                        </span>
                        <span className="font-bold text-green-800 dark:text-green-200">{data.overall_sentiment.total_comments.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl">
                        <span className="text-sm text-orange-700 dark:text-orange-300 font-medium flex items-center gap-2">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Avg Engagement
                        </span>
                        <span className="font-bold text-orange-800 dark:text-orange-200">
                          {Math.round(data.overall_sentiment.total_comments / data.overall_sentiment.total_posts)} per post
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Top subreddits */}
              {data.top_subreddits && (
                <Card className="p-6 bg-gradient-to-br from-white/80 to-orange-50/30 dark:from-background/80 dark:to-orange-950/20 border-0 shadow-lg backdrop-blur-sm">
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                    Top Community Engagement
                  </h4>
                  <div className="space-y-3">
                    {data.top_subreddits.map((sub, idx) => (
                      <div key={idx} className="group hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-red-50/50 dark:hover:from-orange-900/10 dark:hover:to-red-900/10 p-3 rounded-xl transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg shadow-sm">
                              <Hash className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-sm font-semibold group-hover:text-orange-700 transition-colors">{sub.name}</span>
                          </div>
                          <Badge variant="outline" className="bg-orange-50/50 border-orange-200 text-orange-700 font-medium">
                            {sub.posts} posts
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress 
                            value={sub.sentiment_score * 100} 
                            className="flex-1 h-2.5 bg-gradient-to-r from-gray-100 to-gray-200"
                          />
                          <span className="text-xs font-medium text-orange-600 min-w-[3rem] text-right">
                            {Math.round(sub.sentiment_score * 100)}% ❤️
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="posts" className="px-4 space-y-3">
              {data.items && data.items.length > 0 ? (
                data.items.slice(0, postPage * POST_PAGE_SIZE).map((item, idx) => (
                  <Card key={(item as any).url || (item as any).title || idx} className="p-4 group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-r from-white/80 to-orange-50/30 dark:from-background/80 dark:to-orange-950/20 backdrop-blur-sm hover:scale-[1.02] hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-red-50/30">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm leading-relaxed group-hover:text-orange-700 transition-colors duration-200">{item.title}</h4>
                          {(item as any)._crosspostCount > 1 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge variant="secondary" className="text-[10px] bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-sm">
                                <Users className="h-2.5 w-2.5 mr-1" />
                                {(item as any)._crosspostCount}× communities
                              </Badge>
                              {(item as any)._sources?.slice(0, 3).map((src: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px] bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors">
                                  <Hash className="h-2 w-2 mr-0.5" />
                                  {src.subreddit || 'reddit'}
                                </Badge>
                              ))}
                              {(item as any)._sources?.length > 3 && (
                                <Badge variant="outline" className="text-[10px] bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300 text-gray-600">
                                  +{(item as any)._sources.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {item.score !== undefined && (
                          <Badge variant="outline" className="flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 shadow-sm">
                            <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                            {item.score.toLocaleString()}
                          </Badge>
                        )}
                        {/* Groq Relevance Score */}
                        {(item as any)._groqRelevance && (
                          <Badge variant="default" className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm">
                            <Brain className="h-3 w-3 mr-1" />
                            {Math.round((item as any)._groqRelevance * 100)}% relevant
                          </Badge>
                        )}
                      </div>
                      {item.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.snippet}</p>
                      )}
                      {/* Groq Relevance Reasoning */}
                      {(item as any)._groqReason && (
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-2 rounded-lg border border-purple-200/50">
                          <div className="flex items-start gap-2">
                            <Brain className="h-3.5 w-3.5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-[10px] text-purple-600 font-medium">AI Relevance Analysis:</span>
                              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">{(item as any)._groqReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs">
                          {item.source && (
                            <Badge variant="outline" className="text-[10px] bg-orange-50/50 border-orange-200/50 text-orange-600">
                              <Hash className="h-2.5 w-2.5 mr-1" />
                              {item.source}
                            </Badge>
                          )}
                          {item.num_comments !== undefined && (
                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                              <MessageSquare className="h-3 w-3" />
                              <span className="font-medium">{item.num_comments}</span>
                            </span>
                          )}
                          {item.published && (
                            <span className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                              <Calendar className="h-3 w-3" />
                              <span className="font-medium">{item.published}</span>
                            </span>
                          )}
                        </div>
                        {item.url && (
                          <Button variant="ghost" size="sm" className="h-7 px-3 text-xs bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border border-orange-200/50 text-orange-700 hover:text-orange-800 transition-all duration-200 shadow-sm" asChild>
                            <a href={item.url.startsWith('http') ? item.url : `https://reddit.com${item.url}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1.5" />
                              <span className="font-medium">View Post</span>
                            </a>
                          </Button>
                        )}
                      </div>
                      {!item.url && (item as any).permalink && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs p-0" asChild>
                          <a href={`https://reddit.com${(item as any).permalink}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View on Reddit
                          </a>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-2xl w-16 h-16 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-purple-500 opacity-60" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">No Relevant Reddit Discussions Found</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                    Our AI analyzed Reddit posts but couldn't find discussions highly relevant to your specific idea. 
                    Try refreshing or consider broadening your idea description.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefresh}
                      className="bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-purple-200/50 text-purple-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Try Again
                    </Button>
                    {/* Debug info */}
                    {new URLSearchParams(window.location.search).get('debug') === '1' && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300">
                        🧪 AI Filter Active
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {data.items && data.items.length > postPage * POST_PAGE_SIZE && (
                <div className="flex justify-center pt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setPostPage(p => p + 1)} 
                    className="bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border-orange-200/50 text-orange-700 hover:text-orange-800 transition-all duration-200 shadow-sm font-medium"
                  >
                    <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
                    Load more ({data.items.length - postPage * POST_PAGE_SIZE} remaining)
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="themes" className="px-4 space-y-4">
              {data.themes && data.themes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Emerging Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.themes.map((theme, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        <Hash className="h-3 w-3 mr-1" />
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {data.pain_points && data.pain_points.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Pain Points Mentioned
                  </h4>
                  <div className="space-y-2">
                    {data.pain_points.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                        <span className="text-sm">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.metrics && data.metrics.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
                  <div className="space-y-3">
                    {data.metrics.map((metric, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{metric.name}</span>
                          <span className="text-muted-foreground">
                            {metric.value}{metric.unit || ''}
                          </span>
                        </div>
                        {metric.confidence !== undefined && (
                          <Progress value={metric.confidence * 100} className="h-1" />
                        )}
                        {metric.explanation && (
                          <p className="text-xs text-muted-foreground">{metric.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!data.themes?.length && !data.pain_points?.length && !data.metrics?.length) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No themes data available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="clusters" className="px-4 space-y-4">
              {(data.clusters || []).map((cluster, idx) => (
                <Card 
                  key={idx} 
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    selectedCluster?.cluster_id === cluster.cluster_id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedCluster(cluster)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{cluster.title}</h4>
                      {renderSentimentBadge(cluster.sentiment)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{cluster.insight}</p>
                    
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Avg Upvotes</span>
                        <p className="font-medium flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {cluster.metrics.engagement.avg_upvotes}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Comments</span>
                        <p className="font-medium flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {cluster.metrics.engagement.avg_comments}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recency</span>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {cluster.metrics.recency_days_median}d
                        </p>
                      </div>
                    </div>

                    {/* Subreddit distribution */}
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(cluster.metrics.subreddit_distribution || {}).map(([sub, pct]) => (
                        <Badge key={sub} variant="outline" className="text-xs">
                          {sub}: {pct}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="quotes" className="px-4 space-y-3">
              {(data.clusters || []).flatMap(cluster => 
                (cluster.quotes || []).map((quote, idx) => renderQuoteCard(quote, idx))
              )}
            </TabsContent>

            <TabsContent value="trends" className="px-4 space-y-4">
              {data.sentiment_trend && (
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Sentiment Over Time</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.sentiment_trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="positive" 
                        stroke={SENTIMENT_COLORS.positive} 
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="negative" 
                        stroke={SENTIMENT_COLORS.negative} 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Cluster sentiment comparison */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-3">Sentiment by Theme</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.clusters}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="sentiment.positive" stackId="a" fill={SENTIMENT_COLORS.positive} />
                    <Bar dataKey="sentiment.neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} />
                    <Bar dataKey="sentiment.negative" stackId="a" fill={SENTIMENT_COLORS.negative} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
      
      {truncatedInfo && (
        <div className="px-4 pb-2 text-[10px] text-muted-foreground italic">Dataset trimmed: {truncatedInfo}</div>
      )}
      <TileAIChat
        open={showAIChat}
        onOpenChange={setShowAIChat}
        tileData={data as any}
        tileTitle="Reddit Sentiment"
        idea={lockedIdea}
      />
    </Card>
  );
}