import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Database, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';

interface CacheIndicatorProps {
  fromCache?: boolean;
  lastUpdated?: string;
  confidence?: number;
  className?: string;
}

export function CacheIndicator({ 
  fromCache, 
  lastUpdated, 
  confidence = 0,
  className 
}: CacheIndicatorProps) {
  const { flags } = useFeatureFlags();
  
  if (!flags.showCacheIndicators) {
    return null;
  }

  const getTimeSince = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {fromCache && (
        <Badge 
          variant="secondary" 
          className="flex items-center gap-1 text-xs"
        >
          <Database className="h-3 w-3" />
          Cached
        </Badge>
      )}
      
      {!fromCache && (
        <Badge 
          variant="outline" 
          className="flex items-center gap-1 text-xs"
        >
          <Zap className="h-3 w-3 text-primary" />
          Live
        </Badge>
      )}
      
      {lastUpdated && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {getTimeSince(lastUpdated)}
        </span>
      )}
      
      {confidence > 0 && (
        <span className={cn('text-xs font-medium', getConfidenceColor())}>
          {Math.round(confidence * 100)}% confident
        </span>
      )}
    </div>
  );
}