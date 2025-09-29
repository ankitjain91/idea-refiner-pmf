import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ExternalLink, Info, AlertCircle, Clock, Download, 
  ChevronRight, RefreshCw, Database, DollarSign, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedDataTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  data: any;
  onFetchDetails?: () => Promise<any>;
  className?: string;
  description?: string;
  costInfo?: {
    totalSearches: number;
    costEstimate: string;
    cacheHit: boolean;
  };
}

export function OptimizedDataTile({ 
  title, 
  icon: Icon, 
  tileType, 
  data,
  onFetchDetails,
  className,
  description,
  costInfo
}: OptimizedDataTileProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const handleShowDetails = async () => {
    setShowDetails(true);
    
    // Fetch additional details on-demand if not already loaded
    if (!detailsData && onFetchDetails) {
      setLoadingDetails(true);
      try {
        const details = await onFetchDetails();
        setDetailsData(details);
      } catch (error) {
        console.error('Error fetching tile details:', error);
      } finally {
        setLoadingDetails(false);
      }
    }
  };
  
  const exportTileData = () => {
    if (!data) return;
    
    const csvContent = [
      ['Metric', 'Value', 'Unit', 'Confidence', 'Method'],
      ...(data.metrics || []).map((m: any) => [m.name, m.value, m.unit, m.confidence || 'N/A', m.method || 'N/A'])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tileType}-${new Date().toISOString()}.csv`;
    a.click();
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  if (!data) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No data available. Please enter your startup idea to see insights.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    );
  }
  
  return (
    <>
      <Card 
        className={cn(
          "p-6 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50",
          className,
          data?.stale && "border-yellow-500/50"
        )}
        onClick={handleShowDetails}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Subtle Data Source Indicator - Same as Overview */}
              {costInfo && (
                <Badge variant={costInfo.cacheHit ? 'secondary' : 'outline'} className="text-xs h-5">
                  {costInfo.cacheHit ? 'Cache' : 'Live'}
                </Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          
          {data.metrics && data.metrics.length > 0 && (
            <div className="space-y-3">
              {data.metrics.slice(0, 2).map((metric: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{metric.explanation}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">
                      {metric.value}{metric.unit && ` ${metric.unit}`}
                    </span>
                    {metric.confidence && (
                      <span className={cn("text-xs", getConfidenceColor(metric.confidence))}>
                        {(metric.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {data.notes && (
                <p className="text-xs text-muted-foreground italic">
                  {data.notes}
                </p>
              )}
            </div>
          )}
          
          {data.updatedAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Updated {new Date(data.updatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </Card>
      
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              {title}
            </SheetTitle>
            <SheetDescription>
              {description || `Detailed analysis for ${title.toLowerCase()}`}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {loadingDetails && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            
            {!loadingDetails && (detailsData || data) && (
              <>
                {/* Metrics */}
                {(detailsData?.metrics || data.metrics) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">Metrics</h4>
                    {(detailsData?.metrics || data.metrics).map((metric: any, idx: number) => (
                      <div key={idx} className="p-4 bg-secondary/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{metric.name}</span>
                          <span className="text-lg font-bold">
                            {metric.value}{metric.unit && ` ${metric.unit}`}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{metric.explanation}</p>
                        {metric.confidence && (
                          <div className="flex items-center justify-between text-xs">
                            <span>Method: {metric.method || 'Grouped search analysis'}</span>
                            <span className={getConfidenceColor(metric.confidence)}>
                              Confidence: {(metric.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Cost Information */}
                {costInfo && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Cost Optimization</h4>
                    <div className="space-y-1 text-sm">
                      <p>Total API Searches: {costInfo.totalSearches}</p>
                      <p>Estimated Cost: {costInfo.costEstimate}</p>
                      <p>Cache Hit: {costInfo.cacheHit ? 'Yes (No API cost)' : 'No'}</p>
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={exportTileData} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}