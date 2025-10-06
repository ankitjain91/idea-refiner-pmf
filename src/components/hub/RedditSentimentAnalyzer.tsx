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
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Reddit Sentiment
            </CardTitle>
            <CardDescription>Live community mood across Reddit</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSentiment}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        {lastUpdate && (
          <div className="text-xs text-muted-foreground mt-2">
            Last updated: {lastUpdate.toLocaleTimeString()}
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

            {/* Top Posts - Show 10 with comprehensive details */}
            {data.topPosts && data.topPosts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Top {data.topPosts.length} Recent Discussions</h4>
                <div className="space-y-3">
                  {data.topPosts.slice(0, 10).map((post, idx) => (
                    <a
                      key={idx}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "block p-4 rounded-lg border transition-all hover:shadow-lg hover:scale-[1.02]",
                        getSentimentColor(post.sentiment)
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          {getSentimentIcon(post.sentiment)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2 mb-1">{post.title}</p>
                            {post.selftext && (
                              <p className="text-xs text-muted-foreground line-clamp-3 mb-2">
                                {post.selftext.substring(0, 300)}...
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {post.subreddit && (
                                <Badge variant="outline" className="text-xs">
                                  r/{post.subreddit}
                                </Badge>
                              )}
                              <span>u/{post.author}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                {post.score}
                              </span>
                              {post.upvote_ratio !== undefined && (
                                <>
                                  <span>•</span>
                                  <span>{Math.round(post.upvote_ratio * 100)}% upvoted</span>
                                </>
                              )}
                              {post.num_comments !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {post.num_comments}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span>{getRelativeTime(post.created)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
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
