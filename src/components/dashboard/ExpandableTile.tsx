import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Maximize2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TileDetailPanel } from './TileDetailPanel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExpandableTileProps {
  title: string;
  description?: string;
  value?: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  data?: any;
  chartData?: any[];
  sources?: any[];
  metrics?: Record<string, any>;
  metricExplanations?: Record<string, any>;
  insights?: string[];
  rawData?: any;
  chartType?: 'line' | 'bar' | 'area' | 'pie';
  accentColor?: string;
  children?: React.ReactNode;
  className?: string;
  quickInfo?: string;
  expandable?: boolean;
  loading?: boolean;
  error?: string;
  onExpand?: () => void;
}

export function ExpandableTile({
  title,
  description,
  value,
  subtitle,
  icon,
  trend,
  badge,
  data,
  chartData,
  sources,
  metrics,
  metricExplanations,
  insights,
  rawData,
  chartType,
  accentColor,
  children,
  className,
  quickInfo,
  expandable = true,
  loading = false,
  error,
  onExpand
}: ExpandableTileProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const handleExpand = () => {
    setDetailOpen(true);
    onExpand?.();
  };

  return (
    <>
      <Card
        className={cn(
          'relative transition-all duration-200 hover:shadow-lg',
          expandable && 'cursor-pointer hover:scale-[1.02]',
          className
        )}
        onClick={expandable && !loading ? handleExpand : undefined}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {icon && (
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">{title}</CardTitle>
                  {quickInfo && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">{quickInfo}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {description && (
                  <CardDescription className="text-xs mt-1">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {badge && (
                <Badge variant={badge.variant || 'default'} className="text-xs">
                  {badge.label}
                </Badge>
              )}
              {expandable && !loading && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpand();
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : (
            <>
              {value !== undefined && (
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              )}
              
              {trend && (
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      trend.positive ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {trend.positive ? '↑' : '↓'} {trend.value}%
                  </span>
                  <span className="text-xs text-muted-foreground">{trend.label}</span>
                </div>
              )}
              
              {children}
              
              {expandable && !loading && (
                <div className="flex items-center justify-end mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpand();
                    }}
                  >
                    View Details
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {expandable && (
        <TileDetailPanel
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title={title}
          description={description}
          data={data}
          chartData={chartData}
          sources={sources}
          metrics={metrics}
          metricExplanations={metricExplanations}
          insights={insights}
          rawData={rawData || data}
          chartType={chartType}
          accentColor={accentColor}
        >
          {children}
        </TileDetailPanel>
      )}
    </>
  );
}