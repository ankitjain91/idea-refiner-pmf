import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot,
  User,
  Loader2,
  BarChart,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Circle,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/EnhancedAuthContext';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  metadata?: any;
}

interface ChatGPTStyleChatProps {
  onAnalysisReady?: (idea: string, metadata: any) => void;
  showDashboard?: boolean;
  className?: string;
}

const ANALYSIS_QUESTIONS = [
  "What problem does your product solve?",
  "Who is your target audience?",
  "What's your unique value proposition?",
  "What's your monetization strategy?",
  "Who are your main competitors?"
];

export default function ChatGPTStyleChat({ 
  onAnalysisReady, 
  showDashboard = false,
  className 
}: ChatGPTStyleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIdea, setCurrentIdea] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [analysisAnswers, setAnalysisAnswers] = useState<Record<string, string>>({});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const autoSaveRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    // Create new session on mount
    if (user) {
      createNewSession();
    }
  }, [user]);

  // Auto-save session every 5 seconds
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      autoSaveRef.current = setInterval(() => {
        saveSession();
      }, 5000);

      return () => {
        if (autoSaveRef.current) {
          clearInterval(autoSaveRef.current);
        }
      };
    }
  }, [sessionId, messages, analysisAnswers]);

  const createNewSession = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .insert({
          user_id: user.id,
          session_name: 'New Analysis Session',
          idea: '',
          metadata: { 
            messages: [],
            analysisAnswers: {},
            analysisProgress: 0
          }
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
      
      // Add welcome message with suggestions
      const welcomeMessage: Message = {
        id: `msg-welcome-${Date.now()}`,
        type: 'system',
        content: "👋 Welcome! I'm your PM-Fit Analyzer. Tell me about your product idea and I'll help you analyze its market fit potential.",
        timestamp: new Date(),
        suggestions: [
          "AI-powered productivity tool for remote teams",
          "Sustainable fashion marketplace for Gen Z",
          "Mental health support platform with AI coaching",
          "Blockchain-based supply chain for small businesses",
          "EdTech platform for personalized learning"
        ]
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const saveSession = async () => {
    if (!sessionId || !user) return;

    try {
      const { error } = await supabase
        .from('analysis_sessions')
        .update({
          metadata: {
            messages: messages.map(m => ({
              id: m.id,
              type: m.type,
              content: m.content,
              timestamp: m.timestamp.toISOString(),
              suggestions: m.suggestions || [],
              metadata: m.metadata || {}
            })),
            analysisAnswers,
            analysisProgress,
            currentQuestionIndex
          },
          idea: currentIdea,
          session_name: currentIdea || 'Analysis Session',
          last_accessed: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const startAnalysis = async () => {
    if (!currentIdea) {
      toast({
        title: "No idea provided",
        description: "Please share your product idea first",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setCurrentQuestionIndex(0);
    setAnalysisProgress(0);
    
    // Get AI-suggested answer for the first question
    const firstQuestion = ANALYSIS_QUESTIONS[0];
    
    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: `Help me answer: ${firstQuestion}`,
          idea: currentIdea,
          currentQuestion: firstQuestion,
          questionNumber: 0,
          analysisContext: {}
        }
      });

      if (!error && data?.suggestions) {
        const analysisMessage: Message = {
          id: `msg-analysis-${Date.now()}`,
          type: 'bot',
          content: `Great! Let's analyze "${currentIdea}". I'll ask you ${ANALYSIS_QUESTIONS.length} key questions to evaluate your product-market fit.\n\n${firstQuestion}`,
          timestamp: new Date(),
          suggestions: data.suggestions
        };
        
        setMessages(prev => [...prev, analysisMessage]);
      } else {
        const analysisMessage: Message = {
          id: `msg-analysis-${Date.now()}`,
          type: 'bot',
          content: `Great! Let's analyze "${currentIdea}". I'll ask you ${ANALYSIS_QUESTIONS.length} key questions to evaluate your product-market fit.\n\n${firstQuestion}`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, analysisMessage]);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      const analysisMessage: Message = {
        id: `msg-analysis-${Date.now()}`,
        type: 'bot',
        content: `Great! Let's analyze "${currentIdea}". I'll ask you ${ANALYSIS_QUESTIONS.length} key questions to evaluate your product-market fit.\n\n${firstQuestion}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, analysisMessage]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // If this is the first message, set it as the idea
    if (!currentIdea && !isAnalyzing) {
      setCurrentIdea(input);
      setInput('');
      
      // Respond with confirmation and analysis prompt
      const confirmMessage: Message = {
        id: `msg-confirm-${Date.now()}`,
        type: 'bot',
        content: `I understand you want to analyze: "${input}"\n\nI can help you evaluate this idea's product-market fit through a comprehensive analysis. Click the "Start Analysis" button below to begin, or continue chatting if you'd like to refine your idea first.`,
        timestamp: new Date(),
        suggestions: [
          `How does ${input} work?`,
          `What makes ${input} unique?`,
          `${input} target market`,
          `${input} revenue model`
        ]
      };
      
      setMessages(prev => [...prev, confirmMessage]);
      return;
    }

    // Handle analysis flow
    if (isAnalyzing && currentQuestionIndex < ANALYSIS_QUESTIONS.length) {
      const question = ANALYSIS_QUESTIONS[currentQuestionIndex];
      setAnalysisAnswers(prev => ({
        ...prev,
        [question]: input
      }));
      
      const newProgress = ((currentQuestionIndex + 1) / ANALYSIS_QUESTIONS.length) * 100;
      setAnalysisProgress(newProgress);
      
      if (currentQuestionIndex + 1 < ANALYSIS_QUESTIONS.length) {
        // Ask next question with AI suggestions
        setCurrentQuestionIndex(prev => prev + 1);
        const nextQuestion = ANALYSIS_QUESTIONS[currentQuestionIndex + 1];
        
        setInput('');
        setIsLoading(true);
        
        try {
          const { data, error } = await supabase.functions.invoke('idea-chat', {
            body: { 
              message: `Help me answer: ${nextQuestion}`,
              idea: currentIdea,
              currentQuestion: nextQuestion,
              questionNumber: currentQuestionIndex + 1,
              analysisContext: analysisAnswers
            }
          });

          const questionMessage: Message = {
            id: `msg-question-${Date.now()}`,
            type: 'bot',
            content: nextQuestion,
            timestamp: new Date(),
            suggestions: data?.suggestions || []
          };
          
          setMessages(prev => [...prev, questionMessage]);
        } catch (error) {
          console.error('Error getting suggestions:', error);
          const questionMessage: Message = {
            id: `msg-question-${Date.now()}`,
            type: 'bot',
            content: nextQuestion,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, questionMessage]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Analysis complete
        completeAnalysis();
      }
      
      setInput('');
      return;
    }

    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: input,
          conversationHistory: messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          idea: currentIdea,
          analysisContext: analysisAnswers
        }
      });

      if (error) throw error;

      const botMessage: Message = {
        id: `msg-${Date.now()}-bot`,
        type: 'bot',
        content: data.response || "Let me help you with that...",
        timestamp: new Date(),
        suggestions: data.suggestions,
        metadata: data.metadata
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const completeAnalysis = async () => {
    setIsAnalyzing(false);
    setAnalysisProgress(100);
    
    const completionMessage: Message = {
      id: `msg-complete-${Date.now()}`,
      type: 'system',
      content: "🎉 Analysis complete! Generating your comprehensive PM-Fit report...",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, completionMessage]);
    
    // Generate PM-Fit analysis
    if (onAnalysisReady) {
      const analysisData = {
        idea: currentIdea,
        answers: analysisAnswers,
        sessionId,
        timestamp: new Date().toISOString()
      };
      
      onAnalysisReady(currentIdea, analysisData);
    }
    
    // Save final session state
    await saveSession();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header with Progress */}
      {isAnalyzing && (
        <div className="border-b p-4 bg-muted/10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Analysis Progress</h3>
              <span className="text-xs text-muted-foreground">
                Question {currentQuestionIndex + 1} of {ANALYSIS_QUESTIONS.length}
              </span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
            <div className="flex gap-2 mt-3">
              {ANALYSIS_QUESTIONS.map((q, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    idx < currentQuestionIndex && "text-primary",
                    idx === currentQuestionIndex && "text-primary font-medium",
                    idx > currentQuestionIndex && "text-muted-foreground"
                  )}
                >
                  {idx < currentQuestionIndex ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : idx === currentQuestionIndex ? (
                    <Circle className="h-3 w-3 fill-primary" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4 pb-32">
          {/* Welcome Card with Suggestions */}
          {messages.length === 1 && messages[0].type === 'system' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <div className="space-y-4">
                  <div className="text-center">
                    <Bot className="h-12 w-12 text-primary mx-auto mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Get Started with Your Idea</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose an example or type your own product idea
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Quick Start Ideas:</p>
                    <div className="grid gap-2">
                      {messages[0].suggestions?.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          variant="outline"
                          className="justify-start text-left h-auto py-3 px-4 hover:bg-primary/5 hover:border-primary/30 transition-all"
                        >
                          <Sparkles className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                          <span className="text-sm">{suggestion}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                msg.type === 'user' && 'justify-end',
                msg.type === 'system' && 'justify-center'
              )}
            >
              {msg.type === 'system' ? (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm max-w-md text-center">
                  {msg.content}
                </div>
              ) : (
                <>
                  {msg.type === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[75%]",
                    msg.type === 'user' ? 'items-end' : 'items-start'
                  )}>
                    <div
                      className={cn(
                        "rounded-lg px-4 py-3",
                        msg.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.suggestions.map((suggestion, idx) => (
                          <Button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          {/* Action Buttons */}
          {currentIdea && !isAnalyzing && !showDashboard && (
            <div className="flex items-center gap-2 mb-3">
              <Button
                onClick={startAnalysis}
                className="gap-2"
                variant="default"
              >
                <Play className="h-4 w-4" />
                Start PM-Fit Analysis
              </Button>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {ANALYSIS_QUESTIONS.length} Questions
              </Badge>
            </div>
          )}
          
          {/* Current Idea Display */}
          {currentIdea && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
              <Badge variant="secondary" className="text-xs">
                Current Idea
              </Badge>
              <span className="text-sm text-muted-foreground truncate">
                {currentIdea}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={
                !currentIdea 
                  ? "Describe your product idea..." 
                  : isAnalyzing 
                    ? "Type your answer..." 
                    : "Ask a follow-up question..."
              }
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            {showDashboard && (
              <Button
                variant="outline"
                size="icon"
                className="relative"
              >
                <BarChart className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}