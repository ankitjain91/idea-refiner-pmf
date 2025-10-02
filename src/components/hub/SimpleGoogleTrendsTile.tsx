import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, Minus, Search, 
  RefreshCw, Globe, Clock, Hash, MapPin, 
  BarChart, LineChart, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

interface SimpleGoogleTrendsTileProps {
  idea: string;
  className?: string;
}

export function SimpleGoogleTrendsTile({ idea, className }: SimpleGoogleTrendsTileProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchGoogleTrendsData = async () => {
    if (!idea) {
      setError("No idea provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: trendsData, error: trendsError } = await supabase.functions.invoke('google-trends', {
        body: { idea }
      });

      if (trendsError) throw trendsError;

      setData(trendsData?.google_trends || trendsData);
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
    
    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchGoogleTrendsData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [idea]);

  const getTrendIcon = (trend?: string | number) => {
    if (typeof trend === 'number') {
      if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
      if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else if (typeof trend === 'string') {
      if (trend.includes('+')) return <TrendingUp className="h-4 w-4 text-green-500" />;
      if (trend.includes('-')) return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatChartData = (chartData: any) => {
    if (!chartData?.data) return [];
    
    if (Array.isArray(chartData.data)) {
      return chartData.data.map((item: any) => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        formattedDate: new Date(item.date).toLocaleDateString(),
      }));
    }
    
    return [];
  };

  const formatComparisonData = (comparisonData: any) => {
    if (!comparisonData?.data || !Array.isArray(comparisonData.data)) return [];
    
    const allDates = new Set<string>();
    const dataByDate: any = {};
    
    comparisonData.data.forEach((series: any) => {
      series.data?.forEach((point: any) => {
        const date = new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        allDates.add(date);
        if (!dataByDate[date]) dataByDate[date] = { date };
        dataByDate[date][series.keyword] = point.value;
      });
    });
    
    return Array.from(allDates).map(date => dataByDate[date]);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Trends Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
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
            Google Trends Analysis
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

  const { metrics, charts, summary, keywords, related_queries } = data;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Trends Analysis
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="regions">Regions</TabsTrigger>
            <TabsTrigger value="queries">Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">{summary}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Interest Score</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {metrics?.interest_score || 0}
                  {getTrendIcon(metrics?.['12m_growth'])}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Search Volume</p>
                <p className="text-2xl font-bold">
                  {(metrics?.search_volume || 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">12M Growth</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {metrics?.['12m_growth'] || '0%'}
                  {getTrendIcon(metrics?.['12m_growth'])}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Momentum</p>
                <p className="text-2xl font-bold">
                  {metrics?.momentum_score || 0}
                </p>
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Tracked Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {keywords?.map((keyword: string, idx: number) => (
                  <Badge key={idx} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            {/* 12-Month Timeline */}
            {charts?.timeline && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  {charts.timeline.title}
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={formatChartData(charts.timeline)}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Keyword Comparison */}
            {charts?.comparison && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {charts.comparison.title}
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={formatComparisonData(charts.comparison)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {keywords?.map((keyword: string, idx: number) => (
                      <Line 
                        key={keyword}
                        type="monotone" 
                        dataKey={keyword} 
                        stroke={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx]}
                        strokeWidth={2}
                      />
                    ))}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 5-Year Context */}
            {charts?.fiveYear && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {charts.fiveYear.title}
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsLineChart data={formatChartData(charts.fiveYear)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="regions" className="space-y-4">
            {/* Regional Interest */}
            {charts?.regions?.data && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {charts.regions.title}
                </h4>
                <div className="space-y-2">
                  {charts.regions.data.map((region: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{region.region}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${region.value}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-10 text-right">
                          {region.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="queries" className="space-y-4">
            {/* Rising Queries */}
            {metrics?.rising_queries && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Rising Queries
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={metrics.rising_queries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="query" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="growth" fill="#10b981" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Related Queries */}
            {related_queries && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Related Searches
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {related_queries.slice(0, 10).map((query: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-sm">{query.query}</span>
                      <Badge variant="outline" className="text-xs">
                        {query.value || idx === 0 ? '100' : 100 - idx * 10}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}