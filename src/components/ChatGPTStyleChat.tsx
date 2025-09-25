import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Bot,
  User,
  Loader2,
  BarChart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/EnhancedAuthContext';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface ChatGPTStyleChatProps {
  onAnalysisReady?: (idea: string, metadata: any) => void;
  className?: string;
}

export default function ChatGPTStyleChat({ onAnalysisReady, className }: ChatGPTStyleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIdea, setCurrentIdea] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
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
  }, [sessionId, messages]);

  const createNewSession = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .insert({
          user_id: user.id,
          session_name: 'New Chat Session',
          idea: '',
          metadata: { messages: [] }
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
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
              suggestions: m.suggestions || []
            }))
          },
          idea: currentIdea,
          session_name: currentIdea || 'Chat Session',
          last_accessed: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const getContextualSuggestions = useCallback(() => {
    if (messages.length === 0) {
      return [
        "AI productivity tool for teams",
        "Sustainable fashion marketplace",
        "Mental health support platform",
        "Crypto portfolio manager"
      ];
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.type === 'bot' && lastMessage.content.includes('problem')) {
      return [
        "Saves time and increases efficiency",
        "Reduces costs by 50%",
        "Improves team collaboration",
        "Automates repetitive tasks"
      ];
    }

    if (lastMessage.content.includes('audience')) {
      return [
        "B2B SaaS companies",
        "Young professionals 25-35",
        "Small business owners",
        "Enterprise teams"
      ];
    }

    return [
      "Tell me more about pricing",
      "What about competitors?",
      "How big is the market?",
      "What's the go-to-market strategy?"
    ];
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (!currentIdea) {
      setCurrentIdea(input);
    }

    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: input,
          conversationHistory: messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        }
      });

      if (error) throw error;

      const botMessage: Message = {
        id: `msg-${Date.now()}-bot`,
        type: 'bot',
        content: data.response || "Let me analyze that for you...",
        timestamp: new Date(),
        suggestions: data.suggestions || getContextualSuggestions()
      };

      setMessages(prev => [...prev, botMessage]);

      // If we have PM-Fit analysis data, notify parent and show dashboard
      if (data.pmfAnalysis && onAnalysisReady) {
        onAnalysisReady(currentIdea || input, data.pmfAnalysis);
        setShowDashboard(true);
      }
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col h-screen bg-background", className)}>
      {/* Main Chat Area - Like ChatGPT */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-32">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <Bot className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">How can I help you analyze your product idea?</h1>
                <p className="text-muted-foreground">
                  Tell me about your product or business idea and I'll analyze its market fit
                </p>
                
                {/* Quick Start Suggestions */}
                <div className="mt-8 grid grid-cols-2 gap-2 max-w-md mx-auto">
                  {getContextualSuggestions().map((suggestion, idx) => (
                    <Button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      variant="outline"
                      className="text-sm h-auto py-3 px-4 justify-start"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  msg.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.type === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] space-y-2",
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
                    <div className="flex flex-wrap gap-1">
                      {msg.suggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
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
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type your message..."
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
              {messages.length > 0 && (
                <Button
                  onClick={() => setShowDashboard(!showDashboard)}
                  variant="outline"
                  size="icon"
                  className="relative"
                >
                  <BarChart className="h-4 w-4" />
                  {showDashboard && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Dashboard - Shows when analysis is ready */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t bg-muted/10"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Analysis Dashboard</h2>
                <Button
                  onClick={() => setShowDashboard(false)}
                  size="sm"
                  variant="ghost"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Dashboard will appear here when analysis is ready...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}