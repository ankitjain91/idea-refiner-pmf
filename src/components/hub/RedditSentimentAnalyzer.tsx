import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ThumbsUp, ThumbsDown, Minus, TrendingUp, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RedditPost {
  title: string;
  url: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  author: string;
  created: number;
  subreddit?: string;
  num_comments?: number;
  selftext?: string;
  upvote_ratio?: number;
}

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  summary: string;
  topPosts: RedditPost[];
  totalPosts: number;
}

interface RedditSentimentAnalyzerProps {
  idea: string;
}

export function RedditSentimentAnalyzer({ idea }: RedditSentimentAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SentimentData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSentiment = async () => {
    if (!idea || idea.length < 10) {
      toast.error("Please provide a valid idea or topic");
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('reddit-sentiment-analyzer', {
        body: { idea }
      });

      if (error) throw error;

      setData(result);
      setLastUpdate(new Date());
      toast.success("Reddit sentiment updated");
    } catch (error: any) {
      console.error("Reddit sentiment error:", error);
      toast.error(error.message || "Failed to fetch Reddit sentiment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idea) {
      fetchSentiment();
      
      // Auto-refresh every 10 minutes
      const interval = setInterval(fetchSentiment, 10 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [idea]);

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

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "border-green-500/20 bg-green-500/5";
      case "negative":
        return "border-red-500/20 bg-red-500/5";
      default:
        return "border-gray-500/20 bg-gray-500/5";
    }
  };

  const total = data ? data.positive + data.neutral + data.negative : 0;

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <Card className="overflow-hidden border-2 border-primary/10 bg-gradient-to-br from-card via-card/95 to-primary/5 shadow-lg">
      <CardHeader className="border-b-2 border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              Reddit Community Pulse
            </CardTitle>
            <CardDescription className="text-sm">Real-time sentiment analysis from Reddit discussions</CardDescription>
          </div>
        </div>
        {lastUpdate && (
          <div className="text-xs text-muted-foreground/80 mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {loading && !data ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing Reddit discussions...</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Sentiment Summary */}
            {data.summary && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground/90 leading-relaxed">{data.summary}</p>
                </div>
              </div>
            )}

            {/* Sentiment Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Sentiment Distribution</span>
                <span className="text-muted-foreground">{data.totalPosts} posts analyzed</span>
              </div>
              
              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/20">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-500">{data.positive}</div>
                  <div className="text-xs text-muted-foreground">Positive</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-500">{data.neutral}</div>
                  <div className="text-xs text-muted-foreground">Neutral</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-500">{data.negative}</div>
                  <div className="text-xs text-muted-foreground">Negative</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    <span>Positive</span>
                  </div>
                  <span className="font-medium text-green-500">
                    {total > 0 ? Math.round((data.positive / total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500 rounded-full"
                    style={{ width: `${total > 0 ? (data.positive / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-gray-500" />
                    <span>Neutral</span>
                  </div>
                  <span className="font-medium text-gray-500">
                    {total > 0 ? Math.round((data.neutral / total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-500 transition-all duration-500 rounded-full"
                    style={{ width: `${total > 0 ? (data.neutral / total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                    <span>Negative</span>
                  </div>
                  <span className="font-medium text-red-500">
                    {total > 0 ? Math.round((data.negative / total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500 rounded-full"
                    style={{ width: `${total > 0 ? (data.negative / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Top Posts - Show unique posts only with enhanced design */}
            {data.topPosts && data.topPosts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Top Discussions
                </h4>
                <div className="grid gap-3">
                  {(() => {
                    const seenTitles = new Set<string>();
                    return data.topPosts
                      .filter(post => {
                        const normalized = post.title.toLowerCase().trim();
                        if (seenTitles.has(normalized)) return false;
                        seenTitles.add(normalized);
                        return true;
                      })
                      .slice(0, 8)
                      .map((post, idx) => (
                        <a
                          key={`${post.url}-${idx}`}
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "group relative block p-5 rounded-xl border-2 transition-all duration-300",
                            "hover:shadow-xl hover:-translate-y-1 hover:border-primary/40",
                            getSentimentColor(post.sentiment)
                          )}
                        >
                          {/* Gradient overlay on hover */}
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300" />
                          
                          <div className="relative space-y-3">
                            {/* Header with sentiment */}
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {getSentimentIcon(post.sentiment)}
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <h5 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                  {post.title}
                                </h5>
                                
                                {/* Post preview text */}
                                {post.selftext && post.selftext.trim() && (
                                  <p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-2 italic border-l-2 border-border/50 pl-3">
                                    {post.selftext.substring(0, 200)}...
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Metadata row */}
                            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/30">
                              {post.subreddit && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                >
                                  r/{post.subreddit}
                                </Badge>
                              )}
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
                                <span className="flex items-center gap-1 bg-background/50 px-2 py-1 rounded-md">
                                  <ThumbsUp className="h-3 w-3" />
                                  <span className="font-medium">{post.score.toLocaleString()}</span>
                                </span>
                                
                                {post.num_comments !== undefined && (
                                  <span className="flex items-center gap-1 bg-background/50 px-2 py-1 rounded-md">
                                    <MessageSquare className="h-3 w-3" />
                                    <span className="font-medium">{post.num_comments}</span>
                                  </span>
                                )}
                                
                                <span className="bg-background/50 px-2 py-1 rounded-md font-medium">
                                  {getRelativeTime(post.created)}
                                </span>
                              </div>
                            </div>

                            {/* Author and upvote ratio */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground/70 pt-1">
                              <span>by u/{post.author}</span>
                              {post.upvote_ratio !== undefined && (
                                <span className="flex items-center gap-1">
                                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                  {Math.round(post.upvote_ratio * 100)}% upvoted
                                </span>
                              )}
                            </div>
                          </div>
                        </a>
                      ));
                  })()}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No data yet. Click refresh to analyze Reddit sentiment.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
