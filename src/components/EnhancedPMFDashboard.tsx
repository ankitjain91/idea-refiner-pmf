import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, ExternalLink, RefreshCw, TrendingUp, Users, DollarSign, Target, Zap, Info, ChevronRight, Clock, BarChart3, Lightbulb, AlertCircle, CheckCircle, Activity, MapPin, Package, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PMFScoreDisplay } from './dashboard/PMFScoreDisplay';
import { ScoreCard } from './dashboard/ScoreCard';
import { GrowthChart } from './dashboard/GrowthChart';
import { CompetitorChart } from './dashboard/CompetitorChart';
import { MetricDetailModal } from './dashboard/MetricDetailModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
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
                onClick={() => {
                  setSelectedItem({
                    type: 'quickwin',
                    ...win,
                    why: win.reasoning || 'This quick win can accelerate your path to product-market fit',
                    how: win.specificSteps || [],
                    where: win.sources || [],
                    impact: win.expectedImpact || '10-15% improvement in PMF score',
                    result: win.expectedResult || 'Immediate improvement in user engagement and market response'
                  });
                  setDetailModalOpen(true);
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="group-hover:text-primary transition-colors">{win.title}</span>
                    <Zap className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={win.impact === 'High' ? 'default' : 'secondary'} className="animate-pulse">
                      Impact: {win.impact}
                    </Badge>
                    <Badge variant={win.effort === 'Low' ? 'default' : 'secondary'}>
                      Effort: {win.effort}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {win.timeframe || '1-2 weeks'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{win.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    Expected improvement: {win.expectedDelta || '+5-10%'}
                    <ChevronRight className="w-3 h-3 ml-auto" />
                    Click for full analysis
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="improvements" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                By Timeframe
              </h3>
              {insights.improvementsByTime?.map((group: any, idx: number) => (
                <Card 
                  key={idx} 
                  className="mb-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-green-500"
                  onClick={() => {
                    setSelectedItem({
                      type: 'improvement-timeframe',
                      title: group.timeframe,
                      improvements: group.improvements,
                      totalImpact: `${group.improvements?.length || 0} improvements`,
                      why: `These improvements are scheduled for ${group.timeframe} to maximize efficiency`,
                      how: group.improvements?.map((imp: any) => imp.description) || [],
                      where: group.improvements?.flatMap((imp: any) => imp.sources || []) || [],
                      impact: `Combined impact: ${group.expectedImpact || '20-30% PMF improvement'}`,
                      result: group.expectedResult || 'Progressive improvement in product-market fit'
                    });
                    setDetailModalOpen(true);
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {group.timeframe}
                      <Badge variant="outline" className="ml-2">
                        {group.improvements?.length || 0} actions
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {group.improvements?.map((imp: any, i: number) => (
                      <div key={i} className="mb-3 p-3 bg-muted/30 rounded-lg">
                        <h4 className="font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {imp.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{imp.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {imp.expectedDelta || '+5%'}
                          </Badge>
                          {imp.confidence && (
                            <Badge variant="outline" className="text-xs">
                              Confidence: {imp.confidence}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 mr-1" />
                      Click for detailed implementation plan
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                By Cost
              </h3>
              {insights.improvementsByCost?.map((group: any, idx: number) => (
                <Card 
                  key={idx} 
                  className="mb-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-blue-500"
                  onClick={() => {
                    setSelectedItem({
                      type: 'improvement-cost',
                      title: group.budget,
                      improvements: group.improvements,
                      why: `Optimized for ${group.budget} budget constraints`,
                      how: group.improvements?.map((imp: any) => `${imp.title}: ${imp.description}`) || [],
                      where: group.improvements?.flatMap((imp: any) => imp.sources || []) || [],
                      impact: `Average ROI: ${group.averageROI || '300%'}`,
                      result: `Expected revenue impact: ${group.revenueImpact || '$10K-50K'}`
                    });
                    setDetailModalOpen(true);
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {group.budget}
                      <Badge variant="outline">
                        {group.improvements?.length || 0} options
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {group.improvements?.map((imp: any, i: number) => (
                      <div key={i} className="mb-3 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{imp.title}</h4>
                          <Badge variant="secondary">{imp.cost}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{imp.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            ROI: {imp.roi}
                          </Badge>
                          <span className="text-xs text-green-500">
                            +{imp.expectedRevenue || '$5K'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 mr-1" />
                      View full ROI analysis
                    </div>
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
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-purple-500"
                  onClick={() => {
                    setSelectedItem({
                      type: 'competitor',
                      title: comp.name,
                      ...comp,
                      why: `Understanding ${comp.name} helps identify market gaps and opportunities`,
                      how: [
                        `They target: ${comp.targetMarket || 'Similar audience'}`,
                        `Their USP: ${comp.usp || comp.description}`,
                        `Key features: ${comp.keyFeatures?.join(', ') || 'Feature parity required'}`,
                        `Weaknesses: ${comp.weaknesses?.join(', ') || 'Limited customer support'}`
                      ],
                      where: comp.sources || [],
                      impact: `Market opportunity: ${comp.marketGap || '15-20% untapped segment'}`,
                      result: `Differentiation strategy: ${comp.differentiationStrategy || 'Focus on underserved features'}`
                    });
                    setDetailModalOpen(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">{comp.name}</CardTitle>
                      <Target className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex gap-2">
                      <Badge className="w-fit">{comp.marketShare} market share</Badge>
                      <Badge variant="outline">{comp.userBase || '10K+ users'}</Badge>
                    </div>
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
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="w-3 h-3" />
                        Threat level: {comp.threatLevel || 'Medium'}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                Organic Channels
              </h3>
              {insights.channels?.organic?.map((channel: any, idx: number) => (
                <Card 
                  key={idx} 
                  className="mb-3 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-orange-500"
                  onClick={() => {
                    setSelectedItem({
                      type: 'channel-organic',
                      title: channel.name,
                      ...channel,
                      why: `${channel.name} offers ${channel.potential} potential for organic growth`,
                      how: [
                        channel.strategy,
                        `Content strategy: ${channel.contentStrategy || 'Educational content and community building'}`,
                        `Engagement tactics: ${channel.engagementTactics || 'Regular posting and interaction'}`,
                        `Growth hacks: ${channel.growthHacks || 'Viral loops and user-generated content'}`
                      ],
                      where: channel.sources || [],
                      impact: `Expected reach: ${channel.expectedReach || '10K-50K organic impressions/month'}`,
                      result: `Conversion rate: ${channel.conversionRate || '2-5% from organic traffic'}`
                    });
                    setDetailModalOpen(true);
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {channel.name}
                      <Users className="w-4 h-4 text-orange-500" />
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={channel.potential === 'High' ? 'default' : 'secondary'}>
                        {channel.potential} potential
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        {channel.timeToResults || '2-3 months'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{channel.strategy}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-green-500">
                        Cost: {channel.cost || 'Free'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Paid Channels
              </h3>
              {insights.channels?.paid?.map((channel: any, idx: number) => (
                <Card 
                  key={idx} 
                  className="mb-3 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-indigo-500"
                  onClick={() => {
                    setSelectedItem({
                      type: 'channel-paid',
                      title: channel.name,
                      ...channel,
                      why: `${channel.name} provides ${channel.effectiveness} effectiveness for paid acquisition`,
                      how: [
                        channel.strategy,
                        `Targeting: ${channel.targeting || 'Lookalike audiences and interest-based'}`,
                        `Ad formats: ${channel.adFormats || 'Video, carousel, and dynamic ads'}`,
                        `Optimization: ${channel.optimization || 'A/B testing and bid optimization'}`
                      ],
                      where: channel.sources || [],
                      impact: `ROI: ${channel.roi || '200-300%'} | LTV:CAC ratio: ${channel.ltvcac || '3:1'}`,
                      result: `Monthly acquisitions: ${channel.monthlyAcquisitions || '100-500 customers'}`
                    });
                    setDetailModalOpen(true);
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {channel.name}
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge>CAC: {channel.cac}</Badge>
                      <Badge variant={channel.effectiveness === 'High' ? 'default' : 'secondary'}>
                        {channel.effectiveness} effectiveness
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{channel.strategy}</p>
                    <div className="mt-2 p-2 bg-muted/30 rounded">
                      <p className="text-xs">Budget: {channel.budget}</p>
                      <p className="text-xs">Expected ROAS: {channel.roas || '2.5x'}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-end">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card 
              className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-l-4 border-l-blue-500"
              onClick={() => {
                setSelectedItem({
                  type: 'metric',
                  title: 'Market Size',
                  value: insights.marketSize?.total,
                  growth: insights.marketSize?.growth,
                  why: 'Market size determines the total addressable opportunity for your product',
                  how: [
                    `Total addressable market: ${insights.marketSize?.tam || '$500M'}`,
                    `Serviceable addressable market: ${insights.marketSize?.sam || '$100M'}`,
                    `Serviceable obtainable market: ${insights.marketSize?.som || '$10M'}`,
                    `Year-over-year growth: ${insights.marketSize?.growth}`
                  ],
                  where: insights.marketSize?.sources || [],
                  impact: `Capture potential: ${insights.marketSize?.captureRate || '1-5%'} of market`,
                  result: `Revenue opportunity: ${insights.marketSize?.revenueOpportunity || '$1M-5M ARR'}`
                });
                setDetailModalOpen(true);
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  Market Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{insights.marketSize?.total || '$100M'}</p>
                <p className="text-sm text-muted-foreground mt-1">Growth: {insights.marketSize?.growth || '25% YoY'}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {insights.marketSize?.trend || 'Expanding'}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
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

      {/* Generic Detail Modal for other items */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              {selectedItem?.type === 'quickwin' && <Zap className="w-6 h-6 text-yellow-500" />}
              {selectedItem?.type === 'competitor' && <Target className="w-6 h-6 text-purple-500" />}
              {selectedItem?.type?.includes('channel') && <Rocket className="w-6 h-6 text-orange-500" />}
              {selectedItem?.type?.includes('improvement') && <TrendingUp className="w-6 h-6 text-green-500" />}
              {selectedItem?.type === 'metric' && <BarChart3 className="w-6 h-6 text-blue-500" />}
              {selectedItem?.title}
            </DialogTitle>
            <DialogDescription>
              Comprehensive analysis and actionable insights for: <span className="font-semibold text-foreground">{idea}</span>
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {/* Why Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-lg">Why This Matters</h3>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">{selectedItem?.why}</p>
                </div>
              </div>

              {/* How Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-lg">How to Implement</h3>
                </div>
                <div className="space-y-2">
                  {selectedItem?.how?.map((step: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Sources */}
              {selectedItem?.where?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-lg">Data Sources</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem?.where?.map((source: any, idx: number) => (
                      <a 
                        key={idx}
                        href={source.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-xs hover:bg-primary/10 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {source.name || source}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Impact & Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <h4 className="font-semibold">Expected Impact</h4>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-3 rounded-lg">
                    <p className="text-sm">{selectedItem?.impact}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold">Expected Result</h4>
                  </div>
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-3 rounded-lg">
                    <p className="text-sm">{selectedItem?.result}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}