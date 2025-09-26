import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreCardProps {
  title: string;
  current: number;
  potential: number;
  label: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

export function ScoreCard({ title, current, potential, label, color }: ScoreCardProps) {
  const improvement = potential - current;
  const improvementPercent = ((improvement / current) * 100).toFixed(0);
  
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-500/40',
    green: 'bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 hover:border-green-500/40',
    purple: 'bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20 hover:border-purple-500/40',
    orange: 'bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20 hover:border-orange-500/40'
  };
  
  const progressColors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer",
      colorClasses[color]
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold">{current}%</span>
            <div className="flex items-center gap-1">
              {improvement > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : improvement < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={cn(
                "text-sm font-medium",
                improvement > 0 ? "text-green-500" : improvement < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                +{improvementPercent}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Current</span>
            <span>Potential: {potential}%</span>
          </div>
          <div className="relative">
            <Progress value={current} className="h-2" />
            <div 
              className={cn("absolute top-0 h-2 opacity-30", progressColors[color])}
              style={{ width: `${potential}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}