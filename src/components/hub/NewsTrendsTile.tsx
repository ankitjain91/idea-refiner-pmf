import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Newspaper,
  Calendar,
  Globe,
  BarChart3,
  Activity,
  ExternalLink,
  Hash,
  Users,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell
} from 'recharts';

interface NewsTrendData {
  trend_id: string;
  title: string;
  summary: string;
  metrics: {
    article_count: number;
    growth_rate: string;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
    geo_distribution: Record<string, number>;
    timeline?: Array<{ date: string; count: number }>;
    influence_score?: number;
    recency_score?: number;
  };
  entities: string[];
  charts?: any[];
  citations: Array<{
    source: string;
    url?: string;
    headline?: string;
    date?: string;
  }>;
}

interface NewsTrendsTileProps {
  data: any;
  loading?: boolean;
  className?: string;
  onRefresh?: () => void;
}

export function NewsTrendsTile({ data, loading, className, onRefresh }: NewsTrendsTileProps) {
  const SENTIMENT_COLORS = {
    positive: '#10b981',
    neutral: '#6b7280',
    negative: '#ef4444'
  };

  const GEO_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  // Process and enrich the news trends data
  const processedTrends = useMemo(() => {
    if (!data) return [];
    
    // Handle different data structures
    const trends = data.news_trends || data.trends || [];
    
    return trends.map((trend: any) => {
      // Generate timeline data if not provided
      const timeline = trend.metrics?.timeline || generateMockTimeline();
      
      // Calculate influence score if not provided
      const influenceScore = trend.metrics?.influence_score || 
        calculateInfluenceScore(trend.metrics);
      
      return {
        ...trend,
        metrics: {
          ...trend.metrics,
          timeline,
          influence_score: influenceScore
        }
      };
    });
  }, [data]);

  // Helper functions
  const generateMockTimeline = () => {
    const timeline = [];
    const today = new Date();
    for (let i = 30; i >= 0; i -= 5) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      timeline.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Math.floor(Math.random() * 50) + 10
      });
    }
    return timeline;
  };

  const calculateInfluenceScore = (metrics: any) => {
    if (!metrics) return 50;
    const volumeScore = Math.min(metrics.article_count / 10, 100);
    const sentimentScore = metrics.sentiment?.positive || 50;
    const growthScore = parseInt(metrics.growth_rate?.replace('%', '') || '0');
    return Math.round((volumeScore + sentimentScore + growthScore) / 3);
  };

  const getTrendIcon = (growth: string) => {
    const value = parseInt(growth?.replace('%', '') || '0');
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-yellow-500" />;
  };

  const getTrendColor = (growth: string) => {
    const value = parseInt(growth?.replace('%', '') || '0');
    if (value > 50) return 'text-green-500';
    if (value > 0) return 'text-green-400';
    if (value < -50) return 'text-red-500';
    if (value < 0) return 'text-red-400';
    return 'text-yellow-500';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || processedTrends.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No news trends data available</p>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" size="sm" className="mt-4">
                Fetch News Data
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Aggregate metrics
  const totalArticles = processedTrends.reduce((sum: number, t: NewsTrendData) => 
    sum + (t.metrics?.article_count || 0), 0);
  
  const avgGrowth = processedTrends.reduce((sum: number, t: NewsTrendData) => {
    const growth = parseInt(t.metrics?.growth_rate?.replace('%', '') || '0');
    return sum + growth;
  }, 0) / processedTrends.length;

  const overallSentiment = processedTrends.reduce((acc: any, t: NewsTrendData) => {
    if (t.metrics?.sentiment) {
      acc.positive += t.metrics.sentiment.positive || 0;
      acc.neutral += t.metrics.sentiment.neutral || 0;
      acc.negative += t.metrics.sentiment.negative || 0;
    }
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 });

  const sentimentTotal = overallSentiment.positive + overallSentiment.neutral + overallSentiment.negative;
  const sentimentData = [
    { name: 'Positive', value: Math.round((overallSentiment.positive / sentimentTotal) * 100), color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: Math.round((overallSentiment.neutral / sentimentTotal) * 100), color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: Math.round((overallSentiment.negative / sentimentTotal) * 100), color: SENTIMENT_COLORS.negative }
  ];

  // Aggregate geographic distribution
  const geoAggregated: Record<string, number> = {};
  processedTrends.forEach((trend: NewsTrendData) => {
    if (trend.metrics?.geo_distribution) {
      Object.entries(trend.metrics.geo_distribution).forEach(([region, count]) => {
        geoAggregated[region] = (geoAggregated[region] || 0) + count;
      });
    }
  });

  const geoData = Object.entries(geoAggregated)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([region, count], idx) => ({
      region,
      count,
      color: GEO_COLORS[idx % GEO_COLORS.length]
    }));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            News Trends Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              Last 6 months
            </Badge>
            {onRefresh && (
              <Button onClick={onRefresh} size="sm" variant="ghost">
                <Activity className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[700px] pr-4">
          <div className="space-y-6">
            {/* Executive Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{totalArticles}</div>
                  <p className="text-xs text-muted-foreground">Total Articles</p>
                  <div className="flex items-center mt-2">
                    {getTrendIcon(`${avgGrowth}%`)}
                    <span className={`text-sm ml-1 ${getTrendColor(`${avgGrowth}%`)}`}>
                      {avgGrowth > 0 ? '+' : ''}{avgGrowth.toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{processedTrends.length}</div>
                  <p className="text-xs text-muted-foreground">Key Trends</p>
                  <Badge className="mt-2" variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Identified
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {Math.round((overallSentiment.positive / sentimentTotal) * 100)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Positive Coverage</p>
                  <Progress 
                    value={(overallSentiment.positive / sentimentTotal) * 100} 
                    className="mt-2 h-2"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Overall Sentiment Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overall Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={sentimentData} layout="horizontal">
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip />
                    <Bar dataKey="value">
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Geographic Distribution */}
            {geoData.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Geographic Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {geoData.map((geo, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{geo.region}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{geo.count} articles</span>
                          <div className="w-24">
                            <Progress 
                              value={(geo.count / geoData[0].count) * 100} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Individual Trends */}
            {processedTrends.map((trend: NewsTrendData, idx: number) => (
              <Card key={trend.trend_id || idx} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {getTrendIcon(trend.metrics?.growth_rate || '0%')}
                        {trend.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          {trend.metrics?.article_count || 0} articles
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={getTrendColor(trend.metrics?.growth_rate || '0%')}
                        >
                          {trend.metrics?.growth_rate || '0%'} growth
                        </Badge>
                        {trend.metrics?.influence_score && (
                          <Badge variant="secondary">
                            Influence: {trend.metrics.influence_score}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {trend.summary}
                  </p>

                  {/* Timeline Chart */}
                  {trend.metrics?.timeline && trend.metrics.timeline.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2">Coverage Timeline</p>
                      <ResponsiveContainer width="100%" height={100}>
                        <AreaChart data={trend.metrics.timeline}>
                          <defs>
                            <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#3b82f6"
                            fill={`url(#gradient-${idx})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Entities */}
                  {trend.entities && trend.entities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2 flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Key Entities
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {trend.entities.slice(0, 8).map((entity, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {entity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sentiment Breakdown */}
                  {trend.metrics?.sentiment && (
                    <div>
                      <p className="text-xs font-medium mb-2">Sentiment Analysis</p>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-xs">Positive: {trend.metrics.sentiment.positive}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-gray-500" />
                          <span className="text-xs">Neutral: {trend.metrics.sentiment.neutral}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-xs">Negative: {trend.metrics.sentiment.negative}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Citations */}
                  {trend.citations && trend.citations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Sources
                      </p>
                      <div className="space-y-1">
                        {trend.citations.slice(0, 3).map((citation, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Newspaper className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{citation.source}</span>
                              {citation.headline && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {citation.headline}
                                </span>
                              )}
                            </div>
                            {citation.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => window.open(citation.url, '_blank')}
                              >
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}