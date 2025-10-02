import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Building2, TrendingUp, Users, Shield, Brain, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Lightbulb, Target, Sparkles, MessageSquare, Activity, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CompetitionChatDialog } from './CompetitionChatDialog';
import { OptimizedDashboardService, OptimizedTileData } from '@/services/optimizedDashboardService';
import { Skeleton } from '@/components/ui/skeleton';

interface Competitor {
  name: string;
  marketShare: string;
  strength: 'strong' | 'moderate' | 'weak';
  strengths: string[];
  weaknesses: string[];
  funding: string;
  founded: string;
  url?: string;
}

interface CompetitionData {
  competitors: Competitor[];
  marketConcentration: string;
  entryBarriers: string;
  differentiationOpportunities: string[];
  competitiveLandscape: {
    directCompetitors: number;
    indirectCompetitors: number;
    substitutes: number;
  };
  analysis: {
    threat: 'high' | 'medium' | 'low';
    opportunities: string[];
    recommendations: string[];
  };
}

interface OptimizedCompetitionTileProps {
  idea?: string;
  className?: string;
  initialData?: OptimizedTileData | null;
  onRefresh?: () => void;
}

export function OptimizedCompetitionTile({ idea, className, initialData, onRefresh }: OptimizedCompetitionTileProps) {
  const [data, setData] = useState<CompetitionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(!initialData);
  const [currentView, setCurrentView] = useState<'overview' | 'landscape' | 'analysis' | 'opportunities'>('overview');
  const { toast } = useToast();
  const dataFetchedRef = useRef(false);
  const dashboardService = useRef(OptimizedDashboardService.getInstance());

  // Get the actual idea to use
  const currentIdea = idea || 
    localStorage.getItem('dashboardIdea') || 
    localStorage.getItem('currentIdea') || 
    '';

  // Process initial data
  useEffect(() => {
    if (initialData?.insights && !dataFetchedRef.current) {
      const competitionData = initialData.insights as any;
      if (competitionData.competitors) {
        setData({
          competitors: competitionData.competitors || [],
          marketConcentration: competitionData.marketConcentration || 'Medium',
          entryBarriers: competitionData.entryBarriers || 'Moderate',
          differentiationOpportunities: competitionData.differentiationOpportunities || [],
          competitiveLandscape: competitionData.competitiveLandscape || {
            directCompetitors: 3,
            indirectCompetitors: 5,
            substitutes: 2
          },
          analysis: competitionData.analysis || {
            threat: 'medium',
            opportunities: [],
            recommendations: []
          }
        });
        setIsCollapsed(false);
        dataFetchedRef.current = true;
      }
    }
  }, [initialData]);

  // Fetch competition data using optimized pipeline
  const fetchCompetitionData = async (forceRefresh = false) => {
    if (!currentIdea || loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const result = await dashboardService.current.getDataForTile(
        'competition',
        currentIdea
      );

      if (result?.insights) {
        const competitionData = result.insights as any;
        setData({
          competitors: competitionData.competitors || [],
          marketConcentration: competitionData.marketConcentration || 'Medium',
          entryBarriers: competitionData.entryBarriers || 'Moderate',
          differentiationOpportunities: competitionData.differentiationOpportunities || competitionData.opportunities || [],
          competitiveLandscape: competitionData.competitiveLandscape || competitionData.landscape || {
            directCompetitors: competitionData.directCompetitors || 3,
            indirectCompetitors: competitionData.indirectCompetitors || 5,
            substitutes: competitionData.substitutes || 2
          },
          analysis: competitionData.analysis || {
            threat: competitionData.threatLevel || 'medium',
            opportunities: competitionData.marketOpportunities || [],
            recommendations: competitionData.strategicRecommendations || []
          }
        });
        
        if (forceRefresh) {
          toast({
            title: 'Competition Analysis Updated',
            description: 'Fresh competitive landscape data loaded',
          });
        }
      }
    } catch (err) {
      console.error('[Competition] Error fetching data:', err);
      setError('Failed to load competition data');
      
      // Load fallback data
      setData(getFallbackData());
    } finally {
      setLoading(false);
    }
  };

  // Handle expand/collapse with lazy loading
  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    // If expanding for the first time, trigger data load
    if (!newCollapsed && !data && !loading) {
      fetchCompetitionData();
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchCompetitionData(true);
    }
  };

  // Auto-fetch on mount if not collapsed
  useEffect(() => {
    if (!isCollapsed && !data && !loading && currentIdea && !dataFetchedRef.current) {
      fetchCompetitionData();
    }
  }, [isCollapsed, currentIdea]);

  // Get fallback data
  const getFallbackData = (): CompetitionData => ({
    competitors: [
      {
        name: "Market Leader Pro",
        marketShare: "35%",
        strength: "strong",
        strengths: ["Market dominance", "Brand recognition", "Enterprise features"],
        weaknesses: ["High cost", "Legacy systems", "Slow innovation"],
        funding: "$500M",
        founded: "2012",
      },
      {
        name: "Innovation Labs",
        marketShare: "22%",
        strength: "moderate",
        strengths: ["Modern tech", "Good UX", "Fast iteration"],
        weaknesses: ["Limited scale", "Smaller team", "Less funding"],
        funding: "$120M",
        founded: "2018",
      },
    ],
    marketConcentration: "Medium",
    entryBarriers: "Moderate",
    differentiationOpportunities: [
      "AI-powered features",
      "Better pricing model",
      "Superior user experience"
    ],
    competitiveLandscape: {
      directCompetitors: 5,
      indirectCompetitors: 8,
      substitutes: 3
    },
    analysis: {
      threat: 'medium',
      opportunities: ["Market gaps exist", "Innovation potential high"],
      recommendations: ["Focus on differentiation", "Build strategic partnerships"]
    }
  });

  // Get threat color
  const getThreatColor = (threat: string) => {
    switch (threat) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  // Get strength badge variant
  const getStrengthVariant = (strength: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (strength) {
      case 'strong': return 'destructive';
      case 'moderate': return 'secondary';
      case 'weak': return 'outline';
      default: return 'default';
    }
  };

  return (
    <>
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="cursor-pointer" onClick={handleToggleCollapse}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Competition Analysis
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
              {!isCollapsed && data && (
                <CardDescription>
                  {data.competitors.length} competitors • {data.competitiveLandscape.directCompetitors} direct threats
                </CardDescription>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  AI Analysis
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="space-y-4">
            {loading && !data ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : error && !data ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchCompetitionData()}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            ) : data ? (
              <>
                {/* Show a subtle message if no competitors found */}
                {data.competitors.length === 0 && (
                  <div className="text-center py-6 rounded-lg bg-muted/30">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No competitors detected yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Competition data will populate as market analysis completes
                    </p>
                  </div>
                )}
                
                {data.competitors.length > 0 && (
                  <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="landscape">Landscape</TabsTrigger>
                      <TabsTrigger value="analysis">Analysis</TabsTrigger>
                      <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                    </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                        <p className="text-sm font-medium mb-1">Market Concentration</p>
                        <p className="text-2xl font-bold">{data.marketConcentration}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-1">Entry Barriers</p>
                        <p className="text-2xl font-bold">{data.entryBarriers}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium">Top Competitors</p>
                      {data.competitors.slice(0, 3).map((competitor, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedCompetitor(competitor)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{competitor.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {competitor.marketShare} market share • Founded {competitor.founded}
                              </p>
                            </div>
                            <Badge variant={getStrengthVariant(competitor.strength)}>
                              {competitor.strength}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="font-medium text-success mb-1">Strengths</p>
                              <ul className="space-y-0.5">
                                {competitor.strengths.slice(0, 2).map((s, i) => (
                                  <li key={i} className="text-muted-foreground">• {s}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium text-warning mb-1">Weaknesses</p>
                              <ul className="space-y-0.5">
                                {competitor.weaknesses.slice(0, 2).map((w, i) => (
                                  <li key={i} className="text-muted-foreground">• {w}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="landscape" className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-accent">{data.competitiveLandscape.directCompetitors}</p>
                        <p className="text-sm text-muted-foreground mt-1">Direct Competitors</p>
                      </div>
                      <div className="bg-muted/50 border border-border/50 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold">{data.competitiveLandscape.indirectCompetitors}</p>
                        <p className="text-sm text-muted-foreground mt-1">Indirect</p>
                      </div>
                      <div className="bg-muted/50 border border-border/50 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold">{data.competitiveLandscape.substitutes}</p>
                        <p className="text-sm text-muted-foreground mt-1">Substitutes</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-primary" />
                        <p className="font-medium">Market Dynamics</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Competition Intensity</span>
                          <Progress value={70} className="w-24" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Market Saturation</span>
                          <Progress value={45} className="w-24" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Innovation Rate</span>
                          <Progress value={85} className="w-24" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="analysis" className="space-y-4">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium">Competitive Threat Level</p>
                        <Badge className={cn("capitalize", getThreatColor(data.analysis.threat))}>
                          {data.analysis.threat}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        {data.analysis.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-primary mt-0.5" />
                            <p className="text-sm text-muted-foreground">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                        <Shield className="h-4 w-4 text-success mb-2" />
                        <p className="text-sm font-medium">Defensive Strategy</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Build moats around core strengths
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <TrendingUp className="h-4 w-4 text-primary mb-2" />
                        <p className="text-sm font-medium">Offensive Strategy</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Target competitor weaknesses
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="opportunities" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-warning" />
                        <p className="font-medium">Differentiation Opportunities</p>
                      </div>
                      {data.differentiationOpportunities.map((opp, index) => (
                        <div key={index} className="p-3 rounded-lg bg-muted/30 border">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-warning mt-0.5" />
                            <p className="text-sm">{opp}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {data.analysis.opportunities.length > 0 && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="font-medium mb-2">Market Opportunities</p>
                        <ul className="space-y-1">
                          {data.analysis.opportunities.map((opp, index) => (
                            <li key={index} className="text-sm text-muted-foreground">• {opp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </TabsContent>
                  </Tabs>
                )}

                {loading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Updating competition data...</span>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        )}
      </Card>

      {chatDialogOpen && (
        <CompetitionChatDialog
          open={chatDialogOpen}
          onOpenChange={setChatDialogOpen}
          competitionData={data}
          idea={currentIdea}
        />
      )}
    </>
  );
}