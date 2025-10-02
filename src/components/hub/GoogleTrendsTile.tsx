import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  BarChart3,
  Users,
  Brain,
  Sparkles,
  Globe,
  Calendar,
  Hash,
  MessageCircle,
  ChevronRight,
  Target,
  Zap,
  RefreshCw
} from 'lucide-react';

interface GoogleTrendsTileProps {
  data: any;
  loading?: boolean;
  className?: string;
  onRefresh?: () => void;
}

export function GoogleTrendsTile({ data, loading, className, onRefresh }: GoogleTrendsTileProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Google Trends Analysis
            </CardTitle>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Google Trends Analysis
            </CardTitle>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No trends data available</p>
        </CardContent>
      </Card>
    );
  }

  // Extract all possible data fields
  const interest = data.interest || data.interestScore || 0;
  const trend = data.trend || 'stable';
  const searchVolume = data.searchVolume || 'N/A';
  const timeRange = data.timeRange || 'Last 30 days';
  const relatedQueries = data.relatedQueries || data.relatedSearches || [];
  const trendingTopics = data.trendingTopics || data.trendingKeywords || [];
  const questionsAsked = data.questionsAsked || data.peopleAlsoAsk || [];
  const trendSignals = data.trendSignals || [];
  const dataPoints = data.dataPoints || {};
  const insights = data.insights || {};
  const keywords = data.keywords || [];
  const marketFactors = insights.keyFactors || [];
  
  const getTrendIcon = () => {
    switch (trend.toLowerCase()) {
      case 'rising':
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend.toLowerCase()) {
      case 'rising':
      case 'increasing':
        return 'text-green-500';
      case 'declining':
      case 'decreasing':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Google Trends Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Badge variant="outline" className="font-normal">
              <Calendar className="h-3 w-3 mr-1" />
              {timeRange}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Main Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Score</p>
                      <p className="text-3xl font-bold">{interest}</p>
                      <Progress value={interest} className="mt-2" />
                    </div>
                    <div className="text-4xl">{getTrendIcon()}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Search Volume</p>
                      <p className="text-2xl font-semibold">{searchVolume}</p>
                      <Badge className={`mt-2 ${getTrendColor()}`} variant="secondary">
                        {trend}
                      </Badge>
                    </div>
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Points Summary */}
            {Object.keys(dataPoints).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Trend Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {dataPoints.positive && (
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-green-500">{dataPoints.positive}</p>
                        <p className="text-xs text-muted-foreground">Positive</p>
                      </div>
                    )}
                    {dataPoints.neutral && (
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-yellow-500">{dataPoints.neutral}</p>
                        <p className="text-xs text-muted-foreground">Neutral</p>
                      </div>
                    )}
                    {dataPoints.negative && (
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-red-500">{dataPoints.negative}</p>
                        <p className="text-xs text-muted-foreground">Negative</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trending Topics & Keywords */}
            {(trendingTopics.length > 0 || keywords.length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Trending Topics & Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {trendingTopics.map((topic: any, idx: number) => (
                      <Badge key={`topic-${idx}`} variant="default">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {typeof topic === 'string' ? topic : topic.name || topic.term}
                      </Badge>
                    ))}
                    {keywords.map((keyword: string, idx: number) => (
                      <Badge key={`keyword-${idx}`} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Searches */}
            {relatedQueries.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Related Searches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {relatedQueries.slice(0, 5).map((query: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <span className="text-sm flex items-center gap-2">
                          <ChevronRight className="h-3 w-3" />
                          {typeof query === 'string' ? query : query.query || query.term}
                        </span>
                        {query.value && (
                          <Badge variant="outline" className="text-xs">
                            {query.value}%
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Questions People Ask */}
            {questionsAsked.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    People Also Ask
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {questionsAsked.slice(0, 5).map((question: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-muted">
                        <Target className="h-3 w-3 mt-1 text-muted-foreground" />
                        <p className="text-sm">{question}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Market Signals */}
            {trendSignals.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Market Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trendSignals.slice(0, 5).map((signal: any, idx: number) => (
                      <div key={idx} className="border-l-2 border-primary pl-3">
                        <p className="text-sm font-medium">{signal.title || signal.signal}</p>
                        {signal.description && (
                          <p className="text-xs text-muted-foreground mt-1">{signal.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {signal.sentiment && (
                            <Badge variant={signal.sentiment === 'positive' ? 'default' : 'secondary'} className="text-xs">
                              {signal.sentiment}
                            </Badge>
                          )}
                          {signal.recency && (
                            <Badge variant="outline" className="text-xs">
                              {signal.recency}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Market Factors */}
            {marketFactors.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Key Market Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {marketFactors.map((factor: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <p className="text-sm">{factor}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market Insights Summary */}
            {insights.summary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Market Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{insights.summary}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}