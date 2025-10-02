import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, Minus, Search, 
  RefreshCw, Globe, Clock, Hash
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimpleGoogleTrendsTileProps {
  idea: string;
  className?: string;
}

export function SimpleGoogleTrendsTile({ idea, className }: SimpleGoogleTrendsTileProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoogleTrendsData = async () => {
    if (!idea) {
      setError("No idea provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: trendsData, error: trendsError } = await supabase.functions.invoke('web-search', {
        body: { 
          idea_keywords: idea
        }
      });

      if (trendsError) throw trendsError;

      // Handle various data structures
      const extractedData = trendsData?.google_trends || 
                          trendsData?.trends || 
                          trendsData?.data?.google_trends ||
                          trendsData?.data?.trends ||
                          trendsData?.json?.google_trends ||
                          trendsData?.json?.trends ||
                          trendsData;

      setData(extractedData);
    } catch (err) {
      console.error('Error fetching Google Trends:', err);
      setError('Failed to fetch Google Trends data');
      toast.error('Failed to fetch Google Trends data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleTrendsData();
    
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchGoogleTrendsData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [idea]);

  const getTrendIcon = (trend?: string | number) => {
    if (typeof trend === 'number') {
      if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
      if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else if (typeof trend === 'string') {
      if (trend.toLowerCase().includes('rising') || trend.toLowerCase().includes('up')) {
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      }
      if (trend.toLowerCase().includes('declining') || trend.toLowerCase().includes('down')) {
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      }
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {error || "No Google Trends data available"}
            </p>
            <Button onClick={fetchGoogleTrendsData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract data from various possible structures
  const interestScore = data.interestScore || data.interest || data.metrics?.interest || 0;
  const searchVolume = data.searchVolume || data.volume || data.metrics?.queries || 0;
  const growthRate = data.growthRate || data.growth || data.metrics?.growth || 0;
  const trendDirection = data.trendDirection || data.trend || data.direction || 'stable';
  
  // Related queries and topics
  const relatedQueries = data.relatedQueries || data.related_queries || data.queries || [];
  const risingTopics = data.risingTopics || data.rising_topics || data.breakout_terms || [];
  const relatedTopics = data.relatedTopics || data.related_topics || data.topics || [];
  
  // Regional data
  const regionalData = data.regionalInterest || data.regional_interest || data.regions || [];
  
  // Time series data
  const timelineData = data.timeline || data.time_series || data.interest_over_time || [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Trends
          </div>
          <Button
            onClick={fetchGoogleTrendsData}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Interest Score</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {interestScore}
                  {getTrendIcon(trendDirection)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Search Volume</p>
                <p className="text-2xl font-bold">
                  {searchVolume.toLocaleString()}
                </p>
              </div>
              {growthRate !== 0 && (
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    {growthRate > 0 ? '+' : ''}{growthRate}%
                    {getTrendIcon(growthRate)}
                  </p>
                </div>
              )}
            </div>

            {/* Rising Topics */}
            {risingTopics.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Rising Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {risingTopics.slice(0, 10).map((topic: any, index: number) => (
                    <Badge key={index} variant="secondary">
                      {typeof topic === 'string' ? topic : topic.term || topic.topic}
                      {topic.value && ` (+${topic.value}%)`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Related Queries */}
            {relatedQueries.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Related Searches
                </h4>
                <div className="space-y-1">
                  {relatedQueries.slice(0, 8).map((query: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{typeof query === 'string' ? query : query.query || query.term}</span>
                      {query.value && (
                        <Badge variant="outline" className="text-xs">
                          {query.value}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regional Interest */}
            {regionalData.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Top Regions
                </h4>
                <div className="space-y-1">
                  {regionalData.slice(0, 5).map((region: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{typeof region === 'string' ? region : region.location || region.region}</span>
                      {region.value && (
                        <span className="text-muted-foreground">{region.value}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Summary */}
            {timelineData.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Trend
                </h4>
                <p className="text-sm text-muted-foreground">
                  Interest has {growthRate > 0 ? 'increased' : growthRate < 0 ? 'decreased' : 'remained stable'} over 
                  the past {timelineData.length} data points
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}