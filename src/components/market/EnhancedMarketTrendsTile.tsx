import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, RefreshCw, ChartBar, TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TileInsightsDialog } from '@/components/hub/TileInsightsDialog';
import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboardData';
import { toast } from '@/hooks/use-toast';
import { MarketSizeChart } from './MarketSizeChart';
import { GrowthProjectionChart } from './GrowthProjectionChart';
import { CompetitorAnalysisChart } from './CompetitorAnalysisChart';
import { LaunchTimelineChart } from './LaunchTimelineChart';
import { PricingStrategyChart } from './PricingStrategyChart';
import { TargetAudienceChart } from './TargetAudienceChart';
import { Skeleton } from '@/components/ui/skeleton';

interface EnhancedMarketTrendsTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  description?: string;
  currentIdea: string;
}

export function EnhancedMarketTrendsTile({
  title,
  icon: Icon,
  tileType,
  filters,
  description,
  currentIdea,
}: EnhancedMarketTrendsTileProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { 
    data, 
    loading, 
    error,
    refresh
  } = useOptimizedDashboardData({
    tileType,
    filters: { ...filters, idea: currentIdea },
    enabled: true
  });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refresh();
      toast({
        title: "Data refreshed",
        description: `${title} has been updated with the latest information.`,
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderChart = () => {
    switch (tileType) {
      case 'market_size':
        return <MarketSizeChart data={data} />;
      case 'growth_projections':
        return <GrowthProjectionChart data={data} />;
      case 'competitor_analysis':
        return <CompetitorAnalysisChart data={data} />;
      case 'launch_timeline':
        return <LaunchTimelineChart data={data} />;
      case 'pricing_strategy':
        return <PricingStrategyChart data={data} />;
      case 'target_audience':
        return <TargetAudienceChart data={data} />;
      default:
        return null;
    }
  };

  const renderAIAnalysis = () => {
    const analysis = (data as any)?.analysis;
    if (!analysis) return null;

    return (
      <div className="space-y-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h4 className="text-lg font-semibold mb-3">AI Market Intelligence</h4>
          {typeof analysis === 'string' ? (
            <p className="text-muted-foreground leading-relaxed">{analysis}</p>
          ) : (
            <div className="space-y-3">
              {analysis.summary && (
                <div>
                  <h5 className="font-medium mb-1">Executive Summary</h5>
                  <p className="text-muted-foreground">{analysis.summary}</p>
                </div>
              )}
              {analysis.opportunities && (
                <div>
                  <h5 className="font-medium mb-1">Key Opportunities</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysis.opportunities.map((opp: string, idx: number) => (
                      <li key={idx} className="text-muted-foreground">{opp}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.risks && (
                <div>
                  <h5 className="font-medium mb-1">Risk Factors</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysis.risks.map((risk: string, idx: number) => (
                      <li key={idx} className="text-muted-foreground">{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.recommendations && (
                <div>
                  <h5 className="font-medium mb-1">Strategic Recommendations</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysis.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRawData = () => {
    if (!data) return null;

    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && (
                  <CardDescription className="text-xs">{description}</CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className={cn(
                  "h-8 w-8",
                  isRefreshing && "animate-spin"
                )}
                disabled={isRefreshing}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDialogOpen(true)}
                className="h-8 w-8"
              >
                <Brain className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Unable to load data</p>
              <Button 
                variant="link" 
                size="sm" 
                onClick={handleRefresh}
                className="mt-2"
              >
                Try again
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="text-xs">
                  <ChartBar className="h-3 w-3 mr-1" />
                  Charts
                </TabsTrigger>
                <TabsTrigger value="analysis" className="text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Analysis
                </TabsTrigger>
                <TabsTrigger value="insights" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="raw" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Raw Data
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                {renderChart()}
              </TabsContent>

              <TabsContent value="analysis" className="mt-4">
                {renderAIAnalysis()}
              </TabsContent>

              <TabsContent value="insights" className="mt-4">
                <TileInsightsDialog
                  open={false}
                  onOpenChange={() => {}}
                  tileType={tileType}
                  tileData={data}
                  ideaText={currentIdea}
                />
              </TabsContent>

              <TabsContent value="raw" className="mt-4">
                {renderRawData()}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <TileInsightsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tileType={tileType}
        tileData={data}
        ideaText={currentIdea}
      />
    </>
  );
}