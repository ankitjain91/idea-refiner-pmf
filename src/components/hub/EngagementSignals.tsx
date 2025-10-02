import { useState, useEffect } from "react";
import { extractEdgeFunctionData } from "@/utils/edgeFunctionUtils";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ThumbsUp, ThumbsDown, MessageCircle, Rocket, Building2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface EngagementSignalsProps {
  idea: string;
}

export function EngagementSignals({ idea }: EngagementSignalsProps) {
  const [loading, setLoading] = useState(true);
  const [sentiment, setSentiment] = useState<any>(null);
  const [pollVotes, setPollVotes] = useState({ yes: 124, no: 31 });

  useEffect(() => {
    if (idea) {
      fetchSentimentData();
    }
  }, [idea]);

  const fetchSentimentData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-sentiment', {
        body: { idea }
      });

      // Get the inner data object ({ socialSentiment, searchVolume, ... })
      const payload = extractEdgeFunctionData({ data, error });
      const social = payload?.socialSentiment || payload?.sentiment || payload;
      if (social) {
        const normalized = {
          sentiment: {
            breakdown: {
              positive: Number(social.positive ?? social.score ?? 0),
              neutral: Number(social.neutral ?? 0),
              negative: Number(social.negative ?? 0),
            },
          },
        };
        setSentiment(normalized);
      }
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = (vote: 'yes' | 'no') => {
    setPollVotes(prev => ({
      ...prev,
      [vote]: prev[vote] + 1
    }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/50 backdrop-blur">
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const sentimentData = sentiment?.sentiment?.breakdown ? [
    { name: 'Positive', value: sentiment.sentiment.breakdown.positive, color: 'hsl(var(--success))' },
    { name: 'Neutral', value: sentiment.sentiment.breakdown.neutral, color: 'hsl(var(--muted))' },
    { name: 'Negative', value: sentiment.sentiment.breakdown.negative, color: 'hsl(var(--destructive))' }
  ] : [];

  const totalVotes = pollVotes.yes + pollVotes.no;
  const yesPercentage = Math.round((pollVotes.yes / totalVotes) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Quick Poll Widget */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Poll: Would you use this?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Yes ({yesPercentage}%)</span>
                  <span>{pollVotes.yes} votes</span>
                </div>
                <Progress value={yesPercentage} className="h-2" />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleVote('yes')}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleVote('no')}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  No
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Live validation from {totalVotes} users
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Social Sentiment Chart */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Social Sentiment
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-around mt-2">
              {sentimentData.map((item: any) => (
                <div key={item.name} className="text-center">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs">{item.name}</span>
                  </div>
                  <p className="text-sm font-bold">{item.value}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Mentions */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Platform Mentions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentiment?.platforms && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-500">R</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reddit</p>
                        <p className="text-xs text-muted-foreground">{sentiment.platforms.reddit?.mentions} mentions</p>
                      </div>
                    </div>
                    <Badge variant={sentiment.platforms.reddit?.sentiment === 'positive' ? 'default' : 'secondary'}>
                      {sentiment.platforms.reddit?.sentiment}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-500">X</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Twitter/X</p>
                        <p className="text-xs text-muted-foreground">{sentiment.platforms.twitter?.mentions} mentions</p>
                      </div>
                    </div>
                    <Badge variant={sentiment.platforms.twitter?.sentiment === 'positive' ? 'default' : 'secondary'}>
                      {sentiment.platforms.twitter?.sentiment}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-pink-500">T</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">TikTok</p>
                        <p className="text-xs text-muted-foreground">{sentiment.platforms.tiktok?.views} views</p>
                      </div>
                    </div>
                    {sentiment.platforms.tiktok?.trending && (
                      <Badge variant="default">Trending</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Investor Signals */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Investor Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentiment?.interestedInvestors?.map((investor: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div>
                    <p className="font-medium">{investor.name}</p>
                    <p className="text-sm text-muted-foreground">{investor.type}</p>
                    <div className="flex gap-1 mt-1">
                      {investor.focus?.slice(0, 2).map((focus: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {focus}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant={investor.likelihood === 'high' ? 'default' : investor.likelihood === 'medium' ? 'secondary' : 'outline'}>
                    {investor.likelihood} match
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Partnership Opportunities */}
        <Card className="bg-card/50 backdrop-blur hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Partnership Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sentiment?.suggestedCommunities?.map((community: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{community.name}</p>
                    </div>
                    <Badge variant={community.relevance === 'high' ? 'default' : 'secondary'}>
                      {community.relevance} relevance
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{community.platform}</span>
                    <span>{community.memberCount} members</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}