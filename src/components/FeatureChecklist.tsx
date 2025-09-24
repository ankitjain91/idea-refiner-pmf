import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Sparkles, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureChecklistProps {
  idea: string;
  budget: string;
}

interface Feature {
  id: string;
  label: string;
  priority: "must-have" | "nice-to-have" | "future";
  checked: boolean;
  effort: "low" | "medium" | "high";
}

const FeatureChecklist = ({ idea, budget }: FeatureChecklistProps) => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    // Generate features based on idea and budget
    const baseFeatures: Feature[] = [
      {
        id: "1",
        label: "User Authentication & Accounts",
        priority: "must-have",
        checked: false,
        effort: "low",
      },
      {
        id: "2",
        label: "Mobile Responsive Design",
        priority: "must-have",
        checked: false,
        effort: "low",
      },
      {
        id: "3",
        label: "Analytics Dashboard",
        priority: "nice-to-have",
        checked: false,
        effort: "medium",
      },
      {
        id: "4",
        label: "API Integration",
        priority: "nice-to-have",
        checked: false,
        effort: "medium",
      },
      {
        id: "5",
        label: "Payment Processing",
        priority: budget === "bootstrapped" ? "future" : "must-have",
        checked: false,
        effort: "high",
      },
      {
        id: "6",
        label: "Real-time Notifications",
        priority: "nice-to-have",
        checked: false,
        effort: "medium",
      },
      {
        id: "7",
        label: "AI-Powered Recommendations",
        priority: budget === "series-a" ? "nice-to-have" : "future",
        checked: false,
        effort: "high",
      },
      {
        id: "8",
        label: "Multi-language Support",
        priority: "future",
        checked: false,
        effort: "high",
      },
    ];

    setFeatures(baseFeatures);
  }, [idea, budget]);

  const toggleFeature = (id: string) => {
    setFeatures(prev =>
      prev.map(feature =>
        feature.id === id ? { ...feature, checked: !feature.checked } : feature
      )
    );
  };

  const addCustomFeature = () => {
    if (newFeature.trim()) {
      const newFeatureObj: Feature = {
        id: Date.now().toString(),
        label: newFeature,
        priority: "nice-to-have",
        checked: false,
        effort: "medium",
      };
      setFeatures(prev => [...prev, newFeatureObj]);
      setNewFeature("");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "must-have":
        return "text-destructive";
      case "nice-to-have":
        return "text-warning";
      case "future":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  const getEffortBadge = (effort: string) => {
    switch (effort) {
      case "low":
        return <Badge variant="outline" className="text-xs text-success border-success/50">Low Effort</Badge>;
      case "medium":
        return <Badge variant="outline" className="text-xs text-warning border-warning/50">Medium</Badge>;
      case "high":
        return <Badge variant="outline" className="text-xs text-destructive border-destructive/50">High Effort</Badge>;
      default:
        return null;
    }
  };

  const completionRate = Math.round((features.filter(f => f.checked).length / features.length) * 100) || 0;

  return (
    <Card className="glass-card p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Feature Checklist
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {completionRate}% Complete
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Suggested
            </Badge>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-all",
                "animate-slide-up",
                feature.checked && "opacity-75"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  checked={feature.checked}
                  onCheckedChange={() => toggleFeature(feature.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      feature.checked && "line-through opacity-60"
                    )}>
                      {feature.label}
                    </span>
                    <span className={cn("text-xs", getPriorityColor(feature.priority))}>
                      ({feature.priority})
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getEffortBadge(feature.effort)}
                {feature.checked ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-3 border-t border-border/50">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addCustomFeature()}
            placeholder="Add custom feature..."
            className="flex-1 px-3 py-2 text-sm bg-background/50 border border-border/50 rounded-md focus:border-primary focus:outline-none transition-colors"
          />
          <Button
            onClick={addCustomFeature}
            size="sm"
            variant="secondary"
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default FeatureChecklist;