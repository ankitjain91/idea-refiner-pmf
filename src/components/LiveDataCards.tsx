import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Info
} from 'lucide-react';
import { RealDataFetcher } from '@/lib/real-data-fetcher';
import { motion, AnimatePresence } from 'framer-motion';
import AITooltip from './AITooltip';
import { cn } from '@/lib/utils';

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
    { name: 'Web Search', icon: <Globe className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-blue-500' },
    { name: 'Google Trends', icon: <TrendingUp className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-green-500' },
    { name: 'Reddit', icon: <MessageSquare className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-orange-500' },
    { name: 'YouTube', icon: <Youtube className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-red-500' },
    { name: 'Twitter/X', icon: <Twitter className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-sky-500' },
    { name: 'TikTok', icon: <Hash className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-pink-500' },
    { name: 'Amazon', icon: <ShoppingCart className="w-5 h-5" />, status: 'loading', data: null, color: 'bg-yellow-500' }
  ]);

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

  const renderDataSources = (sources: any[]) => {
    if (!sources || sources.length === 0) return null;
    
    return (
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center gap-2 mb-2">
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Data Sources</span>
        </div>
        <div className="space-y-1">
          {sources.slice(0, 3).map((source: any, i: number) => (
            <a
              key={i}
              href={source.url || source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline block truncate"
            >
              {source.source || source.url || source}
            </a>
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
          <AITooltip content={isLargeMarket ? 'high' : 'low'} context="marketSize">
            <div>
              <p className="text-sm text-muted-foreground">Market Size</p>
              <p className="text-2xl font-bold">
                ${(marketSizeValue / 1000000000).toFixed(1)}B
              </p>
            </div>
          </AITooltip>
          
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
            </div>
          </div>
        )}

        {data.raw.topCompetitors && data.raw.topCompetitors.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Top Competitors</p>
            <ScrollArea className="h-24">
              <div className="space-y-2">
                {data.raw.topCompetitors.map((comp: any, i: number) => (
                  <div key={i} className="flex justify-between items-center">
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
                    </div>
                  </div>
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
        <h2 className="text-2xl font-bold">Live Platform Analysis</h2>
        <Badge variant="outline" className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Real-time Data
        </Badge>
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
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${platform.color} text-white`}>
                        {platform.icon}
                      </div>
                      <span>{platform.name}</span>
                    </div>
                    {platform.status === 'loading' && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {platform.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {platform.status === 'error' && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {platform.status === 'loading' && (
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  )}
                  
                  {platform.status === 'success' && platform.name === 'Web Search' && renderWebSearchCard(platform.data)}
                  {platform.status === 'success' && platform.name === 'Google Trends' && renderTrendsCard(platform.data)}
                  {platform.status === 'success' && platform.name === 'Reddit' && renderRedditCard(platform.data)}
                  
                  {platform.status === 'success' && !['Web Search', 'Google Trends', 'Reddit'].includes(platform.name) && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Volume</span>
                        <span className="font-medium">{platform.data?.normalized?.volume || 0}%</span>
                      </div>
                      {platform.data?.normalized?.engagement && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Engagement</span>
                          <span className="font-medium">{platform.data.normalized.engagement}</span>
                        </div>
                      )}
                      <Progress value={platform.data?.normalized?.volume || 0} className="h-2" />
                    </div>
                  )}
                  
                  {platform.status === 'error' && (
                    <div className="text-xs text-muted-foreground">
                      Failed to fetch data
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}