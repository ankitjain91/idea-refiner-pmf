import React, { ReactNode, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlertCircle, Info, LucideIcon, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';

export interface BaseTileProps {
  title: string;
  icon: LucideIcon;
  className?: string;
  description?: string;
  children?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  data?: any;
  onLoad?: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  autoLoad?: boolean;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  headerActions?: ReactNode;
  footerContent?: ReactNode;
  emptyStateMessage?: string;
  emptyStateIcon?: LucideIcon;
  loadingRows?: number;
  tileType?: string;
  fetchFromApi?: () => Promise<any>;
  useDatabase?: boolean;
  showRefreshButton?: boolean;
}

export function BaseTile({
  title,
  icon: Icon,
  className,
  description,
  children,
  isLoading = false,
  error = null,
  data = null,
  onLoad,
  onRefresh,
  autoLoad = true,
  badge,
  headerActions,
  footerContent,
  emptyStateMessage = "No data available",
  emptyStateIcon: EmptyIcon,
  loadingRows = 3,
  tileType,
  fetchFromApi,
  useDatabase = true,
  showRefreshButton = true
}: BaseTileProps) {
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && !hasLoadedOnce && onLoad) {
      setHasLoadedOnce(true);
      onLoad();
    }
  }, [autoLoad, hasLoadedOnce, onLoad]);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  const renderLoadingState = () => (
    <div className="space-y-3 animate-fade-in">
      {Array.from({ length: loadingRows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );

  const renderErrorState = () => (
    <Alert variant="destructive" className="border-destructive/50 animate-fade-in">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {error || 'Failed to load data'}
      </AlertDescription>
    </Alert>
  );

  const renderEmptyState = () => {
    const EmptyIconComponent = EmptyIcon || Icon;
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-3xl rounded-full animate-pulse" />
          <div className="relative p-4 bg-gradient-to-br from-muted/40 to-muted/20 rounded-full">
            <EmptyIconComponent className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {emptyStateMessage}
        </p>
      </div>
    );
  };

  const renderContent = () => {
    // Loading state
    if (isLoading && !data) {
      return renderLoadingState();
    }

    // Error state
    if (error) {
      return renderErrorState();
    }

    // Empty state
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return renderEmptyState();
    }

    // Content provided via children
    if (children) {
      return <div className="animate-fade-in">{children}</div>;
    }

    // Default: no content
    return renderEmptyState();
  };

  return (
    <Card className={cn(
      "h-full flex flex-col transition-all duration-200 hover:shadow-lg border-border/50",
      "bg-gradient-to-br from-background to-muted/5",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {title}
                {badge && (
                  <Badge variant={badge.variant || "secondary"} className="text-xs">
                    {badge.text}
                  </Badge>
                )}
              </CardTitle>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {showRefreshButton && onRefresh && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={isRefreshing || isLoading}
                      className="h-7 w-7"
                    >
                      <RefreshCw 
                        className={cn(
                          "h-3.5 w-3.5",
                          (isRefreshing || isLoading) && "animate-spin"
                        )} 
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Refresh data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {headerActions && (
              <div className="flex items-center gap-1">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {renderContent()}
      </CardContent>

      {footerContent && (
        <div className="px-6 pb-4 pt-2 border-t border-border/50">
          {footerContent}
        </div>
      )}
    </Card>
  );
}

// Metric Card Component for consistent metric display
export interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  trend = 'neutral',
  className 
}: MetricCardProps) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground'
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4",
      "hover:shadow-lg transition-all duration-300 hover:scale-105",
      className
    )}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10" />
      <div className="relative space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-primary/60" />}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {change && (
          <div className={cn("flex items-center gap-1", trendColors[trend])}>
            <span className="text-xs font-medium">
              {change.value > 0 ? '+' : ''}{change.value}%
            </span>
            <span className="text-xs text-muted-foreground">{change.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// List Item Component for consistent list display
export interface ListItemProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  title,
  subtitle,
  value,
  badge,
  icon: Icon,
  onClick,
  className
}: ListItemProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        "bg-muted/30 hover:bg-muted/50 transition-colors",
        onClick && "cursor-pointer hover-scale",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-primary/10 rounded">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="text-left">
          <p className="font-medium text-sm">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge variant={badge.variant || "secondary"} className="text-xs">
            {badge.text}
          </Badge>
        )}
        {value && (
          <span className="font-semibold text-sm">{value}</span>
        )}
      </div>
    </Component>
  );
}

// Export a hook for consistent tile behavior with database support
export function useTileData<T = any>(
  fetchFunction: () => Promise<T>,
  dependencies: any[] = [],
  options?: {
    tileType?: string;
    useDatabase?: boolean;
    cacheMinutes?: number;
  }
) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentSession } = useSession();

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to load from database first if enabled
      if (options?.useDatabase && options?.tileType && user?.id) {
        const dbData = null; // Database functionality removed
        
        if (dbData) {
          console.log(`[${options.tileType}] Found data in database`);
          // Mark data as coming from database
          const enrichedData = typeof dbData === 'object' ? 
            { ...dbData, fromDatabase: true } : 
            { data: dbData, fromDatabase: true };
          setData(enrichedData);
          setIsLoading(false);
          return;
        } else {
          console.log(`[${options.tileType}] No data in database, fetching from API...`);
        }
      }
      
      // Fetch from API if not in database
      const result = await fetchFunction();
      
      // IMPORTANT: Only persist REAL API data, not mock data
      // Check if result has indicators of being mock data
      const resultAny = result as any;
      const isMockData = resultAny?.isMockData || resultAny?.isTestData || false;
      
      if (result && !isMockData) {
        // Mark data as coming from API
        const enrichedResult = typeof result === 'object' ? 
          { ...result, fromApi: true } : 
          { data: result, fromApi: true };
        setData(enrichedResult);
        
        // Save REAL data to database if enabled
        if (options?.useDatabase && options?.tileType && user?.id) {
          console.log(`[${options.tileType}] Persisting real API data to database...`);
          // Database save functionality removed
        }
      } else if (result) {
        // If it's mock data, show it but DON'T persist
        console.warn(`[${options.tileType}] Received mock/test data, not persisting to database`);
        setData({ ...result, fromApi: true, isMockData: true });
      } else {
        console.log(`[${options.tileType}] No data returned from API`);
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset when dependencies change
    setData(null);
    setError(null);
  }, dependencies);

  return { data, isLoading, error, loadData, setData };
}