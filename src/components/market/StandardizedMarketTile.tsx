import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, RefreshCw, AlertCircle, TrendingUp, DollarSign, BarChart3, Users, Target, Calendar, Rocket, Building2 } from 'lucide-react';
import { MarketSizeChart } from './MarketSizeChart';
import { GrowthProjectionChart } from './GrowthProjectionChart';
import { CompetitorAnalysisChart } from './CompetitorAnalysisChart';
import { PricingStrategyChart } from './PricingStrategyChart';
import { TargetAudienceChart } from './TargetAudienceChart';
import { LaunchTimelineChart } from './LaunchTimelineChart';
import { AITileDialog } from '@/components/dashboard/AITileDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTileData } from '@/components/hub/BaseTile';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';

interface StandardizedMarketTileProps {
  title: string;
  icon: React.ElementType;
  tileType: string;
  filters: any;
  description?: string;
  currentIdea: string;
}

// Map tile types to appropriate icons for metrics
const getTileIcon = (tileType: string) => {
  switch(tileType) {
    case 'market_size':
      return DollarSign;
    case 'growth_projections':
      return Rocket;
    case 'competitor_analysis':
      return Building2;
    case 'launch_timeline':
      return Calendar;
    case 'pricing_strategy':
      return DollarSign;
    case 'target_audience':
      return Users;
    default:
      return BarChart3;
  }
};

export function StandardizedMarketTile({
  title,
  icon: Icon,
  tileType,
  filters,
  description,
  currentIdea,
}: StandardizedMarketTileProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();

  // Map tile types to their respective edge functions
  const functionMap: Record<string, string> = {
    'market_size': 'market-size',
    'growth_projections': 'growth-projections',
    'competitor_analysis': 'competitor-analysis',
    'launch_timeline': 'launch-timeline',
    'pricing_strategy': 'pricing-strategy',
    'target_audience': 'target-audience',
    'twitter_buzz': 'twitter-search',
    'amazon_reviews': 'amazon-public',
    'youtube_analytics': 'youtube-search',
    'news_analysis': 'news-analysis',
    'user_engagement': 'user-engagement'
  };

  const fetchTileData = async () => {
    if (!currentIdea) {
      console.warn(`[${tileType}] No idea provided, skipping fetch`);
      return null;
    }

    console.log(`[${tileType}] Starting data fetch for idea: "${currentIdea}"`);
    
    // 1. First check localStorage cache (fastest)
    const cacheKey = `tile_cache_${tileType}_${currentIdea}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const maxCacheAge = 30 * 60 * 1000; // 30 minutes
        
        if (cacheAge < maxCacheAge) {
          console.log(`[${tileType}] ✅ Using localStorage cache (age: ${Math.round(cacheAge/1000)}s)`);
          return { 
            ...parsed.data, 
            fromCache: true, 
            cacheAge: Math.round(cacheAge/1000),
            source: 'localStorage'
          };
        } else {
          console.log(`[${tileType}] ⚠️ Cache expired (age: ${Math.round(cacheAge/1000)}s)`);
        }
      } catch (e) {
        console.error(`[${tileType}] Failed to parse cache:`, e);
      }
    } else {
      console.log(`[${tileType}] No localStorage cache found`);
    }
    
    // 2. Database check will be handled by useTileData hook
    console.log(`[${tileType}] Will check database via useTileData hook...`);
    
    // 3. If not in cache or DB, make API call with extreme detail
    const functionName = functionMap[tileType];
    if (!functionName) {
      console.error(`[${tileType}] ❌ No edge function mapped for tile type`);
      throw new Error(`No function mapping for tile type: ${tileType}`);
    }

    console.log(`[${tileType}] 📡 Making API call to ${functionName}...`);
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { 
        idea: currentIdea,
        // Request maximum detail from API
        detailed: true,
        includeAll: true,
        depth: 'comprehensive',
        filters: {
          timeRange: filters?.timeRange || '12months',
          industry: filters?.industry || 'all',
          detailed: true,
          includeCompetitors: true,
          includeMarketData: true,
          includeTrends: true,
          includeProjections: true,
          includeRisks: true,
          includeOpportunities: true,
          includeRecommendations: true,
          includeMetrics: true,
          includeAnalysis: true,
          includeInsights: true,
          includeSources: true,
          includeConfidence: true,
          includeMethodology: true,
          maxCompetitors: 10,
          maxInsights: 20,
          maxRecommendations: 15,
          granularity: 'high'
        }
      }
    });

    const apiTime = Date.now() - startTime;

    if (error) {
      console.error(`[${tileType}] ❌ API call failed after ${apiTime}ms:`, error);
      throw error;
    }
    
    console.log(`[${tileType}] ✅ API call successful (${apiTime}ms)`);
    
    // Save to localStorage cache for next time
    if (data) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: {
            ...data,
            fetchedAt: new Date().toISOString(),
            apiResponseTime: apiTime
          },
          timestamp: Date.now()
        }));
        console.log(`[${tileType}] 💾 Data cached to localStorage`);
      } catch (e) {
        console.error(`[${tileType}] Failed to cache data:`, e);
        // Clear old cache entries if localStorage is full
        try {
          const keys = Object.keys(localStorage);
          const cacheKeys = keys.filter(k => k.startsWith('tile_cache_'));
          if (cacheKeys.length > 50) {
            // Remove oldest 25% of cache entries
            cacheKeys.slice(0, Math.ceil(cacheKeys.length * 0.25)).forEach(k => {
              localStorage.removeItem(k);
            });
            console.log(`[${tileType}] Cleared old cache entries`);
          }
        } catch (cleanupError) {
          console.error(`[${tileType}] Failed to cleanup cache:`, cleanupError);
        }
      }
    }
    
    return { 
      ...data, 
      fromApi: true,
      apiResponseTime: apiTime,
      source: 'api',
      fetchedAt: new Date().toISOString()
    };
  };

  const { data, isLoading: loading, error, loadData: refresh } = useTileData(
    fetchTileData, 
    [currentIdea, tileType], 
    {
      tileType,
      useDatabase: true,
      cacheMinutes: 30
    }
  );

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Simulate analysis - in production this would call an API
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000);
  };

  const renderChart = () => {
    switch (tileType) {
      case 'market_size':
        return <MarketSizeChart data={data} />;
      case 'growth_projections':
        return <GrowthProjectionChart data={data} />;
      case 'competitor_analysis':
        return <CompetitorAnalysisChart data={data} />;
      case 'launch_timeline':
        return <LaunchTimelineChart data={data} />;
      case 'pricing_strategy':
        return <PricingStrategyChart data={data} />;
      case 'target_audience':
        return <TargetAudienceChart data={data} />;
      default:
        // For other tile types, render basic data display
        return renderBasicContent();
    }
  };

  const renderBasicContent = () => {
    if (!data) return null;
    
    // Render extreme detail from all available data fields
    return (
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {/* Primary Analysis */}
        {data?.analysis && (
          <div className="space-y-2">
            <Alert className="border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {typeof data.analysis === 'string' 
                  ? data.analysis 
                  : data.analysis.summary || data.analysis.overview || 'Analysis available'}
              </AlertDescription>
            </Alert>
            
            {/* Detailed analysis sections */}
            {data.analysis.detailed && (
              <div className="pl-4 border-l-2 border-primary/20">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Detailed Analysis</p>
                <p className="text-sm">{data.analysis.detailed}</p>
              </div>
            )}
            
            {data.analysis.methodology && (
              <div className="pl-4 border-l-2 border-primary/20">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Methodology</p>
                <p className="text-sm">{data.analysis.methodology}</p>
              </div>
            )}
          </div>
        )}
        
        {/* All Metrics with extreme detail */}
        {data?.metrics && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Key Metrics</p>
            <div className="grid grid-cols-2 gap-2">
              {(Array.isArray(data.metrics) ? data.metrics : Object.entries(data.metrics))
                .map((item: any, idx: number) => {
                  const isArray = Array.isArray(data.metrics);
                  const key = isArray ? item.name : item[0];
                  const value = isArray ? item.value : item[1];
                  const unit = isArray ? item.unit : '';
                  const confidence = isArray ? item.confidence : null;
                  const explanation = isArray ? item.explanation : null;
                  
                  return (
                    <div key={idx} className="bg-muted/50 rounded-lg p-2.5 border border-muted">
                      <p className="text-xs text-muted-foreground capitalize">
                        {key?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-base font-semibold mt-0.5">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        {unit ? ` ${unit}` : ''}
                      </p>
                      {confidence !== null && confidence !== undefined && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary/60 rounded-full"
                              style={{ width: `${confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {Math.round(confidence * 100)}%
                          </span>
                        </div>
                      )}
                      {explanation && (
                        <p className="text-[10px] text-muted-foreground mt-1">{explanation}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
        {/* Opportunities */}
        {data?.opportunities && data.opportunities.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Opportunities</p>
            <div className="space-y-1">
              {data.opportunities.map((opp: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-primary text-xs mt-0.5">•</span>
                  <p className="text-sm">{typeof opp === 'string' ? opp : opp.description || opp.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Risks */}
        {data?.risks && data.risks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Risk Factors</p>
            <div className="space-y-1">
              {data.risks.map((risk: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-destructive text-xs mt-0.5">⚠</span>
                  <p className="text-sm">{typeof risk === 'string' ? risk : risk.description || risk.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recommendations */}
        {data?.recommendations && data.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Recommendations</p>
            <div className="space-y-1">
              {data.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-green-600 text-xs mt-0.5">✓</span>
                  <p className="text-sm">{typeof rec === 'string' ? rec : rec.description || rec.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Insights */}
        {data?.insights && data.insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Key Insights</p>
            <div className="space-y-1">
              {data.insights.map((insight: any, idx: number) => (
                <div key={idx} className="pl-3 border-l-2 border-primary/20">
                  <p className="text-sm">{typeof insight === 'string' ? insight : insight.description || insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Competitors */}
        {data?.competitors && data.competitors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Competitors</p>
            <div className="grid grid-cols-2 gap-2">
              {data.competitors.slice(0, 6).map((comp: any, idx: number) => (
                <div key={idx} className="bg-muted/30 rounded p-2">
                  <p className="text-xs font-medium">{comp.name || comp}</p>
                  {comp.marketShare && (
                    <p className="text-[10px] text-muted-foreground">Share: {comp.marketShare}%</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Trends */}
        {data?.trends && data.trends.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Market Trends</p>
            <div className="space-y-1">
              {data.trends.map((trend: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <p className="text-sm">{typeof trend === 'string' ? trend : trend.name || trend.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Data Source Info */}
        {(data?.source || data?.fetchedAt || data?.apiResponseTime) && (
          <div className="pt-2 border-t border-muted">
            <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
              {data.source && <span>Source: {data.source}</span>}
              {data.fetchedAt && <span>Fetched: {new Date(data.fetchedAt).toLocaleTimeString()}</span>}
              {data.apiResponseTime && <span>Response: {data.apiResponseTime}ms</span>}
              {data.cacheAge && <span>Cache Age: {data.cacheAge}s</span>}
            </div>
          </div>
        )}
        
        {/* Sources/Citations */}
        {data?.sources && data.sources.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-muted">
            <p className="text-xs font-semibold text-muted-foreground">Sources</p>
            <div className="space-y-1">
              {data.sources.slice(0, 5).map((source: any, idx: number) => (
                <div key={idx} className="text-[10px] text-muted-foreground">
                  {typeof source === 'string' ? source : source.name || source.url}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Transform data for AITileDialog format
  const getDialogData = () => {
    if (!data) return null;

    const analysis = data?.analysis || {};
    const MetricIcon = getTileIcon(tileType);
    
    // Build metrics array based on tile type
    const metrics = [];
    
    // Add primary metric
    metrics.push({
      title: title,
      value: getMetricValue(),
      icon: MetricIcon,
      color: 'primary',
      levels: [
        {
          title: 'Overview',
          content: typeof analysis === 'string' ? analysis : (analysis.summary || `Overview analysis for ${title}`)
        },
        {
          title: 'Detailed Analysis',
          content: analysis.detailed || getDetailedAnalysis()
        },
        {
          title: 'Strategic Insights',
          content: analysis.strategic || getStrategicInsights()
        }
      ]
    });

    // Add additional metrics if available
    if (data?.metrics) {
      const metricsArray = Array.isArray(data.metrics) ? data.metrics : Object.entries(data.metrics);
      metricsArray.slice(0, 3).forEach((item: any) => {
        const isArray = Array.isArray(data.metrics);
        const key = isArray ? item.name : item[0];
        const value = isArray ? item.value : item[1];
        
        metrics.push({
          title: key?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          value: typeof value === 'number' ? value.toLocaleString() : String(value),
          icon: TrendingUp,
          color: 'secondary',
          levels: [
            { title: 'Overview', content: `Current ${key}: ${value}` },
            { title: 'Detailed', content: `Detailed analysis of ${key} metric` },
            { title: 'Strategic', content: `Strategic implications of ${key}` }
          ]
        });
      });
    }

    return {
      title: `${title} - AI Analysis`,
      metrics,
      chartData: data?.chartData || [],
      barChartData: data?.barChartData || [],
      sources: data?.sources || [],
      insights: [
        ...(data?.insights || []),
        `AI-powered analysis for ${currentIdea}`,
        'Real-time market intelligence',
        'Data-driven recommendations'
      ]
    };
  };

  const getMetricValue = () => {
    if (data?.metrics) {
      if (Array.isArray(data.metrics) && data.metrics.length > 0) {
        return data.metrics[0].value?.toLocaleString() || 'N/A';
      } else if (typeof data.metrics === 'object') {
        const firstValue = Object.values(data.metrics)[0];
        return typeof firstValue === 'number' ? firstValue.toLocaleString() : String(firstValue);
      }
    }
    return 'N/A';
  };

  const getDetailedAnalysis = () => {
    const analysis = data?.analysis || {};
    if (analysis.opportunities && analysis.opportunities.length > 0) {
      return `Key Opportunities:\n${analysis.opportunities.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}`;
    }
    return `Detailed analysis shows ${title} metrics are within expected ranges for ${currentIdea}. Further investigation recommended for optimization opportunities.`;
  };

  const getStrategicInsights = () => {
    const analysis = data?.analysis || {};
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      return `Strategic Recommendations:\n${analysis.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`;
    }
    return `Strategic positioning suggests focusing on differentiation and market penetration strategies for ${currentIdea}.`;
  };

  // Show loading state
  if (loading && !data) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {typeof error === 'string' ? error : 'Failed to load data'}
            </AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} className="mt-4" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("h-full group relative")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Data source indicator */}
              {data && (() => {
                let source = 'API';
                let variant: 'default' | 'secondary' | 'outline' = 'default';
                
                if (data.fromDatabase) {
                  source = 'DB';
                  variant = 'default';
                } else if (data.fromCache || data.cacheHit) {
                  source = 'Cache';
                  variant = 'secondary';
                }
                
                return (
                  <Badge variant={variant} className="text-xs h-5">
                    {source}
                  </Badge>
                );
              })()}
              
              {/* Refresh button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
              
              {/* Brain AI button */}
              {data && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                  className="h-8 w-8 p-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-200"
                >
                  <Brain className="h-4 w-4 text-violet-600" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* AI Analysis Dialog using AITileDialog component */}
      <AITileDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        data={getDialogData()}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
      />
    </>
  );
}