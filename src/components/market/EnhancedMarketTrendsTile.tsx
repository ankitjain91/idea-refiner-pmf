import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [isHovered, setIsHovered] = useState(false);

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
      <div className="space-y-4 animate-fade-in">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            AI Market Intelligence
          </h4>
          {typeof analysis === 'string' ? (
            <p className="text-muted-foreground leading-relaxed">{analysis}</p>
          ) : (
            <div className="space-y-4">
              {analysis.summary && (
                <Card className="border-primary/20 bg-primary/5 p-4 animate-scale-in">
                  <h5 className="font-medium mb-2 text-primary">Executive Summary</h5>
                  <p className="text-muted-foreground text-sm">{analysis.summary}</p>
                </Card>
              )}
              {analysis.opportunities && (
                <Card className="border-green-500/20 bg-green-500/5 p-4 animate-scale-in" style={{ animationDelay: '100ms' }}>
                  <h5 className="font-medium mb-2 text-green-700 dark:text-green-400">Key Opportunities</h5>
                  <ul className="space-y-2">
                    {analysis.opportunities.map((opp: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {analysis.risks && (
                <Card className="border-orange-500/20 bg-orange-500/5 p-4 animate-scale-in" style={{ animationDelay: '200ms' }}>
                  <h5 className="font-medium mb-2 text-orange-700 dark:text-orange-400">Risk Factors</h5>
                  <ul className="space-y-2">
                    {analysis.risks.map((risk: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {analysis.recommendations && (
                <Card className="border-blue-500/20 bg-blue-500/5 p-4 animate-scale-in" style={{ animationDelay: '300ms' }}>
                  <h5 className="font-medium mb-2 text-blue-700 dark:text-blue-400">Strategic Recommendations</h5>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-blue-600 font-bold">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card 
        className={cn(
          "group transition-all duration-300 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 backdrop-blur animate-fade-in",
          isHovered && "shadow-xl shadow-primary/10 border-primary/20 scale-[1.02]"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 transition-all duration-300",
                isHovered && "from-primary/30 to-primary/20 rotate-3"
              )}>
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription className="text-xs animate-fade-in">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className={cn(
                  "h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200",
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
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
              >
                <Brain className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
              <div className="p-3 rounded-full bg-destructive/10 mb-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">Unable to load data</p>
              <Button 
                variant="link" 
                size="sm" 
                onClick={handleRefresh}
                className="mt-2 hover:scale-105 transition-transform"
              >
                Try again
              </Button>
            </div>
          ) : (
            <div className="animate-fade-in">
              {renderChart()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20 animate-pulse">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  AI Analysis: {title}
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Comprehensive insights and recommendations for {currentIdea}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="h-[calc(85vh-80px)] px-6 py-4">
            {renderAIAnalysis()}
            
            {/* Include TileInsightsDialog content */}
            <div className="mt-6">
              <TileInsightsDialog
                open={false}
                onOpenChange={() => {}}
                tileType={tileType}
                tileData={data}
                ideaText={currentIdea}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}