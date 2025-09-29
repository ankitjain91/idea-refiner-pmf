import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Globe,
  MessageSquare,
  Youtube,
  Twitter,
  ShoppingCart,
  Hash,
  BarChart,
  Target,
  Sparkles,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Info,
  HelpCircle,
  Zap
} from 'lucide-react';
import { RealDataFetcher } from '@/lib/real-data-fetcher';
import { motion, AnimatePresence } from 'framer-motion';
import AITooltip from './AITooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LiveDataCardsProps {
  idea: string;
}

interface PlatformData {
  name: string;
  icon: React.ReactNode;
  status: 'loading' | 'success' | 'error';
  data: any;
  color: string;
}

export default function LiveDataCards({ idea }: LiveDataCardsProps) {
  const [platforms, setPlatforms] = useState<PlatformData[]>(() => [
    { name: 'Web Search', icon: <Globe className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
    { name: 'Google Trends', icon: <TrendingUp className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { name: 'Reddit', icon: <MessageSquare className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-gradient-to-br from-orange-500 to-red-600' },
    { name: 'YouTube', icon: <Youtube className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-gradient-to-br from-red-500 to-pink-600' },
    { name: 'Twitter/X', icon: <Twitter className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-gradient-to-br from-sky-500 to-blue-600' },
    { name: 'TikTok', icon: <Hash className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-gradient-to-br from-pink-500 to-purple-600' },
    { name: 'Amazon', icon: <ShoppingCart className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-gradient-to-br from-yellow-500 to-orange-600' }
  ]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();

  const fetcher = useMemo(() => new RealDataFetcher(), []);

  const updatePlatform = useCallback((name: string, result: any) => {
    setPlatforms(prev => prev.map(p => 
      p.name === name 
        ? { ...p, status: result.status === 'ok' ? 'success' : 'error', data: result }
        : p
    ));
  }, []);

  const fetchAllPlatformData = useCallback(async () => {
    // Fetch Web Search
    fetcher.searchWeb(idea).then(result => {
      updatePlatform('Web Search', result);
    });

    // Fetch Google Trends
    fetcher.googleTrends(idea).then(result => {
      updatePlatform('Google Trends', result);
    });

    // Fetch Reddit
    fetcher.redditSearch(idea).then(result => {
      updatePlatform('Reddit', result);
    });

    // Fetch YouTube
    fetcher.youtubeSearch(idea).then(result => {
      updatePlatform('YouTube', result);
    });

    // Fetch Twitter
    fetcher.twitterSearch(idea).then(result => {
      updatePlatform('Twitter/X', result);
    });

    // Fetch TikTok
    fetcher.tiktokTrends([idea.replace(/\s+/g, '')]).then(result => {
      updatePlatform('TikTok', result);
    });

    // Fetch Amazon
    fetcher.amazonPublic(idea).then(result => {
      updatePlatform('Amazon', result);
    });
  }, [idea, fetcher, updatePlatform]);

  useEffect(() => {
    if (idea) {
      fetchAllPlatformData();
    }
  }, [idea, fetchAllPlatformData]);

  const handleAnalyze = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('groq-synthesis', {
        body: { 
          idea,
          analysisType: 'live-data',
          platformData: platforms.map(p => ({
            platform: p.name,
            data: p.data
          }))
        }
      });

      if (error) throw error;
      
      toast({
        title: "Analysis Complete",
        description: "AI insights have been generated for your live data",
      });
    } catch (error) {
      console.error('Error analyzing data:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze data at this time",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShowHelp = () => {
    toast({
      title: "How Live Data Works",
      description: "We fetch real-time data from 7+ platforms to give you comprehensive market insights. Each platform provides unique signals about market demand, competition, and user sentiment.",
    });
  };

  const renderDataSources = (sources: any[]) => {
    if (!sources || sources.length === 0) return null;
    
    return (
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center gap-2 mb-2">
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Data Sources (Click to explore)</span>
        </div>
        <div className="space-y-1">
          {sources.slice(0, 3).map((source: any, i: number) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              asChild
              className="h-auto p-1 justify-start w-full"
            >
              <a
                href={source.url || source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{source.source || source.url || source}</span>
              </a>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderWebSearchCard = useCallback((data: any) => {
    if (!data?.raw) return null;
    
    const marketSizeValue = data.raw.marketSize || 0;
    const isLargeMarket = marketSizeValue > 10000000000;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 z-10">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>Market Size:</strong> Total addressable market value for "{idea}". 
                    This data is fetched from real market reports and industry analysis.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AITooltip content={isLargeMarket ? 'high' : 'low'} context="marketSize">
              <div>
                <p className="text-sm text-muted-foreground">Market Size</p>
                <p className="text-2xl font-bold">
                  ${(marketSizeValue / 1000000000).toFixed(1)}B
                </p>
              </div>
            </AITooltip>
          </div>
          
          <div className="relative">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 z-10">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>Growth Rate:</strong> Year-over-year market growth percentage. 
                    Higher rates indicate emerging opportunities in the "{idea}" space.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AITooltip content={data.raw.growthRate > 20 ? 'high' : 'low'} context="growthRate">
              <div>
                <p className="text-sm text-muted-foreground">Growth Rate</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {data.raw.growthRate}%
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </p>
              </div>
            </AITooltip>
          </div>
        </div>

        {data.raw.demographics && (
          <div>
            <p className="text-sm font-medium mb-2">Demographics</p>
            <div className="space-y-1">
              <Badge variant="outline">Age: {data.raw.demographics.primaryAge}</Badge>
              <div className="flex flex-wrap gap-1">
                {data.raw.demographics.industries?.map((ind: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {ind}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {data.raw.pricing && (
          <div>
            <p className="text-sm font-medium mb-2">Pricing Analysis</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Average Price</span>
                <span className="font-medium">${data.raw.pricing.averagePrice}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Range</span>
                <span className="font-medium">
                  ${data.raw.pricing.priceRange?.min} - ${data.raw.pricing.priceRange?.max}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {data.raw.pricing.model}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(idea + ' pricing comparison')}`, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Research Pricing Strategy
              </Button>
            </div>
          </div>
        )}

        {data.raw.topCompetitors && data.raw.topCompetitors.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Top Competitors (Click to research)</p>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {data.raw.topCompetitors.map((comp: any, i: number) => (
                  <Card key={i} className="p-2 hover:bg-muted/50 transition-colors cursor-pointer">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between p-0 h-auto"
                      onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(comp.name + ' company')}`, '_blank')}
                    >
                      <span className="text-sm font-medium">{comp.name}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {comp.marketShare}% share
                        </Badge>
                        {comp.pricing && (
                          <Badge variant="secondary" className="text-xs">
                            {comp.pricing}
                          </Badge>
                        )}
                        {comp.funding && (
                          <Badge variant="default" className="text-xs">
                            {comp.funding}
                          </Badge>
                        )}
                      </div>
                    </Button>
                    {comp.strengths && comp.strengths.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {comp.strengths.slice(0, 2).map((strength: string, j: number) => (
                          <Badge key={j} variant="outline" className="text-xs text-green-600">
                            ✓ {strength}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {renderDataSources(data.raw.sources || data.citations)}
      </div>
    );
  }, []);

  const renderTrendsCard = useCallback((data: any) => {
    if (!data?.raw) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <AITooltip content="default" context="marketSize">
            <div>
              <p className="text-sm text-muted-foreground">Interest Score</p>
              <p className="text-2xl font-bold">{data.raw.interestScore || 0}/100</p>
            </div>
          </AITooltip>
          <Badge 
            variant={data.raw.trendDirection === 'rising' ? 'default' : 'secondary'}
            className="flex items-center gap-1"
          >
            {data.raw.trendDirection === 'rising' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {data.raw.trendDirection}
          </Badge>
        </div>

        {data.raw.demographics && (
          <div>
            <p className="text-sm font-medium mb-2">Age Demographics</p>
            <div className="space-y-1">
              {data.raw.demographics.ageGroups?.map((age: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs mr-1">
                  {age}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.raw.relatedTopics && (
          <div>
            <p className="text-sm font-medium mb-2">Trending Topics</p>
            <div className="flex flex-wrap gap-1">
              {data.raw.relatedTopics.slice(0, 5).map((topic: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.raw.regions && (
          <div>
            <p className="text-sm font-medium mb-2">Top Regions</p>
            {data.raw.regions.slice(0, 3).map((region: any, i: number) => (
              <div key={i} className="flex items-center justify-between mb-1">
                <span className="text-xs">{region.region}</span>
                <Progress value={region.interest} className="w-20 h-1" />
              </div>
            ))}
          </div>
        )}
        
        {renderDataSources(data.raw.sources || data.citations)}
      </div>
    );
  }, []);

  const renderRedditCard = useCallback((data: any) => {
    if (!data?.raw) return null;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <AITooltip content={data.normalized?.painDensity > 60 ? 'high' : 'low'} context="painDensity">
            <div>
              <p className="text-sm text-muted-foreground">Pain Density</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{data.normalized?.painDensity || 0}%</p>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
          </AITooltip>
          
          <AITooltip content={data.normalized?.sentiment > 0 ? 'positive' : 'negative'} context="sentiment">
            <div>
              <p className="text-sm text-muted-foreground">Sentiment</p>
              <p className="text-2xl font-bold">
                {data.normalized?.sentiment > 0 ? '+' : ''}{data.normalized?.sentiment || 0}
              </p>
            </div>
          </AITooltip>
        </div>

        {data.raw.demographics && (
          <div>
            <p className="text-sm font-medium mb-2">Active Communities</p>
            <div className="flex flex-wrap gap-1">
              {data.raw.demographics.subreddits?.slice(0, 3).map((sub: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {sub}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.raw.topPainPhrases && (
          <div>
            <p className="text-sm font-medium mb-2">Top Complaints</p>
            <div className="space-y-1">
              {data.raw.topPainPhrases.slice(0, 3).map((pain: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span className="text-xs">{pain}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.raw.userNeeds && (
          <div>
            <p className="text-sm font-medium mb-2">User Needs</p>
            <div className="space-y-1">
              {data.raw.userNeeds.slice(0, 3).map((need: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-xs">{need}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {renderDataSources(data.raw.sources || data.citations)}
      </div>
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Live Platform Analysis
            </h2>
            <p className="text-sm text-muted-foreground">Real-time insights from 7+ platforms</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-700 dark:text-amber-300">Live Data</span>
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAllPlatformData}
            className="h-8"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                {/* Gradient background effect */}
                <div className={cn(
                  "absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity",
                  platform.color
                )} />
                
                <CardHeader className="pb-3 relative">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-2 rounded-lg text-white shadow-lg",
                        platform.color
                      )}>
                        {platform.icon}
                      </div>
                      <span className="font-semibold">{platform.name}</span>
                    </div>
                    {platform.status === 'loading' && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Loading</span>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                    {platform.status === 'success' && (
                      <Badge variant="outline" className="bg-green-500/10 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
                        <span className="text-xs text-green-700 dark:text-green-300">Live</span>
                      </Badge>
                    )}
                    {platform.status === 'error' && (
                      <Badge variant="outline" className="bg-red-500/10 border-red-500/30">
                        <XCircle className="w-3 h-3 mr-1 text-red-600 dark:text-red-400" />
                        <span className="text-xs text-red-700 dark:text-red-300">Error</span>
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 relative">
                  {platform.status === 'loading' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
                      </div>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  )}
                  
                  {platform.status === 'success' && platform.name === 'Web Search' && renderWebSearchCard(platform.data)}
                  {platform.status === 'success' && platform.name === 'Google Trends' && renderTrendsCard(platform.data)}
                  {platform.status === 'success' && platform.name === 'Reddit' && renderRedditCard(platform.data)}
                  
                  {platform.status === 'success' && !['Web Search', 'Google Trends', 'Reddit'].includes(platform.name) && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Volume</p>
                          <p className="text-xl font-bold text-primary">
                            {platform.data?.normalized?.volume?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="p-2 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Engagement</p>
                          <div className="flex items-center gap-1">
                            <p className="text-xl font-bold text-secondary">
                              {platform.data?.normalized?.engagement || 0}%
                            </p>
                            {platform.data?.normalized?.engagement > 70 && (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {platform.data?.raw?.topItems && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Top Results
                          </p>
                          <div className="space-y-2">
                            {platform.data.raw.topItems.slice(0, 3).map((item: any, i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                <Badge variant="outline" className="text-xs shrink-0">
                                  #{i + 1}
                                </Badge>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {item.title || item}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {platform.data?.raw?.sentiment && (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={platform.data.raw.sentiment > 0 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            Sentiment: {platform.data.raw.sentiment > 0 ? '+' : ''}{platform.data.raw.sentiment}
                          </Badge>
                        </div>
                      )}
                      
                      <Progress 
                        value={platform.data?.normalized?.volume || 0} 
                        className="h-2 bg-muted"
                      />
                    </div>
                  )}
                  
                  {platform.status === 'error' && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Failed to load data. Please retry.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3 mt-8">
        <Button
          variant="default"
          size="lg"
          onClick={handleAnalyze}
          disabled={isAnalyzing || platforms.every(p => p.status === 'loading')}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Analyze with AI
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleShowHelp}
          className="shadow-md"
        >
          <HelpCircle className="h-5 w-5 mr-2" />
          How this works
        </Button>
      </div>
    </div>
  );
}