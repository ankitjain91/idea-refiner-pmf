import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Target, 
  TrendingUp, 
  Users, 
  Lightbulb, 
  ChartBar,
  Sparkles,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  Search,
  Hash,
  MessageSquare,
  DollarSign,
  Clock,
  AlertCircle,
  Zap,
  Trophy,
  Brain,
  Rocket,
  Shield,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EnhancedPMFDashboardProps {
  idea: string;
  refinements: any;
  metadata?: any;
  userAnswers?: Record<string, string>;
  onScoreUpdate: (score: number) => void;
}

interface InsightSection {
  id: string;
  title: string;
  icon: any;
  summary: string;
  details: any;
  loading?: boolean;
}

export default function EnhancedPMFDashboard({ 
  idea, 
  refinements, 
  metadata, 
  userAnswers = {},
  onScoreUpdate 
}: EnhancedPMFDashboardProps) {
  const [pmfScore, setPmfScore] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [insights, setInsights] = useState<Record<string, any>>({});
  const [loadingInsights, setLoadingInsights] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  // Calculate dynamic score
  useEffect(() => {
    const calculateScore = () => {
      let score = metadata?.pmfScore || 45;
      const answerCount = Object.keys(userAnswers).length;
      score += answerCount * 3;
      
      // Add bonus based on insights gathered
      const insightBonus = Object.keys(insights).length * 5;
      score += insightBonus;
      
      // Add quality bonuses
      if (userAnswers['Who is your target audience?']?.length > 20) score += 5;
      if (userAnswers['What\'s your unique value proposition?']?.length > 30) score += 7;
      if (insights.market?.marketSize?.global) score += 10;
      if (insights.social?.viralPotential?.score > 7) score += 8;
      
      return Math.min(95, score);
    };
    
    const newScore = calculateScore();
    setPmfScore(newScore);
    onScoreUpdate(newScore);
  }, [metadata, userAnswers, insights, onScoreUpdate]);

  // Fetch insights from ChatGPT
  const fetchInsights = async (category: string) => {
    if (loadingInsights[category] || insights[category]) return;
    
    setLoadingInsights(prev => ({ ...prev, [category]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('market-insights', {
        body: { idea, userAnswers, category }
      });
      
      if (error) throw error;
      
      if (data?.success && data?.insights) {
        setInsights(prev => ({ ...prev, [category]: data.insights }));
      }
    } catch (error) {
      console.error(`Failed to fetch ${category} insights:`, error);
      toast({
        title: "Couldn't load insights",
        description: "We'll use cached data instead",
        variant: "default"
      });
    } finally {
      setLoadingInsights(prev => ({ ...prev, [category]: false }));
    }
  };

  const toggleSection = (sectionId: string) => {
    const newState = !expandedSections[sectionId];
    setExpandedSections(prev => ({ ...prev, [sectionId]: newState }));
    
    // Fetch insights when section is expanded
    if (newState && !insights[sectionId]) {
      fetchInsights(sectionId);
    }
  };

  const getScoreColor = () => {
    if (pmfScore >= 80) return "text-success";
    if (pmfScore >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreMessage = () => {
    if (pmfScore >= 80) return "Ready to launch! 🚀";
    if (pmfScore >= 60) return "Getting closer! Keep refining 💪";
    return "Let's build something amazing 🎯";
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Hero Score Card - Minimal by default */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Target className="w-6 h-6 text-primary" />
                Your Idea Score
              </CardTitle>
              <CardDescription className="mt-2">
                {idea || "Your business idea"}
              </CardDescription>
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor()}`}>
                {pmfScore}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {getScoreMessage()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={pmfScore} className="h-3" />
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSection('market')}
              className="justify-start"
            >
              <Globe className="w-4 h-4 mr-2" />
              Market Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSection('social')}
              className="justify-start"
            >
              <Hash className="w-4 h-4 mr-2" />
              Social Trends
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSection('customers')}
              className="justify-start"
            >
              <Users className="w-4 h-4 mr-2" />
              Customers
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSection('improvements')}
              className="justify-start"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Improvements
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Market Intelligence Section */}
      <Collapsible open={expandedSections.market} onOpenChange={() => toggleSection('market')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Market Intelligence</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {loadingInsights.market && <Loader2 className="w-4 h-4 animate-spin" />}
                  {expandedSections.market ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
              <CardDescription>
                Market size, growth trends, and competitive landscape
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {insights.market ? (
                <>
                  {/* Market Size & Growth */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Market Opportunity
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Global Size:</strong> {insights.market.marketSize?.global || 'Loading...'}</p>
                        <p><strong>Growth Rate:</strong> {insights.market.marketSize?.growth || 'Loading...'}</p>
                        <div className="mt-2">
                          <p className="font-medium mb-1">Top Regions:</p>
                          <div className="flex flex-wrap gap-1">
                            {insights.market.marketSize?.topRegions?.map((region: string, idx: number) => (
                              <Badge key={idx} variant="secondary">{region}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-success/5 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search Demand
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Monthly Searches:</strong> {insights.market.searchData?.monthlySearches || 'Loading...'}</p>
                        <p><strong>Trend:</strong> <Badge variant={insights.market.searchData?.trendDirection === 'rising' ? 'default' : 'secondary'}>{insights.market.searchData?.trendDirection || 'Loading...'}</Badge></p>
                        <div className="mt-2">
                          <p className="font-medium mb-1">Top Keywords:</p>
                          <div className="flex flex-wrap gap-1">
                            {insights.market.searchData?.topKeywords?.map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="outline">{keyword}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Competitors */}
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Competitive Analysis
                    </h4>
                    {insights.market.competitors?.map((competitor: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{competitor.name}</span>
                          <Badge>{competitor.marketShare}</Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-success font-medium">Strengths:</p>
                            <ul className="list-disc list-inside text-muted-foreground">
                              {competitor.strengths?.map((s: string, i: number) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-destructive font-medium">Weaknesses:</p>
                            <ul className="list-disc list-inside text-muted-foreground">
                              {competitor.weaknesses?.map((w: string, i: number) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <p className="text-sm mt-2"><strong>Pricing:</strong> {competitor.pricing}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Opportunities */}
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Market Opportunities
                    </h4>
                    <div className="grid gap-2">
                      {insights.market.opportunities?.map((opp: any, idx: number) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">{opp.title}</span>
                            <div className="flex gap-1">
                              <Badge variant={opp.difficulty === 'easy' ? 'default' : opp.difficulty === 'medium' ? 'secondary' : 'destructive'}>
                                {opp.difficulty}
                              </Badge>
                              <Badge variant="outline">{opp.timeframe}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{opp.description}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium">Impact:</span>
                            <Badge variant={opp.expectedImpact === 'high' ? 'default' : 'secondary'}>
                              {opp.expectedImpact}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click to load detailed market insights...
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Social Media Intelligence */}
      <Collapsible open={expandedSections.social} onOpenChange={() => toggleSection('social')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Social Media Trends</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {loadingInsights.social && <Loader2 className="w-4 h-4 animate-spin" />}
                  {expandedSections.social ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
              <CardDescription>
                Viral potential, trending hashtags, and community sentiment
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {insights.social ? (
                <>
                  {/* Platform Analysis */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(insights.social.platforms || {}).map(([platform, data]: [string, any]) => (
                      <div key={platform} className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2 capitalize flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          {platform}
                        </h4>
                        <div className="space-y-2 text-sm">
                          {platform === 'tiktok' && (
                            <>
                              <p><strong>Trending:</strong> <Badge variant={data.trending ? 'default' : 'secondary'}>{data.trending ? 'Yes' : 'No'}</Badge></p>
                              <p><strong>Views Est:</strong> {data.viewsEstimate}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {data.hashtags?.map((tag: string, i: number) => (
                                  <Badge key={i} variant="outline">#{tag}</Badge>
                                ))}
                              </div>
                            </>
                          )}
                          {platform === 'reddit' && (
                            <>
                              <p><strong>Sentiment:</strong> <Badge variant={data.sentiment === 'positive' ? 'default' : 'secondary'}>{data.sentiment}</Badge></p>
                              <p className="font-medium">Communities:</p>
                              <div className="flex flex-wrap gap-1">
                                {data.communities?.map((sub: string, i: number) => (
                                  <Badge key={i} variant="outline">r/{sub}</Badge>
                                ))}
                              </div>
                              <p className="font-medium mt-2">Pain Points:</p>
                              <ul className="list-disc list-inside text-muted-foreground">
                                {data.painPoints?.map((pain: string, i: number) => (
                                  <li key={i}>{pain}</li>
                                ))}
                              </ul>
                            </>
                          )}
                          {platform === 'linkedin' && (
                            <>
                              <p><strong>B2B Potential:</strong> <Badge>{data.b2bPotential}</Badge></p>
                              <p className="font-medium">Decision Makers:</p>
                              <div className="flex flex-wrap gap-1">
                                {data.decisionMakers?.map((title: string, i: number) => (
                                  <Badge key={i} variant="secondary">{title}</Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Viral Potential */}
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Viral Potential Score: {insights.social.viralPotential?.score}/10
                    </h4>
                    <Progress value={(insights.social.viralPotential?.score || 0) * 10} className="mb-3" />
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium">Why it could go viral:</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {insights.social.viralPotential?.reasons?.map((reason: string, i: number) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Content Ideas:</p>
                        <div className="grid gap-1 mt-1">
                          {insights.social.viralPotential?.contentIdeas?.map((idea: string, i: number) => (
                            <Badge key={i} variant="outline" className="justify-start">
                              💡 {idea}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click to load social media insights...
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Customer Intelligence */}
      <Collapsible open={expandedSections.customers} onOpenChange={() => toggleSection('customers')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Customer Deep Dive</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {loadingInsights.customers && <Loader2 className="w-4 h-4 animate-spin" />}
                  {expandedSections.customers ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
              <CardDescription>
                Detailed personas, journey mapping, and buying behavior
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {insights.customers ? (
                <>
                  {/* Customer Segments */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Target Segments</h4>
                    {insights.customers.segments?.map((segment: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-lg">{segment.name}</span>
                          <Badge>{segment.size}</Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <p className="font-medium text-sm mb-1">Demographics</p>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>📅 Age: {segment.demographics?.age}</p>
                              <p>💰 Income: {segment.demographics?.income}</p>
                              <p>📍 Location: {segment.demographics?.location}</p>
                              <p>🎓 Education: {segment.demographics?.education}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-medium text-sm mb-1">Psychographics</p>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p><strong>Values:</strong> {segment.psychographics?.values?.join(', ')}</p>
                              <p><strong>Interests:</strong> {segment.psychographics?.interests?.join(', ')}</p>
                              <p><strong>Pain Points:</strong></p>
                              <ul className="list-disc list-inside ml-2">
                                {segment.psychographics?.painPoints?.map((pain: string, i: number) => (
                                  <li key={i}>{pain}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 p-3 bg-muted/50 rounded">
                          <p className="text-sm">
                            <strong>Willingness to Pay:</strong> {segment.willingness?.toPay} | 
                            <strong> Switch:</strong> {segment.willingness?.toSwitch} | 
                            <strong> Adoption:</strong> {segment.willingness?.adoptionSpeed}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Personas */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Customer Personas</h4>
                    {insights.customers.personas?.map((persona: any, idx: number) => (
                      <div key={idx} className="p-4 bg-primary/5 rounded-lg">
                        <h5 className="font-medium mb-2">{persona.name}</h5>
                        <blockquote className="italic text-muted-foreground mb-2">
                          "{persona.quote}"
                        </blockquote>
                        <p className="text-sm mb-2">{persona.story}</p>
                        <div className="flex flex-wrap gap-2">
                          <div>
                            <span className="text-xs font-medium">Channels: </span>
                            {persona.channels?.map((channel: string, i: number) => (
                              <Badge key={i} variant="outline" className="ml-1">{channel}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-medium">Common Objections: </span>
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            {persona.objections?.map((obj: string, i: number) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Customer Journey */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">Customer Journey</h4>
                    <div className="grid md:grid-cols-4 gap-3">
                      {Object.entries(insights.customers.journey || {}).map(([stage, touchpoints]: [string, any]) => (
                        <div key={stage}>
                          <p className="font-medium text-sm capitalize mb-1">{stage}</p>
                          <div className="space-y-1">
                            {touchpoints?.map((point: string, i: number) => (
                              <Badge key={i} variant="secondary" className="w-full justify-start text-xs">
                                {point}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click to load customer insights...
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Comprehensive Improvements */}
      <Collapsible open={expandedSections.improvements} onOpenChange={() => toggleSection('improvements')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Action Plan & Improvements</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {loadingInsights.improvements && <Loader2 className="w-4 h-4 animate-spin" />}
                  {expandedSections.improvements ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
              <CardDescription>
                Step-by-step improvements and experiments to run
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {insights.improvements ? (
                <Tabs defaultValue="immediate" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="immediate">Today</TabsTrigger>
                    <TabsTrigger value="shortTerm">This Month</TabsTrigger>
                    <TabsTrigger value="longTerm">This Year</TabsTrigger>
                    <TabsTrigger value="experiments">Test Ideas</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="immediate" className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Do These Today (Free & Fast)
                    </h4>
                    {insights.improvements.immediate?.map((action: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{action.action}</span>
                          <div className="flex gap-1">
                            <Badge variant="outline">{action.cost}</Badge>
                            <Badge variant="outline">{action.time}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Why:</strong> {action.why}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">How to do it:</p>
                          <ol className="list-decimal list-inside text-sm text-muted-foreground">
                            {action.how?.map((step: string, i: number) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div className="mt-2 p-2 bg-success/10 rounded">
                          <p className="text-xs">
                            <strong>Expected Impact:</strong> {action.impact}
                          </p>
                          <p className="text-xs">
                            <strong>Measure:</strong> {action.metrics?.join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="shortTerm" className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      1-3 Month Goals
                    </h4>
                    {insights.improvements.shortTerm?.map((action: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{action.action}</span>
                          <div className="flex gap-1">
                            <Badge variant="outline">{action.cost}</Badge>
                            <Badge variant="outline">{action.time}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Why:</strong> {action.why}
                        </p>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm font-medium mb-1">Steps:</p>
                            <ol className="list-decimal list-inside text-sm text-muted-foreground">
                              {action.how?.map((step: string, i: number) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Tools Needed:</p>
                            <div className="flex flex-wrap gap-1">
                              {action.tools?.map((tool: string, i: number) => (
                                <Badge key={i} variant="secondary">{tool}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="longTerm" className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Strategic Initiatives
                    </h4>
                    {insights.improvements.longTerm?.map((action: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{action.action}</span>
                          <Badge>{action.investment}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Strategic Reason:</strong> {action.why}
                        </p>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm font-medium mb-1">Milestones:</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {action.milestones?.map((milestone: string, i: number) => (
                                <li key={i}>{milestone}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Risks & Mitigations:</p>
                            <div className="space-y-1">
                              {action.risks?.map((risk: string, i: number) => (
                                <div key={i} className="text-sm">
                                  <span className="text-destructive">⚠️ {risk}</span>
                                  <span className="text-muted-foreground"> → {action.mitigations?.[i]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-primary/10 rounded">
                          <p className="text-xs">
                            <strong>Expected ROI:</strong> {action.roi}
                          </p>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="experiments" className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Low-Risk Experiments to Run
                    </h4>
                    {insights.improvements.experiments?.map((exp: any, idx: number) => (
                      <div key={idx} className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
                        <h5 className="font-medium mb-2">Hypothesis:</h5>
                        <p className="text-sm italic mb-3">"{exp.hypothesis}"</p>
                        
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm font-medium mb-1">How to Test:</p>
                            <p className="text-sm text-muted-foreground">{exp.test}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Success Looks Like:</p>
                            <p className="text-sm text-muted-foreground">{exp.successCriteria}</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between mt-3 pt-3 border-t">
                          <Badge variant="outline">Duration: {exp.duration}</Badge>
                          <Badge variant="outline">Budget: {exp.budget}</Badge>
                        </div>
                        
                        <div className="mt-2 p-2 bg-primary/5 rounded">
                          <p className="text-xs">
                            <strong>What You'll Learn:</strong> {exp.learnings}
                          </p>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click to generate your personalized action plan...
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Validation Strategies */}
      <Collapsible open={expandedSections.validation} onOpenChange={() => toggleSection('validation')}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Validation Playbook</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {loadingInsights.validation && <Loader2 className="w-4 h-4 animate-spin" />}
                  {expandedSections.validation ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
              <CardDescription>
                Test assumptions, MVP options, and success metrics
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {insights.validation ? (
                <>
                  {/* Assumptions to Test */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">Critical Assumptions to Test</h4>
                    {insights.validation.assumptions?.map((assumption: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm">{assumption.assumption}</span>
                          <Badge variant={assumption.risk === 'high' ? 'destructive' : assumption.risk === 'medium' ? 'secondary' : 'secondary'}>
                            {assumption.risk} risk
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-3 gap-2 text-xs">
                          <div>
                            <strong>Test:</strong> {assumption.testMethod}
                          </div>
                          <div>
                            <strong>Cost:</strong> {assumption.cost}
                          </div>
                          <div>
                            <strong>Time:</strong> {assumption.timeline}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* MVP Options */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">MVP Options</h4>
                    {insights.validation.mvpOptions?.map((mvp: any, idx: number) => (
                      <div key={idx} className="p-4 bg-primary/5 rounded-lg">
                        <h5 className="font-medium mb-1">{mvp.type}</h5>
                        <p className="text-sm text-muted-foreground mb-2">{mvp.description}</p>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium">Build Time: {mvp.buildTime}</p>
                            <p className="text-xs font-medium">Cost: {mvp.cost}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium">You'll Learn:</p>
                            <ul className="list-disc list-inside text-xs text-muted-foreground">
                              {mvp.learnings?.map((learning: string, i: number) => (
                                <li key={i}>{learning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Success Metrics */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">Success Metrics</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Leading Indicators:</p>
                        <div className="space-y-1">
                          {insights.validation.metrics?.leading?.map((metric: string, i: number) => (
                            <Badge key={i} variant="outline" className="w-full justify-start">
                              📊 {metric}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Lagging Indicators:</p>
                        <div className="space-y-1">
                          {insights.validation.metrics?.lagging?.map((metric: string, i: number) => (
                            <Badge key={i} variant="outline" className="w-full justify-start">
                              📈 {metric}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-success/10 rounded">
                      <p className="text-sm font-medium">🎯 North Star Metric: {insights.validation.metrics?.northStar}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Click to load validation strategies...
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}