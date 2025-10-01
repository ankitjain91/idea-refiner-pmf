import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, Sparkles, Target, Shield, Users, MessageSquare, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface CompetitionChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionData: any;
  idea: string;
}

const suggestedQuestions = [
  {
    icon: Target,
    label: "Competitive Positioning",
    question: "How should I position my product against these competitors?"
  },
  {
    icon: Shield,
    label: "Weakness Exploitation",
    question: "What competitor weaknesses can I exploit to gain market share?"
  },
  {
    icon: Sparkles,
    label: "Differentiation Strategy",
    question: "How can I differentiate my offering from existing solutions?"
  },
  {
    icon: Users,
    label: "Partnership Opportunities",
    question: "Which competitors could be potential partners instead of rivals?"
  }
];

export function CompetitionChatDialog({ 
  open, 
  onOpenChange, 
  competitionData, 
  idea 
}: CompetitionChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseSuggestions, setResponseSuggestions] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && messages.length === 0) {
      // Add initial welcome message
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm here to help you analyze the competitive landscape for "${idea}". I have access to data about ${competitionData?.competitors?.length || 0} competitors, market concentration, and strategic opportunities. What would you like to know?`,
        timestamp: new Date()
      }]);
    }
  }, [open, competitionData, idea]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('competition-chat', {
        body: {
          message: messageText,
          competitionData,
          idea,
          chatHistory: messages
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
        suggestions: data.suggestions || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      setResponseSuggestions(data.suggestions || []);
    } catch (error: any) {
      console.error('Chat error:', error);
      
      let errorMessage = 'Failed to get response. Please try again.';
      if (error.message?.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
      } else if (error.message?.includes('402')) {
        errorMessage = 'AI credits exhausted. Please add more credits to continue.';
      }
      
      toast({
        title: "Chat Error",
        description: errorMessage,
        variant: "destructive",
        duration: 4000
      });

      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error: ${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 text-primary" />
            Competition Analysis Assistant
          </DialogTitle>
          <DialogDescription>
            Chat about your competitive landscape and strategic positioning
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div className="px-6 py-4 border-b bg-muted/30">
              <p className="text-sm font-medium mb-3">Suggested Questions:</p>
              <div className="grid grid-cols-2 gap-2">
                {suggestedQuestions.map((sq, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 h-auto py-2 px-3 text-left hover:bg-accent/10 hover:border-accent"
                    onClick={() => handleSuggestedQuestion(sq.question)}
                    disabled={loading}
                  >
                    <sq.icon className="h-4 w-4 flex-shrink-0 text-accent" />
                    <span className="text-xs line-clamp-2">{sq.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div key={idx} className="space-y-3">
                  <div
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Response Suggestions */}
                  {message.role === 'assistant' && 
                   message.suggestions && 
                   message.suggestions.length > 0 && 
                   idx === messages.length - 1 && 
                   !loading && (
                    <div className="ml-11 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Suggested follow-ups:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, sIdx) => (
                          <Button
                            key={sIdx}
                            variant="outline"
                            size="sm"
                            className="text-xs h-auto py-1.5 px-3 hover:bg-accent/10 hover:border-accent"
                            onClick={() => sendMessage(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Analyzing competition data...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="px-6 py-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about competitors, market positioning, strategies..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                size="icon"
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}