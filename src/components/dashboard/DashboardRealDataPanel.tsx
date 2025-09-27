import React, { useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLiveRealData } from '@/hooks/useLiveRealData';
import { RefreshCw, Clock, Activity, AlertCircle, Radio } from 'lucide-react';

interface Props {
  idea?: string;
}

function fmtAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return `${Math.floor(diff/1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff/60_000)}m ago`;
  return `${Math.floor(diff/3600_000)}h ago`;
}

function fmtMs(ms: number) {
  if (ms < 1000) return '0s';
  const s = Math.ceil(ms/1000);
  if (s < 60) return `${s}s`; return `${Math.floor(s/60)}m ${s%60}s`;
}

export const DashboardRealDataPanel: React.FC<Props> = ({ idea }) => {
  const { snapshot, loading, progress, statusMessage, isStale, nextRefreshInMs, refresh } = useLiveRealData(idea, {
    refreshIntervalMs: 5 * 60 * 1000,
    staleAfterMs: 7 * 60 * 1000,
    cooldownMs: 25 * 1000,
    storageKey: 'realDataSnapshot'
  });

  // Auto refresh when analysis completed event fires and idea matches
  useEffect(() => {
    const handler = (e: any) => {
      if (!idea) return;
      if (e?.detail?.idea && e.detail.idea !== idea) return;
      refresh();
    };
    window.addEventListener('analysis:completed', handler as any);
    return () => window.removeEventListener('analysis:completed', handler as any);
  }, [idea, refresh]);

  const quickStats = useMemo(() => {
    const s = snapshot?.sources;
    if (!s) return [] as { label: string; value: string | number; status?: string }[];
    return [
      { label: 'Search Status', value: s.search?.status || '—', status: s.search?.status },
      { label: 'Trends', value: s.trends?.normalized?.velocity ?? '—' },
      { label: 'Reddit Threads', value: s.reddit?.raw?.threads?.length ?? '—' },
      { label: 'YouTube Vol', value: s.youtube?.normalized?.volume ?? '—' },
      { label: 'Twitter Vol', value: s.twitter?.normalized?.volume ?? '—' },
      { label: 'Amazon Listings', value: s.amazon?.raw?.topListings?.length ?? '—' },
    ];
  }, [snapshot]);

  const sourceStatuses = useMemo(() => {
    const s = snapshot?.sources;
    if (!s) return [] as { key: string; label: string; status: string }[];
    return [
      { key: 'search', label: 'Search', status: s.search?.status || 'unknown' },
      { key: 'trends', label: 'Trends', status: s.trends?.status || 'unknown' },
      { key: 'reddit', label: 'Reddit', status: s.reddit?.status || 'unknown' },
      { key: 'youtube', label: 'YouTube', status: s.youtube?.status || 'unknown' },
      { key: 'twitter', label: 'Twitter', status: s.twitter?.status || 'unknown' },
      { key: 'tiktok', label: 'TikTok', status: s.tiktok?.status || 'unknown' },
      { key: 'amazon', label: 'Amazon', status: s.amazon?.status || 'unknown' },
    ];
  }, [snapshot]);

  const badgeClass = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30';
      case 'degraded':
        return 'bg-amber-500/15 text-amber-500 border border-amber-500/30';
      case 'unavailable':
        return 'bg-red-500/15 text-red-500 border border-red-500/30';
      default:
        return 'bg-muted/40 text-muted-foreground border border-border/40';
    }
  };

  return (
    <Card className="p-4 rounded-xl glass-super-surface elevation-1 border relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className={`h-4 w-4 ${isStale ? 'text-amber-500 animate-pulse' : 'text-emerald-500'} `} />
          <h3 className="font-semibold text-sm">Live Market Signals</h3>
          {snapshot?.fetchedAt && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={isStale ? 'destructive' : 'secondary'} className="text-[10px]">
                  {isStale ? 'STALE' : 'LIVE'}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Last fetch {fmtAgo(snapshot.fetchedAt)} • Next in {fmtMs(nextRefreshInMs)}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3 animate-pulse" /> {statusMessage}
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => refresh()} disabled={loading} className="h-7 px-2 gap-1">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Updating' : 'Refresh'}
          </Button>
        </div>
      </div>
      {progress > 0 && (
        <div className="mb-3">
          <Progress value={progress} className="h-1" />
        </div>
      )}
      {!snapshot && !loading && (
        <div className="text-xs text-muted-foreground flex items-center gap-2 py-4">
          <AlertCircle className="h-4 w-4" /> No data yet. Run an analysis in Idea Chat.
        </div>
      )}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {quickStats.map(stat => (
            <div key={stat.label} className="p-2 rounded-lg bg-muted/40 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{stat.label}</span>
              <span className="font-semibold tabular-nums text-sm">{stat.value}</span>
            </div>
          ))}
        </div>
      )}
      {snapshot && sourceStatuses.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Source Health</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sourceStatuses.map(src => (
              <span
                key={src.key}
                className={`text-[10px] px-2 py-1 rounded-full font-medium inline-flex items-center gap-1 ${badgeClass(src.status)}`}
                aria-label={`${src.label} status ${src.status}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" /> {src.label}
              </span>
            ))}
          </div>
        </div>
      )}
      {snapshot?.error && (
        <div className="mt-3 text-[10px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {snapshot.error}
        </div>
      )}
      <div className="mt-4 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{snapshot?.fetchedAt ? `Fetched ${fmtAgo(snapshot.fetchedAt)}` : 'Awaiting first fetch'}</span>
        <span>Next refresh in {fmtMs(nextRefreshInMs)}</span>
      </div>
    </Card>
  );
};

export default DashboardRealDataPanel;
