import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UnifiedResponseCache } from '@/lib/cache/unifiedResponseCache';
import { Database, Zap, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';

interface CacheStatsDisplayProps {
  className?: string;
}

export function CacheStatsDisplay({ className }: CacheStatsDisplayProps) {
  const { flags } = useFeatureFlags();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const loadStats = async () => {
    setLoading(true);
    try {
      const cache = UnifiedResponseCache.getInstance();
      const cacheStats = await cache.getStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const clearCache = async () => {
    if (confirm('Clear all cached data? This will require re-fetching from APIs.')) {
      const cache = UnifiedResponseCache.getInstance();
      await cache.clearAll();
      await loadStats();
    }
  };
  
  useEffect(() => {
    if (flags.useOptimizedDataLoading) {
      loadStats();
    }
  }, [flags.useOptimizedDataLoading]);
  
  if (!flags.useOptimizedDataLoading || !stats) {
    return null;
  }
  
  const getAgeLabel = (timestamp: number) => {
    const age = Date.now() - timestamp;
    const hours = Math.floor(age / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d old`;
    if (hours > 0) return `${hours}h old`;
    return 'Fresh';
  };
  
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Database className="h-4 w-4" />
          Cache Performance
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={loadStats}
            disabled={loading}
            className="h-7 px-2"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearCache}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            Clear
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Cached</span>
          <Badge variant="secondary" className="text-xs">
            {stats.total} items
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Valid Cache</span>
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3 mr-1 text-success" />
            {stats.valid} active
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Memory Cache</span>
          <Badge variant="outline" className="text-xs">
            {stats.memoryCache} hot
          </Badge>
        </div>
        
        {stats.oldestTimestamp && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Oldest Entry</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getAgeLabel(stats.oldestTimestamp)}
            </span>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-1">By Source</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.bySource || {}).map(([source, count]) => (
              <Badge key={source} variant="secondary" className="text-xs">
                {source}: {count as number}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}