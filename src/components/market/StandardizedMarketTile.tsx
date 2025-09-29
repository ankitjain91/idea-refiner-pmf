import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, RefreshCw, AlertCircle, TrendingUp, DollarSign, BarChart3, Users, Target, Calendar, Rocket, Building2 } from 'lucide-react';
import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboardData';
import { toast } from '@/hooks/use-toast';
import { MarketSizeChart } from './MarketSizeChart';
import { GrowthProjectionChart } from './GrowthProjectionChart';
import { CompetitorAnalysisChart } from './CompetitorAnalysisChart';
import { PricingStrategyChart } from './PricingStrategyChart';
import { TargetAudienceChart } from './TargetAudienceChart';
import { LaunchTimelineChart } from './LaunchTimelineChart';
import { AITileDialog } from '@/components/dashboard/AITileDialog';
import { cn } from '@/lib/utils';

interface StandardizedMarketTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  description?: string;
  currentIdea: string;
}

// Map tile types to appropriate icons for metrics
const getTileIcon = (tileType: string) => {
  switch(tileType) {
    case 'market_size':
      return DollarSign;
    case 'growth_projections':
      return Rocket;
    case 'competitor_analysis':
      return Building2;
    case 'launch_timeline':
      return Calendar;
    case 'pricing_strategy':
      return DollarSign;
    case 'target_audience':
      return Users;
    default:
      return BarChart3;
  }
};

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
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Extract keywords from the idea for the filters
  const ideaKeywords = currentIdea ? currentIdea.split(' ').filter(word => word.length > 3).slice(0, 5) : [];
  
  const enhancedFilters = {
    ...filters,
    idea: currentIdea,
    idea_keywords: ideaKeywords
  };
  
  const { 
    data, 
    loading, 
    error,
    refresh,
    getTileData
  } = useOptimizedDashboardData(enhancedFilters);

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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Simulate analysis - in production this would call an API
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis complete",
        description: "AI insights have been updated.",
      });
    }, 2000);
  };

  const renderChart = () => {
    // Get tile-specific data
    const tileData = getTileData ? getTileData(tileType) : data;
    
    switch (tileType) {
      case 'market_size':
        return <MarketSizeChart data={tileData} />;
      case 'growth_projections':
        return <GrowthProjectionChart data={tileData} />;
      case 'competitor_analysis':
        return <CompetitorAnalysisChart data={tileData} />;
      case 'launch_timeline':
        return <LaunchTimelineChart data={tileData} />;
      case 'pricing_strategy':
        return <PricingStrategyChart data={tileData} />;
      case 'target_audience':
        return <TargetAudienceChart data={tileData} />;
      default:
        // For other tile types, render basic data display
        return renderBasicContent(tileData);
    }
  };

  const renderBasicContent = (tileData?: any) => {
    const dataToUse = tileData || data;
    if (!dataToUse) return null;
    
    // Generic content rendering for tiles without specific charts
    return (
      <div className="space-y-4">
        {dataToUse?.analysis && (
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {typeof dataToUse.analysis === 'string' 
                ? dataToUse.analysis 
                : dataToUse.analysis.summary || 'Analysis available'}
            </AlertDescription>
          </Alert>
        )}
        
        {dataToUse?.metrics && (
          <div className="grid grid-cols-2 gap-3">
            {(Array.isArray(dataToUse.metrics) ? dataToUse.metrics : Object.entries(dataToUse.metrics))
              .slice(0, 4).map((item: any, idx: number) => {
                const isArray = Array.isArray(dataToUse.metrics);
                const key = isArray ? item.name : item[0];
                const value = isArray ? item.value : item[1];
                return (
                  <div key={idx} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-lg font-semibold mt-1">
                      {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      {isArray && item.unit ? ` ${item.unit}` : ''}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // Transform data for AITileDialog format
  const getDialogData = () => {
    if (!data) return null;

    const analysis = (data as any)?.analysis || {};
    const MetricIcon = getTileIcon(tileType);
    
    // Build metrics array based on tile type
    const metrics = [];
    
    // Add primary metric
    metrics.push({
      title: title,
      value: getMetricValue(),
      icon: MetricIcon,
      color: 'primary',
      levels: [
        {
          title: 'Overview',
          content: typeof analysis === 'string' ? analysis : (analysis.summary || `Overview analysis for ${title}`)
        },
        {
          title: 'Detailed Analysis',
          content: analysis.detailed || getDetailedAnalysis()
        },
        {
          title: 'Strategic Insights',
          content: analysis.strategic || getStrategicInsights()
        }
      ]
    });

    // Add additional metrics if available
    if ((data as any)?.metrics) {
      Object.entries((data as any).metrics).slice(0, 3).forEach(([key, value]) => {
        metrics.push({
          title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: typeof value === 'number' ? value.toLocaleString() : String(value),
          icon: TrendingUp,
          color: 'secondary',
          levels: [
            { title: 'Overview', content: `Current ${key}: ${value}` },
            { title: 'Detailed', content: `Detailed analysis of ${key} metric` },
            { title: 'Strategic', content: `Strategic implications of ${key}` }
          ]
        });
      });
    }

    return {
      title: `${title} - AI Analysis`,
      metrics,
      chartData: (data as any)?.chartData || [],
      barChartData: (data as any)?.barChartData || [],
      sources: (data as any)?.sources || [],
      insights: [
        ...((data as any)?.insights || []),
        `AI-powered analysis for ${currentIdea}`,
        'Real-time market intelligence',
        'Data-driven recommendations'
      ]
    };
  };

  const getMetricValue = () => {
    if ((data as any)?.metrics) {
      const firstMetric = Object.values((data as any).metrics)[0];
      return typeof firstMetric === 'number' ? firstMetric.toLocaleString() : String(firstMetric);
    }
    return 'N/A';
  };

  const getDetailedAnalysis = () => {
    const analysis = (data as any)?.analysis || {};
    if (analysis.opportunities && analysis.opportunities.length > 0) {
      return `Key Opportunities:\n${analysis.opportunities.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}`;
    }
    return `Detailed analysis shows ${title} metrics are within expected ranges for ${currentIdea}. Further investigation recommended for optimization opportunities.`;
  };

  const getStrategicInsights = () => {
    const analysis = (data as any)?.analysis || {};
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      return `Strategic Recommendations:\n${analysis.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`;
    }
    return `Strategic positioning suggests focusing on differentiation and market penetration strategies for ${currentIdea}.`;
  };

  // Show loading state
  if (loading && !data) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {typeof error === 'string' ? error : 'Failed to load data'}
            </AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("h-full group relative")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Data source indicator */}
              {data && (() => {
                let source = 'API';
                let variant: 'default' | 'secondary' | 'outline' = 'default';
                
                if ((data as any).fromDatabase) {
                  source = 'DB';
                  variant = 'default';
                } else if ((data as any).fromCache || (data as any).cacheHit) {
                  source = 'Cache';
                  variant = 'secondary';
                }
                
                return (
                  <Badge variant={variant} className="text-xs h-5">
                    {source}
                  </Badge>
                );
              })()}
              
              {/* Refresh button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
              
              {/* Brain AI button */}
              {data && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                  className="h-8 w-8 p-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-200"
                >
                  <Brain className="h-4 w-4 text-violet-600" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* AI Analysis Dialog using AITileDialog component */}
      <AITileDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        data={getDialogData()}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
      />
    </>
  );
}