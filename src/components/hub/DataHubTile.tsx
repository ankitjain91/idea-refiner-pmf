import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnhancedTileDialog } from "./EnhancedTileDialog";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, TrendingUp, TrendingDown, 
  Minus, AlertCircle, CheckCircle, XCircle,
  FileText
} from "lucide-react";
import { useState } from "react";
import { TileData } from "@/lib/data-hub-orchestrator";
import { cn } from "@/lib/utils";

interface DataHubTileProps {
  title: string;
  tileType?: string;
  data?: TileData | null;
  Icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  onRefresh?: () => void;
  expanded?: boolean;
}

export function DataHubTile({ title, tileType = "default", data, Icon, loading, onRefresh, expanded }: DataHubTileProps) {
  const [showDetails, setShowDetails] = useState(false);
  const icon = Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null;
  
  if (!data && !loading) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              No Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Data not available</p>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="mt-2"
              >
                Fetch Data
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Loading...
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Determine primary metric display
  const primaryMetric = getPrimaryMetric(tileType, data);
  const qualityColor = getQualityColor(data?.dataQuality);
  const confidenceIcon = getConfidenceIcon(data?.confidence || 0);
  
  return (
    <>
      <Card 
        className={cn(
          "relative overflow-hidden border-border/50 bg-card/50 backdrop-blur cursor-pointer transition-all",
          "hover:shadow-lg hover:border-primary/50"
        )}
        onClick={() => setShowDetails(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", qualityColor)}>
                {data?.dataQuality || 'unknown'}
              </Badge>
              {confidenceIcon}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Primary Metric Display */}
            {primaryMetric && (
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">
                  {primaryMetric.value}
                </div>
                {primaryMetric.trend && (
                  <div className={cn("flex items-center text-sm", primaryMetric.trendColor)}>
                    {primaryMetric.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                     primaryMetric.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : 
                     <Minus className="h-3 w-3" />}
                    <span className="ml-1">{primaryMetric.trendText}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Quick explanation */}
            <p className="text-xs text-muted-foreground line-clamp-2">
              {data?.explanation}
            </p>
            
            {/* Citation count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>{data?.citations?.length || 0} sources</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Enhanced Details Dialog */}
      <EnhancedTileDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        title={title}
        tileType={tileType}
        data={data}
        icon={icon}
      />
    </>
  );
}

// Helper functions
function getPrimaryMetric(tileType: string, data: TileData | null) {
  if (!data?.metrics) return null;
  
  const metricMap: Record<string, string> = {
    pmf_score: 'score',
    market_size: 'tam',
    competition: 'total',
    sentiment: 'score',
    market_trends: 'velocity',
    news_analysis: 'recentArticles',
    google_trends: 'currentInterest',
    growth_potential: 'score',
    market_readiness: 'score',
    competitive_advantage: 'score',
    risk_assessment: 'score'
  };
  
  const metricKey = metricMap[tileType];
  if (!metricKey || !data.metrics[metricKey]) return null;
  
  const value = data.metrics[metricKey];
  const formattedValue = formatMetricValue(value);
  
  // Determine trend
  let trend = null;
  let trendText = '';
  let trendColor = '';
  
  if (tileType.includes('score') || tileType.includes('potential')) {
    if (value > 70) {
      trend = 'up';
      trendText = 'Strong';
      trendColor = 'text-green-600';
    } else if (value < 40) {
      trend = 'down';
      trendText = 'Weak';
      trendColor = 'text-red-600';
    } else {
      trend = 'stable';
      trendText = 'Moderate';
      trendColor = 'text-yellow-600';
    }
  }
  
  return { value: formattedValue, trend, trendText, trendColor };
}

function formatMetricValue(value: any): string {
  if (typeof value === 'number') {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else if (value > 100) {
      return `$${value.toFixed(0)}`;
    } else {
      return `${value.toFixed(0)}`;
    }
  }
  return String(value);
}

function getQualityColor(quality?: string): string {
  switch (quality) {
    case 'high': return 'text-green-600 border-green-600';
    case 'medium': return 'text-yellow-600 border-yellow-600';
    case 'low': return 'text-red-600 border-red-600';
    default: return 'text-muted-foreground';
  }
}

function getConfidenceIcon(confidence: number) {
  if (confidence >= 80) {
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  } else if (confidence >= 50) {
    return <AlertCircle className="h-4 w-4 text-yellow-600" />;
  } else {
    return <XCircle className="h-4 w-4 text-red-600" />;
  }
}