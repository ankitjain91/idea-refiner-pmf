import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PMFScoreDisplayProps {
  currentScore: number;
  previousScore: number;
}

export function PMFScoreDisplay({ currentScore, previousScore }: PMFScoreDisplayProps) {
  const improvement = currentScore - previousScore;
  
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Strong PM-Fit';
    if (score >= 50) return 'Moderate PM-Fit';
    return 'Needs Improvement';
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Current PM-Fit Score</p>
            <div className="flex items-baseline gap-4">
              <span className={cn("text-5xl font-bold", getScoreColor(currentScore))}>
                {currentScore}%
              </span>
              {improvement > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl text-muted-foreground line-through">
                    {previousScore}%
                  </span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  <div className="flex items-center gap-1 text-green-500">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold">+{improvement}%</span>
                  </div>
                </div>
              )}
            </div>
            <p className={cn("text-sm mt-2 font-medium", getScoreColor(currentScore))}>
              {getScoreLabel(currentScore)}
            </p>
          </div>
          
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - currentScore / 100)}`}
                className={cn("transition-all duration-1000", getScoreColor(currentScore))}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className={cn("text-2xl font-bold", getScoreColor(currentScore))}>
                  {currentScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}