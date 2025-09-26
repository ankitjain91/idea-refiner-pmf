import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, TrendingUp, Users, DollarSign, Target, Zap, ChevronRight, Crown, Sparkles, MessageCircle, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PMFDashboardTabs from './PMFDashboardTabs';
import RefinementControlsAdvanced from './RefinementControlsAdvanced';
import RealTimeRefinementChart from './RealTimeRefinementChart';
import PMFImprovements from './PMFImprovements';
import RealDataPMFAnalyzer from './RealDataPMFAnalyzer';
import StreamlinedPMFChat from './StreamlinedPMFChat';
import LiveDataCards from './LiveDataCards';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface SignalStatus {
  source: string;
  status: 'fetching' | 'success' | 'degraded' | 'error';
  message?: string;
}

export default function PMFAnalyzer() {
  const [idea, setIdea] = useState('');
  const [initialIdea, setInitialIdea] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [maxQuestions] = useState(10);
  const [signals, setSignals] = useState<SignalStatus[]>([]);
  const [showDashboard, setShowDashboard] = useState(true); // Show dashboard immediately
  const [pmfScore, setPmfScore] = useState(0);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
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
  const [resetTrigger, setResetTrigger] = useState(0);
  const [autoAnalyzing, setAutoAnalyzing] = useState(false);

  // Fetch real market data from edge functions
  const fetchRealMarketData = async (ideaText: string, category: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('market-insights', {
        body: { 
          idea: ideaText, 
          userAnswers,
          category 
        }
      });
      
      if (error) throw error;
      return data?.insights || null;
    } catch (error) {
      console.error(`Error fetching ${category} data:`, error);
      return null;
    }
  };

  // Auto-fetch real market data on component mount or when idea changes
  useEffect(() => {
    const loadStoredData = async () => {
      const storedIdea = localStorage.getItem('pmfCurrentIdea') || localStorage.getItem('userIdea');
      const storedAnswers = localStorage.getItem('userAnswers');
      const storedMetadata = localStorage.getItem('ideaMetadata');
      
      if (storedIdea && !initialIdea) {
        setInitialIdea(storedIdea);
        setIdea(storedIdea);
        
        if (storedAnswers) {
          try {
            const answers = JSON.parse(storedAnswers);
            setUserAnswers(answers);
          } catch (e) {
            console.error('Error parsing stored answers:', e);
          }
        }
        
        if (storedMetadata) {
          try {
            const meta = JSON.parse(storedMetadata);
            setMetadata(meta);
            if (meta.pmfScore) {
              setPmfScore(meta.pmfScore);
            } else if (meta.scoreBreakdown) {
              const score = calculatePMFScore(meta.scoreBreakdown);
              setPmfScore(score);
            }
          } catch (e) {
            console.error('Error parsing stored metadata:', e);
          }
        }
        
        // Fetch fresh real-time data
        if (storedIdea) {
          try {
            toast({
              title: "Fetching Real Market Data",
              description: `Analyzing: "${storedIdea}"`,
            });
            
            // Fetch real market signals
            const fetchedMetadata = await fetchSignals(storedIdea);
            setMetadata(fetchedMetadata);
            
            // Fetch additional real data from market insights
            const marketData = await fetchRealMarketData(storedIdea, 'market');
            const socialData = await fetchRealMarketData(storedIdea, 'social');
            const customerData = await fetchRealMarketData(storedIdea, 'customers');
            
            // Merge real data into metadata
            const enhancedMetadata = {
              ...fetchedMetadata,
              marketInsights: marketData,
              socialInsights: socialData,
              customerInsights: customerData
            };
            
            setMetadata(enhancedMetadata);
            localStorage.setItem('ideaMetadata', JSON.stringify(enhancedMetadata));
            
            toast({
              title: "Real Data Loaded",
              description: `Analysis complete with live market data`,
            });
          } catch (error) {
            console.error('Error fetching market data:', error);
          }
        }
      }
    };
    
    loadStoredData();
  }, []);

  const sampleQuestions = [
    {
      question: "What problem does your product solve?",
      options: [
        "Saves time and increases productivity",
        "Reduces costs and improves efficiency",
        "Enhances communication and collaboration",
        "Provides entertainment or lifestyle improvement"
      ]
    },
    {
      question: "Who is your target audience?",
      options: [
        "B2B - Small to medium businesses",
        "B2B - Enterprise companies",
        "B2C - Young adults (18-35)",
        "B2C - Families and parents"
      ]
    },
    {
      question: "What's your unique value proposition?",
      options: [
        "Lower cost than competitors",
        "Better features and functionality",
        "Superior user experience",
        "First to market with this solution"
      ]
    },
    {
      question: "What's your planned business model?",
      options: [
        "SaaS subscription model",
        "Marketplace with transaction fees",
        "Freemium with paid upgrades",
        "One-time purchase or licensing"
      ]
    },
    {
      question: "What's your budget range for customer acquisition?",
      options: [
        "Bootstrap - Under $10K",
        "Seed - $10K to $100K",
        "Funded - $100K to $1M",
        "Well-funded - Over $1M"
      ]
    },
    {
      question: "Which regions are you targeting initially?",
      options: [
        "North America only",
        "Europe and UK",
        "Asia-Pacific",
        "Global from day one"
      ]
    },
    {
      question: "What is your go-to-market strategy?",
      options: [
        "Content marketing and SEO",
        "Paid advertising (Google, Facebook)",
        "Direct sales and partnerships",
        "Product-led growth and virality"
      ]
    },
    {
      question: "How will you measure early success?",
      options: [
        "User acquisition and growth rate",
        "Revenue and profitability",
        "User engagement and retention",
        "Market share and competitive position"
      ]
    },
    {
      question: "What are the top 3 risks you foresee?",
      options: [
        "Competition and market saturation",
        "Technical challenges and scalability",
        "Customer acquisition costs",
        "Regulatory and compliance issues"
      ]
    },
    {
      question: "What is your pricing strategy?",
      options: [
        "Premium pricing - High value",
        "Competitive pricing - Market average",
        "Penetration pricing - Below market",
        "Dynamic pricing - Usage-based"
      ]
    }
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
    localStorage.setItem('ideaMetadata', JSON.stringify(generatedMetadata));
    return generatedMetadata;
  }, []);

  // Fetch AI-generated suggestions for the current question
  const fetchSuggestions = async (question: string, ideaDesc: string, prevAnswers?: Record<string, string>) => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-suggestions', {
        body: {
          question,
          ideaDescription: ideaDesc,
          previousAnswers: prevAnswers ?? userAnswers
        }
      });

      if (error) {
        console.error('Failed to fetch suggestions:', error);
        throw new Error('Unable to get suggestions from API');
      }
      
      const suggestions = data?.suggestions;
      if (!suggestions || suggestions.length === 0) {
        throw new Error('No suggestions received from API');
      }
      
      setCurrentSuggestions(suggestions);
      return suggestions;
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      toast({
        title: "Error",
        description: "Unable to fetch suggestions. Please check API configuration.",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSubmit = async () => {
    const ideaToSend = idea.trim();
    if (!ideaToSend) return;

    // Store the initial idea on first submission
    if (currentQuestion === 1 && !initialIdea) {
      setInitialIdea(ideaToSend);
      localStorage.setItem('userIdea', ideaToSend);
    }

    // Clear input immediately for better UX
    setIdea('');
    setIsLoading(true);

    const userMessage: Message = {
      role: 'user',
      content: ideaToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Store the answer - always map to the correct question
    let updatedAnswers = { ...userAnswers };
    if (currentQuestion === 1) {
      // First message is the idea itself
      updatedAnswers['Initial Idea'] = ideaToSend;
    } else if (currentQuestion > 1 && currentQuestion <= maxQuestions) {
      const questionKey = sampleQuestions[currentQuestion - 2].question;
      updatedAnswers[questionKey] = ideaToSend;
    }
    setUserAnswers(updatedAnswers);
    localStorage.setItem('userAnswers', JSON.stringify(updatedAnswers));

    try {
      // Start fetching signals
      const metadata = await fetchSignals(ideaToSend);

      // Get the next question
      const nextQuestion = currentQuestion < maxQuestions 
        ? sampleQuestions[currentQuestion].question
        : null;
      
      // Fetch AI suggestions for the next question
      // Always use the initial idea as the base context
      let suggestions: string[] = [];
      if (nextQuestion) {
        const ideaContext = initialIdea || ideaToSend; // Use initial idea if available
        
        // Pass all context to the suggestions API
        console.log('[PMF] Fetching suggestions with context:', {
          question: nextQuestion,
          idea: ideaContext,
          previousAnswers: updatedAnswers
        });
        
        suggestions = await fetchSuggestions(nextQuestion, ideaContext, updatedAnswers);
      }

      // Simulate AI response
      const assistantMessage: Message = {
        role: 'assistant',
        content: nextQuestion || "Great! I've analyzed your idea. Let me show you the PM-Fit dashboard...",
        timestamp: new Date(),
        suggestions: nextQuestion ? suggestions : undefined
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
    localStorage.setItem('userRefinements', JSON.stringify(newRefinements));
    
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

  const handleIdeaChatAnalysis = async (idea: string, metadata: any) => {
    // Reset everything for fresh analysis
    setInitialIdea(idea);
    setMetadata(metadata);
    setShowDashboard(true);
    setPmfScore(metadata?.pmfScore || 75);
    setMessages([]); // Clear old messages
    setUserAnswers({}); // Clear old answers
    setRefinements({ // Reset refinements
      ageRange: [18, 45],
      regionFocus: 'global',
      pricePoint: 50,
      channelWeights: { tiktok: 0.3, instagram: 0.2, reddit: 0.2, youtube: 0.15, linkedin: 0.15 },
      b2b: false,
      premium: false,
      niche: true
    });
    
    // Store data
    localStorage.setItem('userIdea', idea);
    localStorage.setItem('ideaMetadata', JSON.stringify(metadata));
    localStorage.removeItem('userAnswers'); // Clear old data
    localStorage.removeItem('userRefinements');
    
    // Save session to database
    const userResponse = await supabase.auth.getUser();
    if (userResponse.data?.user) {
      try {
        const sessionId = localStorage.getItem('currentSessionId');
        const sessionData = {
          user_id: userResponse.data.user.id,
          session_name: idea.substring(0, 50) + (idea.length > 50 ? '...' : ''),
          idea: idea,
          user_answers: {},
          refinements: refinements,
          metadata: metadata,
          insights: {},
          pmf_score: metadata?.pmfScore || 75,
          last_accessed: new Date().toISOString()
        };

        if (sessionId) {
          // Update existing session
          await supabase
            .from('analysis_sessions')
            .update(sessionData)
            .eq('id', sessionId);
        } else {
          // Create new session
          const { data, error } = await supabase
            .from('analysis_sessions')
            .insert([sessionData])
            .select()
            .single();
          
          if (!error && data) {
            localStorage.setItem('currentSessionId', data.id);
          }
        }
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
  };

  // Add method to reset entire analyzer
  const resetAnalyzer = () => {
    // Clear all state
    setIdea('');
    setInitialIdea('');
    setMessages([]);
    setIsLoading(false);
    setCurrentQuestion(1);
    setSignals([]);
    setShowDashboard(false);
    setPmfScore(0);
    setCurrentSuggestions([]);
    setLoadingSuggestions(false);
    setUserAnswers({});
    setRefinements({
      ageRange: [18, 45],
      regionFocus: 'global',
      pricePoint: 50,
      channelWeights: { tiktok: 0.3, instagram: 0.2, reddit: 0.2, youtube: 0.15, linkedin: 0.15 },
      b2b: false,
      premium: false,
      niche: true
    });
    setMetadata(null);
    
    // Clear localStorage
    localStorage.removeItem('userIdea');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('userRefinements');
    localStorage.removeItem('ideaMetadata');
    localStorage.removeItem('currentSessionId');
    
    // Trigger chat reset
    setResetTrigger(Date.now());
  };



  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-background via-background to-muted/20">
      
      {/* Main Container */}
      <div className="container-fluid py-4 sm:py-6 lg:py-8">

        {/* Auto-load dashboard for initial data */}
        {!showDashboard && metadata && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <h2 className="text-2xl font-bold mb-4">Welcome to PM-Fit Analyzer</h2>
            <p className="text-muted-foreground mb-6">
              Click the chat button in the bottom right to start analyzing your idea
            </p>
            <Badge variant="outline" className="animate-pulse">
              <Sparkles className="w-4 h-4 mr-2" />
              Real-time market data ready
            </Badge>
          </motion.div>
        )}

        {/* Dashboard Content - Show immediately with data */}
        {(showDashboard || metadata) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8">
              {/* PM-Fit Score Card */}
              <Card className="w-full shadow-xl border-0 bg-card/95 backdrop-blur">
                <CardHeader className="p-4 sm:p-6">
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
            
            {/* Dashboard and Controls */}
            <div className="mt-6 sm:mt-8 space-y-6">
              {/* PM-Fit Improvements Section */}
              <PMFImprovements
                idea={messages[0]?.content || ''}
                scores={{
                  demand: metadata?.scoreBreakdown?.demand || 75,
                  painIntensity: metadata?.scoreBreakdown?.painIntensity || 80,
                  competitionGap: metadata?.scoreBreakdown?.competitionGap || 65,
                  differentiation: metadata?.scoreBreakdown?.differentiation || 70,
                  distribution: metadata?.scoreBreakdown?.distribution || 72
                }}
                signals={{
                  dominantChannel: refinements.channelWeights && Object.entries(refinements.channelWeights)
                    .reduce((a, b) => a[1] > b[1] ? a : b)[0] as any,
                  b2b: refinements.b2b,
                  priceBand: refinements.pricePoint < 30 ? 'budget' : refinements.pricePoint < 100 ? 'mid' : 'premium'
                }}
                refinements={refinements}
                onApplyExperiment={(improvement) => {
                  toast({
                    title: "Experiment Applied",
                    description: `"${improvement.title}" added to your roadmap (+${improvement.estDelta} pts expected)`,
                  });
                }}
              />
              
              {/* Live Platform Data Cards */}
              <LiveDataCards idea={messages[0]?.content || initialIdea || idea || "AI-powered productivity tool"} />
              
              {/* Real Data PM-Fit Analyzer */}
              <RealDataPMFAnalyzer 
                idea={messages[0]?.content || initialIdea || idea || "AI-powered productivity tool for remote teams"}
                assumptions={refinements}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
