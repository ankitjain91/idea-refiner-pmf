import React, { useEffect, useRef, useState, Suspense } from 'react';

// Lazy import of heavy map component
const MapComponent = React.lazy(() => import('./ProfessionalWorldMap').then(m => ({ default: m.ProfessionalWorldMap })));

interface LazyWorldMapProps {
  marketData?: any;
  loading?: boolean;
  minHeight?: number;
  threshold?: number;
}

/**
 * LazyWorldMap mounts the real ProfessionalWorldMap only when scrolled into view.
 * Reduces initial bundle parse + execution cost on /enterprisehub and /deep-dive.
 */
export function LazyWorldMap({ marketData, loading, minHeight = 420, threshold = 0.2 }: LazyWorldMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return;
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setVisible(true);
          observer.disconnect();
          break;
        }
      }
    }, { threshold });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, threshold]);

  return (
    <div ref={ref} style={{ minHeight }} className="relative">
      {!visible && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground animate-in fade-in">
          <div className="h-10 w-10 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
          <p className="text-xs">Preparing global market map…</p>
        </div>
      )}
      {visible && (
        <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading map…</div>}>
          <MapComponent marketData={marketData} loading={loading} />
        </Suspense>
      )}
    </div>
  );
}

export default LazyWorldMap;