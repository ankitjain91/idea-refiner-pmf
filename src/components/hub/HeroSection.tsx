import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Sparkles, ArrowRight, ChartBar, TrendingUp as TrendIcon, Users, Globe } from "lucide-react";
import { DashboardLoader } from "@/components/engagement/DashboardLoader";
import { cn } from "@/lib/utils";
import { TileData } from "@/lib/data-hub-orchestrator";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface HeroSectionProps {
  pmfScore?: TileData | null;
  loading?: boolean;
  onGetScore?: () => void;
  hasData?: boolean;
}

export function HeroSection({ pmfScore, loading, onGetScore, hasData }: HeroSectionProps) {
  const score = pmfScore?.metrics?.score || 0;
  const category = pmfScore?.metrics?.category || "Analyzing...";
  const insight = pmfScore?.explanation || "Click below to analyze your startup's market fit potential with real-time data.";
  
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };
  
  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-500/20 to-green-500/5";
    if (score >= 60) return "from-yellow-500/20 to-yellow-500/5";
    if (score >= 40) return "from-orange-500/20 to-orange-500/5";
    return "from-red-500/20 to-red-500/5";
  };
  
  const getTrendIcon = () => {
    const trend = pmfScore?.metrics?.trend;
    if (!trend) return <Minus className="h-4 w-4" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4" />;
  };

  // Check if score already exists to skip initial screen
  const hasExistingScore = pmfScore?.metrics?.score && pmfScore.metrics.score > 0;
  
  // Initial state - before data is loaded and no existing score
  if (!hasData && !loading && !hasExistingScore) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative p-8 md:p-12">
          {/* Animated background decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-48 translate-x-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl translate-y-32 -translate-x-32 animate-pulse delay-700" />
          
          <div className="relative">
            {/* Welcome Content */}
            <div className="text-center space-y-8 max-w-3xl mx-auto">
              <div className="space-y-4 animate-fade-in">
                <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Discover Your SmoothBrains Score
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Get instant insights into your startup's potential with our AI-powered analysis engine
                </p>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left animate-fade-in animation-delay-200">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/50 transition-colors">
                  <ChartBar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Market Analysis</p>
                    <p className="text-xs text-muted-foreground">Real-time market demand data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/50 transition-colors">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Competition Insights</p>
                    <p className="text-xs text-muted-foreground">Competitive landscape mapping</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/50 transition-colors">
                  <Globe className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Global Reach</p>
                    <p className="text-xs text-muted-foreground">Multi-region opportunity analysis</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="animate-fade-in animation-delay-400">
                <Button 
                  onClick={onGetScore}
                  size="lg"
                  className="gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-6 text-base group"
                >
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  Analyze My Startup
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">Takes ~10 seconds • No credit card required</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Loading state - show enhanced loader
  if (loading && !pmfScore) {
    return <DashboardLoader stage="hero" />;
  }

  // Data loaded state
  return (
    <Card className={cn(
      "relative overflow-hidden border-border/50 transition-all duration-500 animate-fade-in",
      hasData && `bg-gradient-to-br from-background via-background to-primary/5`
    )}>
      <motion.div 
        className="relative p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Animated background decoration with score-based color */}
        <motion.div 
          className={cn(
            "absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-32 translate-x-32",
            hasData && `bg-gradient-to-br ${getScoreGradient(score)}`
          )}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Score Display */}
          <motion.div 
            className="flex flex-col items-center md:items-start space-y-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative">
              {/* Circular Progress Ring */}
              <div className="relative w-48 h-48">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted/20"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    className={cn("transition-all duration-1000 ease-out", getScoreColor(score))}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - score / 100) }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />
                </svg>
                
                {/* Score Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span 
                    className={cn("text-5xl font-bold transition-all duration-500", getScoreColor(score))}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.8, type: "spring", stiffness: 200 }}
                  >
                    {loading ? "..." : score}
                  </motion.span>
                  <motion.span 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    SmoothBrains Score
                  </motion.span>
                </div>
              </div>
            </div>
            
            {/* Category Badge */}
            <motion.div 
              className="flex items-center gap-2"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <Badge 
                variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive"}
                className="text-sm px-3 py-1"
              >
                {category}
              </Badge>
              {getTrendIcon()}
            </motion.div>
          </motion.div>
          
          {/* Insights */}
          <motion.div 
            className="space-y-4"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div>
              <motion.h1 
                className="text-3xl font-bold mb-2"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                SmoothBrains Analysis Complete
              </motion.h1>
              <motion.p 
                className="text-lg text-muted-foreground leading-relaxed"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {insight}
              </motion.p>
            </div>
            
            {/* Key Metrics */}
            {pmfScore?.metrics && (
              <div className="grid grid-cols-2 gap-4 pt-4">
                <motion.div 
                  className="space-y-1"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <p className="text-sm text-muted-foreground">Market Demand</p>
                  <Progress value={pmfScore.metrics.demand || 0} className="h-2" />
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.0 }}
                >
                  <p className="text-sm text-muted-foreground">Competition Level</p>
                  <Progress value={100 - (pmfScore.metrics.competition || 0)} className="h-2" />
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  <p className="text-sm text-muted-foreground">Market Growth</p>
                  <Progress value={pmfScore.metrics.growth || 0} className="h-2" />
                </motion.div>
                <motion.div 
                  className="space-y-1"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <p className="text-sm text-muted-foreground">Sentiment</p>
                  <Progress value={pmfScore.metrics.sentiment || 0} className="h-2" />
                </motion.div>
              </div>
            )}
            
            {/* Confidence Badge */}
            {pmfScore?.confidence && (
              <motion.div 
                className="flex items-center gap-2 pt-2"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.3 }}
              >
                <span className="text-xs text-muted-foreground">Confidence:</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(pmfScore.confidence * 100)}%
                </Badge>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </Card>
  );
}