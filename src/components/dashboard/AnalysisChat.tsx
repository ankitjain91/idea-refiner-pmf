import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  idea: string;
  onComplete?: () => void;
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

export const AnalysisChat = ({ idea, onComplete, onUpdateData }: AnalysisChatProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentQuestion = ANALYSIS_QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / ANALYSIS_QUESTIONS.length) * 100;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentQuestionIndex, answers]);

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
    
    // Update localStorage with enriched metadata
    const existingMetadata = JSON.parse(localStorage.getItem('ideaMetadata') || '{}');
    const updatedMetadata = {
      ...existingMetadata,
      ...newAnswers
    };
    localStorage.setItem('ideaMetadata', JSON.stringify(updatedMetadata));
    
    // Update conversation history
    const conversationHistory = JSON.parse(localStorage.getItem('conversationHistory') || '[]');
    conversationHistory.push(
      { role: 'assistant', content: currentQuestion.question },
      { role: 'user', content: currentAnswer }
    );
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
    
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
      // Validate and generate insights
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: {
          idea,
          analysisType: 'full',
          metadata: allAnswers,
          conversation: JSON.parse(localStorage.getItem('conversationHistory') || '[]')
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

  return (
    <Card className="flex flex-col h-[600px] border-primary/20 bg-gradient-to-br from-card to-card/80">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Dashboard Analysis</h3>
            <p className="text-xs text-muted-foreground">Answer questions to unlock insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentQuestionIndex + 1} / {ANALYSIS_QUESTIONS.length}
          </Badge>
          <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* Show previous answers */}
          {Object.entries(answers).map(([field, answer], idx) => {
            const question = ANALYSIS_QUESTIONS.find(q => q.field === field);
            if (!question) return null;
            
            return (
              <motion.div
                key={field}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {/* Question */}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <question.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-sm">{question.question}</p>
                    </div>
                  </div>
                </div>
                
                {/* Answer */}
                <div className="flex items-start gap-3 pl-9">
                  <div className="flex-1">
                    <div className="bg-primary/10 rounded-lg p-3">
                      <p className="text-sm">{answer}</p>
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                </div>
              </motion.div>
            );
          })}

          {/* Current Question */}
          {!isAnalyzing && currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              <div className="p-1.5 rounded-lg bg-primary/10">
                <currentQuestion.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium">{currentQuestion.question}</p>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        currentQuestion.importance === 'critical' && "border-red-500/50 text-red-500",
                        currentQuestion.importance === 'important' && "border-yellow-500/50 text-yellow-500",
                        currentQuestion.importance === 'helpful' && "border-green-500/50 text-green-500"
                      )}
                    >
                      {currentQuestion.importance}
                    </Badge>
                  </div>
                  
                  {/* Options for select type */}
                  {currentQuestion.type === 'select' && currentQuestion.options && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {currentQuestion.options.map((option) => (
                        <Button
                          key={option}
                          variant={currentAnswer === option ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentAnswer(option)}
                          className="justify-start"
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Analyzing State */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center py-8"
            >
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm font-medium">Analyzing your responses...</p>
                <p className="text-xs text-muted-foreground">Generating personalized insights</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isAnalyzing && currentQuestion && (
        <div className="p-4 border-t border-white/10">
          {currentQuestion.type === 'text' && (
            <div className="flex gap-2">
              <Input
                placeholder="Type your answer..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                className="flex-1 bg-white/5 border-white/10"
                disabled={isProcessing}
              />
              <Button
                onClick={handleSubmitAnswer}
                disabled={isProcessing || !currentAnswer.trim()}
                className="gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={skipQuestion}
                disabled={isProcessing}
              >
                Skip
              </Button>
            </div>
          )}
          
          {currentQuestion.type === 'select' && (
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitAnswer}
                disabled={isProcessing || !currentAnswer}
                className="flex-1 gap-2"
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
              <Button
                variant="outline"
                onClick={skipQuestion}
                disabled={isProcessing}
              >
                Skip
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};