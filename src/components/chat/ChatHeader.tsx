import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Brain, RotateCcw, Play } from 'lucide-react';
import { ANALYSIS_VERB } from '@/branding';

interface ChatHeaderProps {
  isAnalyzing: boolean;
  analysisProgress: number;
  onReset?: () => void;
  onAnalyze?: () => void;
  canAnalyze?: boolean;
}

export function ChatHeader({ 
  isAnalyzing, 
  analysisProgress, 
  onReset, 
  onAnalyze, 
  canAnalyze = false
}: ChatHeaderProps) {
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
