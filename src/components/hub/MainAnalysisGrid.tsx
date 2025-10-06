import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DataHubTile } from "./DataHubTile";
import { TileData } from "@/lib/data-hub-orchestrator";
import { ExecutiveMarketSizeTile } from "@/components/market/ExecutiveMarketSizeTile";
import { CompetitionAnalysis } from "@/components/competition/CompetitionAnalysis";
import { SimpleGoogleTrendsTile } from "./SimpleGoogleTrendsTile";
import { SimpleNewsTile } from "./SimpleNewsTile";
import { MarketTrendsTile } from "./MarketTrendsTile";
import { WebSearchTile } from "./WebSearchTile";

import { useSession } from "@/contexts/SimpleSessionContext";
import { cn } from "@/lib/utils";
import { dashboardDataService } from '@/services/dashboardDataService';
import { toast } from 'sonner';
import { sanitizeTileData } from '@/utils/dataFormatting';
import { 
  TrendingUp, Users, MessageSquare, Activity, 
  Search, Newspaper, DollarSign, Building2, Globe
} from "lucide-react";
import { fetchTiles, refreshTile } from '@/lib/api/dataHubClient';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Bug } from 'lucide-react';

// Local cache key helper
function ideaHashKey(idea: string) { return 'dh_cache_' + idea.toLowerCase().slice(0,96); }

interface CachedBundle { tiles: Record<string, any>; meta?: any; ts: number; }

interface MainAnalysisGridProps {
  tiles: {
    market_size?: TileData | null;
    competition?: TileData | null;
    sentiment?: TileData | null;
    market_trends?: TileData | null;
    web_search?: TileData | null;
    google_trends?: TileData | null;
    news_analysis?: TileData | null;
  };
  loading?: boolean;
  viewMode: "executive" | "deep";
  onRefreshTile?: (tileType: string) => void | Promise<void>;
}

export function MainAnalysisGrid({ tiles, loading = false, viewMode, onRefreshTile }: MainAnalysisGridProps) {
  const { currentSession } = useSession();
  const [fetchedTiles, setFetchedTiles] = useState<Record<string, any>>({});
  const [tileErrors, setTileErrors] = useState<Record<string, string>>({});
  const [networkLoading, setNetworkLoading] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const [failureCounts, setFailureCounts] = useState<Record<string, number>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

  const currentIdea = useMemo(() => {
    const base = localStorage.getItem('currentIdea') || currentSession?.data?.currentIdea || '';
    return base.trim();
  }, [currentSession?.data?.currentIdea]);

  const requestedTileIds = useMemo(() => Object.keys(tiles || {}), [tiles]);

  // Hydrate from local cache instantly
  useEffect(() => {
    if (!currentIdea) return;
    try {
      const raw = localStorage.getItem(ideaHashKey(currentIdea));
      if (raw) {
        const parsed: CachedBundle = JSON.parse(raw);
        // 10 minute freshness window
        if (Date.now() - parsed.ts < 10 * 60 * 1000) {
          setFetchedTiles(prev => ({ ...parsed.tiles, ...prev }));
          if (parsed.meta) setMeta(parsed.meta);
        }
      }
    } catch {}
  }, [currentIdea]);

  const persistCache = useCallback((tilesObj: Record<string, any>, metaObj: any) => {
    if (!currentIdea) return;
    try {
      const bundle: CachedBundle = { tiles: tilesObj, meta: metaObj, ts: Date.now() };
      localStorage.setItem(ideaHashKey(currentIdea), JSON.stringify(bundle));
    } catch {}
  }, [currentIdea]);

  const hydrateFromServer = useCallback(async (force?: boolean) => {
    if (!currentIdea || requestedTileIds.length === 0) return;
    setNetworkLoading(true);
    try {
      const res = await fetchTiles(currentIdea, { tiles: requestedTileIds, forceRefresh: force });
      if (res?.tiles) {
        setFetchedTiles(res.tiles);
        setTileErrors({});
        setMeta(res.meta || null);
        persistCache(res.tiles, res.meta);
      }
    } catch (e: any) {
      console.error('[MainAnalysisGrid] bulk fetch error', e);
      setTileErrors(prev => ({ ...prev, _bulk: e?.message || 'Failed to fetch tiles' }));
    } finally {
      setNetworkLoading(false);
    }
  }, [currentIdea, requestedTileIds, persistCache]);

  useEffect(() => { hydrateFromServer(false); }, [hydrateFromServer]);

  const handleSingleRefresh = async (id: string) => {
    if (!currentIdea) return;
    // Circuit breaker check
    if (cooldowns[id] && cooldowns[id] > Date.now()) return;
    try {
      const res = await refreshTile(currentIdea, id);
      if (res?.tile) {
        setFetchedTiles(prev => ({ ...prev, [id]: res.tile }));
        setTileErrors(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
        setFailureCounts(prev => ({ ...prev, [id]: 0 }));
        persistCache({ ...fetchedTiles, [id]: res.tile }, meta);
      }
    } catch (e: any) {
      setTileErrors(prev => ({ ...prev, [id]: e?.message || 'Refresh failed' }));
      setFailureCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      if ((failureCounts[id] || 0) + 1 >= 3) {
        setCooldowns(prev => ({ ...prev, [id]: Date.now() + 5 * 60 * 1000 })); // 5 min
      }
    }
  };

  const forceRefreshAll = () => hydrateFromServer(true);

  // Merge precedence: server fetched > prop tiles (legacy) > empty (must be declared before mainTiles)
  const mergedTileData = (id: string): any => {
    return fetchedTiles[id] || (tiles as any)[id] || null;
  };

  // Include financial_analysis if parent passed it in tiles
  const mainTiles = [
    { id: 'market_size', title: 'Market Size', icon: DollarSign },
    { id: 'competition', title: 'Competition', icon: Building2 },
    { id: 'sentiment', title: 'Sentiment', icon: MessageSquare },
    { id: 'market_trends', title: 'Market Trends', icon: TrendingUp },
    { id: 'web_search', title: 'Web Intelligence', icon: Globe },
    { id: 'google_trends', title: 'Google Trends', icon: Search },
    { id: 'news_analysis', title: 'News Analysis', icon: Newspaper },
    { id: 'financial_analysis', title: 'Financial Analysis', icon: DollarSign }
  ]
    .filter(t => requestedTileIds.includes(t.id))
    .map(t => {
      const data = mergedTileData(t.id);
      return {
        ...t,
        data,
        span: 'col-span-full',
        isUsingFallback: !!data && data.confidence < 0.5,
        error: tileErrors[t.id],
        cooldownUntil: cooldowns[t.id]
      };
    });

  // mergedTileData moved earlier to avoid TDZ / reference error

  // Only include tiles explicitly provided via props to avoid cross-tab duplication
  // Only include tiles that are explicitly passed in the tiles prop (by checking if key exists)
  const filteredMainTiles = mainTiles.filter(t => t.id in tiles);
  // In executive mode, only show first 4 of the filtered set
  const displayTiles = viewMode === "executive" ? filteredMainTiles.slice(0, 4) : filteredMainTiles;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {tileErrors._bulk && (
          <div className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{tileErrors._bulk}</div>
        )}
        <Button size="sm" variant="outline" onClick={forceRefreshAll} disabled={networkLoading} className="gap-2">
          <RefreshCw className={cn('h-4 w-4', networkLoading && 'animate-spin')} /> Force Refresh
        </Button>
        {debug && meta && (
          <details className="ml-auto bg-muted/40 rounded px-3 py-2 text-xs">
            <summary className="cursor-pointer flex items-center gap-1"><Bug className="h-3 w-3" />Meta</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px]">{JSON.stringify(meta, null, 2)}</pre>
          </details>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6">
        {displayTiles.map((tile) => {
          if (tile.id === 'market_size') {
            return (
              <div key={tile.id} className={tile.span}>
                <ExecutiveMarketSizeTile 
                  idea={currentIdea}
                  ideaContext={currentIdea}
                  dataHub={tiles}
                  onRefresh={() => handleSingleRefresh('market_size')}
                />
              </div>
            );
          }
          if (tile.id === 'competition') {
            return (
              <div key={tile.id} className={tile.span}>
                <CompetitionAnalysis idea={currentIdea} />
              </div>
            );
          }
          if (tile.id === 'google_trends') {
            return (
              <div key={tile.id} className={tile.span}>
                <SimpleGoogleTrendsTile className="h-full" />
              </div>
            );
          }
          if (tile.id === 'news_analysis') {
            return (
              <div key={tile.id} className={tile.span}>
                <SimpleNewsTile className="h-full" />
              </div>
            );
          }
          if (tile.id === 'market_trends') {
            return (
              <div key={tile.id} className={tile.span}>
                <MarketTrendsTile idea={currentIdea} className="h-full" />
              </div>
            );
          }
          if (tile.id === 'web_search') {
            return (
              <div key={tile.id} className={tile.span}>
                <WebSearchTile idea={currentIdea} className="h-full" />
              </div>
            );
          }
          // Default tile renderer including financial_analysis when backend supplies it
          const hasRegionalData = (tile.data as any)?.regionalBreakdown || (tile.data as any)?.regionalGrowth || (tile.data as any)?.regionalInterest;
          const hasMultipleMetrics = tile.data?.metrics && Object.keys(tile.data.metrics).length > 2;
          const hasDetailedInsights = (tile.data as any)?.segments || (tile.data as any)?.drivers || (tile.data as any)?.breakoutTerms || (tile.data as any)?.keyEvents;
          const isLargeTile = hasRegionalData || (hasMultipleMetrics && hasDetailedInsights);
          const gridClass = isLargeTile && viewMode === 'deep' ? 'lg:col-span-2' : '';
          const inCooldown = tile.cooldownUntil && tile.cooldownUntil > Date.now();
          return (
            <div key={tile.id} className={cn(tile.span, gridClass)}>
              <DataHubTile
                title={tile.title}
                Icon={tile.icon}
                data={sanitizeTileData(tile.data)}
                loading={(networkLoading && !tile.data)}
                onRefresh={() => !inCooldown && handleSingleRefresh(tile.id)}
                expanded={viewMode === 'deep'}
                tileType={tile.id}
                isUsingFallback={tile.isUsingFallback}
                className={cn('h-full', isLargeTile && viewMode === 'deep' ? 'min-h-[400px]' : 'min-h-[300px]')}
              />
              {tile.error && (
                <div className="mt-2 text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {tile.error}
                  {inCooldown && <span className="text-[10px] ml-2">cooling down</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}