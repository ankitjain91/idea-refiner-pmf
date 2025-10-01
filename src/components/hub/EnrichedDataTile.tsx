import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  ArrowRight,
  X
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
      
      {/* Detailed View Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
                    <DialogDescription className="mt-1">{enrichedData.summary}</DialogDescription>
                  </div>
                </div>
                <Button
                  onClick={() => setShowDetails(false)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
          </div>
          
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="h-[calc(90vh-240px)]">
                <TabsContent value="overview" className="space-y-4 mt-0">
                  <div className="grid gap-4">
                    {/* What This Means */}
                    <Card className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          What This Means
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{enrichedData.whatThisMeans}</p>
                      </CardContent>
                    </Card>
                    
                    {/* Why It Matters */}
                    <Card className="border-l-4 border-l-orange-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-orange-500" />
                          Why It Matters
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{enrichedData.whyItMatters}</p>
                      </CardContent>
                    </Card>
                    
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {enrichedData.metrics.map((metric, index) => (
                        <Card key={index} className="relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -mr-16 -mt-16" />
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-sm font-medium">{metric.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-bold">{metric.value}</span>
                                {getTrendIcon(metric.trend)}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{metric.explanation}</p>
                            {metric.benchmark && (
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="secondary" className="text-xs">
                                  Benchmark: {metric.benchmark}
                                </Badge>
                              </div>
                            )}
                            <Progress value={metric.confidence} className="h-1 mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {metric.confidence}% confidence
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="insights" className="space-y-4 mt-0">
                  <div className="grid gap-4">
                    {/* Key Insights */}
                    <Card className="bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-500" />
                          Key Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {enrichedData.insights.map((insight, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Sparkles className="h-3 w-3 text-primary" />
                              </div>
                              <span className="text-sm text-muted-foreground leading-relaxed">{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                    
                    {/* Recommendations */}
                    <Card className="bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-green-500" />
                          Strategic Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {enrichedData.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <ArrowRight className="h-3 w-3 text-green-500" />
                              </div>
                              <span className="text-sm text-muted-foreground leading-relaxed">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="data" className="space-y-4 mt-0">
                  <div className="grid gap-4">
                    {/* How We Calculated */}
                    <Card className="border-l-4 border-l-purple-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-purple-500" />
                          Methodology
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">{enrichedData.howWeCalculated}</p>
                      </CardContent>
                    </Card>
                    
                    {/* Detailed Metrics */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Detailed Metrics Analysis</h3>
                      {enrichedData.metrics.map((metric, index) => (
                        <Card key={index} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium">{metric.label}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="default">{metric.value}</Badge>
                                {getTrendIcon(metric.trend)}
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <p className="text-muted-foreground">{metric.explanation}</p>
                              <p className="text-foreground font-medium">{metric.meaning}</p>
                              <div className="flex items-center justify-between pt-2 border-t">
                                <span className="text-primary">{metric.actionable}</span>
                                <span className="text-xs text-muted-foreground">
                                  Confidence: {metric.confidence}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="space-y-4 mt-0">
                  <div className="grid gap-4">
                    {/* Next Steps */}
                    <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          Your Action Plan
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {enrichedData.nextSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                {index + 1}
                              </div>
                              <span className="text-sm flex-1">{step}</span>
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
                            Resources & Learning
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {enrichedData.learnMoreTopics.map((topic, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{topic}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}