import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, AlertCircle, ChevronUp, ChevronDown, CheckCircle, XCircle, BarChart, PieChart, Activity, MessageSquare, GitBranch, CircleDollarSign, Sparkles, Lock, Crown } from "lucide-react";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PMFDashboardProps {
  idea: string;
  refinements: any;
  metadata?: any; // ChatGPT analysis data
  onScoreUpdate: (score: number) => void;
}

interface Metrics {
  pmfScore: number;
  pmfExplanation: string;
  marketSize: string;
  marketGrowth: string;
  marketExplanation: string;
  competitors: Array<{ name: string; strength: string }>;
  competitorsExplanation: string;
  targetCustomers: Array<{ segment: string; size: string; painPoint: string }>;
  targetCustomersExplanation: string;
  keyMetrics: Array<{ label: string; value: string; trend: 'up' | 'down' | 'neutral'; icon: any }>;
}

export default function PMFDashboard({ idea, refinements, metadata, onScoreUpdate }: PMFDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Generate metrics based on ChatGPT data or fall back to mock data
  const generateMetrics = (): Metrics => {
    // If we have ChatGPT analysis data, use it
    if (metadata?.pmfScore) {
      const score = metadata.pmfScore;
      
      return {
        pmfScore: score,
        pmfExplanation: "We analyzed how much people need this, who else is doing it, and if you can make money from it",
        marketSize: metadata.marketSize || "$2.5 billion",
        marketGrowth: "Growing 15% each year",
        marketExplanation: "More and more people are looking for something like this",
        competitors: [
          { name: "Similar App A", strength: metadata.competition || "Some competition" },
          { name: "Similar App B", strength: "Not much competition" }
        ],
        competitorsExplanation: `How many others are doing this: ${metadata.competition || "A few"}`,
        targetCustomers: [
          { segment: metadata.targetAge || "People aged 25-45", size: "Lots of people", painPoint: "Want things to be easier" }
        ],
        targetCustomersExplanation: `Best for: ${metadata.targetAge || "People aged 25-45"} who make ${metadata.incomeRange || "$60k-100k a year"}`,
        keyMetrics: [
          { label: "Ready to Launch", value: `${score}%`, trend: 'up' as const, icon: TrendingUp },
          { label: "Competition Level", value: metadata.competition || "Some", trend: 'neutral' as const, icon: Target },
          { label: "Who Will Use It", value: metadata.targetAge || "Ages 25-45", trend: 'up' as const, icon: Users },
          { label: "Money You Can Make", value: metadata.incomeRange || "$60k+", trend: 'up' as const, icon: CircleDollarSign }
        ]
      };
    }
    
    // Fallback to mock data
    const baseScore = 45;
    let score = baseScore;
    
    if (refinements.budget === 'funded') score += 10;
    if (refinements.market === 'enterprise') score += 15;
    if (refinements.timeline === 'mvp') score += 10;
    
    score = Math.min(95, score + Math.floor(Math.random() * 20));
    
    return {
      pmfScore: score,
      pmfExplanation: `Here's what we found: People ${refinements.market === 'enterprise' ? 'at big companies' : refinements.market === 'mass' ? 'everywhere' : 'in specific groups'} are looking for this. Your ${refinements.budget === 'funded' ? 'money situation' : 'budget'} works well with your ${refinements.timeline === 'mvp' ? 'quick start plan' : 'timeline'}. What's good: People understand what you're offering and it solves real problems. To get better: Make sure you're different from others and test if people will pay your price.`,
      marketSize: refinements.market === 'enterprise' ? '$12.5 billion' : refinements.market === 'mass' ? '$45.2 billion' : '$3.8 billion',
      marketGrowth: 'Getting 23% bigger each year',
      marketExplanation: `The ${refinements.market === 'enterprise' ? 'business' : refinements.market === 'mass' ? 'everyone' : 'specific'} market is growing fast because everyone's going digital. We found ${refinements.market === 'enterprise' ? 'over 50,000 companies' : 'over 2.5 million people'} who might want this. It's a good time to start because more people are ready to try new things.`,
      competitors: [
        { name: 'Big Player', strength: 'Doing really well' },
        { name: 'Medium Player', strength: 'Doing okay' },
        { name: 'New Player', strength: 'Just starting' }
      ],
      competitorsExplanation: `There are 3 main companies doing something similar - together they have most of the customers. The biggest one has lots of features but isn't easy to use. You can win by being ${refinements.timeline === 'mvp' ? 'faster to launch' : 'more complete'} and easier to use.`,
      targetCustomers: [
        { segment: 'People who try new things', size: '15% of users', painPoint: 'Want the latest stuff' },
        { segment: 'Regular people', size: '68% of users', painPoint: 'Want to know it works' },
        { segment: 'Careful buyers', size: '17% of users', painPoint: 'Need to be sure it\'s safe' }
      ],
      targetCustomersExplanation: `We grouped your future customers by how they buy things. The adventurous ones (15%) will try it first and tell you what to fix. Most people (68%) will buy once others say it's good. Start with the adventurous ones to prove it works.`,
      keyMetrics: [
        { label: 'Money Back Time', value: '6 months', trend: 'up', icon: CircleDollarSign },
        { label: 'Your Share', value: '2.3%', trend: 'up', icon: PieChart },
        { label: 'Growing Speed', value: '15% per month', trend: 'up', icon: BarChart },
        { label: 'People Leaving', value: '5%', trend: 'down', icon: Activity }
      ]
    };
  };

  const metrics = generateMetrics();

  return (
    <div className="space-y-6">
        {/* PMF Score Card */}
        <div>
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-primary text-white">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  How Good Is Your Idea?
                </span>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  AI Rating
                </Badge>
              </CardTitle>
              <CardDescription className="text-white/80">
                A simple score showing if people will love what you're building
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="text-3xl font-bold mb-2">{metrics.pmfScore}%</div>
              <Progress value={metrics.pmfScore} className="mb-3" />
              <Collapsible open={expandedSections.pmf} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, pmf: open }))}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow group"
                  >
                    <Crown className="w-4 h-4 mr-2 text-yellow-300" />
                    <span className="font-semibold">AI Analysis</span>
                    <Sparkles className="w-4 h-4 ml-1 text-yellow-300" />
                    {expandedSections.pmf ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 bg-gradient-subtle p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {metrics.pmfExplanation}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Market Analysis */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  How Big Is The Opportunity?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="text-2xl font-bold mb-2">{metrics.marketSize}</div>
                <Badge variant={metrics.marketGrowth.includes("Getting") ? "default" : "secondary"} className="mb-3">
                  {metrics.marketGrowth}
                </Badge>
                <Collapsible open={expandedSections.market} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, market: open }))}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow group"
                    >
                      <Crown className="w-4 h-4 mr-2 text-yellow-300" />
                      <span className="font-semibold">AI Insights</span>
                      <Sparkles className="w-4 h-4 ml-1 text-yellow-300" />
                      {expandedSections.market ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 bg-gradient-subtle p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {metrics.marketExplanation}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>

          {/* Competitive Landscape */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" />
                  Who Else Is Doing This?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="space-y-3">
                  {metrics.competitors.map((competitor, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{competitor.name}</span>
                      <Badge variant="outline">{competitor.strength}</Badge>
                    </div>
                  ))}
                </div>
                <Collapsible open={expandedSections.competitors} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, competitors: open }))}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow group"
                    >
                      <Crown className="w-4 h-4 mr-2 text-yellow-300" />
                      <span className="font-semibold">AI Research</span>
                      <Sparkles className="w-4 h-4 ml-1 text-yellow-300" />
                      {expandedSections.competitors ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 bg-gradient-subtle p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {metrics.competitorsExplanation}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>

          {/* Target Customers */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-success" />
                  Who Will Use This?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="space-y-3">
                  {metrics.targetCustomers.map((segment, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{segment.segment}</span>
                        <Badge>{segment.size}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{segment.painPoint}</p>
                    </div>
                  ))}
                </div>
                <Collapsible open={expandedSections.customers} onOpenChange={(open) => setExpandedSections(prev => ({ ...prev, customers: open }))}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-4 bg-gradient-primary hover:opacity-90 text-white border-0 shadow-glow group"
                    >
                      <Crown className="w-4 h-4 mr-2 text-yellow-300" />
                      <span className="font-semibold">AI Deep Dive</span>
                      <Sparkles className="w-4 h-4 ml-1 text-yellow-300" />
                      {expandedSections.customers ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 bg-gradient-subtle p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {metrics.targetCustomersExplanation}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Metrics */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5 text-primary" />
                Important Numbers To Watch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.keyMetrics.map((metric, idx) => (
                  <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <metric.icon className="w-4 h-4 text-muted-foreground" />
                      {metric.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : metric.trend === 'down' ? (
                        <TrendingUp className="w-4 h-4 text-destructive rotate-180" />
                      ) : null}
                    </div>
                    <div className="text-lg font-bold">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}