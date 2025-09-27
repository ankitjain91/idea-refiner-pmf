import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Sparkles, Layers, Radar, Lightbulb } from 'lucide-react';

interface AIRecommendationsSectionProps {
  refinements?: string[];
  featureMatrix?: Array<{ feature: string; impact: number; effort: number }>;
  competitorGaps?: string[];
  monetizationTips?: string[];
}

export const AIRecommendationsSection: React.FC<AIRecommendationsSectionProps> = ({
  refinements = [],
  featureMatrix = [],
  competitorGaps = [],
  monetizationTips = []
}) => {
  return (
    <div className="grid md:grid-cols-12 gap-4">
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4"/> Refinement Suggestions</CardTitle></CardHeader>
        <CardContent>
          {refinements.length===0 && <p className="text-xs text-muted-foreground">No suggestions yet.</p>}
          <ul className="text-[11px] space-y-1 list-disc pl-4">
            {refinements.map((r,i)=>(<li key={i}>{r}</li>))}
          </ul>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Layers className="h-4 w-4"/> Feature Prioritization</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {featureMatrix.length===0 && <p className="text-muted-foreground">No matrix data.</p>}
          <div className="grid grid-cols-2 gap-2">
            {featureMatrix.map(f => (
              <div key={f.feature} className="rounded-md border p-2 bg-muted/30">
                <p className="text-[11px] font-medium mb-1 truncate" title={f.feature}>{f.feature}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <span>Impact</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${f.impact}%` }} /></div>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                  <span>Effort</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${f.effort}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Radar className="h-4 w-4"/> Competitor Gaps</CardTitle></CardHeader>
        <CardContent>
          {competitorGaps.length===0 && <p className="text-xs text-muted-foreground">No gap insights yet.</p>}
          <ul className="text-[11px] space-y-1 list-disc pl-4">
            {competitorGaps.map((c,i)=>(<li key={i}>{c}</li>))}
          </ul>
        </CardContent>
      </Card>
      <Card className="md:col-span-12">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4"/> Monetization Strategy Tips</CardTitle></CardHeader>
        <CardContent>
          {monetizationTips.length===0 && <p className="text-xs text-muted-foreground">No tips available.</p>}
          <ul className="text-[11px] space-y-1 list-disc pl-4 columns-1 md:columns-2">
            {monetizationTips.map((t,i)=>(<li key={i}>{t}</li>))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
