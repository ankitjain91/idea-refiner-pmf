import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, AlertCircle, ChevronUp, ChevronDown, CheckCircle, XCircle, BarChart, PieChart, Activity, MessageSquare, GitBranch, CircleDollarSign, Sparkles, Lock, Crown } from "lucide-react";
import PaywallOverlay from "./PaywallOverlay";
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
        pmfExplanation: "Based on AI analysis of market fit, competition, and monetization strategy",
        marketSize: metadata.marketSize || "$2.5B",
        marketGrowth: "15% YoY",
        marketExplanation: "Growing market with strong demand",
        competitors: [
          { name: "Competitor A", strength: metadata.competition || "Medium" },
          { name: "Competitor B", strength: "Low" }
        ],
        competitorsExplanation: `Competition level: ${metadata.competition || "Medium"}`,
        targetCustomers: [
          { segment: metadata.targetAge || "25-45", size: "Large", painPoint: "Efficiency" }
        ],
        targetCustomersExplanation: `Target: ${metadata.targetAge || "25-45"}, ${metadata.incomeRange || "$60k-100k"}`,
        keyMetrics: [
          { label: "Market Readiness", value: `${score}%`, trend: 'up' as const, icon: TrendingUp },
          { label: "Competition", value: metadata.competition || "Medium", trend: 'neutral' as const, icon: Target },
          { label: "Target Market", value: metadata.targetAge || "25-45", trend: 'up' as const, icon: Users },
          { label: "Revenue Potential", value: metadata.incomeRange || "$60k+", trend: 'up' as const, icon: CircleDollarSign }
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
      pmfExplanation: `This score reflects strong market demand signals based on your ${refinements.market} target market. The ${refinements.budget} funding approach aligns well with the ${refinements.timeline} timeline. Key strengths include clear value proposition and identified customer pain points. To improve: focus on competitive differentiation and validate pricing strategy.`,
      marketSize: refinements.market === 'enterprise' ? '$12.5B' : refinements.market === 'mass' ? '$45.2B' : '$3.8B',
      marketGrowth: 'Growing 23% YoY',
      marketExplanation: `The ${refinements.market} market shows robust growth driven by digital transformation trends. TAM analysis indicates ${refinements.market === 'enterprise' ? '50,000+ potential accounts' : '2.5M+ potential users'}. Market timing is favorable with increasing adoption rates and regulatory tailwinds supporting innovation in this space.`,
      competitors: [
        { name: 'Competitor A', strength: 'Strong' },
        { name: 'Competitor B', strength: 'Moderate' },
        { name: 'Competitor C', strength: 'Emerging' }
      ],
      competitorsExplanation: `Competitive landscape analysis reveals 3 main players with combined 65% market share. Competitor A leads with enterprise features but lacks user experience focus. Your differentiation opportunity lies in the ${refinements.timeline === 'mvp' ? 'speed to market' : 'comprehensive feature set'} combined with superior customer experience.`,
      targetCustomers: [
        { segment: 'Early Adopters', size: '15%', painPoint: 'Need innovative solutions' },
        { segment: 'Main Market', size: '68%', painPoint: 'Seeking proven ROI' },
        { segment: 'Late Market', size: '17%', painPoint: 'Risk-averse, need stability' }
      ],
      targetCustomersExplanation: `Customer segmentation based on adoption lifecycle and psychographic analysis. Early adopters (15%) provide initial validation and feedback. Main market (68%) represents scaling opportunity with proven product-market fit. Focus on early adopters first to establish credibility before mainstream expansion.`,
      keyMetrics: [
        { label: 'CAC Payback', value: '6 months', trend: 'up', icon: CircleDollarSign },
        { label: 'Market Share', value: '2.3%', trend: 'up', icon: PieChart },
        { label: 'Growth Rate', value: '15% MoM', trend: 'up', icon: BarChart },
        { label: 'Churn Rate', value: '5%', trend: 'down', icon: Activity }
      ]
    };
  };

  const metrics = generateMetrics();

  return (
    <PaywallOverlay feature="Advanced PMF Analytics" requiredTier="pro">
      <div className="space-y-6">
        {/* PMF Score Card */}
        <div>
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-primary text-white">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Product-Market Fit Score
                </span>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  AI Analysis
                </Badge>
              </CardTitle>
              <CardDescription className="text-white/80">
                Comprehensive analysis of your startup's potential
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
                  Market Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="text-2xl font-bold mb-2">{metrics.marketSize}</div>
                <Badge variant={metrics.marketGrowth.includes("Growing") ? "default" : "secondary"} className="mb-3">
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
                  Competitive Landscape
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
                  Target Customers
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
                Key Performance Indicators
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
    </PaywallOverlay>
  );
}