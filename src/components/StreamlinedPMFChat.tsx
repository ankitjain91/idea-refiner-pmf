import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  TrendingUp,
  Loader2,
  ChevronRight,
  BarChart3,
  Target,
  Users,
  DollarSign,
  Rocket,
  Shield,
  Zap,
  MessageSquare,
  Brain,
  Lightbulb,
  Star,
  ArrowRight,
  RotateCcw,
  Edit2,
  SkipForward,
  Check,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import ChatStepIndicator from './ChatStepIndicator';
import MarketInsightsPreview from './MarketInsightsPreview';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  stepIndex?: number;
}

interface StreamlinedPMFChatProps {
  onAnalysisReady: (idea: string, metadata: any) => void;
  resetTrigger?: number;
}

const StreamlinedPMFChat: React.FC<StreamlinedPMFChatProps> = ({ onAnalysisReady, resetTrigger }) => {
  const conversationSteps = [
    {
      question: "What's your startup idea? Describe it in a few sentences.",
      placeholder: "E.g., An AI-powered platform that helps small businesses automate their customer service...",
      suggestions: [
        "AI tool for content creators",
        "Marketplace for local services",
        "Health tracking for seniors",
        "Educational platform for kids"
      ]
    },
    {
      question: "Who is your target audience? Be specific about demographics and needs.",
      placeholder: "E.g., Small business owners aged 30-50 who need affordable automation...",
      suggestions: [
        "Young professionals 25-35 in urban areas",
        "Small business owners with 10-50 employees",
        "Parents with school-age children",
        "Students and educators in higher education"
      ]
    },
    {
      question: "What specific problem does your product solve?",
      placeholder: "E.g., Businesses waste 20+ hours/week on repetitive customer inquiries...",
      suggestions: [
        "Saves 10+ hours per week on daily tasks",
        "Reduces operational costs by 30-50%",
        "Improves team communication and collaboration",
        "Enhances productivity and workflow efficiency"
      ]
    },
    {
      question: "What's your revenue model?",
      placeholder: "E.g., SaaS with tiered pricing starting at $29/month...",
      suggestions: [
        "SaaS subscription with monthly tiers",
        "Transaction fees on each sale",
        "Freemium model with premium features",
        "One-time purchase with optional upgrades"
      ]
    },
    {
      question: "Who are your main competitors and how are you different?",
      placeholder: "E.g., Unlike Zendesk which is expensive and complex, we focus on simplicity...",
      suggestions: [
        "No direct competitors in this niche yet",
        "Traditional solutions are outdated and expensive",
        "Similar startups but we have unique features",
        "Enterprise tools that are too complex for SMBs"
      ]
    },
    {
      question: "What's your go-to-market strategy?",
      placeholder: "E.g., Content marketing + free trial + referral program...",
      suggestions: [
        "Content marketing and SEO",
        "Social media ads and influencers",
        "Direct B2B sales and partnerships",
        "Product-led growth with viral features"
      ]
    },
    {
      question: "What's your unique value proposition?",
      placeholder: "E.g., 50% cheaper, 3x faster implementation, no-code solution...",
      suggestions: [
        "10x better user experience",
        "50% lower cost than alternatives",
        "Innovative AI-powered features",
        "Focus on underserved niche"
      ]
    },
    {
      question: "What's your timeline and current stage?",
      placeholder: "E.g., MVP ready, launching beta in 2 weeks...",
      suggestions: [
        "Launching MVP in 3 months",
        "Building prototype, need 6 weeks",
        "Beta testing with 50 users now",
        "Planning phase, validating idea"
      ]
    }
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepAnswers, setStepAnswers] = useState<Record<number, string>>({});
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [showMarketPreview, setShowMarketPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with first question
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'step-0',
        type: 'bot',
        content: conversationSteps[0].question,
        timestamp: new Date(),
        suggestions: conversationSteps[0].suggestions,
        stepIndex: 0
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Reset on trigger
  useEffect(() => {
    if (resetTrigger) {
      resetChat();
    }
  }, [resetTrigger]);

  const resetChat = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setStepAnswers({});
    setEditingStep(null);
    setShowMarketPreview(false);
    setIsAnalyzing(false);
    setIsTyping(false);
    
    const welcomeMessage: Message = {
      id: 'step-0',
      type: 'bot',
      content: conversationSteps[0].question,
      timestamp: new Date(),
      suggestions: conversationSteps[0].suggestions,
      stepIndex: 0
    };
    setMessages([welcomeMessage]);
    setInput('');
    
    // Clear localStorage
    localStorage.removeItem('userIdea');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('userRefinements');
    localStorage.removeItem('ideaMetadata');
    localStorage.removeItem('currentSessionId');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStepAnswer = async (answer: string, stepIndex: number) => {
    if (!answer.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${stepIndex}`,
      type: 'user',
      content: answer,
      timestamp: new Date(),
      stepIndex
    };

    // Update state
    const newAnswers = { ...stepAnswers, [stepIndex]: answer };
    setStepAnswers(newAnswers);
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setEditingStep(null);

    // Mark step as completed
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps(prev => [...prev, stepIndex]);
    }

    // Move to next step or analyze
    if (stepIndex < conversationSteps.length - 1) {
      // Add next question
      const nextStep = stepIndex + 1;
      setCurrentStep(nextStep);
      setIsTyping(true);

      // Simulate typing delay
      setTimeout(() => {
        const nextMessage: Message = {
          id: `step-${nextStep}`,
          type: 'bot',
          content: conversationSteps[nextStep].question,
          timestamp: new Date(),
          suggestions: conversationSteps[nextStep].suggestions,
          stepIndex: nextStep
        };
        setMessages(prev => [...prev, nextMessage]);
        setIsTyping(false);
      }, 500);
    } else {
      // All steps completed, run analysis
      await runPMFAnalysis(newAnswers);
    }
  };

  const runPMFAnalysis = async (answers: Record<number, string>) => {
    setIsAnalyzing(true);
    setShowMarketPreview(true);

    try {
      // Combine all answers into a comprehensive idea description
      const ideaDescription = Object.entries(answers)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([_, answer]) => answer)
        .join(' ');

      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: ideaDescription,
          conversationHistory: [],
          generatePMFAnalysis: true
        }
      });

      if (error) throw error;

      const pmfAnalysis = data?.pmfAnalysis || {
        pmfScore: 75,
        audience: {
          primary: {
            name: "Early Adopters",
            share: 0.4,
            demographics: { ages: "25-40", genderSplit: "60/40", geos: ["US", "UK"] }
          }
        },
        scoreBreakdown: {
          demand: 75,
          painIntensity: 80,
          competitionGap: 65,
          differentiation: 70,
          distribution: 72
        }
      };

      // Add analysis complete message
      const analysisMessage: Message = {
        id: 'analysis-complete',
        type: 'bot',
        content: "🎯 Excellent! I've completed your comprehensive PMF analysis. Your idea shows strong potential with a PM-Fit score of " + pmfAnalysis.pmfScore + "/100. Check out the detailed insights below!",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, analysisMessage]);
      onAnalysisReady(answers[0] || ideaDescription, pmfAnalysis);

      toast({
        title: "Analysis Complete!",
        description: `PM-Fit Score: ${pmfAnalysis.pmfScore}/100`,
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleStepEdit = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex)) {
      setEditingStep(stepIndex);
      setCurrentStep(stepIndex);
      setInput(stepAnswers[stepIndex] || '');
      inputRef.current?.focus();
    }
  };

  const handleSkipStep = () => {
    if (currentStep < conversationSteps.length - 1) {
      handleStepAnswer('[Skipped]', currentStep);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex) || stepIndex === currentStep) {
      handleStepEdit(stepIndex);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Step Indicator */}
      <ChatStepIndicator
        currentStep={currentStep}
        maxSteps={conversationSteps.length}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 sm:px-6 py-4">
        <div className="max-w-full sm:max-w-3xl lg:max-w-4xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' && "justify-end"
                )}
              >
                {message.type === 'bot' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                )}
                
                <div className={cn(
                  "flex-1 max-w-2xl",
                  message.type === 'user' && "flex flex-col items-end"
                )}>
                  <Card className={cn(
                    "px-3 sm:px-4 py-2 sm:py-3",
                    message.type === 'user' && "bg-primary/5"
                  )}>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.suggestions && message.type === 'bot' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                          >
                            <Sparkles className="mr-1 h-3 w-3" />
                            <span className="truncate max-w-[200px] sm:max-w-none">{suggestion}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </Card>
                  
                  {message.stepIndex !== undefined && completedSteps.includes(message.stepIndex) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStepEdit(message.stepIndex!)}
                      className="mt-1 h-6 text-xs"
                    >
                      <Edit2 className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <Card className="px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </Card>
            </div>
          )}

          {showMarketPreview && !isAnalyzing && (
            <MarketInsightsPreview 
              idea={stepAnswers[0]}
              isLocked={true}
              pmfScore={75}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur p-3 sm:p-4">
        <div className="max-w-full sm:max-w-3xl lg:max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStepAnswer(input, editingStep ?? currentStep);
                  }
                }}
                placeholder={conversationSteps[currentStep]?.placeholder || "Type your answer..."}
                className="min-h-[60px] sm:min-h-[80px] resize-none text-sm"
                disabled={isAnalyzing}
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkipStep}
                    disabled={isAnalyzing || currentStep >= conversationSteps.length - 1}
                    className="text-xs sm:text-sm"
                  >
                    <SkipForward className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                    Skip
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetChat}
                    disabled={isAnalyzing}
                    className="text-xs sm:text-sm"
                  >
                    <RotateCcw className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                    Start Over
                  </Button>
                </div>
                <Button
                  onClick={() => handleStepAnswer(input, editingStep ?? currentStep)}
                  disabled={!input.trim() || isAnalyzing}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {isAnalyzing ? (
                    <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  ) : editingStep !== null ? (
                    <Check className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Send className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  {isAnalyzing ? "Analyzing..." : editingStep !== null ? "Update" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamlinedPMFChat;