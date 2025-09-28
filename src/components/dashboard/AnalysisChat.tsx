import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, Send, Loader2, CheckCircle, 
  AlertCircle, Target, Users, TrendingUp, 
  DollarSign, Lightbulb, Sparkles, ArrowRight
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
}

interface AnalysisChatProps {
  idea: string | null;
  sessionId?: string;
  onComplete?: (ideaText?: string) => void;
  onUpdateData?: (data: any) => void;
}

const ANALYSIS_QUESTIONS: AnalysisQuestion[] = [
  {
    id: 'target_audience',
    field: 'targetAudience',
    question: 'Who is your target audience? Be specific about demographics and psychographics.',
    type: 'text',
    icon: Users,
    importance: 'critical'
  },
  {
    id: 'problem_solving',
    field: 'problemSolving',
    question: 'What specific problem are you solving? Describe the pain point clearly.',
    type: 'text',
    icon: Target,
    importance: 'critical'
  },
  {
    id: 'business_model',
    field: 'businessModel',
    question: 'How will you make money? Describe your business model.',
    type: 'select',
    options: ['B2B SaaS', 'B2C Subscription', 'Marketplace', 'E-commerce', 'Freemium', 'Other'],
    icon: DollarSign,
    importance: 'critical'
  },
  {
    id: 'market_size',
    field: 'marketSize',
    question: 'What is your estimated market size?',
    type: 'select',
    options: ['< $1M', '$1M - $10M', '$10M - $100M', '$100M - $1B', '> $1B'],
    icon: TrendingUp,
    importance: 'important'
  },
  {
    id: 'unique_value',
    field: 'uniqueValue',
    question: 'What makes your solution unique compared to existing alternatives?',
    type: 'text',
    icon: Sparkles,
    importance: 'important'
  },
  {
    id: 'competitor_analysis',
    field: 'competitorAnalysis',
    question: 'Who are your main competitors and how will you differentiate?',
    type: 'text',
    icon: Users,
    importance: 'helpful'
  }
];

export const AnalysisChat = ({ idea, sessionId, onComplete, onUpdateData }: AnalysisChatProps) => {
  const [ideaText, setIdeaText] = useState<string>('');
  const [ideaInput, setIdeaInput] = useState('');
  const [hasEnteredIdea, setHasEnteredIdea] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for existing idea on mount or when props change
  useEffect(() => {
    // First check if idea was passed as prop
    if (idea) {
      setIdeaText(idea);
      setHasEnteredIdea(true);
      return;
    }

    // Check session storage for existing idea
    if (sessionId) {
      const sessionIdeaKey = `session_${sessionId}_idea`;
      const sessionMetadataKey = `session_${sessionId}_metadata`;
      const sessionConversationKey = `session_${sessionId}_conversation`;
      
      // Try to get idea from storage
      const storedIdea = localStorage.getItem(sessionIdeaKey);
      if (storedIdea) {
        const metadata = localStorage.getItem(sessionMetadataKey);
        try {
          const parsedMetadata = metadata ? JSON.parse(metadata) : null;
          const refinedIdea = parsedMetadata?.refined || storedIdea;
          setIdeaText(refinedIdea);
          setHasEnteredIdea(true);
          return;
        } catch {
          setIdeaText(storedIdea);
          setHasEnteredIdea(true);
          return;
        }
      }

      // Try to extract from conversation history
      const conversationHistory = localStorage.getItem(sessionConversationKey);
      if (conversationHistory) {
        try {
          const history = JSON.parse(conversationHistory);
          const ideaMessage = history.find((msg: any) => 
            msg.role === 'user' && msg.content.toLowerCase().includes('startup idea:')
          );
          if (ideaMessage) {
            const extractedIdea = ideaMessage.content.replace(/^.*startup idea:\s*/i, '').trim();
            if (extractedIdea) {
              setIdeaText(extractedIdea);
              setHasEnteredIdea(true);
              // Save to storage for consistency
              localStorage.setItem(sessionIdeaKey, extractedIdea);
              localStorage.setItem(sessionMetadataKey, JSON.stringify({ refined: extractedIdea }));
            }
          }
        } catch (e) {
          console.error('Error parsing conversation history:', e);
        }
      }
    }
  }, [idea, sessionId]);

  const currentQuestion = hasEnteredIdea ? ANALYSIS_QUESTIONS[currentQuestionIndex] : null;
  const progress = ((currentQuestionIndex + 1) / ANALYSIS_QUESTIONS.length) * 100;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentQuestionIndex, answers]);

  // Fetch AI suggestion when question changes
  useEffect(() => {
    const fetchAISuggestion = async () => {
      console.log('=== fetchAISuggestion useEffect triggered ===');
      console.log('hasEnteredIdea:', hasEnteredIdea);
      console.log('currentQuestion:', currentQuestion);
      console.log('ideaText:', ideaText);
      
      // Always proceed with fetching suggestions if we have a question
      if (!currentQuestion) {
        console.log('No current question available');
        return;
      }
      
      // Even if no idea is entered yet, we should still show helpful suggestions
      if (!hasEnteredIdea || !ideaText) {
        console.log('No idea entered yet - will provide general guidance');
      }
      
      setLoadingSuggestion(true);
      setAiSuggestion('');
      
      try {
        const conversationKey = sessionId ? `session_${sessionId}_conversation` : 'conversationHistory';
        const conversationHistory = JSON.parse(localStorage.getItem(conversationKey) || '[]');
        
        console.log('About to invoke generate-analysis-suggestions');
        console.log('Field:', currentQuestion.field);
        console.log('Question:', currentQuestion.question);
        
        const { data, error } = await supabase.functions.invoke('generate-analysis-suggestions', {
          body: {
            question: currentQuestion.question,
            field: currentQuestion.field,
            conversationHistory,
            ideaText: ideaText || 'Not yet specified', // Provide fallback if no idea yet
            previousAnswers: answers
          }
        });
        console.log('Suggestion invoke completed:', { data, error });
        
        if (error) {
          console.error('Error from edge function:', error);
          // Provide helpful fallback suggestions based on the question
          const fallbackSuggestion = getFallbackSuggestion(currentQuestion);
          setAiSuggestion(fallbackSuggestion);
        } else if (data?.error) {
          console.error('Edge function returned error:', data.error);
          const fallbackSuggestion = getFallbackSuggestion(currentQuestion);
          setAiSuggestion(fallbackSuggestion);
        } else if (data?.suggestion) {
          console.log('Received suggestion:', data.suggestion);
          setAiSuggestion(data.suggestion);
        } else {
          // No suggestion returned - provide fallback
          const fallbackSuggestion = getFallbackSuggestion(currentQuestion);
          setAiSuggestion(fallbackSuggestion);
        }
      } catch (error) {
        console.error('Error fetching AI suggestion:', error);
        // Provide helpful fallback suggestions
        const fallbackSuggestion = getFallbackSuggestion(currentQuestion);
        setAiSuggestion(fallbackSuggestion);
      } finally {
        setLoadingSuggestion(false);
      }
    };
    
    // Helper function to provide useful fallback suggestions
    const getFallbackSuggestion = (question: AnalysisQuestion): string => {
      const fallbacks: Record<string, string> = {
        targetAudience: "Consider defining your ideal customer profile by age, profession, interests, and pain points. Be specific about who would benefit most from your solution.",
        problemSolving: "Think about the specific frustration or challenge your target audience faces daily. What keeps them up at night? What would they pay to solve?",
        businessModel: "Consider how similar successful businesses generate revenue. Will you charge per user, per transaction, or offer a subscription? Think about what pricing model aligns with your value proposition.",
        marketSize: "Research the number of potential customers and their willingness to pay. Look at industry reports, competitor revenues, and growth trends in your space.",
        uniqueValue: "Focus on what makes your approach different. Is it faster, cheaper, more convenient, or solving the problem in a completely new way?",
        competitorAnalysis: "Research existing solutions and identify their weaknesses. How will you position yourself differently? What gaps in the market can you fill?"
      };
      
      return fallbacks[question.field] || "Think carefully about this aspect of your business. Consider industry best practices and what would resonate with your target audience.";
    };
    
    // Delay slightly to ensure state is ready
    const timer = setTimeout(() => {
      fetchAISuggestion();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentQuestionIndex, currentQuestion, hasEnteredIdea, ideaText]);

  const handleSubmitIdea = () => {
    console.log('=== handleSubmitIdea called ===');
    console.log('ideaInput:', ideaInput);
    
    if (!ideaInput.trim()) {
      toast({
        title: "Idea Required",
        description: "Please enter your startup idea to begin analysis.",
        variant: "destructive"
      });
      return;
    }

    // Save idea to session-specific localStorage
    if (sessionId) {
      const sessionIdeaKey = `session_${sessionId}_idea`;
      const sessionMetadataKey = `session_${sessionId}_metadata`;
      const sessionConversationKey = `session_${sessionId}_conversation`;
      
      localStorage.setItem(sessionIdeaKey, ideaInput);
      localStorage.setItem(sessionMetadataKey, JSON.stringify({ refined: ideaInput }));
      
      // Initialize session-specific conversation history
      localStorage.setItem(sessionConversationKey, JSON.stringify([
        { role: 'user', content: `My startup idea: ${ideaInput}` }
      ]));
    } else {
      // Fallback to global storage if no sessionId
      localStorage.setItem('ideaText', ideaInput);
      localStorage.setItem('ideaMetadata', JSON.stringify({ refined: ideaInput }));
      localStorage.setItem('conversationHistory', JSON.stringify([
        { role: 'user', content: `My startup idea: ${ideaInput}` }
      ]));
    }
    
    // Pass the idea to parent if onComplete expects it
    if (onComplete) {
      onComplete(ideaInput);
    }
    
    console.log('Setting ideaText and hasEnteredIdea to true');
    setIdeaText(ideaInput);
    setHasEnteredIdea(true);
    setIdeaInput('');
    console.log('State updated - should trigger suggestion fetch');
    
  };

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    // Save answer
    const newAnswers = {
      ...answers,
      [currentQuestion.field]: currentAnswer
    };
    setAnswers(newAnswers);
    
    // Update session-specific localStorage with enriched metadata
    const metadataKey = sessionId ? `session_${sessionId}_metadata` : 'ideaMetadata';
    const existingMetadata = JSON.parse(localStorage.getItem(metadataKey) || '{}');
    const updatedMetadata = {
      ...existingMetadata,
      ...newAnswers
    };
    localStorage.setItem(metadataKey, JSON.stringify(updatedMetadata));
    
    // Update session-specific conversation history
    const conversationKey = sessionId ? `session_${sessionId}_conversation` : 'conversationHistory';
    const conversationHistory = JSON.parse(localStorage.getItem(conversationKey) || '[]');
    conversationHistory.push(
      { role: 'assistant', content: currentQuestion.question },
      { role: 'user', content: currentAnswer }
    );
    localStorage.setItem(conversationKey, JSON.stringify(conversationHistory));
    
    // Notify parent of data update
    if (onUpdateData) {
      onUpdateData(updatedMetadata);
    }

    setCurrentAnswer('');
    setIsProcessing(false);

    // Move to next question or complete
    if (currentQuestionIndex < ANALYSIS_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered - complete analysis
      await completeAnalysis(newAnswers);
    }
  };

  const completeAnalysis = async (allAnswers: Record<string, string>) => {
    setIsAnalyzing(true);
    
    try {
      // Get session-specific conversation history
      const conversationKey = sessionId ? `session_${sessionId}_conversation` : 'conversationHistory';
      const conversationHistory = JSON.parse(localStorage.getItem(conversationKey) || '[]');
      
      // Validate and generate insights
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: {
          idea: ideaText,
          analysisType: 'full',
          metadata: allAnswers,
          conversation: conversationHistory
        }
      });

      if (error) throw error;

      // Save validation status
      localStorage.setItem('dashboardValidation', JSON.stringify({
        readyForDashboard: true,
        missingFields: [],
        completeness: 100
      }));

      toast({
        title: "Analysis Complete!",
        description: "Your dashboard is now ready with full insights.",
      });

      // Trigger completion callback
      if (onComplete) {
        onComplete();
      }
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
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
    } else {
      completeAnalysis(answers);
    }
  };

  // Show idea input screen if no idea yet
  if (!hasEnteredIdea) {
    return (
      <Card className="flex flex-col h-[600px] border-primary/20 bg-gradient-to-br from-card to-card/80">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Start Your Analysis</h3>
              <p className="text-xs text-muted-foreground">Tell us about your startup idea</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">What's your startup idea?</h2>
              <p className="text-muted-foreground">
                Describe your business concept in a few sentences. Be as specific as possible.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="E.g., An AI-powered platform that helps small businesses automate their customer support..."
                  value={ideaInput}
                  onChange={(e) => setIdeaInput(e.target.value)}
                  className="min-h-[100px] pt-3 pb-3 pr-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitIdea();
                    }
                  }}
                />
                <Button
                  onClick={handleSubmitIdea}
                  size="icon"
                  className="absolute bottom-2 right-2"
                  disabled={!ideaInput.trim()}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>PMF Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Market Insights</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Growth Strategy</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Competitor Analysis</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col h-[700px] border-0 shadow-2xl bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Enhanced Header with Better Progress */}
      <div className="p-6 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20 backdrop-blur">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Dashboard Analysis</h3>
              <p className="text-sm text-muted-foreground">Let's understand your business better</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              Question {currentQuestionIndex + 1} of {ANALYSIS_QUESTIONS.length}
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
              <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary via-primary to-primary/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages with Better Visual Hierarchy */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <AnimatePresence mode="wait">
          {/* Previous Q&A Pairs */}
          {Object.entries(answers).map(([field, answer], idx) => {
            const question = ANALYSIS_QUESTIONS.find(q => q.field === field);
            if (!question) return null;
            
            return (
              <motion.div
                key={field}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="mb-6"
              >
                {/* Question Bubble */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm">
                    <question.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-secondary/50 backdrop-blur rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <p className="text-sm font-medium">{question.question}</p>
                    </div>
                  </div>
                </div>
                
                {/* Answer Bubble */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm ml-auto">
                      <p className="text-sm">{answer}</p>
                    </div>
                  </div>
                  <div className="p-1.5 rounded-full bg-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Loading AI Suggestion State */}
          {!isAnalyzing && currentQuestion && loadingSuggestion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center py-12"
            >
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping">
                    <div className="h-16 w-16 rounded-full bg-primary/20 mx-auto" />
                  </div>
                  <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 mx-auto w-fit">
                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">AI is thinking...</p>
                  <p className="text-xs text-muted-foreground">Analyzing your context to provide personalized suggestions</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Current Question Card - Enhanced Design */}
          {!isAnalyzing && currentQuestion && !loadingSuggestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="space-y-4"
            >
              {/* Question Card */}
              <div className="bg-gradient-to-br from-secondary via-secondary/80 to-secondary/60 rounded-2xl p-6 shadow-lg border border-border/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/25 to-primary/15">
                      <currentQuestion.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-base mb-1">{currentQuestion.question}</p>
                      <Badge 
                        variant={
                          currentQuestion.importance === 'critical' ? "destructive" :
                          currentQuestion.importance === 'important' ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {currentQuestion.importance}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* AI Suggestion Card */}
                {aiSuggestion && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg bg-primary/20">
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1.5">AI Suggestion</p>
                          <p className="text-sm leading-relaxed">{aiSuggestion}</p>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setCurrentAnswer(aiSuggestion);
                            toast({
                              title: "Suggestion applied",
                              description: "You can edit it before sending",
                            });
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Use this suggestion
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Options Grid for Select Type */}
                {currentQuestion.type === 'select' && currentQuestion.options && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {currentQuestion.options.map((option, idx) => (
                      <motion.div
                        key={option}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Button
                          variant={currentAnswer === option ? "default" : "outline"}
                          className="w-full justify-start gap-2 h-auto py-3 px-4"
                          onClick={() => setCurrentAnswer(option)}
                        >
                          {currentAnswer === option && <CheckCircle className="h-4 w-4" />}
                          <span className="text-sm">{option}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Analyzing State - Enhanced */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center py-16"
            >
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 mx-auto" />
                  </div>
                  <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 mx-auto w-fit">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">Creating your dashboard...</p>
                  <p className="text-sm text-muted-foreground">Analyzing responses and generating insights</p>
                  <Progress value={75} className="w-48 mx-auto h-2" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      {!isAnalyzing && currentQuestion && !loadingSuggestion && (
        <div className="p-6 border-t bg-gradient-to-t from-background via-background/95 to-transparent">
          {currentQuestion.type === 'text' && (
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Type your answer here..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitAnswer()}
                  className="pr-12 py-6 text-sm bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-colors"
                  disabled={isProcessing}
                />
                <Badge variant="outline" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                  {currentAnswer.length > 0 ? `${currentAnswer.length} chars` : 'Required'}
                </Badge>
              </div>
              <Button
                onClick={handleSubmitAnswer}
                disabled={isProcessing || !currentAnswer.trim()}
                size="lg"
                className="gap-2 px-6"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={skipQuestion}
                disabled={isProcessing}
                size="lg"
                className="text-muted-foreground"
              >
                Skip
              </Button>
            </div>
          )}
          
          {currentQuestion.type === 'select' && (
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={skipQuestion}
                disabled={isProcessing}
                size="lg"
                className="text-muted-foreground"
              >
                Skip this question
              </Button>
              <Button
                onClick={handleSubmitAnswer}
                disabled={isProcessing || !currentAnswer}
                size="lg"
                className="gap-2 px-8"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};