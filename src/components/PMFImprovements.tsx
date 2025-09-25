import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  GitBranch, 
  Users, 
  ArrowRight, 
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Beaker,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface Improvement {
  factor: 'demand' | 'painIntensity' | 'competitionGap' | 'differentiation' | 'distribution';
  title: string;
  why: string;
  howTo: string[];
  experiment: {
    hypothesis: string;
    metric: 'CTR' | 'CR' | 'ARPU' | 'Waitlist' | 'ReplyRate' | 'ARR';
    design: string[];
    sampleSizeHint?: string;
    costBand: '$' | '$$' | '$$$';
    timeToImpactDays: number;
  };
  dependencies?: string[];
  estDelta: number;
  confidence: 'low' | 'med' | 'high';
}

interface PMFImprovementsProps {
  idea: string;
  scores: {
    demand: number;
    painIntensity: number;
    competitionGap: number;
    differentiation: number;
    distribution: number;
  };
  signals?: {
    googleTrendsVelocity?: number;
    tiktokHashtagGrowth?: number;
    redditPainMentions?: number;
    amazonReviewThemes?: string[];
    topRegions?: string[];
    dominantChannel?: 'tiktok' | 'instagram' | 'reddit' | 'linkedin' | 'youtube' | 'seo' | 'amazon';
    priceBand?: 'budget' | 'mid' | 'premium';
    b2b?: boolean;
  };
  refinements?: any;
  onApplyExperiment?: (improvement: Improvement) => void;
}

const factorConfig = {
  demand: {
    label: 'Demand',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  painIntensity: {
    label: 'Pain Intensity',
    icon: Target,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  competitionGap: {
    label: 'Competition Gap',
    icon: GitBranch,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  differentiation: {
    label: 'Differentiation',
    icon: Sparkles,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  distribution: {
    label: 'Distribution',
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
};

function recommendImprovements(ctx: {
  idea: string;
  scores: {
    demand: number;
    painIntensity: number;
    competitionGap: number;
    differentiation: number;
    distribution: number;
  };
  signals?: {
    googleTrendsVelocity?: number;
    tiktokHashtagGrowth?: number;
    redditPainMentions?: number;
    amazonReviewThemes?: string[];
    topRegions?: string[];
    dominantChannel?: 'tiktok' | 'instagram' | 'reddit' | 'linkedin' | 'youtube' | 'seo' | 'amazon';
    priceBand?: 'budget' | 'mid' | 'premium';
    b2b?: boolean;
  };
}): Improvement[] {
  const R: Improvement[] = [];

  // Demand improvements
  if (ctx.scores.demand < 65) {
    R.push({
      factor: 'demand',
      title: 'Broaden intent & intercept rising queries',
      why: 'Search & social velocity are below benchmark; you\'re missing adjacent, faster-growing intents.',
      howTo: [
        'Add 3 adjacent intents to landing page (e.g., "alternatives to ___", "for ___ use case")',
        'Ship 4 SEO pages matching rising queries; link from homepage hero',
        'Run $200 test on TikTok Spark Ads targeting those intents'
      ],
      experiment: {
        hypothesis: 'Adding adjacent intents grows qualified visits by 20% and lifts signup rate 10%',
        metric: 'CR',
        design: ['A/B: current LP vs LP+adjacent intents', '14-day run', 'Hold geo constant'],
        costBand: '$',
        timeToImpactDays: 14
      },
      estDelta: 6,
      confidence: 'med'
    });
  }

  // Pain intensity improvements
  if (ctx.scores.painIntensity < 70 || (ctx.signals?.redditPainMentions ?? 0) < 5) {
    R.push({
      factor: 'painIntensity',
      title: 'Narrow to a pain-dense ICP & rewrite problem-first hero',
      why: 'Communities show diffuse complaints; stronger resonance requires a sharper use case.',
      howTo: [
        'Pick 1 subsegment with frequent complaints (from Reddit threads)',
        'Rewrite hero: "{pain statement} → in {time} with {mechanism}"',
        'Add 3 proof bullets (before/after, time saved, money saved)'
      ],
      experiment: {
        hypothesis: 'A pain-first hero for a narrower ICP increases LP-to-signup by 25%',
        metric: 'CR',
        design: ['Multivariate: current vs pain-first copy', 'Record session replays', 'Survey 50 visitors (1 Q)'],
        costBand: '$',
        timeToImpactDays: 7
      },
      estDelta: 8,
      confidence: 'high'
    });
  }

  // Competition gap improvements
  if (ctx.scores.competitionGap < 65) {
    R.push({
      factor: 'competitionGap',
      title: 'Launch a wedge feature + switching plan',
      why: 'Top competitors own general use cases; winning wedge accelerates adoption.',
      howTo: [
        'Identify one underserved workflow from competitor reviews',
        'Ship a lightweight "killer micro-feature" around that workflow',
        'Publish a "Switch in 15 minutes" guide + import tool'
      ],
      experiment: {
        hypothesis: 'Wedge + import raises win rate on head-to-head deals by 15%',
        metric: 'ARR',
        design: ['Track deals flagged "switch"', 'Compare close rates pre/post feature'],
        costBand: '$$',
        timeToImpactDays: 21
      },
      estDelta: 7,
      confidence: 'med'
    });
  }

  // Differentiation improvements
  if (ctx.scores.differentiation < 70) {
    R.push({
      factor: 'differentiation',
      title: 'Create a 10× moment and make it legible',
      why: 'Users can\'t articulate why you\'re uniquely better.',
      howTo: [
        'Benchmark 3 tasks vs top alt; show time/cost deltas',
        'Add interactive demo or sandbox to prove the 10×',
        'Secure 2 creator reviews that replicate the benchmark'
      ],
      experiment: {
        hypothesis: 'Visible 10× proof increases demo-to-close by 20%',
        metric: 'CR',
        design: ['Prospect flow A/B: with vs without benchmark section'],
        costBand: '$$',
        timeToImpactDays: 10
      },
      estDelta: 6,
      confidence: 'med'
    });
  }

  // Distribution improvements
  if (ctx.scores.distribution < 70) {
    const ch = ctx.signals?.dominantChannel ?? 'tiktok';
    R.push({
      factor: 'distribution',
      title: `Go deep on ${ch} with 2 repeatable formats`,
      why: 'Broad-but-shallow channel mix dilutes reach and CAC learning.',
      howTo: [
        `Pick 2 repeatable formats (e.g., "myth-busters", "POV demo"). Post 5×/wk for 3 weeks`,
        'Partner with 3 micro-creators (10–50k) for seeded UGC',
        'Retarget site visitors with 2 hooks tied to pain'
      ],
      experiment: {
        hypothesis: 'Channel focus improves CAC by 20% and lifts signups by 15%',
        metric: 'CTR',
        design: ['Hold budget constant; reallocate 80% to one channel', 'Compare CAC 2-week rolling'],
        costBand: '$$',
        timeToImpactDays: 14
      },
      estDelta: 5,
      confidence: 'med'
    });
  }

  // Additional targeted improvements based on signals
  if (ctx.signals?.b2b && ctx.scores.distribution < 80) {
    R.push({
      factor: 'distribution',
      title: 'B2B outbound engine: LinkedIn + cold email sequence',
      why: 'B2B requires direct outreach to decision makers.',
      howTo: [
        'Build list of 500 ICP companies using Apollo/Clay',
        'Create 3-touch email sequence focused on ROI',
        'Run LinkedIn ads to warm up prospects before outreach'
      ],
      experiment: {
        hypothesis: 'Outbound + LinkedIn generates 20 qualified demos in 30 days',
        metric: 'ARR',
        design: ['Track reply rate, demo book rate, close rate', 'A/B subject lines'],
        costBand: '$$',
        timeToImpactDays: 30
      },
      estDelta: 9,
      confidence: 'high'
    });
  }

  return R.sort((a, b) => b.estDelta - a.estDelta);
}

export default function PMFImprovements({ 
  idea, 
  scores, 
  signals, 
  refinements,
  onApplyExperiment 
}: PMFImprovementsProps) {
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);
  const [appliedExperiments, setAppliedExperiments] = useState<Set<string>>(new Set());

  useEffect(() => {
    const recommendations = recommendImprovements({
      idea,
      scores,
      signals
    });
    setImprovements(recommendations);
  }, [idea, scores, signals]);

  const quickWins = improvements.filter(
    i => i.experiment.costBand === '$' && i.experiment.timeToImpactDays <= 14
  );

  const getConfidenceBadge = (confidence: Improvement['confidence']) => {
    const variants = {
      low: 'bg-gray-100 text-gray-700',
      med: 'bg-blue-100 text-blue-700',
      high: 'bg-green-100 text-green-700'
    };
    return variants[confidence];
  };

  const getCostIndicator = (cost: string) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(cost.length)].map((_, i) => (
          <DollarSign key={i} className="h-3 w-3 text-green-600" />
        ))}
      </div>
    );
  };

  const handleApplyExperiment = (improvement: Improvement) => {
    setAppliedExperiments(prev => new Set(prev).add(improvement.title));
    onApplyExperiment?.(improvement);
  };

  const ImprovementCard = ({ improvement }: { improvement: Improvement }) => {
    const config = factorConfig[improvement.factor];
    const Icon = config.icon;
    const isApplied = appliedExperiments.has(improvement.title);

    return (
      <Card className={cn(
        "transition-all hover:shadow-lg",
        isApplied && "opacity-75"
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", config.bgColor)}>
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>
              <div>
                <CardTitle className="text-base">{improvement.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    +{improvement.estDelta} pts
                  </Badge>
                  <Badge className={cn("text-xs", getConfidenceBadge(improvement.confidence))}>
                    {improvement.confidence} confidence
                  </Badge>
                  {getCostIndicator(improvement.experiment.costBand)}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{improvement.why}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              How to execute
            </p>
            <ol className="space-y-1">
              {improvement.howTo.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-semibold mt-0.5">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Beaker className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-semibold">Experiment Design</p>
            </div>
            
            <p className="text-sm italic">"{improvement.experiment.hypothesis}"</p>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Metric</p>
                <Badge variant="secondary">{improvement.experiment.metric}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time to Impact</p>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{improvement.experiment.timeToImpactDays} days</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {improvement.experiment.design.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {improvement.dependencies && improvement.dependencies.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-orange-600">
              <AlertCircle className="h-3 w-3" />
              <span>Requires: {improvement.dependencies.join(', ')}</span>
            </div>
          )}

          <Button
            onClick={() => handleApplyExperiment(improvement)}
            disabled={isApplied}
            className="w-full"
            variant={isApplied ? "secondary" : "default"}
          >
            {isApplied ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Applied to Roadmap
              </>
            ) : (
              <>
                Apply as Experiment
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Wins Section */}
      {quickWins.length > 0 && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                <CardTitle>Quick Wins Available</CardTitle>
              </div>
              <Button
                onClick={() => quickWins.forEach(handleApplyExperiment)}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Play All Quick Wins
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              {quickWins.length} low-cost experiments that can impact your score in under 2 weeks
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Factor-based Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(scores).map(([factor, score]) => {
          const config = factorConfig[factor as keyof typeof factorConfig];
          const Icon = config.icon;
          const factorImprovements = improvements.filter(i => i.factor === factor);
          const totalLift = factorImprovements.reduce((sum, i) => sum + i.estDelta, 0);

          return (
            <Sheet key={factor}>
              <SheetTrigger asChild>
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105",
                    score < 70 && "ring-2 ring-orange-200"
                  )}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Icon className={cn("h-5 w-5", config.color)} />
                        <Badge variant={score >= 70 ? "default" : "destructive"}>
                          {score}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{config.label}</p>
                      {factorImprovements.length > 0 && (
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {factorImprovements.length} actions
                          </Badge>
                          <span className="text-xs text-green-600 font-semibold">
                            +{totalLift} pts
                          </span>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" className="w-full">
                        Improve This
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </SheetTrigger>
              
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Icon className={cn("h-5 w-5", config.color)} />
                    Improve {config.label}
                  </SheetTitle>
                  <SheetDescription>
                    Current score: {score}/100 · Potential gain: +{totalLift} points
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-4">
                  {factorImprovements.length > 0 ? (
                    factorImprovements.map((improvement, idx) => (
                      <ImprovementCard key={idx} improvement={improvement} />
                    ))
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                          <p className="font-medium">This factor is performing well!</p>
                          <p className="text-sm text-muted-foreground">
                            No immediate improvements needed. Focus on other areas.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          );
        })}
      </div>

      {/* All Improvements List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              All Recommended Improvements
            </CardTitle>
            <Badge variant="outline">
              Total potential: +{improvements.reduce((sum, i) => sum + i.estDelta, 0)} pts
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="impact" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="impact">By Impact</TabsTrigger>
              <TabsTrigger value="time">By Time</TabsTrigger>
              <TabsTrigger value="cost">By Cost</TabsTrigger>
            </TabsList>
            
            <TabsContent value="impact" className="space-y-4">
              {improvements
                .sort((a, b) => b.estDelta - a.estDelta)
                .map((improvement, idx) => (
                  <ImprovementCard key={idx} improvement={improvement} />
                ))}
            </TabsContent>
            
            <TabsContent value="time" className="space-y-4">
              {improvements
                .sort((a, b) => a.experiment.timeToImpactDays - b.experiment.timeToImpactDays)
                .map((improvement, idx) => (
                  <ImprovementCard key={idx} improvement={improvement} />
                ))}
            </TabsContent>
            
            <TabsContent value="cost" className="space-y-4">
              {improvements
                .sort((a, b) => a.experiment.costBand.length - b.experiment.costBand.length)
                .map((improvement, idx) => (
                  <ImprovementCard key={idx} improvement={improvement} />
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}