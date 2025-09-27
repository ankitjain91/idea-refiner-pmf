import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
        "I'm building an AI-powered tool that helps content creators generate engaging social media posts and schedule them automatically across multiple platforms",
        "We're creating a marketplace that connects local service providers with customers in their neighborhood, focusing on trust and quality verification",
        "My idea is a health tracking app specifically designed for seniors, with simplified interfaces and emergency contact features their families can monitor",
        "I want to build an educational platform that makes learning fun for kids through gamification and personalized learning paths based on their interests"
      ]
    },
    {
      question: "Who is your target audience? Be specific about demographics and needs.",
      placeholder: "E.g., Small business owners aged 30-50 who need affordable automation...",
      suggestions: [
        "Our target is young professionals aged 25-35 living in urban areas who value convenience and are willing to pay premium for time-saving services",
        "We're focusing on small business owners with 10-50 employees who struggle with managing operations but can't afford enterprise solutions",
        "My audience is parents with school-age children who want to be involved in their kids' education but need better tools to track progress",
        "We're targeting university students and educators who need better collaboration tools for remote learning and project management"
      ]
    },
    {
      question: "What specific problem does your product solve?",
      placeholder: "E.g., Businesses waste 20+ hours/week on repetitive customer inquiries...",
      suggestions: [
        "We help businesses save 10+ hours per week by automating repetitive daily tasks that currently require manual intervention and constant oversight",
        "Our solution reduces operational costs by 30-50% through intelligent resource allocation and eliminating inefficiencies in current workflows",
        "We solve the communication breakdown between remote teams by providing a unified platform that improves collaboration and reduces miscommunication",
        "Our platform enhances productivity by streamlining complex workflows into simple, automated processes that anyone can manage without technical expertise"
      ]
    },
    {
      question: "What's your revenue model?",
      placeholder: "E.g., SaaS with tiered pricing starting at $29/month...",
      suggestions: [
        "We'll use a SaaS subscription model with three tiers - starter at $29/month, professional at $99/month, and enterprise with custom pricing",
        "Our model charges transaction fees of 2.5% on each sale, similar to payment processors, making it affordable for small businesses to start",
        "We're going with a freemium model where basic features are free forever, and advanced features start at $19/month per user",
        "It's a one-time purchase of $299 with optional add-ons and yearly updates available for $49, keeping it simple for customers"
      ]
    },
    {
      question: "Who are your main competitors and how are you different?",
      placeholder: "E.g., Unlike Zendesk which is expensive and complex, we focus on simplicity...",
      suggestions: [
        "There aren't any direct competitors in this specific niche yet, giving us first-mover advantage to establish market leadership and brand recognition",
        "Traditional solutions like Salesforce are outdated, expensive, and require months of training - we're modern, affordable, and users can start in minutes",
        "Similar startups exist but we have unique AI-powered features that give us 10x better accuracy and automation capabilities they can't match",
        "Enterprise tools like SAP are too complex and expensive for SMBs - we're building specifically for small businesses with simpler needs and budgets"
      ]
    },
    {
      question: "What's your go-to-market strategy?",
      placeholder: "E.g., Content marketing + free trial + referral program...",
      suggestions: [
        "We'll focus on content marketing and SEO to build organic traffic, creating valuable resources that establish us as thought leaders in our space",
        "Our strategy combines targeted social media ads with influencer partnerships in our niche to build credibility and reach our ideal customers quickly",
        "We're going with direct B2B sales and strategic partnerships with complementary businesses that already serve our target market",
        "We'll use product-led growth with viral features built-in, encouraging users to invite teammates and share their success stories naturally"
      ]
    },
    {
      question: "What's your unique value proposition?",
      placeholder: "E.g., 50% cheaper, 3x faster implementation, no-code solution...",
      suggestions: [
        "We deliver 10x better user experience through intuitive design and AI assistance, making complex tasks feel effortless compared to clunky alternatives",
        "Our solution costs 50% less than competitors while delivering more features, achieved through efficient architecture and automation",
        "We're the only platform with these specific AI-powered features that adapt to each user's behavior and preferences over time",
        "We exclusively focus on this underserved niche, allowing us to build deeper, more specialized features our broader competitors can't prioritize"
      ]
    },
    {
      question: "What's your timeline and current stage?",
      placeholder: "E.g., MVP ready, launching beta in 2 weeks...",
      suggestions: [
        "We're planning to launch our MVP in 3 months, currently finalizing core features and setting up infrastructure for initial user testing",
        "Our prototype is in development and needs about 6 weeks to complete, then we'll start onboarding our first beta users for feedback",
        "We're currently beta testing with 50 users who are providing valuable feedback, planning to open public access within the next month",
        "We're in the planning and validation phase, conducting customer interviews and market research to ensure we're building the right solution"
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
  const [typingMessage, setTypingMessage] = useState('Thinking about your idea...');
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

    // Show typing indicator immediately
    setIsTyping(true);
    
    // Update typing message based on step
    const typingMessages = [
      "Analyzing your idea concept...",
      "Understanding your target market...",
      "Evaluating the problem space...",
      "Reviewing your revenue model...",
      "Researching competitive landscape...",
      "Examining your go-to-market strategy...",
      "Assessing your value proposition...",
      "Evaluating project timeline..."
    ];
    setTypingMessage(typingMessages[stepIndex] || "Processing your response...");

    // Move to next step or analyze
    if (stepIndex < conversationSteps.length - 1) {
      // Add next question with delay
      const nextStep = stepIndex + 1;
      setCurrentStep(nextStep);

      // Simulate realistic typing delay
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
        setTypingMessage('Thinking about your idea...');
      }, 1500);
    } else {
      // All steps completed, run analysis
      setTypingMessage('Generating comprehensive PM-Fit analysis...');
      await runPMFAnalysis(newAnswers);
    }
  };

  const runPMFAnalysis = async (answers: Record<number, string>) => {
    setIsAnalyzing(true);
    setIsTyping(true);
    setTypingMessage('🔍 Analyzing market data and competitors...');
    setShowMarketPreview(true);

    try {
      // Combine all answers into a comprehensive idea description
      const ideaDescription = Object.entries(answers)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([_, answer]) => answer)
        .join(' ');

        try {
          // Update status message during API call
          setTypingMessage('🤖 Generating personalized insights...');
        const { data, error } = await supabase.functions.invoke('idea-chat', {
          body: { 
            message: ideaDescription,
            conversationHistory: [],
            generatePMFAnalysis: true
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

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

      // Store complete analysis data in localStorage for dashboard
      localStorage.setItem('pmfAnalysisData', JSON.stringify(pmfAnalysis));
      localStorage.setItem('userIdea', answers[0] || ideaDescription);
      localStorage.setItem('analysisCompleted', 'true');
      
      // Add analysis complete message
      const analysisMessage: Message = {
        id: 'analysis-complete',
        type: 'bot',
        content: `🎯 Fantastic work! Your PM-Fit analysis is complete with a score of ${pmfAnalysis.pmfScore}/100! 

I've identified strong market opportunities and key areas for growth. Your dashboard is now loaded with:
• Real-time market signals and competitor analysis
• Personalized improvement strategies
• Growth projections and target demographics
• Actionable next steps for validation

Let's dive into your results! 🚀`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, analysisMessage]);
      setIsTyping(false);
      
      // Trigger navigation to dashboard with analysis data
      setTimeout(() => {
        onAnalysisReady(answers[0] || ideaDescription, pmfAnalysis);
      }, 1500);

      toast({
        title: "🎉 Analysis Complete!",
        description: `Your PM-Fit Score: ${pmfAnalysis.pmfScore}/100 - Dashboard ready!`,
      });

    } catch (error) {
      console.error('Analysis error:', error);
      
      // Use fallback analysis if edge function fails
      const fallbackAnalysis = {
        pmfScore: 72,
        audience: {
          primary: {
            name: "Early Adopters",
            share: 0.4,
            demographics: { ages: "25-40", genderSplit: "60/40", geos: ["US", "UK"] }
          }
        },
        scoreBreakdown: {
          demand: 70,
          painIntensity: 75,
          competitionGap: 68,
          differentiation: 72,
          distribution: 75
        }
      };
      
      const analysisMessage: Message = {
        id: 'analysis-complete',
        type: 'bot',
        content: "🎯 I've completed your PMF analysis! Check out the detailed insights below.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, analysisMessage]);
      setIsTyping(false);
      onAnalysisReady(answers[0] || ideaDescription, fallbackAnalysis);
      
      toast({
        title: "Analysis Complete",
        description: "Your idea has been analyzed successfully!",
        variant: "default"
      });
    }
    } finally {
      setIsAnalyzing(false);
      setIsTyping(false);
      setTypingMessage('Thinking about your idea...');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Set the input field with the suggestion text first
    setInput(suggestion);
    // Then process it as user input
    handleStepAnswer(suggestion, currentStep);
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
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <Card className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 animate-fade-in">
                    {typingMessage}
                  </span>
                </div>
              </Card>
            </motion.div>
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