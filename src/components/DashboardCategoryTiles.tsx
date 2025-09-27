import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CategoryTileData {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  loading: boolean;
  error?: string;
  summary?: { value: string; sub?: string; accent?: string };
  health?: 'good' | 'warn' | 'poor' | 'neutral';
  refreshing?: boolean;
}

interface DashboardCategoryTilesProps {
  tiles: CategoryTileData[];
  activeId: string;
  onSelect: (id: string) => void;
  onRefresh?: (id: string) => void;
}

export const DashboardCategoryTiles: React.FC<DashboardCategoryTilesProps> = ({ tiles, activeId, onSelect, onRefresh }) => {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-6">
      {tiles.map(tile => {
        const Icon = tile.icon;
        return (
          <Card
            key={tile.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(tile.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect(tile.id); }}
            className={cn(
              'p-4 relative border transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-lg overflow-hidden',
              activeId === tile.id && 'border-primary shadow-md',
              activeId === tile.id && 'ring-1 ring-primary border-primary shadow-md',
              tile.error && 'border-destructive/40'
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-md flex items-center justify-center bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors', activeId === tile.id && 'bg-primary/10 text-primary')}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">{tile.label}</span>
              </div>
              {tile.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {onRefresh && !tile.loading && !tile.error && (
                <button
                  aria-label={`Refresh ${tile.label}`}
                  className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                  onClick={(e) => { e.stopPropagation(); onRefresh(tile.id); }}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', tile.refreshing && 'animate-spin')} />
                </button>
              )}
              {tile.error && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="space-y-1 min-h-[38px]">
              {tile.error && (
                <p className="text-xs text-destructive/80">Failed to load</p>
              )}
              {tile.loading && (
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-muted/60 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted/40 rounded animate-pulse" />
                </div>
              )}
              {!tile.loading && !tile.error && tile.summary && (
                <>
                  <p className="text-lg font-semibold leading-tight">{tile.summary.value}</p>
                  {tile.summary.sub && <p className="text-xs text-muted-foreground truncate">{tile.summary.sub}</p>}
                </>
              )}
              {!tile.error && !tile.summary && !tile.loading && (
                <p className="text-xs text-muted-foreground">No data</p>
              )}
            </div>
            <div className="absolute inset-0 rounded-md ring-0 group-hover:ring-1 group-hover:ring-primary/40 transition" />
          </Card>
        );
      })}
    </div>
  );
};
