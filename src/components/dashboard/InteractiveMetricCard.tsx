import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  TrendingUp, ArrowUp, ArrowDown, Info, 
  DollarSign, Target, Users, Lightbulb,
  ChevronRight, Activity, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MetricInsight {
  metric: string;
  value: any;
  impact: 'high' | 'medium' | 'low';
  profitabilityRole: string;
  improvementTips: string[];
  benchmark: string;
  source?: string;
}

interface InteractiveMetricCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  prefix?: string;
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: string;
  description?: string;
  insight?: MetricInsight;
  onClick?: () => void;
}

export const InteractiveMetricCard: React.FC<InteractiveMetricCardProps> = ({
  title,
  value,
  suffix = "",
  prefix = "",
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
  description,
  insight,
  onClick
}) => {
  const [showInsight, setShowInsight] = useState(false);
  
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Activity;
  const trendColor = trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-yellow-500";
  
  const handleClick = () => {
    if (insight) {
      setShowInsight(true);
    }
    if (onClick) {
      onClick();
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/50';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/50';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Card 
          className={cn(
            "p-6 cursor-pointer transition-all hover:shadow-lg",
            "hover:border-primary/50 relative overflow-hidden group"
          )}
          onClick={handleClick}
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                <Icon className={cn("h-6 w-6", `text-${color}-500`)} />
              </div>
              {trend && (
                <div className="flex items-center gap-1">
                  <TrendIcon className={cn("h-4 w-4", trendColor)} />
                  {trendValue && (
                    <span className={cn("text-xs font-medium", trendColor)}>
                      {trendValue}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">
                {prefix}{value}{suffix}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground mt-2">{description}</p>
              )}
            </div>

            {/* Clickable Indicator */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1 text-xs text-primary">
                <Info className="h-3 w-3" />
                Click for insights
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Insight Dialog */}
      {insight && (
        <Dialog open={showInsight} onOpenChange={setShowInsight}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                {title} - Profitability Analysis
              </DialogTitle>
              <DialogDescription>
                Understanding how this metric impacts your business success
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Current Value */}
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-2xl font-bold">{prefix}{value}{suffix}</p>
                </div>
                <Badge className={cn("px-3 py-1", getImpactColor(insight.impact))}>
                  {insight.impact} Impact
                </Badge>
              </div>

              {/* Profitability Role */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <h4 className="font-semibold">Role in Profitability</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {insight.profitabilityRole}
                </p>
              </div>

              {/* Benchmark */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <h4 className="font-semibold">Industry Benchmark</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {insight.benchmark}
                </p>
              </div>

              {/* Improvement Tips */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <h4 className="font-semibold">How to Improve</h4>
                </div>
                <div className="space-y-2">
                  {insight.improvementTips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                      <p className="text-sm text-muted-foreground">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Source */}
              {insight.source && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Source: {insight.source}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowInsight(false)}>
                Close
              </Button>
              <Button onClick={() => {
                // Implement export or save functionality
                setShowInsight(false);
              }}>
                Save Insights
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};