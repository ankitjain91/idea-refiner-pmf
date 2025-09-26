import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnhancedPMFDashboardProps {
  idea: string;
  userAnswers: Record<string, string>;
}

export default function EnhancedPMFDashboard({ idea, userAnswers }: EnhancedPMFDashboardProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardInsights();
  }, [idea, userAnswers]);

  const fetchDashboardInsights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: { idea, userAnswers }
      });

      if (error) throw error;
      if (data?.insights) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.error('Error fetching insights:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch insights from ChatGPT',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Fetching Real Data from ChatGPT</h3>
          <p className="text-sm text-muted-foreground">Analyzing market, competitors, and improvements...</p>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PM-Fit Score: {insights.pmfScore}%</h2>
          <p className="text-sm text-muted-foreground">Real-time analysis from ChatGPT</p>
        </div>
        <button onClick={fetchDashboardInsights} className="p-2">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <Tabs defaultValue="quickwins" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="quickwins">Quick Wins</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[500px] mt-4">
          <TabsContent value="quickwins" className="space-y-4">
            {insights.quickWins?.map((win: any, idx: number) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle>{win.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge>Impact: {win.impact}</Badge>
                    <Badge>Effort: {win.effort}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>{win.description}</p>
                  <div className="mt-2">
                    <strong>Steps:</strong>
                    <ul className="list-disc list-inside">
                      {win.specificSteps?.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {win.sources?.map((source: any, i: number) => (
                      <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {source.name}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="improvements" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">By Timeframe</h3>
              {insights.improvementsByTime?.map((group: any, idx: number) => (
                <Card key={idx} className="mb-4">
                  <CardHeader>
                    <CardTitle>{group.timeframe}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {group.improvements?.map((imp: any, i: number) => (
                      <div key={i} className="mb-3">
                        <h4 className="font-medium">{imp.title}</h4>
                        <p className="text-sm">{imp.description}</p>
                        <div className="flex gap-2 mt-2">
                          {imp.sources?.map((source: any, j: number) => (
                            <a key={j} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
                              {source.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-3">By Cost</h3>
              {insights.improvementsByCost?.map((group: any, idx: number) => (
                <Card key={idx} className="mb-4">
                  <CardHeader>
                    <CardTitle>{group.budget}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {group.improvements?.map((imp: any, i: number) => (
                      <div key={i} className="mb-3">
                        <h4 className="font-medium">{imp.title} - {imp.cost}</h4>
                        <p className="text-sm">{imp.description}</p>
                        <p className="text-sm font-medium">ROI: {imp.roi}</p>
                        <div className="flex gap-2 mt-2">
                          {imp.sources?.map((source: any, j: number) => (
                            <a key={j} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
                              {source.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="competitors" className="space-y-4">
            {insights.competitors?.map((comp: any, idx: number) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle>{comp.name}</CardTitle>
                  <Badge>{comp.marketShare} market share</Badge>
                </CardHeader>
                <CardContent>
                  <p>{comp.description}</p>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <strong>Pricing:</strong> {comp.pricing}
                    </div>
                    <div>
                      <strong>Funding:</strong> {comp.fundingRaised}
                    </div>
                  </div>
                  <div className="mt-3">
                    <a href={comp.website} target="_blank" rel="noopener noreferrer" className="text-primary">
                      Visit Website
                    </a>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {comp.sources?.map((source: any, i: number) => (
                      <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {source.name}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Organic Channels</h3>
              {insights.channels?.organic?.map((channel: any, idx: number) => (
                <Card key={idx} className="mb-3">
                  <CardHeader>
                    <CardTitle>{channel.name}</CardTitle>
                    <Badge>{channel.potential} potential</Badge>
                  </CardHeader>
                  <CardContent>
                    <p>{channel.strategy}</p>
                    <div className="flex gap-2 mt-2">
                      {channel.sources?.map((source: any, i: number) => (
                        <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
                          {source.name}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Paid Channels</h3>
              {insights.channels?.paid?.map((channel: any, idx: number) => (
                <Card key={idx} className="mb-3">
                  <CardHeader>
                    <CardTitle>{channel.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge>CAC: {channel.cac}</Badge>
                      <Badge>{channel.effectiveness} effectiveness</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p>{channel.strategy}</p>
                    <p className="text-sm">Budget: {channel.budget}</p>
                    <div className="flex gap-2 mt-2">
                      {channel.sources?.map((source: any, i: number) => (
                        <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
                          {source.name}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Size</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{insights.marketSize?.total}</p>
                <p>Growth: {insights.marketSize?.growth}</p>
                <div className="flex gap-2 mt-2">
                  {insights.marketSize?.sources?.map((source: any, i: number) => (
                    <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">
                      {source.name}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Search Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{insights.realTimeMetrics?.searchVolume?.monthly?.toLocaleString()}</p>
                <Badge>{insights.realTimeMetrics?.searchVolume?.trend}</Badge>
                <div className="mt-2">
                  {insights.realTimeMetrics?.searchVolume?.relatedQueries?.map((query: string, i: number) => (
                    <Badge key={i} variant="outline" className="mr-1">{query}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Projections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Month 1</p>
                    <p className="font-bold">{insights.monetization?.revenue?.month1}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Month 6</p>
                    <p className="font-bold">{insights.monetization?.revenue?.month6}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year 1</p>
                    <p className="font-bold">{insights.monetization?.revenue?.year1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}