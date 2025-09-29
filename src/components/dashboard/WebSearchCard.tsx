import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardData } from '@/hooks/useCardData';
import { Search, TrendingUp, DollarSign, RefreshCw, ExternalLink, ChevronRight, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebSearchCardProps {
  idea: string;
  industry?: string;
  geography?: string;
  timeWindow?: string;
}

export function WebSearchCard({ idea, industry, geography, timeWindow }: WebSearchCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data, loading, error, status, lastUpdated, refresh, cacheAge } = useCardData({
    cardType: 'web-search',
    idea,
    industry,
    geo: geography,
    time_window: timeWindow
  });

  const competitionIntensity = data?.metrics?.[0]?.value || '0%';
  const monetizationPotential = data?.metrics?.[1]?.value || '0%';
  const topQueries = (data as any)?.top_queries || [];
  const competitors = (data as any)?.competitors || [];
  const competitorInsights = (data as any)?.competitor_insights || [];

  const getIntensityColor = (value: string | number) => {
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (num >= 70) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
    if (num >= 40) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
    return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
  };

  const getPotentialColor = (value: string | number) => {
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (num >= 70) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
    if (num >= 40) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
  };

  const formatCacheAge = (seconds: number): string => {
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading && !data) {
    return (
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Web Search Analysis</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Loading search insights...
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">Web Search Analysis</CardTitle>
                <CardDescription className="text-xs mt-1 text-destructive">
                  {error || 'Failed to load search data'}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              className="h-8 px-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <CardTitle className="text-lg">Web Search Analysis</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {lastUpdated && (
                    <>Updated {formatCacheAge(cacheAge || 0)}</>
                  )}
                </CardDescription>
                {cacheAge !== undefined && (
                  <div className="mt-1">
                    {cacheAge < 60 ? (
                      <Badge 
                        variant="secondary" 
                        className="text-xs py-0 px-1.5 h-5 w-fit bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                        Fresh data
                      </Badge>
                    ) : (
                      <Badge 
                        variant="secondary" 
                        className="text-xs py-0 px-1.5 h-5 w-fit bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1 animate-pulse" />
                        Cached • {formatCacheAge(cacheAge)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  refresh();
                }}
                disabled={loading}
                className="h-8 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metrics Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant="secondary" 
              className={`font-medium ${getIntensityColor(competitionIntensity)}`}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Competition: {competitionIntensity}
            </Badge>
            <Badge 
              variant="secondary"
              className={`font-medium ${getPotentialColor(monetizationPotential)}`}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Monetization: {monetizationPotential}
            </Badge>
          </div>

          {/* Top Transactional Queries */}
          {topQueries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Top Money Keywords:</p>
              <div className="flex flex-wrap gap-1">
                {topQueries.slice(0, 4).map((query: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs py-0.5">
                    {query}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mini Competitor Table */}
          {competitors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Top Competitors:</p>
              <div className="space-y-1">
                {competitors.slice(0, 3).map((comp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="truncate flex-1">{comp.domain}</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {comp.appearances} results
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cache Status Indicator */}
          {cacheAge !== undefined && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${
                cacheAge < 60 ? 'bg-green-500' :
                cacheAge < 3600 ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} />
              <span>Data from {formatCacheAge(cacheAge)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed View Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Web Search Deep Dive
            </SheetTitle>
            <SheetDescription>
              Comprehensive search analysis and competitor insights
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            <div className="space-y-6 pr-4">
              {/* Metrics Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Market Signals</h3>
                <div className="grid grid-cols-2 gap-4">
                  {data?.metrics?.map((metric, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold">{metric.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{metric.name}</div>
                      <div className="text-xs mt-2">{metric.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* All Transactional Queries */}
              {topQueries.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Commercial Intent Queries</h3>
                  <div className="flex flex-wrap gap-2">
                    {topQueries.map((query: string, idx: number) => (
                      <Badge 
                        key={idx} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')}
                      >
                        {query}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Query Analysis Table */}
              {data?.items && data.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Query Analysis</h3>
                  <div className="space-y-2">
                    {data.items.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{item.snippet}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() => window.open(item.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        {item.evidence && item.evidence.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {item.evidence.map((domain, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {domain}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Competitor Insights */}
              {competitorInsights.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Competitor Deep Dive</h3>
                  <div className="space-y-3">
                    {competitorInsights.map((insight: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-sm">{insight.domain}</div>
                          {insight.hasPricing && (
                            <Badge variant="default" className="text-xs">
                              Has Pricing
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {insight.snippet}
                        </div>
                        {insight.prices && insight.prices.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {insight.prices.map((price: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {price}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto mt-2 text-xs"
                          onClick={() => window.open(insight.url, '_blank')}
                        >
                          View Full Page <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Citations */}
              {data?.citations && data.citations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Sources</h3>
                  <div className="space-y-1">
                    {data.citations.map((citation, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{citation.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => window.open(citation.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {data?.warnings && data.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="space-y-1">
                      {data.warnings.map((warning, idx) => (
                        <p key={idx} className="text-xs text-yellow-800 dark:text-yellow-200">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}