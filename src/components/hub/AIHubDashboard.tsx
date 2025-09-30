import { useState, useEffect } from 'react';
import { 
  generateAIInsights, 
  generateCompetitiveStrategy,
  generateMarketEntryStrategy,
  analyzeUserPatterns,
  generatePredictiveMetrics,
  generateActionItems
} from '@/lib/ai-insights-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, Sparkles, Target, TrendingUp, AlertCircle, 
  Lightbulb, Zap, BarChart3, Users, Shield, Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIHubDashboardProps {
  idea: string;
  marketData?: any;
  competitorData?: any;
  sessionData?: any[];
}

export function AIHubDashboard({ idea, marketData, competitorData, sessionData }: AIHubDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('strategy');
  const [insights, setInsights] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [patterns, setPatterns] = useState<any>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!idea) return;
    fetchAIData();
  }, [idea]);

  const fetchAIData = async () => {
    setLoading(true);
    try {
      // Fetch multiple AI insights in parallel
      const [competitiveStrat, marketEntry, userPatterns, predictive, actions] = await Promise.all([
        generateCompetitiveStrategy(idea, competitorData?.competitors || [], marketData || {}),
        generateMarketEntryStrategy(idea, marketData || {}, { budget: 50000, team: 3, timeline: '6 months' }),
        sessionData ? analyzeUserPatterns(sessionData, idea) : null,
        generatePredictiveMetrics(marketData || {}, '6months'),
        generateActionItems(idea, marketData || {}, ['growth', 'validation', 'launch'])
      ]);

      setStrategy(competitiveStrat);
      setInsights(marketEntry);
      setPatterns(userPatterns);
      setPredictions(predictive);
      setActionItems(actions || []);
    } catch (error) {
      console.error('Error fetching AI data:', error);
      toast({
        title: 'AI Analysis',
        description: 'Some AI features are temporarily unavailable',
        variant: 'default'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Brain className="h-10 w-10 animate-pulse text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">AI is analyzing your data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Business Intelligence
          </h2>
          <p className="text-muted-foreground">Powered by advanced AI analysis</p>
        </div>
        <Button onClick={fetchAIData} variant="outline" size="sm">
          <Brain className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="space-y-4">
          {strategy && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Competitive Positioning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{strategy.positioning}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Key Differentiators:</p>
                    {strategy.differentiators?.map((diff: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-primary" />
                        <span className="text-xs">{diff}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Risk Mitigation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {strategy.risks?.map((risk: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5" />
                        <span className="text-xs">{risk}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {insights && insights.phases && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Market Entry Roadmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.phases.map((phase: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-primary pl-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{phase.phase}</p>
                        <Badge variant="outline">{phase.duration}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {phase.goals.join(' • ')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          {predictions && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Revenue Projection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ${(predictions.revenue?.projected / 1000).toFixed(0)}k
                    </p>
                    <Progress value={predictions.revenue?.confidence || 0} className="mt-2 h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {predictions.revenue?.confidence}% confidence
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">User Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {predictions.users?.projected.toLocaleString()}
                    </p>
                    <Progress value={predictions.users?.confidence || 0} className="mt-2 h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {predictions.users?.confidence}% confidence
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Churn Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {predictions.churn?.projected}%
                    </p>
                    <Progress value={100 - (predictions.churn?.projected || 0)} className="mt-2 h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: &lt;10%
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Growth Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {predictions.suggestions?.map((suggestion: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-sm">{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {patterns && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    User Behavior Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {patterns.patterns?.map((pattern: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <BarChart3 className="h-3 w-3 text-primary mt-0.5" />
                        <span className="text-sm">{pattern}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {patterns.insights?.map((insight: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">• {insight}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {patterns.opportunities?.map((opp: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">• {opp}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="space-y-3">
            {actionItems.map((item, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        <p className="font-medium">{item.action}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.impact}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant={
                          item.priority === 'high' ? 'destructive' : 
                          item.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {item.priority} priority
                        </Badge>
                        <span className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.timeframe}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.resources && item.resources.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Resources needed: {item.resources.join(', ')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}