import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataFormatterProps {
  value: any;
  type?: 'currency' | 'percentage' | 'number' | 'text' | 'trend' | 'confidence' | 'raw';
  unit?: string;
  confidence?: number;
  trend?: 'up' | 'down' | 'stable';
  explanation?: string;
  source?: string;
  methodology?: string;
  className?: string;
}

export function DataFormatter({
  value,
  type = 'text',
  unit,
  confidence,
  trend,
  explanation,
  source,
  methodology,
  className
}: DataFormatterProps) {
  // Format value based on type
  const formatValue = () => {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    switch (type) {
      case 'currency':
        if (typeof value === 'number') {
          if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
          if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
          if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
          return `$${value.toFixed(0)}`;
        }
        // Handle string currency values
        const cleanValue = String(value).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleanValue);
        if (!isNaN(num)) {
          if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
          if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
          if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
          return `$${num.toFixed(0)}`;
        }
        return String(value);

      case 'percentage':
        if (typeof value === 'number') {
          return `${value.toFixed(1)}%`;
        }
        return `${value}%`;

      case 'number':
        if (typeof value === 'number') {
          return value.toLocaleString();
        }
        return String(value);

      case 'trend':
        return String(value);

      case 'confidence':
        if (typeof value === 'number') {
          return `${Math.round(value * 100)}%`;
        }
        return String(value);

      case 'raw':
        // For raw data, format it nicely
        if (typeof value === 'object') {
          return JSON.stringify(value, null, 2);
        }
        return String(value);

      default:
        return String(value);
    }
  };

  const formattedValue = formatValue();

  // Get trend icon
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  // Get confidence color
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600 dark:text-green-400';
    if (conf >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <TooltipProvider>
      <div className={cn("inline-flex items-center gap-2", className)}>
        <span className="font-medium">
          {formattedValue}
          {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
        </span>
        
        {trend && getTrendIcon()}
        
        {confidence !== undefined && (
          <Badge 
            variant="outline" 
            className={cn("text-xs", getConfidenceColor(confidence))}
          >
            {Math.round(confidence * 100)}%
          </Badge>
        )}
        
        {(explanation || source || methodology) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-2">
              {explanation && (
                <div>
                  <p className="font-semibold text-xs">Explanation</p>
                  <p className="text-xs">{explanation}</p>
                </div>
              )}
              {methodology && (
                <div>
                  <p className="font-semibold text-xs">How we calculated this</p>
                  <p className="text-xs">{methodology}</p>
                </div>
              )}
              {source && (
                <div>
                  <p className="font-semibold text-xs">Source</p>
                  <p className="text-xs">{source}</p>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Export formatted display components for common data types
export function CurrencyDisplay({ value, ...props }: Omit<DataFormatterProps, 'type'>) {
  return <DataFormatter value={value} type="currency" {...props} />;
}

export function PercentageDisplay({ value, ...props }: Omit<DataFormatterProps, 'type'>) {
  return <DataFormatter value={value} type="percentage" {...props} />;
}

export function MetricDisplay({ 
  name, 
  value, 
  unit, 
  confidence, 
  explanation,
  methodology,
  source,
  trend,
  className 
}: {
  name: string;
  value: any;
  unit?: string;
  confidence?: number;
  explanation?: string;
  methodology?: string;
  source?: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground font-medium">{name}</p>
      <DataFormatter
        value={value}
        type={unit === '%' ? 'percentage' : unit?.startsWith('$') ? 'currency' : 'number'}
        unit={unit}
        confidence={confidence}
        explanation={explanation}
        methodology={methodology}
        source={source}
        trend={trend}
        className="text-lg"
      />
      {confidence !== undefined && (
        <Progress value={confidence * 100} className="h-1" />
      )}
    </div>
  );
}

// Clean up raw JSON data for display
export function cleanRawData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(item => cleanRawData(item));
  }
  
  if (data && typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip internal/technical fields
      if (key.startsWith('_') || key.startsWith('$$') || key === 'updatedAt' || key === 'createdAt') {
        continue;
      }
      
      // Format key names nicely
      const formattedKey = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase());
      
      cleaned[formattedKey] = cleanRawData(value);
    }
    return cleaned;
  }
  
  return data;
}