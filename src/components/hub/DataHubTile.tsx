import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnhancedTileDialog } from "./EnhancedTileDialog";
import { TileAIChat } from "./TileAIChat";
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
import { useSession } from "@/contexts/SimpleSessionContext";

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
  const [showAIChat, setShowAIChat] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { currentSession } = useSession();
  const currentIdea = currentSession?.data?.currentIdea || localStorage.getItem('current_idea') || '';
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
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card className={cn("transition-all duration-300 hover:shadow-lg")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg bg-gradient-to-br border", tileStyle)}>
                  {icon}
                </div>
                {title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", qualityColor)}
                >
                  {data?.confidence || 'Medium'} Confidence
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAIChat(true);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Analysis
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Display primary insight if available */}
              {(data as any)?.primaryInsight && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <p className="text-sm font-medium leading-relaxed">
                    {(data as any).primaryInsight}
                  </p>
                </div>
              )}
              
              {/* Display metrics from data.metrics object */}
              {data?.metrics && Object.keys(data.metrics).length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(data.metrics).slice(0, 4).map(([key, value], index) => (
                    <Card key={key} className="border-primary/20">
                      <CardContent className="pt-4">
                        <div className="text-xs text-muted-foreground mb-1 capitalize">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold">{
                            typeof value === 'number' && key.includes('Rate') ? `${value}%` :
                            typeof value === 'number' && (key.includes('Cap') || key.includes('reach')) ? 
                              `$${(value / 1000000000).toFixed(1)}B` :
                            typeof value === 'number' && value > 1000000 ? 
                              `${(value / 1000000).toFixed(1)}M` :
                            typeof value === 'number' && value > 1000 ? 
                              `${(value / 1000).toFixed(1)}K` :
                            String(value)
                          }</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* Display regional breakdown if available */}
              {(data as any)?.regionalBreakdown && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Regional Breakdown</div>
                    <div className="space-y-2">
                      {(data as any).regionalBreakdown.slice(0, 3).map((region: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{region.region}</span>
                          <div className="flex items-center gap-2">
                            {region.positive && (
                              <Badge variant="outline" className="text-xs">
                                {region.positive}% positive
                              </Badge>
                            )}
                            {region.growth && (
                              <Badge variant="outline" className="text-xs">
                                {region.growth}% growth
                              </Badge>
                            )}
                            {region.interest && (
                              <Badge variant="outline" className="text-xs">
                                {region.interest}/100
                              </Badge>
                            )}
                            {region.coverage && (
                              <Badge variant="outline" className="text-xs">
                                {region.coverage}% coverage
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display regional growth for market trends */}
              {(data as any)?.regionalGrowth && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Regional Growth</div>
                    <div className="space-y-2">
                      {(data as any).regionalGrowth.slice(0, 3).map((region: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{region.region}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {region.growth}% CAGR
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {region.marketShare}% share
                            </Badge>
                            <span className={cn(
                              "text-xs font-medium",
                              region.trend === "Accelerating" ? "text-green-500" :
                              region.trend === "Growing" ? "text-blue-500" :
                              region.trend === "Stable" ? "text-yellow-500" :
                              "text-muted-foreground"
                            )}>
                              {region.trend}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display regional interest for Google Trends */}
              {(data as any)?.regionalInterest && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Regional Interest</div>
                    <div className="space-y-2">
                      {(data as any).regionalInterest.slice(0, 3).map((region: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{region.region}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {region.interest}/100
                            </Badge>
                            <span className="text-muted-foreground">{region.queries}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display top themes for sentiment */}
              {(data as any)?.topThemes && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Top Themes</div>
                    <div className="space-y-2">
                      {(data as any).topThemes.slice(0, 3).map((theme: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs font-medium">{theme.theme}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{theme.mentions} mentions</span>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              theme.sentiment === "Very Positive" ? "text-green-500" :
                              theme.sentiment === "Positive" ? "text-blue-500" :
                              "text-yellow-500"
                            )}>
                              {theme.sentiment}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display segments for market trends */}
              {(data as any)?.segments && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Market Segments</div>
                    <div className="space-y-2">
                      {(data as any).segments.map((segment: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs font-medium">{segment.segment}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{segment.size}</span>
                            <Badge variant="outline" className="text-xs">
                              {segment.growth}% growth
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {segment.adoption}% adoption
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display related queries for Google Trends */}
              {(data as any)?.relatedQueries && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Trending Searches</div>
                    <div className="space-y-2">
                      {(data as any).relatedQueries.slice(0, 3).map((query: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs">{query.query}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{(query.volume / 1000).toFixed(1)}K/mo</span>
                            <Badge variant="outline" className="text-xs text-green-500">
                              {query.growth}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display top publications for news */}
              {(data as any)?.topPublications && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Top Publications</div>
                    <div className="space-y-2">
                      {(data as any).topPublications.slice(0, 3).map((pub: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs font-medium">{pub.publication}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{pub.articles} articles</span>
                            <Badge variant="outline" className="text-xs">
                              {pub.reach} reach
                            </Badge>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              pub.sentiment === "Positive" ? "text-green-500" :
                              pub.sentiment === "Neutral" ? "text-yellow-500" :
                              "text-red-500"
                            )}>
                              {pub.sentiment}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display explanation */}
              {data?.explanation && (
                <div className="p-3 rounded-lg bg-muted/20">
                  <p className="text-sm leading-relaxed">
                    {typeof data.explanation === 'string' 
                      ? data.explanation 
                      : (data.explanation as any)?.summary || ''}
                  </p>
                </div>
              )}
              
              {/* Display key drivers for market trends */}
              {(data as any)?.drivers && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Key Market Drivers</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(data as any).drivers.map((driver: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 text-primary" />
                          <span className="text-xs">{driver}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display breakout terms for Google Trends */}
              {(data as any)?.breakoutTerms && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Breakout Terms</div>
                    <div className="flex flex-wrap gap-2">
                      {(data as any).breakoutTerms.map((term: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display key events for news */}
              {(data as any)?.keyEvents && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Recent Key Events</div>
                    <div className="space-y-2">
                      {(data as any).keyEvents.slice(0, 3).map((event: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="mt-0.5">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              event.impact === "Very High" ? "bg-red-500" :
                              event.impact === "High" ? "bg-orange-500" :
                              event.impact === "Medium" ? "bg-yellow-500" :
                              "bg-green-500"
                            )} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium">{event.event}</p>
                            <p className="text-xs text-muted-foreground">{event.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display platforms for sentiment */}
              {(data as any)?.platforms && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Platform Sentiment</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries((data as any).platforms).map(([platform, data]: [string, any], idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs font-medium capitalize">{platform}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              data.sentiment > 85 ? "text-green-500" :
                              data.sentiment > 70 ? "text-blue-500" :
                              "text-yellow-500"
                            )}>
                              {data.sentiment}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">{data.posts}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display topics for news */}
              {(data as any)?.topics && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Coverage Topics</div>
                    <div className="space-y-2">
                      {(data as any).topics.slice(0, 3).map((topic: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs font-medium">{topic.topic}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{topic.count} articles</span>
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${topic.sentiment}%` }}
                                />
                              </div>
                              <span className="text-xs">{topic.sentiment}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display confidence as percentage */}
              {data?.confidence && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Analysis Confidence</span>
                    <span className="font-medium">{Math.round(data.confidence * 100)}%</span>
                  </div>
                  <Progress 
                    value={data.confidence * 100} 
                    className="h-2"
                  />
                </div>
              )}
              
              {/* Citations */}
              {data?.citations && data.citations.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>{data.citations.length} sources analyzed</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(true);
                    }}
                  >
                    View All
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
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
      
      {/* AI Chat Dialog */}
      <TileAIChat
        open={showAIChat}
        onOpenChange={setShowAIChat}
        tileData={data}
        tileTitle={title}
        idea={currentIdea}
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