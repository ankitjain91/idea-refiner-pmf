import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Users, Zap, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PMFDashboardProps {
  idea: string;
  refinements: {
    budget: string;
    market: string;
    timeline: string;
  };
  onScoreUpdate: (score: number) => void;
}

const PMFDashboard = ({ idea, refinements, onScoreUpdate }: PMFDashboardProps) => {
  const [score, setScore] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [metrics, setMetrics] = useState({
    marketSize: 0,
    competition: 0,
    feasibility: 0,
    timing: 0,
  });

  // Calculate PMF score based on idea and refinements
  useEffect(() => {
    if (!idea) {
      setScore(0);
      return;
    }

    let newScore = 30; // Base score for having an idea

    // Budget impact
    if (refinements.budget === "bootstrapped") newScore += 10;
    else if (refinements.budget === "seed") newScore += 15;
    else if (refinements.budget === "series-a") newScore += 20;

    // Market impact
    if (refinements.market === "niche") newScore += 8;
    else if (refinements.market === "mainstream") newScore += 15;
    else if (refinements.market === "enterprise") newScore += 18;

    // Timeline impact
    if (refinements.timeline === "mvp") newScore += 12;
    else if (refinements.timeline === "6-months") newScore += 10;
    else if (refinements.timeline === "1-year") newScore += 8;

    // Idea length bonus (more detailed = better)
    newScore += Math.min(idea.length / 10, 15);

    // Calculate individual metrics
    setMetrics({
      marketSize: Math.min(refinements.market === "enterprise" ? 85 : refinements.market === "mainstream" ? 70 : 50, 100),
      competition: Math.min(idea.length > 50 ? 65 : 40, 100),
      feasibility: Math.min(refinements.budget === "bootstrapped" ? 80 : 60, 100),
      timing: Math.min(refinements.timeline === "mvp" ? 90 : 60, 100),
    });

    const finalScore = Math.min(newScore, 100);
    setScore(finalScore);
    onScoreUpdate(finalScore);
  }, [idea, refinements, onScoreUpdate]);

  // Animate score changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return "Strong PMF";
    if (score >= 50) return "Moderate PMF";
    if (score >= 25) return "Weak PMF";
    return "No PMF";
  };

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Product-Market Fit Score</h3>
            <p className="text-sm text-muted-foreground">Real-time analysis based on your inputs</p>
          </div>
          <Badge 
            variant={animatedScore >= 75 ? "default" : animatedScore >= 50 ? "secondary" : "destructive"}
            className="px-3 py-1"
          >
            {getScoreLabel(animatedScore)}
          </Badge>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className={cn("text-4xl font-display font-bold transition-all duration-500", getScoreColor(animatedScore))}>
              {Math.round(animatedScore)}%
            </span>
            <div className="flex items-center gap-2">
              {animatedScore >= 50 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
            </div>
          </div>
          
          <Progress value={animatedScore} className="h-3 transition-all duration-500" />
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Market Size</span>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-bold">{metrics.marketSize}%</span>
            <Progress value={metrics.marketSize} className="h-2" />
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Competition</span>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-bold">{metrics.competition}%</span>
            <Progress value={metrics.competition} className="h-2" />
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-success" />
            <span className="text-sm font-medium">Feasibility</span>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-bold">{metrics.feasibility}%</span>
            <Progress value={metrics.feasibility} className="h-2" />
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">Timing</span>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-bold">{metrics.timing}%</span>
            <Progress value={metrics.timing} className="h-2" />
          </div>
        </Card>
      </div>

      {/* Status Indicators */}
      <Card className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">Live Analysis Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full pulse-glow" />
            <span className="text-xs text-muted-foreground">Updating</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PMFDashboard;