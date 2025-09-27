import React from 'react';
import { Gauge, DollarSign, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPIHeaderProps {
  ideaName: string;
  category?: string;
  pmfScore?: number; // 0-100
  profitabilityIndex?: number; // 0-100 or any scaled metric
  confidence?: 'Low' | 'Medium' | 'High';
}

const confidenceColor: Record<string,string> = {
  Low: 'text-red-600 dark:text-red-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  High: 'text-emerald-600 dark:text-emerald-400'
};

export const KPIHeader: React.FC<KPIHeaderProps> = ({ ideaName, category, pmfScore = 0, profitabilityIndex = 0, confidence = 'Low' }) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium tracking-wide">Idea Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <h1 className="text-xl font-semibold leading-tight break-words">{ideaName || 'Untitled Idea'}</h1>
          <p className="text-xs text-muted-foreground">Category: {category || '—'}</p>
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium tracking-wide flex items-center gap-2"><Gauge className="h-4 w-4" /> PM Fit Score</CardTitle>
          <span className="text-[10px] uppercase text-muted-foreground">0–100</span>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <path className="text-muted stroke-current" strokeWidth="3.5" fill="none" strokeLinecap="round" d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" opacity={0.15} />
                <path className="text-primary stroke-current" strokeWidth="3.5" fill="none" strokeLinecap="round"
                  strokeDasharray={`${pmfScore}, 100`} d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold">
                <span className="text-base">{Math.round(pmfScore)}</span>
                <span className="text-[10px] text-muted-foreground">Score</span>
              </div>
            </div>
            <div className="flex-1 space-y-1 text-xs">
              <p className="leading-tight text-muted-foreground">Represents composite of demand clarity, problem severity, persona definition, and retention signals.</p>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${pmfScore}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium tracking-wide flex items-center gap-2"><DollarSign className="h-4 w-4" /> Profitability Index</CardTitle>
          <span className="text-[10px] uppercase text-muted-foreground">Forecast</span>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="flex flex-col items-start">
            <span className="text-2xl font-semibold tabular-nums">{profitabilityIndex.toFixed(0)}</span>
            <span className="text-[10px] tracking-wide uppercase text-muted-foreground">Potential</span>
          </div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 transition-all', profitabilityIndex<34 && 'from-red-500 via-orange-400 to-amber-400', profitabilityIndex>66 && 'from-emerald-500 via-teal-500 to-cyan-500')} style={{ width: `${profitabilityIndex}%` }} />
          </div>
          <div className={cn('flex flex-col items-center justify-center px-2 py-1 rounded-md border bg-background text-[10px] font-medium gap-1', confidenceColor[confidence])}>
            <ShieldCheck className="h-3 w-3" />
            <span>{confidence}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
