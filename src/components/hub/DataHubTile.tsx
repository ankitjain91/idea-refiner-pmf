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
  Brain, Zap, Target, Shield, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import { TileData } from "@/lib/data-hub-orchestrator";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/contexts/SimpleSessionContext";

interface DataHubTileProps {
  title: string;
  tileType?: string;
  data?: TileData | null;
  Icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  onRefresh?: () => void;
  expanded?: boolean;
  className?: string;
}

export function DataHubTile({ title, tileType = "default", data, Icon, loading, onRefresh, expanded, className }: DataHubTileProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hasBeenExpanded, setHasBeenExpanded] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(false);
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
  
  // Funny loading messages based on tile type
  const getLoadingMessage = () => {
    const messages: Record<string, string[]> = {
      sentiment: [
        "Reading the room vibes... 🎭",
        "Analyzing internet feelings... 💭",
        "Checking if people are happy... 😊",
        "Measuring digital emotions... 🌈"
      ],
      market_trends: [
        "Crystal ball warming up... 🔮",
        "Time traveling to the future... ⏰",
        "Consulting the trend wizards... 🧙‍♂️",
        "Reading market tea leaves... 🍵"
      ],
      google_trends: [
        "Googling your success... 🔍",
        "Asking Google nicely... 🙏",
        "Mining search gold... ⛏️",
        "Tracking what's hot... 🔥"
      ],
      news_analysis: [
        "Speed reading the news... 📰",
        "Checking what journalists think... ✍️",
        "Scanning headlines worldwide... 🌍",
        "Getting the latest scoop... 🍦"
      ],
      web_search: [
        "Crawling the web (like a spider)... 🕷️",
        "Searching every corner of internet... 🌐",
        "Unleashing search bots... 🤖",
        "Diving deep into the web... 🏊‍♂️"
      ],
      reddit_sentiment: [
        "Browsing Reddit (for research!)... 👀",
        "Checking what Redditors think... 💬",
        "Reading all the comments... 📝",
        "Upvoting good vibes... ⬆️"
      ],
      twitter_buzz: [
        "Scrolling through tweets... 🐦",
        "Measuring the Twitter storm... 🌪️",
        "Counting retweets and likes... ❤️",
        "Checking what's trending... 📈"
      ],
      amazon_reviews: [
        "Reading ALL the reviews... ⭐",
        "Checking star ratings... ✨",
        "Analyzing customer opinions... 🛒",
        "Window shopping for insights... 🛍️"
      ],
      youtube_analytics: [
        "Watching videos at 2x speed... ▶️",
        "Counting views and likes... 👍",
        "Analyzing video comments... 💬",
        "Checking subscriber counts... 🔔"
      ],
      risk_assessment: [
        "Calculating danger levels... ⚠️",
        "Running safety checks... 🛡️",
        "Assessing potential pitfalls... 🕳️",
        "Evaluating risk factors... 📊"
      ],
      default: [
        "Crunching the numbers... 🧮",
        "Gathering insights... 💡",
        "Processing data magic... ✨",
        "Loading awesomeness... 🚀"
      ]
    };
    
    const messageList = messages[tileType] || messages.default;
    return messageList[Math.floor(Math.random() * messageList.length)];
  };

  // Handle expand/collapse with lazy loading
  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    // If expanding for the first time and we have onRefresh, trigger data load
    if (!newCollapsed && !hasBeenExpanded && onRefresh && !data) {
      setHasBeenExpanded(true);
      setIsFirstLoad(true);
      onRefresh();
      // Clear first load flag after a delay
      setTimeout(() => setIsFirstLoad(false), 3000);
    }
  };

  if (loading && isFirstLoad) {
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
            <div className="flex flex-col items-center justify-center py-8">
              <Activity className="h-8 w-8 mb-3 text-primary animate-spin" />
              <p className="text-sm font-medium text-center animate-pulse">
                {getLoadingMessage()}
              </p>
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
        className={isCollapsed ? "w-full h-auto min-h-0" : className}
      >
        <Card className={cn("transition-all duration-300 hover:shadow-lg", isCollapsed && "h-auto min-h-0")}> 
          <CardHeader className={cn(isCollapsed ? "py-2 border-b-0" : "py-3")}>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2 min-w-0">
                <div className={cn("p-2 rounded-lg bg-gradient-to-br border flex-shrink-0", tileStyle)}>
                  {icon}
                </div>
                <span className="truncate">{title}</span>
              </CardTitle>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isCollapsed && (
                  <>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs whitespace-nowrap hidden lg:flex", qualityColor)}
                    >
                      {data?.confidence ? `${Math.round(data.confidence * 100)}%` : '50%'} Confidence
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-1 px-3 py-1.5 h-auto whitespace-nowrap text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAIChat(true);
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">AI Analysis</span>
                      <span className="sm:hidden">AI</span>
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleToggleCollapse}
                  aria-label={isCollapsed ? "Expand tile" : "Collapse tile"}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <CardContent>
                  <div className="space-y-4">
              {/* Display primary insight if available - only in expanded mode */}
              {(data as any)?.primaryInsight && expanded && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <p className="text-sm font-medium leading-relaxed">
                    {(data as any).primaryInsight}
                  </p>
                </div>
              )}
              
              {/* Display metrics from data.metrics object */}
              {data?.metrics && Object.keys(data.metrics).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(data.metrics).slice(0, 6).map(([key, value], index) => (
                    <Card key={key} className="border-primary/10 bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all overflow-hidden">
                      <CardContent className="p-3">
                        <div className="text-xs text-muted-foreground mb-1 truncate" title={key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}>
                          {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "font-bold truncate",
                            index < 2 ? "text-lg" : "text-base"
                          )}>{
                            typeof value === 'number' && (key.includes('Rate') || key.includes('positive') || key.includes('negative') || key.includes('neutral')) ? `${value}%` :
                            typeof value === 'number' && (key.includes('Cap') || key.includes('reach')) ? 
                              value > 1000000000 ? `$${(value / 1000000000).toFixed(1)}B` :
                              `$${(value / 1000000).toFixed(1)}M` :
                            typeof value === 'number' && value > 1000000 ? 
                              `${(value / 1000000).toFixed(1)}M` :
                            typeof value === 'number' && value > 1000 ? 
                              `${(value / 1000).toFixed(1)}K` :
                            String(value).length > 15 ? String(value).substring(0, 12) + '...' : String(value)
                          }</span>
                          {key.includes('trending') && value.toString().includes('+') && (
                            <TrendingUp className="h-3 w-3 text-success flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {Object.keys(data.metrics).length > 6 && (
                    <div className="col-span-full text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(true)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        View {Object.keys(data.metrics).length - 6} more metrics
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Display regional breakdown if available - Enhanced for sentiment - only in expanded mode */}
              {(data as any)?.regionalBreakdown && expanded && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Regional Analysis</div>
                    <div className="space-y-3">
                      {(data as any).regionalBreakdown.map((region: any, idx: number) => (
                        <div key={idx} className="space-y-2 p-2 rounded-lg bg-muted/20">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{region.region}</span>
                            <div className="flex items-center gap-2">
                              {region.growthRate && (
                                <Badge variant="default" className="text-xs">
                                  {region.growthRate}
                                </Badge>
                              )}
                              {region.volume && (
                                <Badge variant="outline" className="text-xs">
                                  {region.volume} volume
                                </Badge>
                              )}
                              {region.coverage && (
                                <Badge variant="outline" className="text-xs">
                                  {region.coverage}% coverage
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Sentiment breakdown */}
                          {region.positive && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full flex">
                                  <div 
                                    className="bg-success" 
                                    style={{ width: `${region.positive}%` }}
                                  />
                                  <div 
                                    className="bg-muted-foreground/30" 
                                    style={{ width: `${region.neutral}%` }}
                                  />
                                  <div 
                                    className="bg-destructive" 
                                    style={{ width: `${region.negative}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {region.positive}% positive
                              </span>
                            </div>
                          )}
                          
                          {/* Demographics if available */}
                          {region.demographics && (
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Tech-savvy: </span>
                                <span className="font-medium">{region.demographics.techSavvy}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Early adopters: </span>
                                <span className="font-medium">{region.demographics.earlyAdopters}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">25-34 age: </span>
                                <span className="font-medium">{region.demographics.age25_34}%</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Engagement metrics */}
                          {region.engagement && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Engagement: </span>
                              <span className="font-medium">{region.engagement.toLocaleString()}</span>
                            </div>
                          )}
                          
                          {region.topSentiment && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Top theme: </span>
                              <Badge variant="secondary" className="text-xs">
                                {region.topSentiment}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display regional growth for market trends - only in expanded mode */}
              {(data as any)?.regionalGrowth && expanded && (
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
              
              {/* Display regional interest for Google Trends - only in expanded mode */}
              {(data as any)?.regionalInterest && expanded && (
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
              
              {/* Display top themes for sentiment - only in expanded mode */}
              {(data as any)?.topThemes && expanded && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Top Themes</div>
                    <div className="space-y-2">
                      {(data as any).topThemes.map((theme: any, idx: number) => (
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
              
              {/* Display segments for market trends - only in expanded mode */}
              {(data as any)?.segments && expanded && (
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
                      {(data as any).relatedQueries.map((query: any, idx: number) => (
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
                      {(data as any).topPublications.map((pub: any, idx: number) => (
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
              
              {/* Display key drivers for market trends - only in expanded mode */}
              {(data as any)?.drivers && expanded && (
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
              
              {/* Display breakout terms for Google Trends - only in expanded mode */}
              {(data as any)?.breakoutTerms && expanded && (
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
              
              {/* Display key events for news - only in expanded mode */}
              {(data as any)?.keyEvents && expanded && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Recent Key Events</div>
                    <div className="space-y-2">
                      {(data as any).keyEvents.map((event: any, idx: number) => (
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
              
              {/* Display platforms for sentiment - Enhanced version */}
              {(data as any)?.platforms && expanded && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Platform Analytics</div>
                    <div className="space-y-3">
                      {Object.entries((data as any).platforms).map(([platform, data]: [string, any], idx) => (
                        <div key={idx} className="space-y-2 p-2 rounded-lg bg-muted/10">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{platform}</span>
                            <Badge variant={data.sentiment > 85 ? "default" : "outline"} className="text-xs">
                              {data.sentiment}% positive
                            </Badge>
                          </div>
                          
                          {/* Engagement metrics */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {data.posts && (
                              <div>
                                <span className="text-muted-foreground">Posts: </span>
                                <span className="font-medium">{data.posts.toLocaleString()}</span>
                              </div>
                            )}
                            {data.engagement && (
                              <div>
                                <span className="text-muted-foreground">Engagement: </span>
                                <span className="font-medium">{data.engagement.toLocaleString()}</span>
                              </div>
                            )}
                            {data.impressions && (
                              <div>
                                <span className="text-muted-foreground">Impressions: </span>
                                <span className="font-medium">{(data.impressions / 1000000).toFixed(1)}M</span>
                              </div>
                            )}
                            {data.views && (
                              <div>
                                <span className="text-muted-foreground">Views: </span>
                                <span className="font-medium">{(data.views / 1000000).toFixed(1)}M</span>
                              </div>
                            )}
                            {data.avgRating && (
                              <div>
                                <span className="text-muted-foreground">Rating: </span>
                                <span className="font-medium">⭐ {data.avgRating}</span>
                              </div>
                            )}
                            {data.influencerMentions && (
                              <div>
                                <span className="text-muted-foreground">Influencers: </span>
                                <span className="font-medium">{data.influencerMentions}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Platform-specific highlights */}
                          {data.topSubreddits && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Top communities: </span>
                              {data.topSubreddits.map((sub: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs mr-1">
                                  {sub}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {data.avgWatchTime && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Avg watch time: </span>
                              <span className="font-medium">{data.avgWatchTime}</span>
                            </div>
                          )}
                          {data.featured && (
                            <Badge variant="default" className="text-xs w-fit">
                              Featured #{data.rank}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display additional sentiment insights */}
              {(data as any)?.emotionalBreakdown && expanded && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Emotional Analysis</div>
                    <div className="space-y-2">
                      {Object.entries((data as any).emotionalBreakdown).map(([emotion, value]: [string, any]) => (
                        <div key={emotion} className="flex items-center justify-between">
                          <span className="text-xs capitalize">{emotion}</span>
                          <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  emotion === "joy" || emotion === "trust" ? "bg-success" :
                                  emotion === "anticipation" ? "bg-primary" :
                                  emotion === "surprise" ? "bg-accent" :
                                  "bg-muted-foreground/30"
                                )}
                                style={{ width: `${value}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{value}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display temporal analysis */}
              {(data as any)?.temporalAnalysis && expanded && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Temporal Patterns</div>
                    
                    {/* Daily pattern */}
                    {(data as any).temporalAnalysis.daily && (
                      <div className="mb-3">
                        <div className="text-xs text-muted-foreground mb-2">Weekly Pattern</div>
                        <div className="flex items-end gap-1 h-12">
                          {(data as any).temporalAnalysis.daily.map((day: any) => (
                            <div key={day.day} className="flex-1 flex flex-col items-center">
                              <div 
                                className="w-full bg-primary/80 rounded-t"
                                style={{ height: `${(day.sentiment / 100) * 48}px` }}
                              />
                              <span className="text-[10px] mt-1">{day.day.slice(0, 1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Monthly trend */}
                    {(data as any).temporalAnalysis.monthly && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">3-Month Trend</div>
                        <div className="space-y-1">
                          {(data as any).temporalAnalysis.monthly.map((month: any) => (
                            <div key={month.month} className="flex items-center gap-2">
                              <span className="text-xs w-8">{month.month}</span>
                              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                  style={{ width: `${month.sentiment}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{month.sentiment}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Display influencer mentions */}
              {(data as any)?.influencerMentions && expanded && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Influencer Impact</div>
                    <div className="space-y-2">
                      {(data as any).influencerMentions.map((influencer: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/10">
                          <div>
                            <p className="text-sm font-medium">{influencer.name}</p>
                            <p className="text-xs text-muted-foreground">{influencer.platform} • {(influencer.followers / 1000).toFixed(0)}K followers</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={influencer.impact === "Very High" ? "default" : "outline"} className="text-xs">
                              {influencer.impact} impact
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{(influencer.reach / 1000).toFixed(0)}K reach</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Display predictive trends */}
              {(data as any)?.predictiveTrends && expanded && (
                <Card className="border-accent/20">
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground mb-3">Predictive Analysis</div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-lg bg-muted/20">
                          <p className="text-xs text-muted-foreground">7 Days</p>
                          <p className="text-lg font-bold text-primary">{(data as any).predictiveTrends.next7Days.sentiment}%</p>
                          <p className="text-xs text-muted-foreground">{Math.round((data as any).predictiveTrends.next7Days.confidence * 100)}% conf</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/20">
                          <p className="text-xs text-muted-foreground">30 Days</p>
                          <p className="text-lg font-bold text-primary">{(data as any).predictiveTrends.next30Days.sentiment}%</p>
                          <p className="text-xs text-muted-foreground">{Math.round((data as any).predictiveTrends.next30Days.confidence * 100)}% conf</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/20">
                          <p className="text-xs text-muted-foreground">90 Days</p>
                          <p className="text-lg font-bold text-primary">{(data as any).predictiveTrends.next90Days.sentiment}%</p>
                          <p className="text-xs text-muted-foreground">{Math.round((data as any).predictiveTrends.next90Days.confidence * 100)}% conf</p>
                        </div>
                      </div>
                      
                      {(data as any).predictiveTrends.drivers && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Growth Drivers</p>
                          <div className="flex flex-wrap gap-1">
                            {(data as any).predictiveTrends.drivers.map((driver: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {driver}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
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
                      {(data as any).topics.map((topic: any, idx: number) => (
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <FileText className="h-3 w-3" />
                    <span>{data.citations.length} sources analyzed</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {data.citations.map((citation, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                        <a 
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors truncate flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-medium">{citation.source}:</span> {citation.title}
                        </a>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {Math.round(citation.relevance * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
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