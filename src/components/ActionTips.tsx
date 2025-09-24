import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calculator, 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActionTipsProps {
  score: number;
  metadata?: any; // ChatGPT analysis data
}

const ActionTips = ({ score, metadata }: ActionTipsProps) => {
  const { toast } = useToast();

  // Calculate component scores for breakdown
  const calculateBreakdown = () => {
    const marketSizeScore = metadata?.marketSize?.includes('B') ? 25 : metadata?.marketSize?.includes('M') ? 15 : 10;
    const competitionScore = metadata?.competition === 'Low' ? 25 : metadata?.competition === 'Medium' ? 15 : 5;
    const targetAudienceScore = metadata?.targetAge ? 20 : 10;
    const featuresScore = metadata?.features?.filter((f: any) => f.checked).length * 5 || 15;
    const baseScore = 25; // Base score for having a viable idea
    
    return {
      marketSize: marketSizeScore,
      competition: competitionScore,
      targetAudience: targetAudienceScore,
      features: featuresScore,
      base: baseScore
    };
  };

  const breakdown = calculateBreakdown();

  const calculationDetails = [
    {
      category: "Market Opportunity",
      score: breakdown.marketSize,
      maxScore: 25,
      detail: `Market size: ${metadata?.marketSize || 'Not specified'}`,
      insight: metadata?.marketSize?.includes('B') 
        ? "Large addressable market with high growth potential" 
        : "Focused market with room for expansion",
      icon: TrendingUp,
      color: breakdown.marketSize >= 20 ? "text-success" : breakdown.marketSize >= 15 ? "text-warning" : "text-muted-foreground"
    },
    {
      category: "Competitive Landscape",
      score: breakdown.competition,
      maxScore: 25,
      detail: `Competition level: ${metadata?.competition || 'Medium'}`,
      insight: metadata?.competition === 'Low' 
        ? "First-mover advantage in emerging market" 
        : metadata?.competition === 'High' 
        ? "Saturated market requires strong differentiation" 
        : "Balanced competition with room for innovation",
      icon: Target,
      color: breakdown.competition >= 20 ? "text-success" : breakdown.competition >= 15 ? "text-warning" : "text-muted-foreground"
    },
    {
      category: "Target Demographics",
      score: breakdown.targetAudience,
      maxScore: 20,
      detail: `${metadata?.targetAge || 'General audience'} • ${metadata?.incomeRange || 'Various income levels'}`,
      insight: `${metadata?.interests?.length || 0} key interest areas identified`,
      icon: Users,
      color: breakdown.targetAudience >= 15 ? "text-success" : "text-warning"
    },
    {
      category: "Feature Completeness",
      score: breakdown.features,
      maxScore: 20,
      detail: `${metadata?.features?.filter((f: any) => f.checked).length || 0} core features validated`,
      insight: metadata?.features?.find((f: any) => f.priority === 'high' && !f.checked) 
        ? "Critical features need implementation" 
        : "Core feature set well-defined",
      icon: CheckCircle2,
      color: breakdown.features >= 15 ? "text-success" : breakdown.features >= 10 ? "text-warning" : "text-muted-foreground"
    },
    {
      category: "Idea Viability",
      score: breakdown.base,
      maxScore: 25,
      detail: "Foundation score for concept validation",
      insight: "Idea shows promise with clear problem-solution fit",
      icon: Sparkles,
      color: "text-primary"
    }
  ];

  // Generate contextual action items based on the analysis
  const generateContextualActions = () => {
    const actions = [];
    
    if (metadata?.competition === 'High') {
      actions.push({
        title: "Differentiation Strategy",
        description: "Focus on unique features that competitors lack",
        priority: "high"
      });
    }
    
    if (metadata?.marketSize?.includes('M') || !metadata?.marketSize?.includes('B')) {
      actions.push({
        title: "Market Expansion Plan",
        description: "Identify adjacent markets for growth",
        priority: "medium"
      });
    }
    
    if (score < 70) {
      actions.push({
        title: "MVP Refinement",
        description: "Prioritize must-have features for initial launch",
        priority: "high"
      });
    }
    
    if (!metadata?.features?.some((f: any) => f.name.toLowerCase().includes('ai') || f.name.toLowerCase().includes('automation'))) {
      actions.push({
        title: "AI Integration",
        description: "Consider AI features to enhance user experience",
        priority: "low"
      });
    }
    
    return actions;
  };

  const contextualActions = generateContextualActions();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Calculator className="w-5 h-5" />
          PMF Score Calculation
        </h3>
        
        <div className="space-y-3">
          {calculationDetails.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm font-medium">{item.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{item.score}/{item.maxScore}</span>
                  <Badge variant={item.score >= item.maxScore * 0.7 ? "default" : "secondary"}>
                    {Math.round((item.score / item.maxScore) * 100)}%
                  </Badge>
                </div>
              </div>
              <Progress value={(item.score / item.maxScore) * 100} className="h-2" />
              <div className="text-xs text-muted-foreground">
                <div>{item.detail}</div>
                <div className="flex items-start gap-1 mt-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{item.insight}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Total PMF Score</span>
            <span className="text-2xl font-bold gradient-text">{score}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on market analysis, competition assessment, target demographics, and feature validation.
          </p>
        </div>
      </div>

      {contextualActions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Recommended Actions
          </h4>
          <div className="space-y-2">
            {contextualActions.map((action, index) => (
              <div key={index} className="p-2 bg-background rounded-md border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  </div>
                  <Badge variant={action.priority === 'high' ? 'destructive' : action.priority === 'medium' ? 'default' : 'secondary'}>
                    {action.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metadata?.actionTips && metadata.actionTips.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            AI Recommendations
          </h4>
          <div className="space-y-2">
            {metadata.actionTips.map((tip: string, index: number) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-background rounded-md">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <p className="text-xs">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionTips;