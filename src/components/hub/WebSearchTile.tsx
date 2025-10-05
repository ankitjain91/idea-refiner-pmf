import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search, Globe, TrendingUp, Shield, Users, Lightbulb,
  ExternalLink, RefreshCw, AlertCircle, CheckCircle2,
  ChevronRight, FileText, Building, Sparkles
} from 'lucide-react';
import { TileAIChat } from './TileAIChat';
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, Treemap, Legend
} from 'recharts';
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { cn } from '@/lib/utils';

interface WebSearchTileProps {
  idea: string;
  className?: string;
}

interface WebSearchCluster {
  cluster_id: string;
  title: string;
  influence_score: number;
  metrics: {
    volume: number;
    freshness_days_median: number;
    source_diversity: number;
    relevance_to_idea: number;
    credibility_score: number;
  };
  insight: string;
  entities: string[];
  faqs: Array<{
    q: string;
    a: string;
    citations: Array<{ source: string; title: string; url: string; date?: string }>;
  }>;
  citations: Array<{
    source: string;
    title: string;
    url: string;
    date?: string;
  }>;
}

interface WebSearchData {
  web_search: {
    summary: string;
    clusters: WebSearchCluster[];
    charts: Array<{
      type: string;
      title: string;
      data: any[];
    }>;
    visuals_ready: boolean;
    confidence: 'High' | 'Moderate' | 'Low';
  };
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
  'hsl(var(--destructive))',
  'hsl(var(--warning))'
];

export function WebSearchTile({ idea, className }: WebSearchTileProps) {
  const [data, setData] = useState<WebSearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showAIChat, setShowAIChat] = useState(false);

  const fetchWebSearchData = async () => {
    if (!idea?.trim()) {
      setError('No idea provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await optimizedQueue.invokeFunction('web-search', {
        idea_keywords: idea,  // Changed from 'idea' to 'idea_keywords'
        userId: 'anonymous'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setData(response);
      setLastRefresh(new Date());
      
      // Select first cluster by default
      if (response.web_search?.clusters?.length > 0 && !selectedCluster) {
        setSelectedCluster(response.web_search.clusters[0].cluster_id);
      }
    } catch (err) {
      console.error('[WebSearchTile] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch web search data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebSearchData();
  }, [idea]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWebSearchData();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [idea]);

  // Listen for idea:changed event
  useEffect(() => {
    const handleIdeaChange = () => {
      console.log('[WebSearchTile] idea:changed event received, refetching data');
      fetchWebSearchData();
    };
    
    window.addEventListener('idea:changed', handleIdeaChange);
    
    return () => {
      window.removeEventListener('idea:changed', handleIdeaChange);
    };
  }, []);

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'default';
      case 'Moderate': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  const getInfluenceColor = (score: number) => {
    if (score >= 0.7) return 'hsl(var(--success))';
    if (score >= 0.4) return 'hsl(var(--warning))';
    return 'hsl(var(--muted))';
  };

  const renderTreemap = (chartData: any[]) => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <Treemap
          data={chartData}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="hsl(var(--border))"
          fill="hsl(var(--primary))"
        >
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded-lg p-2 shadow-lg">
                    <p className="font-semibold">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Volume: {data.value} results
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    );
  };

  const renderBubbleChart = (chartData: any[]) => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="category" dataKey="cluster" name="Cluster" />
          <YAxis type="number" dataKey="mentions" name="Mentions" />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded-lg p-2 shadow-lg">
                    <p className="font-semibold">{data.entity}</p>
                    <p className="text-sm text-muted-foreground">
                      Cluster: {data.cluster}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Mentions: {data.mentions}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Influence: {(data.influence * 100).toFixed(0)}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter name="Entities" data={chartData} fill="hsl(var(--primary))">
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.6 + entry.influence * 0.4}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  if (loading && !data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchWebSearchData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.web_search) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No web search data available. Try refreshing or adjusting your idea.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { web_search: webSearch } = data;
  const selectedClusterData = webSearch.clusters.find(c => c.cluster_id === selectedCluster);

  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Web Intelligence
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {webSearch.clusters.length} themes • {webSearch.clusters.reduce((sum, c) => sum + c.metrics.volume, 0)} sources
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIChat(true)}
              className="gap-1 px-3 py-1.5 h-auto whitespace-nowrap text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Analysis</span>
            </Button>
            <Badge variant={getConfidenceBadgeVariant(webSearch.confidence)}>
              {webSearch.confidence} Confidence
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={fetchWebSearchData}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={loading}
                  >
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last updated: {lastRefresh.toLocaleTimeString()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="px-6 pb-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm leading-relaxed">{webSearch.summary}</p>
          </div>
        </div>

        <Tabs defaultValue="themes" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger
              value="themes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Themes
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Insights
            </TabsTrigger>
            <TabsTrigger
              value="faqs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              FAQs
            </TabsTrigger>
            <TabsTrigger
              value="visuals"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Visuals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-3">
                {webSearch.clusters.map((cluster) => (
                  <div
                    key={cluster.cluster_id}
                    className={cn(
                      "rounded-lg border p-4 cursor-pointer transition-colors",
                      selectedCluster === cluster.cluster_id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedCluster(cluster.cluster_id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        {cluster.title}
                        <Badge variant="outline" className="text-xs">
                          {cluster.metrics.volume} sources
                        </Badge>
                      </h3>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={cluster.influence_score * 100}
                          className="w-20 h-2"
                        />
                        <span className="text-xs text-muted-foreground">
                          {(cluster.influence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Freshness</p>
                        <p className="text-sm font-medium">
                          {cluster.metrics.freshness_days_median}d
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Diversity</p>
                        <p className="text-sm font-medium">
                          {cluster.metrics.source_diversity}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Relevance</p>
                        <p className="text-sm font-medium">
                          {cluster.metrics.relevance_to_idea}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Credibility</p>
                        <p className="text-sm font-medium">
                          {(cluster.metrics.credibility_score * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {cluster.insight}
                    </p>

                    {cluster.entities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cluster.entities.slice(0, 4).map((entity) => (
                          <Badge key={entity} variant="secondary" className="text-xs">
                            {entity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4">
                {selectedClusterData ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">{selectedClusterData.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedClusterData.insight}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Key Sources
                      </h4>
                      <div className="space-y-2">
                        {selectedClusterData.citations.map((citation, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50"
                          >
                            <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <a
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline truncate block"
                              >
                                {citation.title}
                              </a>
                              <p className="text-xs text-muted-foreground">
                                {citation.source} {citation.date && `• ${new Date(citation.date).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Key Entities
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedClusterData.entities.map((entity) => (
                          <Badge key={entity} variant="outline">
                            {entity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Select a theme to view detailed insights
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="faqs" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4">
                <Accordion type="single" collapsible className="w-full">
                  {webSearch.clusters.flatMap((cluster) =>
                    cluster.faqs.map((faq, idx) => (
                      <AccordionItem key={`${cluster.cluster_id}-faq-${idx}`} value={`${cluster.cluster_id}-faq-${idx}`}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-start gap-2 pr-4">
                            <HelpCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <span className="text-sm">{faq.q}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-6 space-y-2">
                            <p className="text-sm text-muted-foreground">{faq.a}</p>
                            {faq.citations.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-2">
                                {faq.citations.map((cite, cidx) => (
                                  <a
                                    key={cidx}
                                    href={cite.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {cite.source}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))
                  )}
                </Accordion>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="visuals" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-4">
                {webSearch.charts.map((chart, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="font-medium text-sm">{chart.title}</h4>
                    {chart.type === 'treemap' && renderTreemap(chart.data)}
                    {chart.type === 'bar' && (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="cluster" />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar dataKey="diversity" fill="hsl(var(--primary))" />
                          <Bar dataKey="volume" fill="hsl(var(--secondary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {chart.type === 'line' && (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area
                            type="monotone"
                            dataKey="results"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                    {chart.type === 'bubble' && renderBubbleChart(chart.data)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <TileAIChat
        open={showAIChat}
        onOpenChange={setShowAIChat}
        tileData={data as any}
        tileTitle="Web Intelligence"
        idea={idea}
      />
    </Card>
  );
}

// Add missing import
import { HelpCircle } from 'lucide-react';