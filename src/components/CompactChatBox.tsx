import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  X, 
  Minimize2,
  Maximize2,
  Bot,
  User,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface CompactChatBoxProps {
  onAnalysisReady?: (idea: string, metadata: any) => void;
  className?: string;
}

export default function CompactChatBox({ onAnalysisReady, className }: CompactChatBoxProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIdea, setCurrentIdea] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

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

      // If we have PM-Fit analysis data, notify parent
      if (data.pmfAnalysis && onAnalysisReady) {
        onAnalysisReady(currentIdea || input, data.pmfAnalysis);
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

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          className
        )}
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <Badge 
          className="absolute -top-2 -right-2 animate-pulse"
          variant="default"
        >
          <Sparkles className="w-3 h-3 mr-1" />
          AI Chat
        </Badge>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed bottom-6 right-6 z-50 w-96",
            className
          )}
        >
          <Card className="shadow-2xl border-2 h-[500px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">PM-Fit Advisor</h3>
                  <p className="text-xs text-muted-foreground">AI-powered analysis</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  onClick={() => setIsMinimized(!isMinimized)}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Hi! Tell me about your product idea
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          I'll analyze market fit and provide insights
                        </p>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: msg.type === 'user' ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex gap-2",
                          msg.type === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.type === 'bot' && (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2",
                            msg.type === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          {msg.suggestions && msg.suggestions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.suggestions.map((suggestion, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleSuggestionClick(suggestion)}
                                  className="block w-full text-left text-xs px-2 py-1 rounded bg-background/50 hover:bg-background transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {msg.type === 'user' && (
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Quick Suggestions */}
                {messages.length === 0 && (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-muted-foreground mb-2">Quick ideas:</p>
                    <div className="flex flex-wrap gap-1">
                      {getContextualSuggestions().slice(0, 2).map((suggestion, idx) => (
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
                  </div>
                )}

                {/* Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type your message..."
                      className="flex-1 text-sm"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSend}
                      size="icon"
                      disabled={!input.trim() || isLoading}
                      className="h-9 w-9"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}