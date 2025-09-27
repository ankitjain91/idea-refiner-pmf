import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ResizableSplitProps {
  top: React.ReactNode;
  bottom: React.ReactNode;
  initialRatio?: number; // 0-1 height ratio for top
  storageKey?: string;
  minTop?: number; // px
  minBottom?: number; // px
  className?: string;
}

/**
 * Accessible vertical resizable split (top/bottom) with persistent ratio.
 */
export const ResizableSplit: React.FC<ResizableSplitProps> = ({
  top,
  bottom,
  initialRatio = 0.55,
  storageKey = 'dashboardSplitRatio',
  minTop = 180,
  minBottom = 180,
  className
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState<number>(() => {
    const stored = localStorage.getItem(storageKey);
    const parsed = stored ? parseFloat(stored) : initialRatio;
    if (!isFinite(parsed) || parsed <= 0 || parsed >= 1) return initialRatio;
    return parsed;
  });
  const [dragging, setDragging] = useState(false);

  // Persist ratio
  useEffect(() => {
    localStorage.setItem(storageKey, ratio.toString());
  }, [ratio, storageKey]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top; // px from top
    const clamped = Math.min(Math.max(y, minTop), rect.height - minBottom);
    const newRatio = clamped / rect.height;
    setRatio(newRatio);
  }, [dragging, minTop, minBottom]);

  const stopDragging = useCallback(() => setDragging(false), []);

  const startDragging = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', stopDragging, { once: true });
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDragging);
    };
  }, [dragging, onPointerMove, stopDragging]);

  return (
    <div ref={containerRef} className={cn('relative flex flex-col h-full overflow-hidden', className)}>
      <div style={{ height: `${ratio * 100}%` }} className="relative flex flex-col min-h-[100px] overflow-hidden">
        {top}
      </div>
      <div
        ref={handleRef}
        role="separator"
        aria-orientation="horizontal"
        tabIndex={0}
        aria-label="Resize panels"
        onPointerDown={startDragging}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            setRatio(r => Math.min(r + 0.02, 0.85));
          } else if (e.key === 'ArrowDown') {
            setRatio(r => Math.max(r - 0.02, 0.15));
          }
        }}
        className={cn(
          'group relative z-10 h-3 cursor-row-resize flex items-center justify-center select-none',
          'bg-gradient-to-r from-transparent via-primary/30 to-transparent',
          dragging && 'after:opacity-100'
        )}
      >
        <div className="h-1 w-44 rounded-full bg-primary/50 group-hover:bg-primary/70 transition-colors" />
        <div className="absolute inset-0 pointer-events-none after:absolute after:inset-0 after:bg-primary/10 after:opacity-0 after:transition-opacity" />
      </div>
      <div style={{ height: `${(1 - ratio) * 100}%` }} className="flex-1 min-h-[100px] overflow-hidden relative">
        {bottom}
      </div>
      {dragging && <div className="fixed inset-0 cursor-row-resize z-50" aria-hidden="true" />}
    </div>
  );
};

export default ResizableSplit;
