import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, ExternalLink, RefreshCw, TrendingUp, Users, DollarSign, Target, Zap, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PMFScoreDisplay } from './dashboard/PMFScoreDisplay';
import { ScoreCard } from './dashboard/ScoreCard';
import { GrowthChart } from './dashboard/GrowthChart';
import { CompetitorChart } from './dashboard/CompetitorChart';
import { MetricDetailModal } from './dashboard/MetricDetailModal';

interface EnhancedPMFDashboardProps {
  idea: string;
  userAnswers: Record<string, string>;
}

export default function EnhancedPMFDashboard({ idea, userAnswers }: EnhancedPMFDashboardProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardInsights(0);
  }, [idea, userAnswers]);

  const fetchDashboardInsights = async (retry = 0) => {
    setLoading(true);
    setProgress(10);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: { idea, userAnswers },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;
      if (!data?.insights) throw new Error('No insights returned');

      setInsights(data.insights);
      setLoading(false);
      // Let progress briefly reach 100% before resetting
      setTimeout(() => setProgress(0), 300);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Error fetching insights:', err);
      
      // Faster retry with reduced delays
      const delay = Math.min(2000, 500 + (500 * retry));
      setProgress(0);
      
      if (retry < 3) {
        toast({
          title: "Fetching data...",
          description: `Retrying in ${delay/1000} seconds...`,
          duration: 2000,
        });
        setTimeout(() => fetchDashboardInsights(retry + 1), delay);
      } else {
        toast({
          title: "Still loading...",
          description: "The AI is generating comprehensive insights. Please wait...",
          duration: 3000,
        });
        setTimeout(() => fetchDashboardInsights(0), 1000);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Fetching Real-Time Data</h3>
          <p className="text-sm text-muted-foreground">
            Analyzing market trends, competitors, and generating actionable insights...
          </p>
          <Progress value={progress} className="w-64 mx-auto" />
          <p className="text-xs text-muted-foreground">{progress}% Complete</p>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
      {/* Header with Score Display */}
      <div className="flex items-center justify-between">
        <PMFScoreDisplay 
          currentScore={insights.pmfScore} 
          previousScore={insights.previousScore || insights.pmfScore - 10}
        />
        <button 
          onClick={() => fetchDashboardInsights(0)} 
          className="p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Score Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.scoreBreakdown && (
          <>
            <div 
              className="cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => {
                setSelectedMetric({
                  title: "Market Demand",
                  ...insights.scoreBreakdown.marketDemand
                });
                setMetricModalOpen(true);
              }}
            >
              <ScoreCard
                title="Market Demand"
                current={insights.scoreBreakdown.marketDemand.current}
                potential={insights.scoreBreakdown.marketDemand.potential}
                label={insights.scoreBreakdown.marketDemand.label}
                color="blue"
              />
              <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Info className="w-3 h-3 mr-1" />
                Click for details
              </div>
            </div>
            
            <div 
              className="cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => {
                setSelectedMetric({
                  title: "Product Readiness",
                  ...insights.scoreBreakdown.productReadiness
                });
                setMetricModalOpen(true);
              }}
            >
              <ScoreCard
                title="Product Readiness"
                current={insights.scoreBreakdown.productReadiness.current}
                potential={insights.scoreBreakdown.productReadiness.potential}
                label={insights.scoreBreakdown.productReadiness.label}
                color="green"
              />
              <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Info className="w-3 h-3 mr-1" />
                Click for details
              </div>
            </div>
            
            <div 
              className="cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => {
                setSelectedMetric({
                  title: "User Engagement",
                  ...insights.scoreBreakdown.userEngagement
                });
                setMetricModalOpen(true);
              }}
            >
              <ScoreCard
                title="User Engagement"
                current={insights.scoreBreakdown.userEngagement.current}
                potential={insights.scoreBreakdown.userEngagement.potential}
                label={insights.scoreBreakdown.userEngagement.label}
                color="purple"
              />
              <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Info className="w-3 h-3 mr-1" />
                Click for details
              </div>
            </div>
            
            <div 
              className="cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => {
                setSelectedMetric({
                  title: "Revenue Viability",
                  ...insights.scoreBreakdown.revenueViability
                });
                setMetricModalOpen(true);
              }}
            >
              <ScoreCard
                title="Revenue Viability"
                current={insights.scoreBreakdown.revenueViability.current}
                potential={insights.scoreBreakdown.revenueViability.potential}
                label={insights.scoreBreakdown.revenueViability.label}
                color="orange"
              />
              <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Info className="w-3 h-3 mr-1" />
                Click for details
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.growthMetrics?.timeline && (
          <GrowthChart data={insights.growthMetrics.timeline} />
        )}
        {insights.competitorComparison && (
          <CompetitorChart data={insights.competitorComparison} />
        )}
      </div>

      {/* Detailed Insights Tabs */}
      <Tabs defaultValue="quickwins" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="quickwins" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Quick Wins
          </TabsTrigger>
          <TabsTrigger value="improvements" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Improvements
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[500px] mt-4">
          <TabsContent value="quickwins" className="space-y-4">
            {insights.quickWins?.map((win: any, idx: number) => (
              <Card 
                key={idx} 
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-primary hover:scale-[1.02]"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{win.title}</span>
                    <Zap className="w-5 h-5 text-yellow-500" />
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={win.impact === 'High' ? 'default' : 'secondary'}>
                      Impact: {win.impact}
                    </Badge>
                    <Badge variant={win.effort === 'Low' ? 'default' : 'secondary'}>
                      Effort: {win.effort}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{win.description}</p>
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <strong className="text-sm">Implementation Steps:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {win.specificSteps?.map((step: string, i: number) => (
                        <li key={i} className="text-sm">{step}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {win.sources?.map((source: any, i: number) => (
                      <a 
                        key={i} 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                      >
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.competitors?.map((comp: any, idx: number) => (
                <Card 
                  key={idx}
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-background to-muted/20"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{comp.name}</CardTitle>
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <Badge className="w-fit">{comp.marketShare} market share</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{comp.description}</p>
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Pricing</p>
                        <p className="font-semibold">{comp.pricing}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Funding</p>
                        <p className="font-semibold">{comp.fundingRaised}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <a 
                        href={comp.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Visit Website
                      </a>
                      <div className="flex gap-2">
                        {comp.sources?.map((source: any, i: number) => (
                          <a 
                            key={i} 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            {source.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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

          <TabsContent value="metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-500/5 to-blue-600/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  Market Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{insights.marketSize?.total}</p>
                <p className="text-sm text-muted-foreground mt-1">Growth: {insights.marketSize?.growth}</p>
                <div className="flex gap-2 mt-3">
                  {insights.marketSize?.sources?.map((source: any, i: number) => (
                    <a 
                      key={i} 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      {source.name}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-500/5 to-green-600/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Search Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {insights.realTimeMetrics?.searchVolume?.monthly?.toLocaleString()}
                </p>
                <Badge className="mt-2" variant={insights.realTimeMetrics?.searchVolume?.trend === 'Increasing' ? 'default' : 'secondary'}>
                  {insights.realTimeMetrics?.searchVolume?.trend}
                </Badge>
                <div className="mt-3 flex flex-wrap gap-1">
                  {insights.realTimeMetrics?.searchVolume?.relatedQueries?.map((query: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{query}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500/5 to-purple-600/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                  Revenue Projections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <p className="text-sm text-muted-foreground">Month 1</p>
                    <p className="font-bold text-purple-600">{insights.monetization?.revenue?.month1}</p>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <p className="text-sm text-muted-foreground">Month 6</p>
                    <p className="font-bold text-purple-600">{insights.monetization?.revenue?.month6}</p>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <p className="text-sm text-muted-foreground">Year 1</p>
                    <p className="font-bold text-purple-600">{insights.monetization?.revenue?.year1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Metric Detail Modal */}
      <MetricDetailModal
        isOpen={metricModalOpen}
        onClose={() => setMetricModalOpen(false)}
        metric={selectedMetric}
        idea={idea}
      />
    </div>
  );
}