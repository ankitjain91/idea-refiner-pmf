import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLockedIdea } from '@/lib/lockedIdeaManager';
import { supabase } from '@/integrations/supabase/client';
import { openDB } from 'idb';
import {
  Twitter,
  AlertCircle,
  TrendingUp,
  MessageCircle,
  Hash,
  Users,
  ExternalLink,
  Clock,
  BarChart3,
  ThumbsUp,
  Repeat2
} from 'lucide-react';

// IndexedDB cache settings
const CACHE_DB_NAME = 'twitter_cache_db';
const CACHE_STORE_NAME = 'twitter_data';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function getTwitterCache(ideaHash: string) {
  try {
    const db = await openDB(CACHE_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          db.createObjectStore(CACHE_STORE_NAME);
        }
      },
    });
    const cached = await db.get(CACHE_STORE_NAME, ideaHash);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  } catch (error) {
    console.error('[TwitterCache] Error reading cache:', error);
    return null;
  }
}

async function setTwitterCache(ideaHash: string, data: any) {
  try {
    const db = await openDB(CACHE_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
          db.createObjectStore(CACHE_STORE_NAME);
        }
      },
    });
    await db.put(CACHE_STORE_NAME, { data, timestamp: Date.now() }, ideaHash);
  } catch (error) {
    console.error('[TwitterCache] Error writing cache:', error);
  }
}

function hashIdea(idea: string): string {
  let hash = 0;
  for (let i = 0; i < idea.length; i++) {
    const char = idea.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function isValidTwitterBuzzData(obj: any): obj is TwitterBuzzData {
  try {
    return !!(
      obj && typeof obj === 'object' &&
      obj.metrics && typeof obj.metrics.total_tweets === 'number' &&
      obj.metrics.overall_sentiment &&
      typeof obj.metrics.overall_sentiment.positive === 'number'
    );
  } catch {
    return false;
  }
}

interface TwitterBuzzData {
  summary: string;
  metrics: {
    total_tweets: number;
    buzz_trend: string;
    overall_sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
    top_hashtags: string[];
    influencers: Array<{
      handle: string;
      followers: number;
      sentiment: string;
    }>;
  };
  clusters: Array<{
    cluster_id: string;
    title: string;
    insight: string;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
    engagement: {
      avg_likes: number;
      avg_retweets: number;
    };
    hashtags: string[];
    quotes: Array<{
      text: string;
      sentiment: string;
      url: string;
      metrics?: any;
    }>;
    citations: Array<{
      source: string;
      url: string;
    }>;
  }>;
  raw_tweets: Array<{
    id: string;
    text: string;
    created_at: string;
    metrics: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
    };
    url: string;
  }>;
  confidence: string;
  cached?: boolean;
  cached_at?: string;
  cached_until?: string;
}

function normalizeTwitterBuzzData(obj: any): TwitterBuzzData {
  const metrics = obj?.metrics || {};
  const overall = metrics?.overall_sentiment || {};

  const normalizeTweet = (t: any, idx: number) => {
    const rawText = typeof t?.text === 'string'
      ? t.text
      : (typeof t?.text?.text === 'string'
          ? t.text.text
          : (typeof t?.text?.content === 'string'
              ? t.text.content
              : (typeof t === 'string' ? t : '')));

    return {
      id: String(t?.id ?? `tmp_${idx}`),
      text: rawText,
      created_at: t?.created_at ?? new Date().toISOString(),
      metrics: {
        like_count: Number(t?.metrics?.like_count ?? t?.likes ?? 0),
        retweet_count: Number(t?.metrics?.retweet_count ?? t?.retweets ?? 0),
        reply_count: Number(t?.metrics?.reply_count ?? t?.replies ?? 0),
      },
      url: t?.url ?? '#',
    };
  };

  return {
    summary: obj?.summary ?? '',
    metrics: {
      total_tweets: Number(metrics?.total_tweets ?? 0),
      buzz_trend: metrics?.buzz_trend ?? '—',
      overall_sentiment: {
        positive: Number(overall?.positive ?? 0),
        neutral: Number(overall?.neutral ?? 0),
        negative: Number(overall?.negative ?? 0),
      },
      top_hashtags: Array.isArray(metrics?.top_hashtags) ? metrics.top_hashtags : [],
      influencers: Array.isArray(metrics?.influencers) ? metrics.influencers : [],
    },
    clusters: Array.isArray(obj?.clusters) ? obj.clusters : [],
    raw_tweets: Array.isArray(obj?.raw_tweets) ? obj.raw_tweets.map((t: any, i: number) => normalizeTweet(t, i)) : [],
    confidence: obj?.confidence ?? 'Low',
    cached: obj?.cached,
    cached_at: obj?.cached_at,
    cached_until: obj?.cached_until,
  };
}

interface TwitterSentimentTileProps {
  className?: string;
}

export function TwitterSentimentTile({ className = '' }: TwitterSentimentTileProps) {
  const { lockedIdea, hasLockedIdea } = useLockedIdea();
  const [data, setData] = useState<TwitterBuzzData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchTwitterData = useCallback(async (force: boolean = false) => {
    if (!hasLockedIdea || !lockedIdea) {
      console.warn('[TwitterSentimentTile] Fetch attempt without a locked idea');
      return;
    }

    if (loading && !force) {
      console.log('[TwitterSentimentTile] Fetch already in progress');
      return;
    }

    const ideaHash = hashIdea(lockedIdea);

    // Check IndexedDB cache first (unless force refresh)
    if (!force) {
      const cachedData = await getTwitterCache(ideaHash);
      if (cachedData && isValidTwitterBuzzData(cachedData)) {
        console.log('[TwitterSentimentTile] Using cached data from IndexedDB');
        setData(normalizeTwitterBuzzData(cachedData));
        setIsFromCache(true);
        setFetchAttempted(true);
        return;
      } else if (cachedData) {
        console.warn('[TwitterSentimentTile] Ignoring stale cached shape; refetching fresh data');
      }
    }

    console.log('[TwitterSentimentTile] Starting Twitter analysis fetch');

    setLoading(true);
    setFetchAttempted(true);
    setError(null);
    setIsFromCache(false);

    try {
      const { data: response, error: functionError } = await supabase.functions.invoke('twitter-search', {
        body: { idea: lockedIdea, query: lockedIdea }
      });

      if (functionError) throw new Error(functionError.message);

      const twitterBuzz = response?.twitter_buzz;
      
      if (!twitterBuzz) {
        throw new Error('No Twitter data in response');
      }

      setData(normalizeTwitterBuzzData(twitterBuzz));
      setIsFromCache(Boolean(twitterBuzz.cached));
      
      // Store in IndexedDB cache
      await setTwitterCache(ideaHash, normalizeTwitterBuzzData(twitterBuzz));
      
      console.log('[TwitterSentimentTile] Data fetched successfully and cached');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Twitter data';
      console.error('[TwitterSentimentTile] Error:', message);
      setError(message);
      toast.error('Failed to fetch Twitter analysis');
    } finally {
      setLoading(false);
    }
  }, [lockedIdea, hasLockedIdea, loading]);

  useEffect(() => {
    if (hasLockedIdea && lockedIdea && !data && !fetchAttempted) {
      console.log('[TwitterSentimentTile] Triggering initial data fetch');
      fetchTwitterData();
    }
  }, [lockedIdea, hasLockedIdea, data, fetchAttempted, fetchTwitterData]);

  const getSentimentColor = (type: 'positive' | 'neutral' | 'negative') => {
    switch (type) {
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
          <div className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            <CardTitle>Twitter Analysis</CardTitle>
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
            <p className="text-sm text-muted-foreground">{error}</p>
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
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="font-normal">
                <MessageCircle className="h-3 w-3 mr-1" />
                {data.metrics?.total_tweets ?? 0} tweets
              </Badge>
              <Badge variant="secondary" className="font-normal">
                <TrendingUp className="h-3 w-3 mr-1" />
                {data.metrics?.buzz_trend ?? '—'}
              </Badge>
              <Badge variant="outline" className={cn('font-normal', getSentimentColor('positive'))}>
                {(data.metrics?.overall_sentiment?.positive ?? 0)}% positive
              </Badge>
              {isFromCache && data.cached_at && (
                <Badge variant="outline" className="font-normal text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
              {data.confidence && (
                <Badge variant="outline" className="font-normal text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  {data.confidence} Confidence
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        {data.summary && (
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </div>
        )}

        {/* Overall Sentiment Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Sentiment Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/20">
              <div className="text-xs text-muted-foreground mb-1">Positive</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {data.metrics?.overall_sentiment?.positive ?? 0}%
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
              <div className="text-xs text-muted-foreground mb-1">Neutral</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {data.metrics?.overall_sentiment?.neutral ?? 0}%
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20">
              <div className="text-xs text-muted-foreground mb-1">Negative</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {data.metrics?.overall_sentiment?.negative ?? 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Top Hashtags */}
        {data.metrics?.top_hashtags?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Trending Hashtags
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.metrics?.top_hashtags?.map((tag, i) => (
                <Badge key={i} variant="secondary" className="font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Influencers */}
        {data.metrics?.influencers?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Influencers
            </h3>
            <div className="grid gap-2">
              {data.metrics?.influencers?.map((influencer, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div>
                    <div className="font-medium text-sm">{influencer.handle}</div>
                    <div className="text-xs text-muted-foreground">
                      {influencer.followers.toLocaleString()} followers
                    </div>
                  </div>
                  <Badge variant="outline" className={getSentimentColor(influencer.sentiment as any)}>
                    {influencer.sentiment}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clusters */}
        {data.clusters && data.clusters.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Discussion Clusters</h3>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {data.clusters.map((cluster, idx) => (
                  <div key={cluster.cluster_id} className="p-4 rounded-lg border bg-card/50 space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{cluster.title}</h4>
                      <p className="text-sm text-muted-foreground">{cluster.insight}</p>
                    </div>

                    {/* Cluster Sentiment */}
                    <div className="flex gap-2 text-xs">
                      <Badge variant="outline" className={getSentimentColor('positive')}>
                        +{cluster.sentiment.positive}%
                      </Badge>
                      <Badge variant="outline" className={getSentimentColor('neutral')}>
                        ={cluster.sentiment.neutral}%
                      </Badge>
                      <Badge variant="outline" className={getSentimentColor('negative')}>
                        -{cluster.sentiment.negative}%
                      </Badge>
                    </div>

                    {/* Engagement */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {cluster.engagement.avg_likes} avg likes
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="h-3 w-3" />
                        {cluster.engagement.avg_retweets} avg retweets
                      </span>
                    </div>

                    {/* Cluster Hashtags */}
                    {cluster.hashtags && cluster.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {cluster.hashtags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Quotes */}
                    {cluster.quotes && cluster.quotes.length > 0 && (
                      <div className="space-y-2">
                        {cluster.quotes.map((quote, i) => (
                          <div key={i} className="pl-3 border-l-2 border-muted">
                            <p className="text-sm italic mb-1">{quote.text}</p>
                            {quote.url && (
                              <a 
                                href={quote.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-[#1DA1F2] hover:underline flex items-center gap-1"
                              >
                                View tweet <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Citations */}
                    {cluster.citations && cluster.citations.length > 0 && (
                      <div className="space-y-1">
                        {cluster.citations.map((citation, i) => (
                          <a 
                            key={i}
                            href={citation.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {citation.source}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Raw Tweets */}
        {data.raw_tweets && data.raw_tweets.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Recent Tweets</h3>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {data.raw_tweets.map((tweet, idx) => (
                  <div key={(tweet as any).id ?? idx} className="p-4 rounded-lg border bg-card/50 space-y-2">
                    <p className="text-sm leading-relaxed">{typeof (tweet as any)?.text === 'string' ? (tweet as any).text : JSON.stringify(tweet)}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {(tweet as any)?.metrics?.like_count ?? (tweet as any)?.likes ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Repeat2 className="h-3 w-3" />
                          {(tweet as any)?.metrics?.retweet_count ?? (tweet as any)?.retweets ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {(tweet as any)?.metrics?.reply_count ?? (tweet as any)?.replies ?? 0}
                        </span>
                      </div>
                      {(tweet as any)?.url && (
                        <a 
                          href={(tweet as any).url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#1DA1F2] hover:underline flex items-center gap-1"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state */}
        {(!data.clusters || data.clusters.length === 0) && 
         (!data.raw_tweets || data.raw_tweets.length === 0) && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No detailed Twitter data available. The summary above shows what we found.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
