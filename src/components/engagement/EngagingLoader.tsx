import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Activity, Database, Brain, CloudDownload, BarChart, ListChecks, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Stage {
  label: string;
  weight: number;
  icon: React.ReactNode;
}

interface EngagingLoaderProps {
  active: boolean;
  scope?: 'auth' | 'settings' | 'generic' | 'dashboard';
  overlay?: boolean;
  className?: string;
  onComplete?: () => void;
}

// Shared fact pool (can be extended or externalized later)
const PRODUCT_FACTS = [
  'Ideas focused on a narrow niche reach first 100 users 2x faster.',
  'Refining positioning early reduces wasted feature dev by ~30%.',
  'Talking to 10 real users beats 100 speculative assumptions.',
  'Define who it is NOT for to sharpen resonance.',
  'Retention patterns in week 2 often predict long-term market fit.',
  'Users buy progress, not features.',
  'A strong “problem statement” copy test outperforms redesigns.',
  'Instrumenting activation beats adding onboarding steps.',
  'Concise landing headlines usually emerge from interview transcripts.',
  'Premium upgrades align with moments of achieved value.',
  'Error clarity is an underrated growth lever.',
  'Users rarely churn from “missing AI”, but from unclear value.',
  'Outcome-oriented pricing pages convert better than feature tables.',
  'Internal language leaking into UX copy confuses new users.',
  'High-friction flows can win if the aha moment is undeniable.'
];

const BASE_STAGES: Stage[] = [
  { label: 'Bootstrapping context', weight: 10, icon: <Activity className='h-3 w-3 text-primary' /> },
  { label: 'Fetching records', weight: 22, icon: <Database className='h-3 w-3 text-primary' /> },
  { label: 'Rehydrating state', weight: 18, icon: <Brain className='h-3 w-3 text-primary' /> },
  { label: 'Restoring assets', weight: 16, icon: <CloudDownload className='h-3 w-3 text-primary' /> },
  { label: 'Preparing panels', weight: 14, icon: <BarChart className='h-3 w-3 text-primary' /> },
  { label: 'Composing layout', weight: 12, icon: <ListChecks className='h-3 w-3 text-primary' /> },
  { label: 'Final polish', weight: 8, icon: <Sparkles className='h-3 w-3 text-primary' /> },
];

export const EngagingLoader: React.FC<EngagingLoaderProps> = ({ active, scope='generic', overlay=true, className, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [factIdx, setFactIdx] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [currentDetail, setCurrentDetail] = useState('Initializing');
  const factIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derive specialized stages by scope (placeholder for future expansion)
  const stages = BASE_STAGES.map(s => ({ ...s }));
  if (scope === 'auth') stages[0].label = 'Verifying authentication';
  if (scope === 'settings') stages[2].label = 'Loading profile';
  if (scope === 'dashboard') {
    stages[0].label = 'Syncing dashboard context';
    stages[1].label = 'Loading sessions';
    stages[2].label = 'Hydrating chat + idea';
  }

  useEffect(() => {
    if (active) {
      // Reset
      setProgress(3);
      setStageIdx(0);
      setCurrentDetail('Initializing');
      // Stage sequencing
      const totalWeight = stages.reduce((a, s) => a + s.weight, 0);
      stageIntervalRef.current = setInterval(() => {
        setStageIdx(prev => {
          const next = prev + 1;
          if (next <= stages.length) {
            const weightSoFar = stages.slice(0, next).reduce((a, s) => a + s.weight, 0);
            setProgress(Math.min(97, Math.round((weightSoFar / totalWeight) * 100)));
            if (next - 1 < stages.length) setCurrentDetail(stages[next - 1].label);
          }
          if (next >= stages.length) {
            clearInterval(stageIntervalRef.current!);
          }
          return next;
        });
      }, 650);
      // Facts rotation
      factIntervalRef.current = setInterval(() => {
        setFactIdx(p => (p + 1) % PRODUCT_FACTS.length);
      }, 5000);
    } else if (!active && progress > 0) {
      setProgress(100);
      setCurrentDetail('Done');
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = setTimeout(() => {
        setProgress(0);
        setCurrentDetail('');
        onComplete?.();
      }, 500);
    }
    return () => {
      if (factIntervalRef.current) clearInterval(factIntervalRef.current);
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    };
  }, [active]);

  if (!active && progress === 0) return null;

  const Container = overlay ? 'div' : 'div';

  return (
    <Container className={cn('pointer-events-none', overlay && 'absolute inset-0 z-40 flex items-center justify-center p-4', className)}>
      <div className="flex flex-col gap-4 w-full max-w-md rounded-xl bg-gradient-to-br from-background/85 via-background/70 to-background/80 backdrop-blur-xl shadow-lg border border-border/50 px-6 py-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div>
            <p className="text-xs uppercase tracking-wide text-primary/80 font-semibold">
              {scope === 'auth' ? 'Signing you in' : scope === 'settings' ? 'Loading Settings' : scope === 'dashboard' ? 'Preparing Dashboard' : 'Loading'}
            </p>
            <p className="text-[11px] text-muted-foreground" aria-live="polite">{currentDetail}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Progress value={progress} className="h-2 w-full" />
          <div className="flex justify-between text-[10px] text-muted-foreground/80 font-mono">
            <span>{progress}%</span>
            <span>{stages[Math.min(stageIdx, stages.length - 1)]?.label}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-2 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-muted-foreground" key={factIdx}>
            {PRODUCT_FACTS[factIdx]}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {stages.slice(0,6).map((s,i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-md bg-muted/30 px-2 py-1">
              {s.icon}
              <span className="text-[10px] truncate" title={s.label}>{s.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60 text-center">
          Auto-saved continuously. Explore freely.
        </p>
      </div>
    </Container>
  );
};

export default EngagingLoader;
