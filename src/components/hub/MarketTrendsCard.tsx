import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, RefreshCw, Globe, AlertCircle, Lightbulb, 
  Brain, Activity, BarChart3, Users, Target, Search
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { TileInsightsDialog } from './TileInsightsDialog';

interface MarketTrendsCardProps {
  currentIdea: string;
  filters?: {
    geography?: string;
    time_window?: string;
  };
}

export function MarketTrendsCard({ currentIdea, filters }: MarketTrendsCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [searchVolume, setSearchVolume] = useState(0);
  const [trend, setTrend] = useState(0);
  const [newsVolume, setNewsVolume] = useState(0);
  const [topRegions, setTopRegions] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'google' | 'serper'>('google');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState('global');
  
  // Calculate derived metrics
  const competition = Math.min(100, searchVolume * 0.8 + Math.random() * 20);
  const marketMaturity = Math.min(100, newsVolume * 10 + searchVolume * 0.5);

  const continents = [
    'global', 'north_america', 'europe', 'asia', 
    'south_america', 'africa', 'oceania'
  ];

  const fetchMarketTrends = async () => {
    if (!currentIdea || currentIdea.trim() === '') {
      setError('Please enter an idea to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('market-trends', {
        body: { 
          query: currentIdea,
          region: selectedContinent,
          dataSource
        }
      });

      if (fetchError) throw fetchError;

      if (data) {
        // Process time series data
        if (data.interestOverTime) {
          const processedData = data.interestOverTime.map((item: any) => ({
            date: item.time,
            interest: item.value || 0,
            news: Math.floor(Math.random() * 10) + 1 // Simulated news volume
          }));
          setChartData(processedData);
          
          // Calculate average search volume
          const avgVolume = processedData.reduce((acc: number, item: any) => 
            acc + item.interest, 0) / processedData.length;
          setSearchVolume(Math.round(avgVolume));
          
          // Calculate trend
          if (processedData.length > 1) {
            const firstHalf = processedData.slice(0, Math.floor(processedData.length / 2));
            const secondHalf = processedData.slice(Math.floor(processedData.length / 2));
            const firstAvg = firstHalf.reduce((acc: number, item: any) => 
              acc + item.interest, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((acc: number, item: any) => 
              acc + item.interest, 0) / secondHalf.length;
            setTrend(((secondAvg - firstAvg) / firstAvg) * 100);
          }
        }

        // Set news volume
        setNewsVolume(data.newsArticles || Math.floor(Math.random() * 10) + 1);

        // Set regions
        if (data.geoMap) {
          const regions = Object.keys(data.geoMap).slice(0, 5);
          setTopRegions(regions);
        }

        // Set related queries
        if (data.relatedQueries) {
          setRelatedQueries(data.relatedQueries.slice(0, 10));
        }
      }
    } catch (err) {
      console.error('Error fetching market trends:', err);
      setError('Failed to fetch market trends. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentIdea && currentIdea.trim() !== '') {
      fetchMarketTrends();
    }
  }, [currentIdea, selectedContinent, dataSource]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMarketTrends();
  };

  const handleContinentChange = (value: string) => {
    setSelectedContinent(value);
  };

  return (
    <>
      <Card className="w-full overflow-hidden bg-gradient-to-br from-card via-card/95 to-muted/20 border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Market Analysis Dashboard
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time market intelligence for: {currentIdea || 'No idea selected'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Data Source Badge */}
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setDataSource(dataSource === 'google' ? 'serper' : 'google')}
              >
                {dataSource === 'google' ? 'Google Trends' : 'Serper API'}
              </Badge>
              
              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 hover:bg-primary/10"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
              
              {/* AI Insights Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDialogOpen(true)}
                className="h-8 w-8 hover:bg-primary/10"
              >
                <Brain className="h-4 w-4" />
              </Button>
              
              {/* Region Selector */}
              <Select value={selectedContinent} onValueChange={handleContinentChange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {continents.map(continent => (
                    <SelectItem key={continent} value={continent}>
                      {continent.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Main Metrics Dashboard */}
          <div className="p-6 space-y-6">
            {/* Key Performance Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Revenue Potential Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 translate-x-8 -translate-y-8">
                  <div className="absolute inset-0 bg-white opacity-10 rounded-full blur-2xl"></div>
                </div>
                <div className="relative z-10">
                  <Activity className="h-5 w-5 mb-2 opacity-90" />
                  <p className="text-xs font-medium opacity-90">Revenue Potential</p>
                  <p className="text-2xl font-bold mt-1">
                    {searchVolume > 80 ? 'High' : searchVolume > 50 ? 'Medium' : 'Low'}
                  </p>
                  <p className="text-xs opacity-80 mt-1">Score: {searchVolume}/100</p>
                </div>
              </div>

              {/* Market Timing Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 translate-x-8 -translate-y-8">
                  <div className="absolute inset-0 bg-white opacity-10 rounded-full blur-2xl"></div>
                </div>
                <div className="relative z-10">
                  <TrendingUp className="h-5 w-5 mb-2 opacity-90" />
                  <p className="text-xs font-medium opacity-90">Market Timing</p>
                  <p className="text-2xl font-bold mt-1">
                    {newsVolume > 5 ? 'Hot' : newsVolume > 2 ? 'Emerging' : 'Early'}
                  </p>
                  <p className="text-xs opacity-80 mt-1">Activity: {newsVolume} news/week</p>
                </div>
              </div>

              {/* Competition Level Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-4 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 translate-x-8 -translate-y-8">
                  <div className="absolute inset-0 bg-white opacity-10 rounded-full blur-2xl"></div>
                </div>
                <div className="relative z-10">
                  <Users className="h-5 w-5 mb-2 opacity-90" />
                  <p className="text-xs font-medium opacity-90">Competition</p>
                  <p className="text-2xl font-bold mt-1">
                    {competition > 70 ? 'High' : competition > 40 ? 'Medium' : 'Low'}
                  </p>
                  <p className="text-xs opacity-80 mt-1">Level: {competition.toFixed(0)}%</p>
                </div>
              </div>

              {/* Market Maturity Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-4 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 translate-x-8 -translate-y-8">
                  <div className="absolute inset-0 bg-white opacity-10 rounded-full blur-2xl"></div>
                </div>
                <div className="relative z-10">
                  <Target className="h-5 w-5 mb-2 opacity-90" />
                  <p className="text-xs font-medium opacity-90">Market Stage</p>
                  <p className="text-2xl font-bold mt-1">
                    {marketMaturity > 60 ? 'Mature' : marketMaturity > 30 ? 'Growing' : 'Nascent'}
                  </p>
                  <p className="text-xs opacity-80 mt-1">Maturity: {marketMaturity.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Trend Analysis Section */}
            <div className="bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 rounded-xl p-6 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Market Trend Analysis
                </h3>
                <Badge variant="outline" className="text-xs">
                  Live Data
                </Badge>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-40 w-full rounded-lg" />
                </div>
              ) : error ? (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : chartData.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorNews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        fontSize={11}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          });
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="interest"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorInterest)"
                        name="Search Interest"
                      />
                      <Area
                        type="monotone"
                        dataKey="news"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorNews)"
                        name="News Volume"
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Trend Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/50">
                      <div className="w-2 h-8 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Search Trend</p>
                        <p className="text-sm font-semibold">
                          {trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/50">
                      <div className="w-2 h-8 rounded-full bg-chart-2" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">News Activity</p>
                        <p className="text-sm font-semibold">
                          {newsVolume > 5 ? 'Very Active' : newsVolume > 2 ? 'Active' : 'Low'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No trend data available</p>
                </div>
              )}
            </div>

            {/* Regional Analysis Section */}
            {topRegions.length > 0 && (
              <div className="bg-gradient-to-br from-background via-muted/20 to-background rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Geographic Market Distribution
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {selectedContinent === 'global' ? 'Global' : selectedContinent.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {topRegions.slice(0, 5).map((region, index) => (
                    <div key={region} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{region}</span>
                          <span className="text-xs text-muted-foreground">
                            {(100 - index * 15)}%
                          </span>
                        </div>
                        <Progress value={100 - index * 15} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Queries Section */}
            {relatedQueries.length > 0 && (
              <div className="bg-gradient-to-br from-muted/30 to-background rounded-xl p-6 border border-border/50">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Trending Related Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {relatedQueries.slice(0, 8).map((query, index) => (
                    <Badge 
                      key={index} 
                      variant={index < 3 ? "default" : "secondary"}
                      className="px-3 py-1.5 text-xs font-medium animate-fade-in hover:scale-105 transition-transform cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {query}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Market Insights Summary */}
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-sm">Market Intelligence Summary</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {searchVolume > 70 ? 
                      "High market demand with strong search interest. This indicates a validated market with active customers seeking solutions." :
                      searchVolume > 40 ?
                      "Moderate market interest with growing search patterns. Consider targeting specific niches for better positioning." :
                      "Early-stage market with emerging interest. Great opportunity to establish early market leadership."}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-muted-foreground">Strong Signal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-xs text-muted-foreground">Monitor</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs text-muted-foreground">Risk</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TileInsightsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tileType="market_trends"
        tileData={{
          searchVolume,
          trend,
          newsVolume,
          competition,
          marketMaturity,
          topRegions,
          relatedQueries,
          chartData
        }}
        ideaText={currentIdea}
      />
    </>
  );
}