import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnhancedTileDialog } from "./EnhancedTileDialog";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, TrendingUp, TrendingDown, 
  Minus, AlertCircle, CheckCircle, XCircle,
  FileText, Sparkles, Activity, BarChart3,
  Brain, Zap, Target, Shield
} from "lucide-react";
import { useState } from "react";
import { TileData } from "@/lib/data-hub-orchestrator";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  const [isHovered, setIsHovered] = useState(false);
  const icon = Icon ? <Icon className="h-5 w-5" /> : null;
  
  // Get tile color scheme based on type
  const getTileStyle = () => {
    const styles: Record<string, string> = {
      pmf_score: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
      market_size: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
      competition: "from-orange-500/20 to-red-500/20 border-orange-500/30",
      sentiment: "from-green-500/20 to-emerald-500/20 border-green-500/30",
      market_trends: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30",
      news_analysis: "from-teal-500/20 to-cyan-500/20 border-teal-500/30",
      google_trends: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30",
      growth_potential: "from-lime-500/20 to-green-500/20 border-lime-500/30",
      default: "from-gray-500/20 to-slate-500/20 border-gray-500/30"
    };
    return styles[tileType] || styles.default;
  };
  
  // Get accent icon based on tile type
  const getAccentIcon = () => {
    const icons: Record<string, React.ReactNode> = {
      pmf_score: <Target className="h-3 w-3" />,
      market_size: <BarChart3 className="h-3 w-3" />,
      competition: <Shield className="h-3 w-3" />,
      sentiment: <Activity className="h-3 w-3" />,
      market_trends: <TrendingUp className="h-3 w-3" />,
      news_analysis: <FileText className="h-3 w-3" />,
      google_trends: <Zap className="h-3 w-3" />,
      growth_potential: <Brain className="h-3 w-3" />
    };
    return icons[tileType];
  };
  
  if (!data && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border-border/50 bg-card/30 backdrop-blur-xl shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-gray-600/5" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  {icon}
                </div>
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs backdrop-blur">
                No Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-3 opacity-50" />
              <p className="text-sm font-medium mb-1">Data not available</p>
              <p className="text-xs opacity-70">Click to fetch data</p>
              {onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefresh}
                  className="mt-3 backdrop-blur"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Fetch Data
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
  
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border-border/50 bg-card/30 backdrop-blur-xl shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 animate-pulse" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50 animate-pulse">
                  {icon}
                </div>
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs backdrop-blur animate-pulse">
                <Activity className="h-3 w-3 mr-1 animate-spin" />
                Loading...
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-3">
              <div className="h-8 bg-muted/50 animate-pulse rounded-lg" />
              <div className="h-4 bg-muted/30 animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted/20 animate-pulse rounded w-1/2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
  
  // Determine primary metric display
  const primaryMetric = getPrimaryMetric(tileType, data);
  const qualityColor = getQualityColor(data?.dataQuality);
  const confidenceIcon = getConfidenceIcon(data?.confidence || 0);
  const tileStyle = getTileStyle();
  const accentIcon = getAccentIcon();
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card 
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all duration-300",
            "border-border/50 bg-card/30 backdrop-blur-xl shadow-xl",
            "hover:shadow-2xl hover:border-primary/30",
            isHovered && "ring-2 ring-primary/20"
          )}
          onClick={() => setShowDetails(true)}
        >
          {/* Gradient background */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-30 transition-opacity duration-300",
            tileStyle,
            isHovered && "opacity-40"
          )} />
          
          {/* Animated glow effect */}
          {isHovered && (
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          )}
          
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className={cn(
                    "p-2.5 rounded-xl bg-gradient-to-br backdrop-blur transition-all",
                    tileStyle
                  )}
                  animate={{ rotate: isHovered ? 360 : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {icon}
                </motion.div>
                <div>
                  <CardTitle className="text-base font-semibold">{title}</CardTitle>
                  <div className="flex items-center gap-1 mt-0.5">
                    {accentIcon || null}
                    <span className="text-xs text-muted-foreground">
                      {data?.citations?.length || 0} sources
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs backdrop-blur border", qualityColor)}
                >
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  {data?.dataQuality || 'unknown'}
                </Badge>
                {confidenceIcon}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative">
            <div className="space-y-4">
              {/* Primary Metric Display */}
              {primaryMetric && (
                <motion.div 
                  className="flex items-baseline justify-between"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      {primaryMetric.value}
                    </div>
                    {primaryMetric.unit && (
                      <span className="text-sm text-muted-foreground font-medium">
                        {primaryMetric.unit}
                      </span>
                    )}
                  </div>
                  {primaryMetric.trend && (
                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/50 backdrop-blur", primaryMetric.trendColor)}>
                      {primaryMetric.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : 
                       primaryMetric.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : 
                       <Minus className="h-3 w-3" />}
                      <span className="text-xs font-medium">{primaryMetric.trendText}</span>
                    </div>
                  )}
                </motion.div>
              )}
              
              {/* Progress indicator for scores */}
              {tileType.includes('score') && primaryMetric && (
                <div className="space-y-2">
                  <Progress 
                    value={typeof primaryMetric.value === 'string' ? parseFloat(primaryMetric.value.replace(/[^0-9.-]/g, '')) || 0 : 0} 
                    className="h-2 bg-muted/30"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>
              )}
              
              {/* Quick explanation */}
              <motion.p 
                className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {typeof data?.explanation === 'string' 
                  ? data.explanation 
                  : (data as any)?.explanation?.summary || (data as any)?.explanation?.meaning || ''}
              </motion.p>
              
              {/* Action hint */}
              <motion.div 
                className="flex items-center justify-between pt-2 border-t border-border/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span className="font-medium">{data?.citations?.length || 0} sources analyzed</span>
                </div>
                <motion.div
                  animate={{ x: isHovered ? 5 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-4 w-4 text-primary/60" />
                </motion.div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
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
  
  const metricMap: Record<string, { key: string; unit?: string }> = {
    pmf_score: { key: 'score', unit: '/100' },
    market_size: { key: 'tam', unit: '' },
    competition: { key: 'total', unit: ' competitors' },
    sentiment: { key: 'score', unit: '% positive' },
    market_trends: { key: 'velocity', unit: ' trend' },
    news_analysis: { key: 'recentArticles', unit: ' articles' },
    google_trends: { key: 'currentInterest', unit: '% interest' },
    growth_potential: { key: 'score', unit: '/100' },
    market_readiness: { key: 'score', unit: '/100' },
    competitive_advantage: { key: 'score', unit: '/100' },
    risk_assessment: { key: 'score', unit: ' risk level' }
  };
  
  const metricConfig = metricMap[tileType];
  if (!metricConfig || !data.metrics[metricConfig.key]) return null;
  
  let value = data.metrics[metricConfig.key];
  
  // Handle case where value might be an object with a value property
  if (typeof value === 'object' && value !== null && 'value' in value) {
    value = (value as any).value;
  }
  
  // Ensure value is a number
  if (typeof value !== 'number') {
    console.warn('Metric value is not a number:', value, 'for tile:', tileType);
    return null;
  }
  
  const formattedValue = formatMetricValue(value, tileType);
  
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
  
  return { value: formattedValue, trend, trendText, trendColor, unit: metricConfig.unit };
}

function formatMetricValue(value: any, tileType: string): string {
  if (typeof value === 'number') {
    if (tileType === 'market_size') {
      if (value >= 1000000000) {
        return `$${(value / 1000000000).toFixed(1)}B`;
      } else if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
      }
      return `$${value.toFixed(0)}`;
    } else if (tileType.includes('score') || tileType === 'sentiment') {
      return `${Math.round(value)}`;
    } else if (value > 100) {
      return `${value.toFixed(0)}`;
    } else {
      return `${value.toFixed(0)}`;
    }
  }
  return String(value);
}

function getQualityColor(quality?: string): string {
  switch (quality) {
    case 'high': return 'text-green-600 border-green-600/50';
    case 'medium': return 'text-yellow-600 border-yellow-600/50';
    case 'low': return 'text-red-600 border-red-600/50';
    default: return 'text-muted-foreground border-border';
  }
}

function getConfidenceIcon(confidence: number) {
  if (confidence >= 80) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <CheckCircle className="h-4 w-4 text-green-600" />
      </motion.div>
    );
  } else if (confidence >= 50) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <AlertCircle className="h-4 w-4 text-yellow-600" />
      </motion.div>
    );
  } else {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <XCircle className="h-4 w-4 text-red-600" />
      </motion.div>
    );
  }
}