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
  Twitter,
  RefreshCw,
  MessageCircle,
  ThumbsUp,
  BarChart3,
  ExternalLink,
  AlertCircle,
  Link2
} from 'lucide-react';

interface TwitterPost {
  id: string;
  text: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  engagementScore: number;
  url: string;
  username: string;
  relevanceScore: number;
}

interface TwitterData {
  posts: TwitterPost[];
  summary: {
    totalPosts: number;
    averageSentiment: number;
    topTopics: string[];
    engagement: {
      total: number;
      average: number;
    };
  };
}

interface TwitterSentimentTileProps {
  idea?: string;
  className?: string;
}

export function TwitterSentimentTile({ className = '' }: TwitterSentimentTileProps) {
  const { lockedIdea, hasLockedIdea } = useLockedIdea();
  const [data, setData] = useState<TwitterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  const fetchTwitterData = useCallback(async (force: boolean = false) => {
    if (!hasLockedIdea || !lockedIdea) {
      console.warn('[TwitterSentimentTile] Fetch attempt without a locked idea');
      return;
    }

    if (loading && !force) {
      console.log('[TwitterSentimentTile] Fetch already in progress');
      return;
    }

    console.log('[TwitterSentimentTile] Starting Twitter analysis fetch:', {
      ideaPreview: lockedIdea.slice(0, 50),
      force,
      currentLoading: loading,
      hasExistingData: !!data
    });

    setLoading(true);
    setFetchAttempted(true);
    setError(null);

    try {
      const { data: response, error: functionError } = await supabase.functions.invoke('twitter-search', {
        body: { idea: lockedIdea, query: lockedIdea }
      });

      if (functionError) throw new Error(functionError.message);

      // Transform the response to match our interface
      const twitterBuzz = response?.twitter_buzz;
      const transformedData: TwitterData = {
        posts: (twitterBuzz?.raw_tweets || []).map((tweet: any) => ({
          id: tweet.id || '',
          text: tweet.text || '',
          timestamp: tweet.created_at || '',
          likes: tweet.metrics?.like_count || 0,
          retweets: tweet.metrics?.retweet_count || 0,
          replies: tweet.metrics?.reply_count || 0,
          sentiment: (twitterBuzz?.metrics?.overall_sentiment?.positive || 0) > 50 ? 'positive' : 
                    (twitterBuzz?.metrics?.overall_sentiment?.negative || 0) > 30 ? 'negative' : 'neutral',
          engagementScore: (tweet.metrics?.like_count || 0) + (tweet.metrics?.retweet_count || 0) * 2,
          url: tweet.url || '',
          username: tweet.author_username || 'unknown',
          relevanceScore: 0.75
        })),
        summary: {
          totalPosts: twitterBuzz?.metrics?.total_tweets || 0,
          averageSentiment: (twitterBuzz?.metrics?.overall_sentiment?.positive || 0) / 100,
          topTopics: twitterBuzz?.metrics?.top_hashtags || [],
          engagement: {
            total: (twitterBuzz?.raw_tweets || []).reduce((sum: number, t: any) => 
              sum + (t.metrics?.like_count || 0) + (t.metrics?.retweet_count || 0), 0),
            average: twitterBuzz?.metrics?.total_tweets ? 
              ((twitterBuzz?.raw_tweets || []).reduce((sum: number, t: any) => 
                sum + (t.metrics?.like_count || 0), 0) / twitterBuzz.metrics.total_tweets) : 0
          }
        }
      };

      setData(transformedData);
      console.log('[TwitterSentimentTile] Data fetched successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Twitter data';
      console.error('[TwitterSentimentTile] Error:', message);
      setError(message);
      toast.error('Failed to fetch Twitter analysis');
    } finally {
      setLoading(false);
    }
  }, [lockedIdea, hasLockedIdea, loading, data]);

  useEffect(() => {
    if (hasLockedIdea && lockedIdea && !data && !fetchAttempted) {
      console.log('[TwitterSentimentTile] Triggering initial data fetch');
      fetchTwitterData();
    }
  }, [lockedIdea, hasLockedIdea, data, fetchAttempted, fetchTwitterData]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'negative': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default: return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    }
  };

  if (!hasLockedIdea) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-muted-foreground" />
            Twitter Analysis
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
              <Twitter className="h-5 w-5 text-[#1DA1F2]" />
              <CardTitle>Twitter Analysis</CardTitle>
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
            <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            Twitter Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchTwitterData(true)} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Twitter className="h-5 w-5 text-[#1DA1F2]" />
              Twitter Analysis
              {loading && (
                <div className="flex items-center gap-1 ml-2">
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Updating...</span>
                </div>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="font-normal">
                {data.summary.totalPosts} posts analyzed
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {Math.round(data.summary.averageSentiment * 100)}% positive
              </Badge>
            </div>
          </div>
          <Button onClick={() => fetchTwitterData(true)} size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top Topics */}
        {data.summary.topTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.summary.topTopics.map((topic, i) => (
              <Badge key={i} variant="outline">#{topic}</Badge>
            ))}
          </div>
        )}

        {/* Posts List */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {data.posts
              .sort((a, b) => b.engagementScore - a.engagementScore)
              .map((post, idx) => (
                <div
                  key={post.id}
                  className="p-4 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">@{post.username}</span>
                        <Badge variant="outline" className={getSentimentColor(post.sentiment)}>
                          {post.sentiment}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{post.text}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" /> {post.retweets}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {post.replies}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {Math.round(post.relevanceScore * 100)}% relevant
                        </span>
                      </div>
                    </div>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}