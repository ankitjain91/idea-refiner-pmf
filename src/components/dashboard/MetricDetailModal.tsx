import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, TrendingUp, Calculator, Database, Target, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MetricDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: {
    title: string;
    current: number;
    potential: number;
    description: string;
    calculation: string;
    dataSources: string[];
    insights: string[];
    improvements: {
      action: string;
      impact: string;
      effort: string;
      expectedResult: string;
    }[];
    contextualRelevance: string;
  };
  idea: string;
}

export function MetricDetailModal({ isOpen, onClose, metric, idea }: MetricDetailModalProps) {
  if (!metric) return null;

  const improvementGap = metric.potential - metric.current;
  const improvementPercentage = ((improvementGap / metric.current) * 100).toFixed(1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            {metric.title}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Understanding your {metric.title.toLowerCase()} metric for: <span className="font-semibold text-foreground">{idea}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Score Overview */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current Score</p>
                  <p className="text-3xl font-bold">{metric.current}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Potential Score</p>
                  <p className="text-3xl font-bold text-primary">{metric.potential}%</p>
                </div>
              </div>
              <Progress value={metric.current} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {improvementGap > 0 
                  ? `You can improve by ${improvementPercentage}% to reach your potential`
                  : `You're already at peak performance!`
                }
              </p>
            </div>

            {/* What This Means */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-lg">What This Means</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">{metric.description}</p>
            </div>

            {/* How It's Calculated */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-lg">How We Calculate This</h3>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm leading-relaxed">{metric.calculation}</p>
              </div>
            </div>

            {/* Data Sources */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-lg">Where This Data Comes From</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {metric.dataSources.map((source, idx) => (
                  <Badge key={idx} variant="secondary">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Contextual Relevance */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-lg">Why This Matters For Your Idea</h3>
              </div>
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-lg">
                <p className="text-sm leading-relaxed">{metric.contextualRelevance}</p>
              </div>
            </div>

            {/* Key Insights */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Key Insights</h3>
              <ul className="space-y-2">
                {metric.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-sm text-muted-foreground">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* How to Improve */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-lg">How to Improve This Score</h3>
              </div>
              <div className="space-y-3">
                {metric.improvements.map((improvement, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-green-500/5 to-emerald-500/5 p-4 rounded-lg border border-green-500/20">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{improvement.action}</h4>
                      <div className="flex gap-2">
                        <Badge variant={improvement.impact === 'High' ? 'default' : 'secondary'}>
                          Impact: {improvement.impact}
                        </Badge>
                        <Badge variant={improvement.effort === 'Low' ? 'default' : 'secondary'}>
                          Effort: {improvement.effort}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Expected Result:</span> {improvement.expectedResult}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}