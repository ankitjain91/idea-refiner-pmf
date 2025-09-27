import { useCallback, useEffect, useRef, useState } from 'react';
import { RealDataFetcher } from '@/lib/real-data-fetcher';

export interface LiveRealDataSnapshot {
  idea: string;
  fetchedAt: string; // ISO string
  sources: any;
  error?: string;
}

interface Options {
  refreshIntervalMs?: number; // periodic refresh
  staleAfterMs?: number;      // when to show stale badge
  cooldownMs?: number;        // min delay between manual refreshes
  storageKey?: string;        // localStorage key
}

const DEFAULTS: Required<Options> = {
  refreshIntervalMs: 5 * 60 * 1000,
  staleAfterMs: 7 * 60 * 1000,
  cooldownMs: 20 * 1000,
  storageKey: 'realDataSnapshot'
};

export function useLiveRealData(idea: string | undefined, opts: Options = {}) {
  const { refreshIntervalMs, staleAfterMs, cooldownMs, storageKey } = { ...DEFAULTS, ...opts };
  const [snapshot, setSnapshot] = useState<LiveRealDataSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('Idle');
  const lastFetchRef = useRef<number>(0);
  const fetcherRef = useRef<RealDataFetcher | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load cached snapshot
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: LiveRealDataSnapshot = JSON.parse(raw);
        setSnapshot(parsed);
      }
    } catch {}
  }, [storageKey]);

  const fetchNow = useCallback(async (reason: string = 'manual') => {
    if (!idea || idea.trim().length < 3) return;
    const now = Date.now();
    if (now - lastFetchRef.current < cooldownMs && reason === 'manual') {
      setStatusMessage('Cooling down');
      return;
    }
    if (!fetcherRef.current) fetcherRef.current = new RealDataFetcher();
    lastFetchRef.current = now;
    setLoading(true);
    setStatusMessage('Collecting external signals');
    setProgress(5);
    progressIntervalRef.current && clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress(p => (p < 90 ? p + 7 : p));
    }, 600);
    try {
      const sources = await fetcherRef.current.orchestrateDataCollection(idea);
      const snap: LiveRealDataSnapshot = {
        idea,
        fetchedAt: new Date().toISOString(),
        sources
      };
      setSnapshot(snap);
      try { localStorage.setItem(storageKey, JSON.stringify(snap)); } catch {}
      setProgress(100);
      setTimeout(() => setProgress(0), 800);
      setStatusMessage('Up to date');
    } catch (e: any) {
      setStatusMessage('Error fetching');
      setSnapshot(prev => prev ? { ...prev, error: String(e) } : prev);
    } finally {
      setLoading(false);
      progressIntervalRef.current && clearInterval(progressIntervalRef.current);
    }
  }, [idea, cooldownMs, storageKey]);

  // Initial + periodic refresh
  useEffect(() => {
    if (!idea) return;
    fetchNow('initial');
    intervalRef.current && clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchNow('interval'), refreshIntervalMs);
    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
      progressIntervalRef.current && clearInterval(progressIntervalRef.current);
    };
  }, [idea, fetchNow, refreshIntervalMs]);

  // Derived state
  const isStale = snapshot ? (Date.now() - new Date(snapshot.fetchedAt).getTime()) > staleAfterMs : false;
  const nextRefreshInMs = intervalRef.current ? (refreshIntervalMs - (Date.now() - lastFetchRef.current)) : refreshIntervalMs;

  return {
    snapshot,
    loading,
    progress,
    statusMessage,
    isStale,
    nextRefreshInMs: Math.max(0, nextRefreshInMs),
    refresh: () => fetchNow('manual')
  };
}
