import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ChatHeaderProps {
  isAnalyzing: boolean;
  analysisProgress: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ isAnalyzing, analysisProgress }) => {
  if (!isAnalyzing) return null;
  return (
    <div className="border-b p-3 bg-muted/10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium">Analyzing Brief</h3>
          <span className="text-xs text-muted-foreground">Working…</span>
        </div>
        <Progress value={analysisProgress} className="h-1.5" />
      </div>
    </div>
  );
};
