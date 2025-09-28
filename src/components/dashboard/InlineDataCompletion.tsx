import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Info, AlertCircle, CheckCircle, ChevronRight, 
  Target, Users, TrendingUp, DollarSign, Lightbulb,
  Sparkles, Send, Loader2, ArrowRight, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ValidationResult, REQUIRED_FIELDS } from './DataValidation';

interface InlineDataCompletionProps {
  validation: ValidationResult | null;
  onComplete: () => void;
  idea: string | null;
}

export const InlineDataCompletion: React.FC<InlineDataCompletionProps> = ({ 
  validation, 
  onComplete,
  idea 
}) => {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Load existing answers
  useEffect(() => {
    const savedAnswers = localStorage.getItem('pmf.user.answers');
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
  }, []);

  // Auto-select first missing field
  useEffect(() => {
    if (validation && !activeQuestion && validation.missingFields.length > 0) {
      const firstMissing = REQUIRED_FIELDS.find(f => validation.missingFields.includes(f.key));
      if (firstMissing) {
        setActiveQuestion(firstMissing.key);
      }
    }
  }, [validation, activeQuestion]);

  // Fetch AI suggestions for active question
  useEffect(() => {
    const fetchSuggestion = async () => {
      if (!activeQuestion || !idea) return;
      
      const field = REQUIRED_FIELDS.find(f => f.key === activeQuestion);
      if (!field) return;
      
      setLoadingSuggestion(true);
      setAiSuggestion(null);
      
      try {
        const conversation = [
          { role: 'user', content: `Startup idea: ${idea}` },
          ...Object.entries(answers).map(([key, value]) => ({
            role: 'assistant',
            content: `${key}: ${value}`
          }))
        ];

        const { data, error } = await supabase.functions.invoke('generate-analysis-suggestions', {
          body: { 
            question: activeQuestion,
            idea: idea,
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
  }, [activeQuestion, idea, answers]);

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim() || !activeQuestion) return;
    
    setIsProcessing(true);
    
    // Save answer
    const updatedAnswers = { ...answers, [activeQuestion]: currentAnswer };
    setAnswers(updatedAnswers);
    localStorage.setItem('pmf.user.answers', JSON.stringify(updatedAnswers));
    
    // Clear current state
    setCurrentAnswer('');
    setAiSuggestion(null);
    
    // Move to next question or complete
    const remainingFields = validation?.missingFields.filter(f => f !== activeQuestion) || [];
    if (remainingFields.length > 0) {
      const nextField = REQUIRED_FIELDS.find(f => remainingFields.includes(f.key));
      if (nextField) {
        setActiveQuestion(nextField.key);
      }
    } else {
      setActiveQuestion(null);
      toast({
        title: "Information Complete!",
        description: "Your dashboard is now ready with all required data.",
      });
      onComplete();
    }
    
    setIsProcessing(false);
  };

  if (!validation) return null;

  const safeMissingFields = Array.isArray(validation.missingFields) ? validation.missingFields : [];
  const safeDataCompleteness = typeof validation.dataCompleteness === 'number' ? validation.dataCompleteness : 0;
  const safeReady = !!validation.readyForDashboard;

  const activeField = REQUIRED_FIELDS.find(f => f.key === activeQuestion);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'text-red-500';
      case 'important': return 'text-yellow-500';
      case 'helpful': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="p-6 border-primary/20 bg-gradient-to-br from-card to-card/80">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Complete Your Dashboard</h3>
            <p className="text-sm text-muted-foreground">
              Answer a few questions to unlock all insights
            </p>
          </div>
        </div>
        <Badge variant={safeReady ? "default" : "secondary"} className={safeReady ? "bg-green-500/20 text-green-500 border-green-500/50" : ""}>
          {safeDataCompleteness}% Complete
        </Badge>
      </div>

      <Progress value={safeDataCompleteness} className="h-2 mb-6" />

      {!safeReady ? (
        <div className="space-y-4">
          {/* Questions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {REQUIRED_FIELDS.filter(field => safeMissingFields.includes(field.key))
              .map((field) => {
                const Icon = field.icon;
                const isActive = field.key === activeQuestion;
                const isAnswered = answers[field.key];
                
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "border rounded-lg p-3 cursor-pointer transition-all",
                      isActive ? "border-primary bg-primary/10" : "hover:border-primary/50",
                      isAnswered ? "opacity-50" : ""
                    )}
                    onClick={() => !isAnswered && setActiveQuestion(field.key)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4", getImportanceColor(field.importance))} />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{field.label}</span>
                        {isAnswered && (
                          <CheckCircle className="h-3 w-3 text-green-500 ml-2 inline" />
                        )}
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4" />}
                    </div>
                  </motion.div>
                );
              })}
          </div>

          {/* Active Question Interface */}
          <AnimatePresence mode="wait">
            {activeField && (
              <motion.div
                key={activeField.key}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border rounded-lg bg-secondary/30 max-h-[400px] overflow-y-auto"
              >
                <div className="space-y-4 p-4">
                  {/* Question */}
                  <div className="flex items-start gap-3">
                    <activeField.icon className={cn("h-5 w-5 mt-0.5", getImportanceColor(activeField.importance))} />
                    <div className="flex-1">
                      <p className="font-medium">{activeField.question}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {activeField.importance}
                      </Badge>
                    </div>
                  </div>

                  {/* AI Suggestion */}
                  {loadingSuggestion ? (
                    <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-sm text-primary">AI is thinking...</span>
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      </div>
                    </div>
                  ) : aiSuggestion && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-primary mb-1">AI Suggestion</p>
                          <p className="text-sm">{aiSuggestion}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 gap-1.5 h-7 text-xs"
                            onClick={() => setCurrentAnswer(aiSuggestion)}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Use this suggestion
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Answer Input - Sticky at bottom */}
                  <div className="sticky bottom-0 bg-secondary/30 p-3 -m-3 mt-3 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your answer..."
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                        className="flex-1 bg-background/50"
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
                            Submit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Info */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Answer {safeMissingFields.length} more questions to unlock:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {['Market Analysis', 'Competitor Insights', 'Revenue Projections', 'Growth Strategy'].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-muted-foreground" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Excellent! You've provided all the necessary information for comprehensive dashboard insights.
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Live Data Active
              </Badge>
            </div>
            <Button onClick={onComplete} className="gap-2">
              Refresh Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// Add missing import
import { Activity } from 'lucide-react';