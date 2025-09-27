import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Star, Target } from 'lucide-react';

interface PMFAnalysisCardProps {
  analysis: any;
}

const PMFAnalysisCard: React.FC<PMFAnalysisCardProps> = ({ analysis }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Score Display */}
      <Card className="relative overflow-hidden p-8 border-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
        <div className="relative">
          <motion.div 
            className="text-center space-y-3"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <div className="relative inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-primary/40 blur-xl"
              />
              <div className="relative text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {analysis.pmfScore || 75}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🧠</span>
              <p className="text-sm font-medium text-muted-foreground">Brain Wrinkle Sophistication Score</p>
              <span className="text-2xl">✨</span>
            </div>
          </motion.div>
          
          {/* Score Breakdown */}
          {analysis.breakdown && (
            <div className="mt-8 space-y-4">
              {Object.entries(analysis.breakdown).map(([key, value]: [string, any], idx) => (
                <motion.div 
                  key={key} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-bold text-primary">{value}%</span>
                  </div>
                  <div className="h-3 bg-muted/50 rounded-full overflow-hidden backdrop-blur">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Insights */}
      {analysis.insights && (
        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Key Insights
          </h4>
          <div className="space-y-2">
            {analysis.insights.map((insight: string, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-muted-foreground break-words overflow-wrap-anywhere">{insight}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Next Steps */}
      {analysis.nextSteps && (
        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Next Steps
          </h4>
          <div className="space-y-2">
            {analysis.nextSteps.map((step: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <Badge variant={step.priority === 'high' ? 'default' : 'secondary'}>
                  {step.priority}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium break-words overflow-wrap-anywhere">{step.action}</p>
                  <p className="text-xs text-muted-foreground break-words">{step.timeline}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-sm text-center text-muted-foreground italic break-words overflow-wrap-anywhere">
        {analysis.summary}
      </p>
    </motion.div>
  );
};

export default PMFAnalysisCard;