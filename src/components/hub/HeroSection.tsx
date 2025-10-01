import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { TileData } from "@/lib/data-hub-orchestrator";

interface HeroSectionProps {
  pmfScore?: TileData | null;
  loading?: boolean;
}

export function HeroSection({ pmfScore, loading, onGetScore }: HeroSectionProps & { onGetScore?: () => void }) {
  const score = pmfScore?.metrics?.score || 0;
  const category = pmfScore?.metrics?.category || "Calculating...";
  const insight = pmfScore?.explanation || "Analyzing market fit potential...";
  
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };
  
  const getTrendIcon = () => {
    const trend = pmfScore?.metrics?.trend;
    if (!trend) return <Minus className="h-4 w-4" />;
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="relative p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
        
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Score Display */}
          <div className="flex flex-col items-center md:items-start space-y-6">
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
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - score / 100)}`}
                    className={cn("transition-all duration-1000 ease-out", getScoreColor(score))}
                    strokeLinecap="round"
                  />
                </svg>
                
              {/* Score Text or Get Score Button */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {!pmfScore && !loading && onGetScore ? (
                  <Button 
                    onClick={onGetScore}
                    size="lg"
                    className="gap-2"
                  >
                    <Brain className="h-5 w-5" />
                    Get My Score
                  </Button>
                ) : (
                  <>
                    <span className={cn("text-5xl font-bold", getScoreColor(score))}>
                      {loading ? "..." : score}
                    </span>
                    <span className="text-sm text-muted-foreground">PMF Score</span>
                  </>
                )}
              </div>
              </div>
            </div>
            
            {/* Category Badge */}
            <div className="flex items-center gap-2">
              <Badge 
                variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive"}
                className="text-sm px-3 py-1"
              >
                {category}
              </Badge>
              {getTrendIcon()}
            </div>
          </div>
          
          {/* Insights */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">SmoothBrains PMF Analysis</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {insight}
              </p>
            </div>
            
            {/* Key Metrics */}
            {pmfScore?.metrics && (
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Market Demand</p>
                  <Progress value={pmfScore.metrics.demand || 0} className="h-2" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Competition Level</p>
                  <Progress value={100 - (pmfScore.metrics.competition || 0)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Market Growth</p>
                  <Progress value={pmfScore.metrics.growth || 0} className="h-2" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sentiment</p>
                  <Progress value={pmfScore.metrics.sentiment || 0} className="h-2" />
                </div>
              </div>
            )}
            
            {/* Confidence Badge */}
            {pmfScore?.confidence && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-muted-foreground">Confidence:</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(pmfScore.confidence * 100)}%
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}