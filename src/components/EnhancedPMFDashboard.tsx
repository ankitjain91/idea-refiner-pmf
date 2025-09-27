import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, ExternalLink, RefreshCw, TrendingUp, Users, DollarSign, Target, Zap, Info, ChevronRight, Clock, BarChart3, Lightbulb, AlertCircle, CheckCircle, Activity, MapPin, Package, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getOrFetchInsights } from '@/lib/insights-cache';
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
  const [marketData, setMarketData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardInsights(0);
  }, [idea, userAnswers]);

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const factTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [factIndex, setFactIndex] = useState(0);
  const FUN_FACTS = [
    '🦄 Only ~0.5% of startups ever reach a $1B valuation — clarity compounds.',
    '⚙️ Shaving 30 seconds off a core workflow can 2x perceived product speed.',
    '🎯 Narrow ICP focus early often improves activation by 20–40%.',
    '🔁 Users rarely churn for “missing features” – unclear value is the usual root.',
    '📈 Launch timing matters less than iteration speed post‑launch.',
    '🧪 PMF signals often appear first in qualitative “unexpected retention” stories.',
    '💬 Re-using user phrasing in your value prop can lift conversions noticeably.',
    '🏗️ Overbuilt MVPs delay the learning loop that creates real moat.',
    '💸 Pricing conversations before code saves months of wasted build.',
    '🛰️ Side-channel communities (Slack/Discord) surface leading indicators early.',
    '📊 Instrumenting a single north-star metric reduces roadmap thrash.',
    '🪄 A crisp “who this is NOT for” accelerates ICP clarity.',
    '🚀 Fast follow-ups to feedback drive emotional lock-in with early users.'
  ];

  const visibilityHiddenRef = useRef(false);
  const loadStartedAtRef = useRef<number | null>(null);
  const activeFetchIdRef = useRef<string | null>(null);
  useEffect(() => {
    const vis = () => { visibilityHiddenRef.current = document.hidden; };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  const fetchDashboardInsights = async (retry = 0) => {
    setLoading(true);
    setProgress(8);
    if (!loadStartedAtRef.current) loadStartedAtRef.current = Date.now();
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress(p => (p < 90 ? Math.min(90, p + 7) : p));
    }, 650);
    if (!factTimerRef.current) {
      factTimerRef.current = setInterval(() => {
        setFactIndex(i => (i + 1) % FUN_FACTS.length);
      }, 4200);
    }

    try {
      const fetchId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      activeFetchIdRef.current = fetchId;
      const data = await getOrFetchInsights(
        idea,
        userAnswers,
        async () => {
          const { data, error } = await supabase.functions.invoke('dashboard-insights', { body: { idea, userAnswers } });
          if (error) throw error;
          if (!data?.insights) throw new Error('No insights returned');
          return data;
        },
        (p) => setProgress(p)
      );
      if (activeFetchIdRef.current !== fetchId) {
        // A newer fetch started; discard these results
        return;
      }
      setProgress(100);
      setInsights(data.insights);
      setMarketData(data.marketData || data.insights?.realSearchData);
      setLoading(false);
      setTimeout(() => setProgress(0), 400);
      const duration = loadStartedAtRef.current ? Date.now() - loadStartedAtRef.current : 0;
      if (visibilityHiddenRef.current) {
        toast({ title: 'Insights Ready', description: `Dashboard generated in ${(duration/1000).toFixed(1)}s while you were away.` });
      }
    } catch (err) {
      console.error('Error fetching insights:', err);
      setProgress(0);
      if (retry < 3) {
        const delay = 500 + retry * 600;
        toast({ title: 'Retrying…', description: `Re-attempting in ${Math.round(delay/1000)}s`, duration: 1500 });
        setTimeout(() => fetchDashboardInsights(retry + 1), delay);
      } else {
        toast({ title: 'Still generating', description: 'Background generation will continue even if you leave.', duration: 3000 });
      }
    } finally {
      // Do NOT clear timers here to allow background progress until resolved (as requested) – only clear on unmount.
    }
  };

  useEffect(() => {
    return () => {
      // Allow fetch to continue (we do not abort) but stop local intervals to prevent setState warnings.
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (factTimerRef.current) clearInterval(factTimerRef.current);
    };
  }, []);

  // Cached snapshot button availability
  let cachedSnapshot: any = null;
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('pmf.insights.cache:'));
    // pick most recent
    const recent = keys.sort((a,b) => {
      const ta = JSON.parse(localStorage.getItem(a) || '{}').timestamp || 0;
      const tb = JSON.parse(localStorage.getItem(b) || '{}').timestamp || 0;
      return tb - ta;
    })[0];
    if (recent) {
      const parsed = JSON.parse(localStorage.getItem(recent) || '{}');
      if (parsed.data?.insights) cachedSnapshot = parsed.data;
    }
  } catch {}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="text-center space-y-5 max-w-lg animate-in fade-in">
          <div className="relative inline-flex">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <span className="absolute -right-3 -top-2 text-xl animate-bounce">⚙️</span>
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Synthesizing Multi-Dimensional PMF Intelligence</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Parsing signals, modeling viability vectors, correlating market language, and assembling actionable growth levers…
          </p>
          <div className="space-y-2">
            <Progress value={progress} className="w-72 mx-auto" />
            <p className="text-[11px] font-mono text-muted-foreground">{progress}% • background generation continues if you navigate away</p>
          </div>
          <div className="text-xs rounded-md px-3 py-2 bg-muted/40 border inline-flex items-start gap-2 text-left">
            <span className="text-base">💡</span>
            <span className="leading-snug whitespace-pre-wrap min-h-[2ch] transition-all">
              {FUN_FACTS[factIndex]}
            </span>
            <button
              aria-label='Next fact'
              onClick={() => setFactIndex(i => (i + 1) % FUN_FACTS.length)}
              className='ml-2 text-[10px] px-1.5 py-0.5 rounded bg-background/60 border hover:bg-background/80 transition-colors'
            >↻</button>
          </div>
          {cachedSnapshot && (
            <div className='space-y-2'>
              <button
                onClick={() => { setInsights(cachedSnapshot.insights); setMarketData(cachedSnapshot.marketData || cachedSnapshot.insights?.realSearchData); setLoading(false); }}
                className='text-xs underline text-primary hover:text-primary/80'
              >Load last cached snapshot instantly</button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/70">Caching results for faster revisits…</p>
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

      {/* Real Market Data Section */}
      {marketData && (
        <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-primary" />
              Real-Time Market Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketData.raw?.marketSize && (
                <div className="bg-background/60 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Market Size</p>
                  <p className="text-2xl font-bold">${(marketData.raw.marketSize / 1000000000).toFixed(1)}B</p>
                </div>
              )}
              {marketData.raw?.growthRate && (
                <div className="bg-background/60 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Growth Rate</p>
                  <p className="text-2xl font-bold">{marketData.raw.growthRate}%</p>
                  <p className="text-xs text-muted-foreground">annual</p>
                </div>
              )}
              {marketData.raw?.demographics?.primaryAge && (
                <div className="bg-background/60 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Target Age</p>
                  <p className="text-2xl font-bold">{marketData.raw.demographics.primaryAge}</p>
                </div>
              )}
            </div>
            
            {marketData.normalized?.relatedQueries && marketData.normalized.relatedQueries.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Trending Searches</p>
                <div className="flex flex-wrap gap-2">
                  {marketData.normalized.relatedQueries.map((query: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {query}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {marketData.citations && marketData.citations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Data Sources</p>
                <div className="flex flex-wrap gap-2">
                  {marketData.citations.map((citation: any, idx: number) => (
                    <a 
                      key={idx}
                      href={citation.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {citation.source}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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