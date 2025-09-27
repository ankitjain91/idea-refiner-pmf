import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LS_UI_KEYS } from '@/lib/storage-keys';

/**
 * Minimal AI Q&A toggle button.
 * Design goals: subtle, compact, non-flashy, clear active affordance.
 */
export const AIQnAToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [active, setActive] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_UI_KEYS.aiQnAToggleActive) === 'true'; } catch { return false; }
  });
  const [animPulse, setAnimPulse] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);

  useEffect(() => {
    const end = () => { setActive(false); try { localStorage.setItem(LS_UI_KEYS.aiQnAToggleActive, 'false'); } catch {}; };
    const start = () => { setActive(true); try { localStorage.setItem(LS_UI_KEYS.aiQnAToggleActive, 'true'); } catch {}; };
    const analysisRun = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setAnalysisRunning(!!detail?.running);
    };
    window.addEventListener('analysis:briefEnded', end as any);
    window.addEventListener('analysis:briefStarted', start as any);
    window.addEventListener('analysis:running', analysisRun as any);
    // If persisted active on reload, auto trigger open event so chat picks it up
    if (active) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('analysis:openBrief'));
      }, 80);
    }
    return () => {
      window.removeEventListener('analysis:briefEnded', end as any);
      window.removeEventListener('analysis:briefStarted', start as any);
      window.removeEventListener('analysis:running', analysisRun as any);
    };
  }, []);

  useEffect(() => {
    if (active) {
      setAnimPulse(true);
      const t = setTimeout(() => setAnimPulse(false), 800);
      return () => clearTimeout(t);
    }
  }, [active]);

  const toggle = () => {
    if (analysisRunning) return; // disabled during analysis
    if (active) {
      window.dispatchEvent(new CustomEvent('analysis:closeBrief'));
      try { localStorage.setItem(LS_UI_KEYS.aiQnAToggleActive, 'false'); } catch {}
      setActive(false);
    } else {
      window.dispatchEvent(new CustomEvent('analysis:openBrief'));
      try { localStorage.setItem(LS_UI_KEYS.aiQnAToggleActive, 'true'); } catch {}
      setActive(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={analysisRunning}
      aria-pressed={active}
      aria-label={active ? 'Deactivate AI Q&A' : 'Activate AI Q&A'}
      title={active ? 'AI Q&A Active (click to stop)' : 'Start AI Q&A'}
      className={cn(
        'relative inline-flex items-center justify-center h-7 px-2 rounded-md border text-[10px] font-medium tracking-wide select-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none',
        active ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]' : 'bg-background/40 hover:bg-background/70 border-border/60 text-muted-foreground scale-[0.98] hover:scale-[1.0]',
        'group',
        className
      )}
      style={active ? { boxShadow: '0 0 0 1px var(--tw-ring-color, rgba(0,0,0,0.06)), 0 0 0 3px rgba(var(--ai-glow-color,59,130,246),0.35), 0 0 10px 2px rgba(var(--ai-glow-color,59,130,246),0.25)' } : undefined}
    >
      <Star className={cn('h-3.5 w-3.5 transition-transform', active ? 'fill-current scale-110' : 'scale-100')} />
      <span className="ml-1 hidden sm:inline">AI</span>
      {/* Active indicator dot */}
      <span
        className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary/70 ring-2 ring-background transition-opacity', active ? 'opacity-100' : 'opacity-0')}
      />
      {/* Soft pulse on activation */}
      {animPulse && (
        <span className="pointer-events-none absolute inset-0 rounded-md animate-ping bg-primary/30" />
      )}
      {/* Analysis running overlay */}
      {analysisRunning && (
        <span className="absolute inset-0 rounded-md bg-background/60 backdrop-blur-[1px] flex items-center justify-center text-[9px] font-semibold text-muted-foreground">…</span>
      )}
    </button>
  );
};
