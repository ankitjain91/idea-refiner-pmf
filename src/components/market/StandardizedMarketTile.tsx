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

  // Always show error state for all tiles
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/10 border border-destructive/30">
              <Icon className="h-4 w-4 text-destructive" />
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
            Error: Cannot fetch data
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}