import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, TrendingUp, Users, DollarSign, Target, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import PMFDashboard from './PMFDashboard';
import RefinementControlsAdvanced from './RefinementControlsAdvanced';
import RealTimeRefinementChart from './RealTimeRefinementChart';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SignalStatus {
  source: string;
  status: 'fetching' | 'success' | 'degraded' | 'error';
  message?: string;
}

export default function PMFAnalyzer() {
  const [idea, setIdea] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [maxQuestions] = useState(6);
  const [signals, setSignals] = useState<SignalStatus[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [pmfScore, setPmfScore] = useState(0);
  const [refinements, setRefinements] = useState({
    ageRange: [18, 45],
    regionFocus: 'global',
    pricePoint: 50,
    channelWeights: { tiktok: 0.3, instagram: 0.2, reddit: 0.2, youtube: 0.15, linkedin: 0.15 },
    b2b: false,
    premium: false,
    niche: true
  });
  const [metadata, setMetadata] = useState<any>(null);
  const { toast } = useToast();

  const sampleQuestions = [
    "What problem does your product solve?",
    "Who is your target audience?",
    "What's your unique value proposition?",
    "What's your planned business model?",
    "What's your budget range for customer acquisition?",
    "Which regions are you targeting initially?"
  ];

  const fetchSignals = useCallback(async (ideaDescription: string) => {
    const sources = [
      { name: 'Google Trends', endpoint: 'google-trends' },
      { name: 'TikTok', endpoint: 'tiktok' },
      { name: 'Reddit', endpoint: 'reddit' },
      { name: 'YouTube', endpoint: 'youtube' },
      { name: 'LinkedIn', endpoint: 'linkedin' }
    ];

    const newSignals: SignalStatus[] = sources.map(source => ({
      source: source.name,
      status: 'fetching'
    }));
    
    setSignals(newSignals);

    // Simulate fetching from different sources
    for (let i = 0; i < sources.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setSignals(prev => prev.map((signal, idx) => 
        idx === i ? { ...signal, status: 'success' } : signal
      ));
    }

    // Generate metadata based on the idea
    const generatedMetadata = {
      audience: {
        primary: {
          name: "Early Adopters",
          share: 0.4,
          demographics: { ages: "25-40", genderSplit: "60/40", geos: ["US", "UK", "Canada"] },
          psychographics: ["Tech-savvy", "Innovation-focused", "Problem-solvers"],
          channels: ["Reddit", "Product Hunt", "Twitter"],
          topKeywords: ["innovation", "startup", "efficiency", "automation"]
        },
        secondary: []
      },
      trends: {
        keywords: ["AI automation", "productivity tools", "workflow optimization"],
        hashtags: ["#startup", "#productivity", "#techtools"],
        risingQueries: ["best AI tools 2024", "workflow automation"],
        regions: ["North America", "Western Europe"],
        notes: "Growing interest in AI-powered solutions"
      },
      scoreBreakdown: {
        demand: 75,
        painIntensity: 80,
        competitionGap: 65,
        differentiation: 70,
        distribution: 72
      },
      monetization: {
        recommendedModels: [
          {
            model: 'subscription',
            why: 'Recurring revenue aligns with continuous value delivery',
            launchPlaybook: ['Free trial', 'Tiered pricing', 'Annual discounts'],
            starterPricingHint: '$29-99/month'
          }
        ]
      },
      channelPlan: [
        {
          channel: 'reddit',
          tactics: ['AMA posts', 'Value-first comments', 'Case studies'],
          exampleAssets: ['Success stories', 'How-to guides'],
          estCacHint: '$15-30'
        }
      ]
    };

    setMetadata(generatedMetadata);
    return generatedMetadata;
  }, []);

  const handleSubmit = async () => {
    if (!idea.trim()) return;

    setIsLoading(true);
    const userMessage: Message = {
      role: 'user',
      content: idea,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Start fetching signals
      const metadata = await fetchSignals(idea);

      // Simulate AI response
      const assistantMessage: Message = {
        role: 'assistant',
        content: currentQuestion < maxQuestions 
          ? sampleQuestions[currentQuestion - 1]
          : "Great! I've analyzed your idea. Let me show you the PM-Fit dashboard...",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (currentQuestion >= 3) {
        setShowDashboard(true);
        // Calculate initial PM-Fit score
        const initialScore = calculatePMFScore(metadata.scoreBreakdown);
        setPmfScore(initialScore);
        toast({
          title: "Analysis Complete",
          description: `Your PM-Fit Score: ${initialScore}/100`,
        });
      }

      setCurrentQuestion(prev => Math.min(prev + 1, maxQuestions));
      setIdea('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze idea. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePMFScore = (breakdown: any) => {
    const weights = {
      demand: 0.25,
      painIntensity: 0.2,
      competitionGap: 0.2,
      differentiation: 0.2,
      distribution: 0.15
    };

    return Math.round(
      breakdown.demand * weights.demand +
      breakdown.painIntensity * weights.painIntensity +
      breakdown.competitionGap * weights.competitionGap +
      breakdown.differentiation * weights.differentiation +
      breakdown.distribution * weights.distribution
    );
  };

  const handleRefinementChange = (newRefinements: any) => {
    setRefinements(newRefinements);
    
    // Recalculate PM-Fit score based on refinements
    if (metadata?.scoreBreakdown) {
      const adjustedBreakdown = {
        ...metadata.scoreBreakdown,
        demand: metadata.scoreBreakdown.demand * (newRefinements.niche ? 0.9 : 1.1),
        differentiation: metadata.scoreBreakdown.differentiation * (newRefinements.premium ? 1.15 : 0.95),
        distribution: metadata.scoreBreakdown.distribution * (newRefinements.b2b ? 0.85 : 1.05)
      };
      
      const newScore = calculatePMFScore(adjustedBreakdown);
      setPmfScore(newScore);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col shadow-xl border-0 bg-card/95 backdrop-blur">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    PM-Fit Analyzer
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Question {currentQuestion}/{maxQuestions}
                    </span>
                    <Progress value={(currentQuestion / maxQuestions) * 100} className="w-20" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12 space-y-4">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-full" />
                        <Target className="h-16 w-16 text-primary relative" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold">Start with your idea</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Describe your startup or product idea, and I'll help analyze its product-market fit potential.
                    </p>
                  </div>
                )}
                
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3 animate-in slide-in-from-bottom-2",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 border'
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="bg-muted/50 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Analyzing...</span>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Describe your idea..."
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!idea.trim() || isLoading}
                    size="icon"
                    className="h-auto px-3"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Signals Queue */}
          <div className="space-y-4">
            <Card className="shadow-xl border-0 bg-card/95 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Live Signals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {signals.map((signal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border animate-in slide-in-from-right"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <span className="text-sm font-medium">{signal.source}</span>
                      <Badge
                        variant={
                          signal.status === 'success' ? 'default' :
                          signal.status === 'fetching' ? 'secondary' :
                          signal.status === 'degraded' ? 'outline' :
                          'destructive'
                        }
                        className="animate-pulse"
                      >
                        {signal.status}
                      </Badge>
                    </div>
                  ))}
                  
                  {signals.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Signals will appear here when analyzing your idea
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {showDashboard && (
              <Card className="shadow-xl border-0 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-bold text-primary">{pmfScore}</div>
                    <div className="text-sm text-muted-foreground">PM-Fit Score</div>
                    <Progress value={pmfScore} className="mt-2" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Dashboard and Controls */}
        {showDashboard && (
          <div className="mt-8 grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3 space-y-6">
              <PMFDashboard 
                idea={messages[0]?.content || ''}
                refinements={refinements}
                metadata={metadata}
                onScoreUpdate={setPmfScore}
              />
              <RealTimeRefinementChart
                idea={messages[0]?.content || ''}
                pmfScore={pmfScore}
                refinements={refinements}
                metadata={metadata}
                onRefinementSuggestion={(suggestion) => {
                  toast({
                    title: "Refinement Suggestion",
                    description: suggestion,
                  });
                }}
              />
            </div>
            <div className="xl:col-span-1">
              <RefinementControlsAdvanced
                refinements={refinements}
                onChange={handleRefinementChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}