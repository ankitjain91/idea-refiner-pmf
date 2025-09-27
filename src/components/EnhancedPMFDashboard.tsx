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
// Lazy-loaded panel components for code-splitting
const QuickWinsPanel = React.lazy(() => import('./dashboard/panels/QuickWinsPanel'));
const ImprovementsPanel = React.lazy(() => import('./dashboard/panels/ImprovementsPanel'));
const CompetitorsPanel = React.lazy(() => import('./dashboard/panels/CompetitorsPanel'));
const ChannelsPanel = React.lazy(() => import('./dashboard/panels/ChannelsPanel'));
const MetricsPanel = React.lazy(() => import('./dashboard/panels/MetricsPanel'));
import { DashboardPanelBoundary } from './dashboard/DashboardPanelBoundary';

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
          <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading panel...</div>}>
            <TabsContent value="quickwins" className="space-y-4">
              <DashboardPanelBoundary label="Quick Wins">
                <QuickWinsPanel wins={insights.quickWins} onSelect={setSelectedItem} setDetailModalOpen={setDetailModalOpen} />
              </DashboardPanelBoundary>
            </TabsContent>
            <TabsContent value="improvements" className="space-y-4">
              <DashboardPanelBoundary label="Improvements">
                <ImprovementsPanel improvementsByTime={insights.improvementsByTime} improvementsByCost={insights.improvementsByCost} onSelect={setSelectedItem} setDetailModalOpen={setDetailModalOpen} />
              </DashboardPanelBoundary>
            </TabsContent>
            <TabsContent value="competitors" className="space-y-4">
              <DashboardPanelBoundary label="Competitors">
                <CompetitorsPanel competitors={insights.competitors} onSelect={setSelectedItem} setDetailModalOpen={setDetailModalOpen} />
              </DashboardPanelBoundary>
            </TabsContent>
            <TabsContent value="channels" className="space-y-4">
              <DashboardPanelBoundary label="Channels">
                <ChannelsPanel channels={insights.channels} onSelect={setSelectedItem} setDetailModalOpen={setDetailModalOpen} />
              </DashboardPanelBoundary>
            </TabsContent>
            <TabsContent value="metrics" className="space-y-4">
              <DashboardPanelBoundary label="Metrics">
                <MetricsPanel insights={insights} onSelect={setSelectedItem} setDetailModalOpen={setDetailModalOpen} />
              </DashboardPanelBoundary>
            </TabsContent>
          </React.Suspense>
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