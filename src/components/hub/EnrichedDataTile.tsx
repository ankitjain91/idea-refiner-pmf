import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Info,
  Target,
  Lightbulb,
  ChevronRight,
  Sparkles,
  BookOpen,
  Calculator,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { enrichTileData } from '@/lib/tile-data-enrichment';

interface EnrichedDataTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  data: any;
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
  className?: string;
}

export function EnrichedDataTile({
  title,
  icon: Icon,
  tileType,
  data,
  isLoading = false,
  error,
  onRefresh,
  className
}: EnrichedDataTileProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get enriched data
  const enrichedData = data ? enrichTileData(tileType, data) : null;
  
  // Get primary metric for display
  const getPrimaryMetric = () => {
    if (!enrichedData?.metrics?.[0]) return null;
    return enrichedData.metrics[0];
  };
  
  const primaryMetric = getPrimaryMetric();
  
  const getTrendIcon = (trend?: string) => {
    switch(trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };
  
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="default" className="text-xs">High confidence</Badge>;
    if (confidence >= 60) return <Badge variant="secondary" className="text-xs">Moderate confidence</Badge>;
    return <Badge variant="outline" className="text-xs">Low confidence</Badge>;
  };
  
  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center h-48">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={cn("h-full border-destructive/50", className)}>
        <CardContent className="p-4">
          <p className="text-sm text-destructive">{error}</p>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm" className="mt-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (!enrichedData) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card 
        className={cn(
          "h-full group hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden",
          className
        )}
        onClick={() => setShowDetails(true)}
      >
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {primaryMetric && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-2xl font-bold">{primaryMetric.value}</span>
                    {getTrendIcon(primaryMetric.trend)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {onRefresh && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              {primaryMetric && getConfidenceBadge(primaryMetric.confidence)}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {/* Summary */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {enrichedData.summary}
          </p>
          
          {/* Key Insights Preview */}
          <div className="space-y-1">
            {enrichedData.insights.slice(0, 2).map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-1">{insight}</p>
              </div>
            ))}
          </div>
          
          {/* Mini Metrics */}
          {enrichedData.metrics.length > 1 && (
            <div className="grid grid-cols-2 gap-2">
              {enrichedData.metrics.slice(1, 3).map((metric, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="text-sm font-semibold">{metric.value}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Action Prompt */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">Click for full analysis</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>
      
      {/* Detailed View Sheet */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>{enrichedData.summary}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[calc(100vh-220px)] mt-4">
              <TabsContent value="overview" className="space-y-4">
                {/* What This Means */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      What This Means
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{enrichedData.whatThisMeans}</p>
                  </CardContent>
                </Card>
                
                {/* Why It Matters */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Why It Matters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{enrichedData.whyItMatters}</p>
                  </CardContent>
                </Card>
                
                {/* Key Metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {enrichedData.metrics.map((metric, index) => (
                      <div key={index} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{metric.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{metric.value}</span>
                            {getTrendIcon(metric.trend)}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{metric.explanation}</p>
                        {metric.benchmark && (
                          <p className="text-xs text-primary">Benchmark: {metric.benchmark}</p>
                        )}
                        <Progress value={metric.confidence} className="h-1" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4">
                {/* Key Insights */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {enrichedData.insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                {/* Recommendations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {enrichedData.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="data" className="space-y-4">
                {/* How We Calculated */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      How We Calculated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{enrichedData.howWeCalculated}</p>
                  </CardContent>
                </Card>
                
                {/* Detailed Metrics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Detailed Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {enrichedData.metrics.map((metric, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{metric.label}</span>
                          <Badge variant="outline">{metric.value}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{metric.meaning}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-primary">{metric.actionable}</span>
                          <span className="text-muted-foreground">Confidence: {metric.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-4">
                {/* Next Steps */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {enrichedData.nextSteps.map((step, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Learn More */}
                {enrichedData.learnMoreTopics && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Learn More
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {enrichedData.learnMoreTopics.map((topic, index) => (
                          <Badge key={index} variant="secondary" className="justify-start">
                            <HelpCircle className="h-3 w-3 mr-1" />
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}