import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, Send, Loader2, CheckCircle, 
  Target, Users, TrendingUp, DollarSign, 
  Lightbulb, Sparkles, ArrowRight, ArrowLeft,
  ChevronLeft, ChevronRight, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AnalysisQuestion {
  id: string;
  field: string;
  question: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  icon: any;
  importance: 'critical' | 'important' | 'helpful';
  placeholder?: string;
  context?: string;
}

interface EnhancedAnalysisChatProps {
  idea: string | null;
  sessionId?: string;
  onComplete?: (ideaText?: string) => void;
  onUpdateData?: () => void;
}

const ANALYSIS_QUESTIONS: AnalysisQuestion[] = [
  {
    id: 'targetAudience',
    field: 'targetAudience',
    question: 'Who is your target audience?',
    type: 'text',
    icon: Users,
    importance: 'critical',
    placeholder: 'e.g., Young professionals aged 25-35 who enjoy reading',
    context: 'Define demographics, psychographics, and specific characteristics of your ideal customers'
  },
  {
    id: 'problemSolving',
    field: 'problemSolving',
    question: 'What problem does your startup solve?',
    type: 'text',
    icon: Target,
    importance: 'critical',
    placeholder: 'e.g., Difficulty finding meaningful connections online',
    context: 'Describe the pain point or challenge your product addresses'
  },
  {
    id: 'businessModel',
    field: 'businessModel',
    question: 'How will you make money?',
    type: 'select',
    options: ['Subscription', 'Freemium', 'Marketplace', 'SaaS', 'E-commerce', 'Advertising', 'Other'],
    icon: DollarSign,
    importance: 'critical',
    context: 'Select your primary revenue model'
  },
  {
    id: 'marketSize',
    field: 'marketSize',
    question: 'What is your estimated market size?',
    type: 'select',
    options: ['< $10M', '$10M - $100M', '$100M - $1B', '$1B - $10B', '> $10B'],
    icon: TrendingUp,
    importance: 'important',
    context: 'Estimate the total addressable market (TAM) for your product'
  },
  {
    id: 'uniqueValue',
    field: 'uniqueValue',
    question: 'What makes your solution unique?',
    type: 'text',
    icon: Lightbulb,
    importance: 'important',
    placeholder: 'e.g., AI-powered matching based on reading preferences',
    context: 'Explain your unique value proposition and competitive advantage'
  },
  {
    id: 'competitorAnalysis',
    field: 'competitorAnalysis',
    question: 'Who are your main competitors?',
    type: 'text',
    icon: Users,
    importance: 'helpful',
    placeholder: 'e.g., Tinder, Bumble, specialized dating apps',
    context: 'List direct and indirect competitors in your market'
  }
];

export const EnhancedAnalysisChat: React.FC<EnhancedAnalysisChatProps> = ({ 
  idea,
  sessionId,
  onComplete,
  onUpdateData
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [ideaInput, setIdeaInput] = useState(idea || '');
  const [hasEnteredIdea, setHasEnteredIdea] = useState(!!idea);
  const [direction, setDirection] = useState(1);

  const currentQuestion = ANALYSIS_QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / ANALYSIS_QUESTIONS.length) * 100;

  // Load existing answers from localStorage - session-specific
  useEffect(() => {
    if (!sessionId) return;
    
    const sessionAnswersKey = `session_${sessionId}_answers`;
    const savedAnswers = localStorage.getItem(sessionAnswersKey);
    
    if (savedAnswers) {
      const parsed = JSON.parse(savedAnswers);
      // Backward compatibility: migrate legacy key
      if (parsed.competition && !parsed.competitorAnalysis) {
        parsed.competitorAnalysis = parsed.competition;
        localStorage.setItem(sessionAnswersKey, JSON.stringify(parsed));
      }
      setAnswers(parsed);
      
      // Find the first unanswered question
      const firstUnanswered = ANALYSIS_QUESTIONS.findIndex(q => !parsed[q.field]);
      if (firstUnanswered !== -1) {
        setCurrentQuestionIndex(firstUnanswered);
      } else {
        setCurrentQuestionIndex(ANALYSIS_QUESTIONS.length - 1);
      }
    }
  }, [sessionId]);

  // Fetch AI suggestions
  useEffect(() => {
    const fetchSuggestion = async () => {
      if (!currentQuestion || !hasEnteredIdea) return;
      
      setLoadingSuggestion(true);
      setAiSuggestion(null);
      
      try {
        const conversation = [
          { role: 'user', content: `Startup idea: ${ideaInput}` },
          ...Object.entries(answers).map(([field, answer]) => ({
            role: 'assistant',
            content: `${field}: ${answer}`
          }))
        ];

        const { data, error } = await supabase.functions.invoke('generate-analysis-suggestions', {
          body: { 
            question: currentQuestion.field,
            idea: ideaInput,
            conversation,
            context: answers
          }
        });

        if (data?.suggestion) {
          setAiSuggestion(data.suggestion);
        }
      } catch (error) {
        console.error('Error fetching suggestion:', error);
      } finally {
        setLoadingSuggestion(false);
      }
    };

    fetchSuggestion();
  }, [currentQuestionIndex, hasEnteredIdea]);

  const handleSubmitIdea = () => {
    if (!ideaInput.trim() || !sessionId) return;
    
    setHasEnteredIdea(true);
    // Store in session-specific keys only
    const sessionIdeaKey = `session_${sessionId}_idea`;
    localStorage.setItem(sessionIdeaKey, ideaInput);
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() && currentQuestion.type === 'text') return;
    if (!sessionId) return;
    
    setIsProcessing(true);
    
    const updatedAnswers = { ...answers, [currentQuestion.field]: currentAnswer };
    setAnswers(updatedAnswers);
    const sessionAnswersKey = `session_${sessionId}_answers`;
    localStorage.setItem(sessionAnswersKey, JSON.stringify(updatedAnswers));
    
    if (onUpdateData) onUpdateData();
    
    if (currentQuestionIndex < ANALYSIS_QUESTIONS.length - 1) {
      setDirection(1);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
    } else {
      await completeAnalysis(updatedAnswers);
    }
    
    setIsProcessing(false);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setDirection(-1);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevQuestion = ANALYSIS_QUESTIONS[currentQuestionIndex - 1];
      setCurrentAnswer(answers[prevQuestion.field] || '');
    }
  };

  const completeAnalysis = async (finalAnswers: Record<string, string>) => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: { 
          idea: ideaInput,
          analysisType: 'complete',
          answers: finalAnswers,
          conversation: [],
          context: { answers: finalAnswers, sessionId }
        }
      });

      if (error) throw error;
      
      // Store completion flag in session-specific key
      if (sessionId) {
        localStorage.setItem(`session_${sessionId}_analysis_completed`, 'true');
      }
      
      if (onComplete) {
        onComplete(ideaInput);
      }
      
      toast({
        title: "Analysis Complete!",
        description: "Your dashboard has been generated with personalized insights.",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to complete analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const skipQuestion = () => {
    if (currentQuestionIndex < ANALYSIS_QUESTIONS.length - 1) {
      setDirection(1);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
    } else {
      completeAnalysis(answers);
    }
  };

  // Slide variants for framer-motion
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  // Initial idea input screen
  if (!hasEnteredIdea) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full"
        >
          <Card className="p-8 shadow-2xl border-0 bg-gradient-to-br from-card to-card/80">
            <div className="text-center space-y-6">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">What's your startup idea?</h1>
                <p className="text-lg text-muted-foreground">
                  Describe your business concept and we'll help you analyze its potential
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    placeholder="e.g., An AI-powered platform that helps small businesses automate their customer support..."
                    value={ideaInput}
                    onChange={(e) => setIdeaInput(e.target.value)}
                    className="w-full min-h-[120px] p-4 text-base rounded-xl border bg-secondary/30 resize-none focus:bg-secondary/50 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSubmitIdea();
                      }
                    }}
                  />
                </div>
                
                <Button
                  onClick={handleSubmitIdea}
                  size="lg"
                  className="w-full gap-2 h-12 text-base"
                  disabled={!ideaInput.trim()}
                >
                  Start Analysis
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                {[
                  { icon: Target, text: "PMF Analysis", color: "text-green-500" },
                  { icon: TrendingUp, text: "Market Insights", color: "text-blue-500" },
                  { icon: Users, text: "User Metrics", color: "text-purple-500" },
                  { icon: DollarSign, text: "Revenue Strategy", color: "text-yellow-500" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <item.icon className={cn("h-4 w-4", item.color)} />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Main analysis interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex flex-col">
      {/* Progress Header */}
      <div className="p-6 border-b bg-background/80 backdrop-blur">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Business Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {ANALYSIS_QUESTIONS.length}
                </p>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="px-4 py-1.5 text-sm font-medium"
            >
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          
          {/* Visual Progress */}
          <div className="space-y-3">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between">
              {ANALYSIS_QUESTIONS.map((q, idx) => (
                <div
                  key={q.id}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                    idx < currentQuestionIndex ? "bg-primary text-primary-foreground" :
                    idx === currentQuestionIndex ? "bg-primary text-primary-foreground ring-4 ring-primary/30" :
                    "bg-secondary text-muted-foreground"
                  )}
                >
                  {answers[q.field] ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : idx === currentQuestionIndex ? (
                    <Circle className="h-5 w-5" />
                  ) : (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {!isAnalyzing ? (
              <motion.div
                key={currentQuestionIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
              >
                <Card className="p-8 shadow-2xl border-0 bg-card/95 backdrop-blur">
                  <div className="space-y-6">
                    {/* Question Header */}
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/25 to-primary/15">
                        <currentQuestion.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold">{currentQuestion.question}</h2>
                          <Badge 
                            variant={
                              currentQuestion.importance === 'critical' ? "destructive" :
                              currentQuestion.importance === 'important' ? "default" : "secondary"
                            }
                          >
                            {currentQuestion.importance}
                          </Badge>
                        </div>
                        {currentQuestion.context && (
                          <p className="text-sm text-muted-foreground">{currentQuestion.context}</p>
                        )}
                      </div>
                    </div>

                    {/* AI Suggestion */}
                    {loadingSuggestion ? (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                        <div className="flex items-center gap-3">
                          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-primary mb-1">AI is thinking...</p>
                            <div className="h-4 bg-primary/10 rounded animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ) : aiSuggestion && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                      >
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="text-sm font-medium text-primary mb-1.5">AI Suggestion</p>
                              <p className="text-sm leading-relaxed">{aiSuggestion}</p>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setCurrentAnswer(aiSuggestion)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Use this suggestion
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Answer Input */}
                    <div className="space-y-4">
                      {currentQuestion.type === 'text' ? (
                        <div className="relative">
                          <textarea
                            placeholder={currentQuestion.placeholder || "Type your answer here..."}
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            className="w-full min-h-[100px] p-4 rounded-xl border bg-secondary/30 resize-none focus:bg-secondary/50 transition-colors"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                handleSubmitAnswer();
                              }
                            }}
                          />
                          <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                            {currentAnswer.length} chars
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {currentQuestion.options?.map((option) => (
                            <Button
                              key={option}
                              variant={currentAnswer === option ? "default" : "outline"}
                              className="h-auto py-3 px-4 justify-start"
                              onClick={() => setCurrentAnswer(option)}
                            >
                              {currentAnswer === option && <CheckCircle className="h-4 w-4 mr-2" />}
                              {option}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Button
                        variant="ghost"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0 || isProcessing}
                        className="gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={skipQuestion}
                          disabled={isProcessing}
                        >
                          Skip
                        </Button>
                        <Button
                          onClick={handleSubmitAnswer}
                          disabled={isProcessing || (!currentAnswer.trim() && currentQuestion.type === 'text')}
                          className="gap-2 min-w-[120px]"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : currentQuestionIndex === ANALYSIS_QUESTIONS.length - 1 ? (
                            <>
                              Complete
                              <CheckCircle className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              Next
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-primary/40 to-primary/20">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Creating your dashboard...</h2>
                  <p className="text-muted-foreground">Analyzing responses and generating insights</p>
                </div>
                <Progress value={75} className="w-64 mx-auto h-2" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};