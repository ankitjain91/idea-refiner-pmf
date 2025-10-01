import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Building2, TrendingUp, Users, Shield, Brain, ChevronRight, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Lightbulb, Target, Sparkles, MessageSquare, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CompetitionChatDialog } from './CompetitionChatDialog';

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

interface EnhancedCompetitionTileProps {
  idea?: string;
}

export function EnhancedCompetitionTile({ idea }: EnhancedCompetitionTileProps) {
  const [data, setData] = useState<CompetitionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hasBeenExpanded, setHasBeenExpanded] = useState(false);
  const { toast } = useToast();
  
  // Handle expand/collapse with lazy loading
  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    // If expanding for the first time, trigger data load
    if (!newCollapsed && !hasBeenExpanded && !data) {
      setHasBeenExpanded(true);
      loadMockData();
    }
  };

  
  // Load mock data function
  const loadMockData = async () => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockData: CompetitionData = {
      competitors: [
        {
          name: "TechCorp Solutions",
          marketShare: "32%",
          strength: "strong",
          strengths: ["Brand recognition", "Enterprise clients", "Global presence"],
          weaknesses: ["High pricing", "Slow innovation", "Complex UI"],
          funding: "$450M Series E",
          founded: "2015",
          url: "https://techcorp.example"
        },
        {
          name: "InnovateLabs",
          marketShare: "18%",
          strength: "moderate",
          strengths: ["Fast innovation", "Modern tech stack", "Good UX"],
          weaknesses: ["Limited scale", "Small team", "Few enterprise features"],
          funding: "$85M Series C",
          founded: "2018",
          url: "https://innovatelabs.example"
        },
        {
          name: "QuickStart AI",
          marketShare: "15%",
          strength: "moderate",
          strengths: ["AI-first approach", "Competitive pricing", "Easy onboarding"],
          weaknesses: ["Limited features", "New to market", "Small customer base"],
          funding: "$35M Series B",
          founded: "2020",
          url: "https://quickstart.example"
        },
        {
          name: "Legacy Systems Inc",
          marketShare: "22%",
          strength: "weak",
          strengths: ["Established customer base", "Industry experience", "Reliable"],
          weaknesses: ["Outdated technology", "Poor mobile experience", "High churn"],
          funding: "$200M (2010)",
          founded: "2005"
        },
        {
          name: "Nimble Startup",
          marketShare: "8%",
          strength: "weak",
          strengths: ["Agile development", "Niche focus", "Responsive support"],
          weaknesses: ["Limited resources", "Unproven model", "Geographic limitations"],
          funding: "$5M Seed",
          founded: "2022"
        }
      ],
      marketConcentration: "Moderate (HHI: 2,150)",
      entryBarriers: "Medium - Requires technical expertise and initial capital",
      differentiationOpportunities: [
        "AI-powered automation features",
        "Superior user experience design",
        "Vertical market specialization",
        "Competitive pricing models",
        "Better integration ecosystem"
      ],
      competitiveLandscape: {
        directCompetitors: 12,
        indirectCompetitors: 25,
        substitutes: 8
      },
      analysis: {
        threat: "medium",
        opportunities: [
          "Market fragmentation allows new entrants",
          "Customer dissatisfaction with legacy providers",
          "Growing demand exceeds current supply",
          "Technology shifts creating new niches"
        ],
        recommendations: [
          "Focus on underserved SMB segment",
          "Differentiate through superior UX",
          "Build strategic partnerships early",
          "Leverage AI for competitive advantage"
        ]
      }
    };
    
    setData(mockData);
    // Auto-expand tile when data is fetched
    setIsCollapsed(false);
    setLoading(false);
  };

  // Remove auto-load on mount to enable lazy loading


  const getStrengthColor = (strength: string) => {
    switch(strength) {
      case 'strong': return 'text-red-500';
      case 'moderate': return 'text-yellow-500';
      case 'weak': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getThreatBadgeVariant = (threat: string) => {
    switch(threat) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getLoadingMessage = () => {
    const messages = [
      "Analyzing the competition landscape... 🕵️",
      "Spying on competitors... 👀",
      "Gathering intel from the field... 📊",
      "Running competitive analysis... 🎯",
      "Checking who's in your space... 🏢"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  if (loading) {
    return (
      <Card className="h-full transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Competition Analysis
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6 hover:bg-muted/50 rounded-full transition-all duration-200"
              onClick={handleToggleCollapse}
              aria-label="Collapse"
            >
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Activity className="h-8 w-8 mb-3 text-primary animate-bounce" />
            <p className="text-sm font-medium text-center animate-pulse">
              {getLoadingMessage()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Competition Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Button onClick={loadMockData} size="sm" variant="outline">
              <Activity className="h-3 w-3 mr-1" />
              Fetch Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full transition-all duration-300 hover:shadow-lg">
        <CardHeader className={cn("pb-3", isCollapsed && "border-b-0")}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Competition Analysis
              </CardTitle>
              {!isCollapsed && (
                <CardDescription>
                  {data.competitors.length} competitors analyzed • {data.competitiveLandscape.directCompetitors} direct threats
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isCollapsed && (
                <>
                  <Badge variant={getThreatBadgeVariant(data.analysis.threat)}>
                    {data.analysis.threat.toUpperCase()} THREAT
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setChatDialogOpen(true)}
                  >
                    <Brain className="h-4 w-4" />
                    AI Analysis
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6 hover:bg-muted/50 rounded-full transition-all duration-200"
                onClick={handleToggleCollapse}
                aria-label={isCollapsed ? "Expand tile" : "Collapse tile"}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="p-4">
          <Tabs defaultValue="overview" className="h-full">
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Market Concentration</p>
                  <p className="text-lg font-semibold">{data.marketConcentration}</p>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Entry Barriers</p>
                  <p className="text-lg font-semibold">{data.entryBarriers}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Competitive Landscape</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Market Share Distribution</p>
                <div className="space-y-3 bg-muted/20 rounded-lg p-4">
                  {data.competitors.slice(0, 3).map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-36 truncate">{comp.name}</span>
                      <Progress value={parseInt(comp.marketShare)} className="flex-1 h-2" />
                      <span className="text-sm font-semibold w-12 text-right">{comp.marketShare}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                    <span className="text-sm font-medium w-36">Others</span>
                    <Progress value={13} className="flex-1 h-2" />
                    <span className="text-sm font-semibold w-12 text-right">13%</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="competitors" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {data.competitors.map((comp, idx) => (
                    <div 
                      key={idx} 
                      className="border border-border/50 rounded-lg p-4 hover:bg-accent/5 hover:border-accent/30 cursor-pointer transition-all duration-200"
                      onClick={() => setSelectedCompetitor(comp)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-base">{comp.name}</p>
                            <Badge 
                              variant="outline" 
                              className={`${getStrengthColor(comp.strength)} border-current`}
                            >
                              {comp.strength.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Founded {comp.founded} • {comp.funding}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-primary">{comp.marketShare}</p>
                          <p className="text-xs text-muted-foreground">market share</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-green-500/5 rounded-md p-2">
                          <p className="font-medium text-green-600 dark:text-green-400 text-xs mb-1">Strengths:</p>
                          <p className="text-sm line-clamp-2">{comp.strengths.join(', ')}</p>
                        </div>
                        <div className="bg-red-500/5 rounded-md p-2">
                          <p className="font-medium text-red-600 dark:text-red-400 text-xs mb-1">Weaknesses:</p>
                          <p className="text-sm line-clamp-2">{comp.weaknesses.join(', ')}</p>
                        </div>
                      </div>

                      {comp.url && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-3 h-7 text-xs gap-1.5 w-full justify-center" 
                          asChild
                        >
                          <a 
                            href={comp.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Website <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="opportunities" className="mt-4">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">Market Opportunities</p>
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                    <div className="space-y-3">
                      {data.analysis.opportunities.map((opp, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <ChevronRight className="h-4 w-4 text-accent" />
                          </div>
                          <p className="text-sm flex-1">{opp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Differentiation Vectors</p>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {data.differentiationOpportunities.map((diff, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary"
                          className="px-3 py-1.5"
                        >
                          {diff}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="mt-4">
              <div className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold mb-3">Strategic Recommendations</p>
                      <div className="space-y-2">
                        {data.analysis.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-sm font-medium text-primary min-w-[20px]">
                              {idx + 1}.
                            </span>
                            <p className="text-sm text-muted-foreground flex-1">
                              {rec}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                    <Target className="h-4 w-4" />
                    <span>View Positioning Map</span>
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                    <TrendingUp className="h-4 w-4" />
                    <span>Growth Projections</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Competitor Detail Dialog */}
          <Dialog open={!!selectedCompetitor} onOpenChange={() => setSelectedCompetitor(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedCompetitor?.name}</DialogTitle>
                <DialogDescription>
                  Detailed competitive analysis
                </DialogDescription>
              </DialogHeader>
              {selectedCompetitor && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Market Share</p>
                      <p className="text-lg font-semibold">{selectedCompetitor.marketShare}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Funding</p>
                      <p className="text-lg font-semibold">{selectedCompetitor.funding}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Strengths</p>
                    <ul className="space-y-1">
                      {selectedCompetitor.strengths.map((str, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400" />
                          {str}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Weaknesses</p>
                    <ul className="space-y-1">
                      {selectedCompetitor.weaknesses.map((weak, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                          {weak}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedCompetitor.url && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={selectedCompetitor.url} target="_blank" rel="noopener noreferrer">
                        Visit Website <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
        )}
      </Card>

      {/* Competition Chat Dialog */}
      <CompetitionChatDialog 
        open={chatDialogOpen}
        onOpenChange={setChatDialogOpen}
        competitionData={data}
        idea={idea || ''}
      />
    </>
  );
}