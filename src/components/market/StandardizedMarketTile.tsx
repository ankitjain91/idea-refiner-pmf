import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, RefreshCw } from 'lucide-react';
import { BaseTile } from '@/components/hub/BaseTile';
import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboardData';
import { toast } from '@/hooks/use-toast';
import { MarketSizeChart } from './MarketSizeChart';
import { GrowthProjectionChart } from './GrowthProjectionChart';
import { CompetitorAnalysisChart } from './CompetitorAnalysisChart';
import { PricingStrategyChart } from './PricingStrategyChart';
import { TargetAudienceChart } from './TargetAudienceChart';
import { LaunchTimelineChart } from './LaunchTimelineChart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TileInsightsDialog } from '@/components/hub/TileInsightsDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StandardizedMarketTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  description?: string;
  currentIdea: string;
}

export function StandardizedMarketTile({
  title,
  icon: Icon,
  tileType,
  filters,
  description,
  currentIdea,
}: StandardizedMarketTileProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        // For other tile types, render basic data display
        return renderBasicContent();
    }
  };

  const renderBasicContent = () => {
    if (!data) return null;
    
    // Generic content rendering for tiles without specific charts
    return (
      <div className="space-y-4">
        {(data as any)?.analysis && (
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {typeof (data as any).analysis === 'string' 
                ? (data as any).analysis 
                : (data as any).analysis.summary || 'Analysis available'}
            </AlertDescription>
          </Alert>
        )}
        
        {(data as any)?.metrics && (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries((data as any).metrics).slice(0, 4).map(([key, value]) => (
              <div key={key} className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground capitalize">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-lg font-semibold mt-1">
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAIAnalysis = () => {
    const analysis = (data as any)?.analysis;
    if (!analysis) return null;

    return (
      <div className="space-y-4">
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
                <Card className="border-primary/20 bg-primary/5 p-4">
                  <h5 className="font-medium mb-2 text-primary">Executive Summary</h5>
                  <p className="text-muted-foreground text-sm">{analysis.summary}</p>
                </Card>
              )}
              {analysis.opportunities && (
                <Card className="border-green-500/20 bg-green-500/5 p-4">
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
                <Card className="border-orange-500/20 bg-orange-500/5 p-4">
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
                <Card className="border-blue-500/20 bg-blue-500/5 p-4">
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

  const headerActions = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        className="h-8 w-8"
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
  );

  return (
    <>
      <BaseTile
        title={title}
        icon={Icon as any}
        description={description}
        isLoading={loading}
        error={error ? "Unable to load data" : undefined}
        headerActions={headerActions}
      >
        {renderChart()}
      </BaseTile>

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