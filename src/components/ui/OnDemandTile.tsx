import React, { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, LucideIcon, Loader2, RefreshCw, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface OnDemandTileProps {
  title: string;
  icon: LucideIcon;
  className?: string;
  description: string;
  children?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  data?: any;
  onLoad: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  headerActions?: ReactNode;
  footerContent?: ReactNode;
  emptyStateMessage?: string;
  emptyStateIcon?: LucideIcon;
  loadingRows?: number;
  showRefreshButton?: boolean;
  estimatedLoadTime?: string;
  features?: string[];
}

export function OnDemandTile({
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
  badge,
  headerActions,
  footerContent,
  emptyStateMessage = "No data available",
  emptyStateIcon: EmptyIcon,
  loadingRows = 3,
  showRefreshButton = true,
  estimatedLoadTime = "~30 seconds",
  features = []
}: OnDemandTileProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLoad = async () => {
    if (onLoad && !isLoading) {
      setHasLoaded(true);
      await onLoad();
    }
  };

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
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading {title.toLowerCase()}... {estimatedLoadTime}</span>
      </div>
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

  const renderDescriptionMode = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </div>
      
      {features.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            What you'll get:
          </div>
          <ul className="space-y-1">
            {features.map((feature, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-2">
        <Button 
          onClick={handleLoad}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary shadow-lg"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Load {title}
            </>
          )}
        </Button>
        <div className="text-xs text-muted-foreground text-center mt-2">
          Estimated time: {estimatedLoadTime}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    // If never loaded, show description mode
    if (!hasLoaded && !data) {
      return renderDescriptionMode();
    }

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
                {!hasLoaded && !data && (
                  <Badge variant="outline" className="text-xs">
                    Ready to Load
                  </Badge>
                )}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {data && showRefreshButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-7 w-7"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
            )}
            {headerActions}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1">
          {renderContent()}
        </div>
        {footerContent && (
          <div className="mt-4 pt-4 border-t border-border/50">
            {footerContent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}