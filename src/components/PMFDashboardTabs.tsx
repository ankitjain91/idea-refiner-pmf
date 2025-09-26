import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Brain,
  Lightbulb,
  Zap,
  Building,
  Globe,
  BarChart,
  Info,
  Loader2,
  RefreshCw,
  ChevronRight,
  Shield,
  Clock,
  Award,
  TrendingDown,
  UserCheck,
  Briefcase,
  MapPin,
  Heart,
  Frown,
  Quote,
  Search,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  ShoppingBag,
  CreditCard,
  Rocket
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PMFDashboardTabsProps {
  idea: string;
  refinements: any;
  metadata?: any;
  userAnswers?: Record<string, string>;
  onScoreUpdate: (score: number) => void;
}

export default function PMFDashboardTabs({ 
  idea, 
  refinements, 
  metadata, 
  userAnswers = {},
  onScoreUpdate 
}: PMFDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('market');
  const [insights, setInsights] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const categories = [
    { id: 'market', label: 'Market', icon: Globe, key: 'market_analysis' },
    { id: 'customers', label: 'Customers', icon: Users, key: 'customer_insights' },
    { id: 'pain', label: 'Pain Points', icon: AlertCircle, key: 'pain_points' },
    { id: 'monetization', label: 'Revenue', icon: DollarSign, key: 'monetization' },
    { id: 'competition', label: 'Competition', icon: Shield, key: 'competitive_analysis' },
    { id: 'growth', label: 'Growth', icon: Rocket, key: 'growth_strategy' }
  ];

  const fetchInsights = async (category: string, forceRefresh = false) => {
    if ((insights[category] && !forceRefresh) || loading[category]) return;

    setLoading(prev => ({ ...prev, [category]: true }));
    setError(prev => ({ ...prev, [category]: '' }));

    try {
      const response = await supabase.functions.invoke('dashboard-insights', {
        body: { idea, category }
      });

      if (response.error) throw response.error;
      
      setInsights(prev => ({ ...prev, [category]: response.data.insights }));
    } catch (err) {
      console.error(`Error fetching ${category} insights:`, err);
      setError(prev => ({ ...prev, [category]: 'Failed to load insights. Please try again.' }));
      toast({
        title: "Error",
        description: `Failed to load ${category.replace('_', ' ')} insights`,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, [category]: false }));
    }
  };

  useEffect(() => {
    const activeCategory = categories.find(c => c.id === activeTab)?.key;
    if (activeCategory) {
      fetchInsights(activeCategory);
    }
  }, [activeTab, idea]);

  const renderLoadingState = (message: string) => (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  const renderErrorState = (errorMsg: string, category: string) => (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{errorMsg}</AlertDescription>
      </Alert>
      <Button onClick={() => fetchInsights(category, true)} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );

  const renderMarketAnalysis = () => {
    const data = insights.market_analysis;
    const isLoading = loading.market_analysis;

    if (isLoading) return renderLoadingState("Analyzing market data...");
    if (error.market_analysis) return renderErrorState(error.market_analysis, 'market_analysis');
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* Market Overview */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Market Overview
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Real-time market analysis based on current industry data and trends</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Market Size</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {data.marketSize?.total || 'N/A'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{data.marketSize?.growth || 'N/A'} CAGR</span>
                  </div>
                </div>
              </div>
              {data.marketSize?.segments && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Key Market Segments</p>
                  {data.marketSize.segments.slice(0, 3).map((segment: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-sm font-medium">{segment.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{segment.size}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {segment.growth} growth
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Competitors */}
        {data.competitors && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Competitive Landscape
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.competitors.slice(0, 3).map((comp: any, i: number) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">{comp.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-muted-foreground">
                            Market Share: <span className="font-semibold text-foreground">{comp.marketShare}</span>
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Valuation: <span className="font-semibold text-foreground">{comp.valuation}</span>
                          </span>
                        </div>
                      </div>
                      <Badge variant={i === 0 ? 'destructive' : 'secondary'}>
                        {i === 0 ? 'Market Leader' : `Rank #${i + 1}`}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-3 mt-3">
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Strengths</p>
                        <div className="flex flex-wrap gap-1">
                          {comp.strengths?.map((strength: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs border-green-200">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Weaknesses</p>
                        <div className="flex flex-wrap gap-1">
                          {comp.weaknesses?.map((weakness: string, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs border-red-200">
                              {weakness}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {comp.recentNews && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Recent News</p>
                          <p className="text-xs">{comp.recentNews}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Market Trends */}
        {data.trends && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Market Trends & Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.trends.map((trend: any, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Badge 
                        variant={trend.impact === 'high' ? 'destructive' : trend.impact === 'medium' ? 'default' : 'secondary'}
                        className="mt-0.5"
                      >
                        {trend.impact} impact
                      </Badge>
                      <div className="flex-1 space-y-2">
                        <p className="font-semibold">{trend.trend}</p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Timeline: {trend.timeline}
                        </p>
                        <div className="p-2 bg-primary/5 rounded">
                          <p className="text-sm">
                            <Lightbulb className="h-3 w-3 inline mr-1 text-yellow-500" />
                            <span className="font-medium">Opportunity:</span> {trend.opportunity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderCustomerInsights = () => {
    const data = insights.customer_insights;
    const isLoading = loading.customer_insights;

    if (isLoading) return renderLoadingState("Analyzing customer segments...");
    if (error.customer_insights) return renderErrorState(error.customer_insights, 'customer_insights');
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* Customer Segments */}
        {data.segments && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Target Customer Segments
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>AI-identified customer segments based on market research and behavior patterns</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent>
              {data.segments.map((segment: any, i: number) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="mb-6 last:mb-0 p-4 border rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">{segment.name}</h4>
                    <Badge variant="default" className="text-sm">
                      {segment.size}
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <p className="text-sm font-semibold flex items-center gap-1 mb-2">
                          <UserCheck className="h-4 w-4 text-blue-600" /> Demographics
                        </p>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Age:</span> {segment.demographics?.age}</p>
                          <p><span className="font-medium">Income:</span> {segment.demographics?.income}</p>
                          <p><span className="font-medium">Location:</span> {segment.demographics?.location}</p>
                          <p><span className="font-medium">Occupation:</span> {segment.demographics?.occupation}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <p className="text-sm font-semibold flex items-center gap-1 mb-2">
                          <Heart className="h-4 w-4 text-purple-600" /> Psychographics
                        </p>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Values:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {segment.psychographics?.values?.map((value: string, j: number) => (
                                <Badge key={j} variant="secondary" className="text-xs">
                                  {value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Goals:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {segment.psychographics?.goals?.map((goal: string, j: number) => (
                                <Badge key={j} variant="secondary" className="text-xs">
                                  {goal}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <p className="text-sm font-semibold flex items-center gap-1 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-600" /> Pain Points & Frustrations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {segment.psychographics?.painPoints?.map((pain: string, j: number) => (
                        <Badge key={j} variant="destructive" className="text-xs">
                          {pain}
                        </Badge>
                      ))}
                      {segment.psychographics?.frustrations?.map((frustration: string, j: number) => (
                        <Badge key={j} variant="outline" className="text-xs border-red-200">
                          {frustration}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-sm font-semibold flex items-center gap-1 mb-2">
                      <ShoppingBag className="h-4 w-4 text-green-600" /> Buying Behavior
                    </p>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Decision Process:</span> {segment.behavior?.buyingProcess}</p>
                      <p><span className="font-medium">Price Range:</span> <Badge variant="outline">{segment.behavior?.priceWillingness}</Badge></p>
                      <div>
                        <span className="font-medium">Channels:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {segment.behavior?.channels?.map((channel: string, j: number) => (
                            <Badge key={j} variant="secondary" className="text-xs">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* User Personas */}
        {data.personas && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                User Personas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.personas.map((persona: any, i: number) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className="border rounded-lg p-5 mb-4 last:mb-0 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold">{persona.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {persona.age} years old • {persona.job}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        Tech: {persona.techSavvy}/10
                      </Badge>
                      <Badge variant="secondary">
                        Budget: {persona.budget}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                      <Quote className="h-4 w-4 text-primary mb-2" />
                      <p className="italic">"{persona.quote}"</p>
                    </div>
                    
                    <div className="p-3 bg-background rounded-lg border">
                      <p className="text-sm leading-relaxed">{persona.story}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Key Insights */}
        {data.insights && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Key Customer Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.insights.map((insight: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{insight.insight}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant={insight.confidence === 'high' ? 'default' : 'secondary'} className="text-xs">
                            {insight.confidence} confidence
                          </Badge>
                          <span className="text-xs text-muted-foreground">Source: {insight.source}</span>
                        </div>
                        <div className="mt-2 p-2 bg-primary/5 rounded">
                          <p className="text-sm">
                            <ArrowRight className="h-3 w-3 inline mr-1" />
                            <span className="font-medium">Action:</span> {insight.actionable}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderPainPoints = () => {
    const data = insights.pain_points;
    const isLoading = loading.pain_points;

    if (isLoading) return renderLoadingState("Analyzing pain points...");
    if (error.pain_points) return renderErrorState(error.pain_points, 'pain_points');
    if (!data) return null;

    return (
      <div className="space-y-6">
        {data.painPoints && data.painPoints.map((pain: any, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
          >
            <Card className={cn(
              "border-l-4",
              pain.severity >= 8 ? "border-l-red-500" : 
              pain.severity >= 5 ? "border-l-yellow-500" : 
              "border-l-blue-500"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    {pain.problem}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={pain.severity >= 8 ? 'destructive' : pain.severity >= 5 ? 'default' : 'secondary'}>
                      Severity: {pain.severity}/10
                    </Badge>
                    <Badge variant="outline">{pain.frequency}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Solutions */}
                {pain.currentSolutions && (
                  <div>
                    <p className="text-sm font-semibold mb-3">Current Solutions & Their Limitations</p>
                    <div className="space-y-2">
                      {pain.currentSolutions.map((sol: any, j: number) => (
                        <div key={j} className="p-3 bg-muted/50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{sol.solution}</span>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                Cost: {sol.cost}
                              </Badge>
                              <Badge 
                                variant={sol.satisfaction <= 3 ? 'destructive' : sol.satisfaction <= 6 ? 'secondary' : 'default'}
                                className="text-xs"
                              >
                                Satisfaction: {sol.satisfaction}/10
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {sol.limitations?.map((limit: string, k: number) => (
                              <Badge key={k} variant="outline" className="text-xs">
                                {limit}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consequences */}
                {pain.consequences && (
                  <div>
                    <p className="text-sm font-semibold mb-3">Impact If Not Solved</p>
                    <div className="space-y-2">
                      {pain.consequences.map((cons: any, j: number) => (
                        <div key={j} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                          <Badge 
                            variant={cons.likelihood === 'high' ? 'destructive' : 'secondary'} 
                            className="mt-0.5"
                          >
                            {cons.likelihood}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{cons.consequence}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Cost/Impact:</span> {cons.cost}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Quotes */}
                {pain.quotes && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">What Users Say</p>
                    {pain.quotes.map((quote: string, j: number) => (
                      <div key={j} className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
                        <Quote className="h-4 w-4 text-primary mb-1" />
                        <p className="text-sm italic">"{quote}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Root Causes Analysis */}
        {data.rootCauses && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Root Cause Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.rootCauses.map((cause: any, i: number) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{cause.cause}</h4>
                      <Badge variant={
                        cause.solvability === 'easy' ? 'default' : 
                        cause.solvability === 'medium' ? 'secondary' : 
                        'destructive'
                      }>
                        {cause.solvability} to solve
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{cause.explanation}</p>
                    <div className="p-2 bg-primary/5 rounded">
                      <p className="text-sm">
                        <Lightbulb className="h-3 w-3 inline mr-1 text-yellow-500" />
                        <span className="font-medium">Approach:</span> {cause.approach}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderMonetization = () => {
    const data = insights.monetization;
    const isLoading = loading.monetization;

    if (isLoading) return renderLoadingState("Calculating revenue strategies...");
    if (error.monetization) return renderErrorState(error.monetization, 'monetization');
    if (!data) return null;

    return (
      <div className="space-y-6">
        {/* Pricing Models */}
        {data.pricingModels && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Recommended Pricing Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.pricingModels.map((model: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="border rounded-lg p-5 mb-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold">{model.model}</h4>
                      <p className="text-3xl font-bold text-primary mt-1">{model.price}</p>
                    </div>
                    {i === 0 && <Badge variant="default" className="text-sm">Recommended</Badge>}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">{model.justification}</p>
                  
                  {/* Competitor Comparison */}
                  {model.competitors && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold mb-2">Market Comparison</p>
                      <div className="space-y-2">
                        {model.competitors.map((comp: any, j: number) => (
                          <div key={j} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <span className="text-sm font-medium">{comp.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{comp.price}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {comp.features?.length} features
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Revenue Projections */}
                  {model.projectedRevenue && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-primary/5 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Month 1</p>
                        <p className="font-bold text-lg">{model.projectedRevenue.month1}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Month 6</p>
                        <p className="font-bold text-lg">{model.projectedRevenue.month6}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Year 1</p>
                        <p className="font-bold text-lg">{model.projectedRevenue.year1}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Unit Economics */}
        {data.unitEconomics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                Unit Economics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Customer Acquisition Cost</p>
                    <p className="text-3xl font-bold">{data.unitEconomics.cac}</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <p className="text-sm text-muted-foreground mb-1">Lifetime Value</p>
                    <p className="text-3xl font-bold text-green-600">{data.unitEconomics.ltv}</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Payback Period</p>
                    <p className="text-3xl font-bold">{data.unitEconomics.paybackPeriod}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Gross Margin</p>
                    <p className="text-3xl font-bold">{data.unitEconomics.grossMargin}</p>
                  </div>
                </motion.div>
              </div>
              
              <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Break-even Point</p>
                    <p className="text-2xl font-bold mt-1">{data.unitEconomics.breakeven}</p>
                    <p className="text-xs text-muted-foreground">customers needed</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue Streams */}
        {data.revenueStreams && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue Streams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.revenueStreams.map((stream: any, i: number) => (
                  <div key={i} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{stream.stream}</h4>
                      <div className="flex gap-2">
                        <Badge variant="default">{stream.percentage} of revenue</Badge>
                        <Badge variant="outline">{stream.growth} growth</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{stream.implementation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderCompetition = () => {
    const data = insights.competitive_analysis;
    const isLoading = loading.competitive_analysis;

    if (isLoading) return renderLoadingState("Analyzing competitors...");
    if (error.competitive_analysis) return renderErrorState(error.competitive_analysis, 'competitive_analysis');
    if (!data) return <div className="flex items-center justify-center h-64">
      <Button onClick={() => fetchInsights('competitive_analysis')}>
        Load Competitive Analysis
      </Button>
    </div>;

    return (
      <div className="space-y-6">
        {/* Add competitive analysis rendering here */}
        <Card>
          <CardHeader>
            <CardTitle>Competitive Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Competitive analysis content will be displayed here</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGrowth = () => {
    const data = insights.growth_strategy;
    const isLoading = loading.growth_strategy;

    if (isLoading) return renderLoadingState("Building growth strategy...");
    if (error.growth_strategy) return renderErrorState(error.growth_strategy, 'growth_strategy');
    if (!data) return <div className="flex items-center justify-center h-64">
      <Button onClick={() => fetchInsights('growth_strategy')}>
        Load Growth Strategy
      </Button>
    </div>;

    return (
      <div className="space-y-6">
        {/* Add growth strategy rendering here */}
        <Card>
          <CardHeader>
            <CardTitle>Growth Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Growth strategy content will be displayed here</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          {categories.map(cat => (
            <TabsTrigger 
              key={cat.id} 
              value={cat.id} 
              className="flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <cat.icon className="h-4 w-4" />
              <span className="hidden md:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'market' && renderMarketAnalysis()}
              {activeTab === 'customers' && renderCustomerInsights()}
              {activeTab === 'pain' && renderPainPoints()}
              {activeTab === 'monetization' && renderMonetization()}
              {activeTab === 'competition' && renderCompetition()}
              {activeTab === 'growth' && renderGrowth()}
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}