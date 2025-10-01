import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, Sparkles, MessageSquare, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface TileAIChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tileData: any;
  tileTitle: string;
  idea: string;
}

export function TileAIChat({ 
  open, 
  onOpenChange, 
  tileData, 
  tileTitle,
  idea 
}: TileAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && messages.length === 0) {
      // Add initial welcome message
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm here to help you analyze the ${tileTitle} data for "${idea}". What would you like to know?`,
        timestamp: new Date()
      }]);
    }
  }, [open, tileData, idea, tileTitle]);

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
      const { data, error } = await supabase.functions.invoke('tile-ai-chat', {
        body: {
          message: messageText,
          tileData,
          tileTitle,
          idea,
          chatHistory: messages
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        suggestions: data.suggestions || []
      };

      setMessages(prev => [...prev, assistantMessage]);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            {tileTitle} Analysis Assistant
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Explore insights and analysis for {tileTitle.toLowerCase()} data
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
          {/* Chat Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
            <div className="space-y-4 max-w-full">
              {messages.map((message, idx) => (
                <div key={idx} className="space-y-3">
                  <div
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-sm">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground'
                          : 'bg-card border border-border/50'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                          <ReactMarkdown
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0 break-words whitespace-pre-wrap">{children}</p>,
                              ul: ({children}) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                              ol: ({children}) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
                              li: ({children}) => <li className="mb-1">{children}</li>,
                              strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                              code: ({children}) => <code className="px-1.5 py-0.5 rounded bg-muted text-sm">{children}</code>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                      <p className="text-xs opacity-70 mt-3 font-medium">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                        <MessageSquare className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Response Suggestions */}
                  {message.role === 'assistant' && 
                   message.suggestions && 
                   message.suggestions.length > 0 && 
                   idx === messages.length - 1 && 
                   !loading && (
                    <div className="ml-14 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-accent" />
                        Suggested follow-ups:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, sIdx) => (
                          <Button
                            key={sIdx}
                            variant="outline"
                            size="sm"
                            className="text-xs h-auto py-2 px-3 hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/10 hover:border-accent/50 transition-all duration-200"
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
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-sm">
                    <Brain className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div className="bg-card border border-border/50 rounded-2xl px-5 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Analyzing {tileTitle.toLowerCase()} data...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="px-6 py-5 border-t bg-gradient-to-r from-background via-muted/30 to-background backdrop-blur-sm">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask about ${tileTitle.toLowerCase()} insights, trends, analysis...`}
                disabled={loading}
                className="flex-1 h-11 px-4 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-colors"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-11 w-11 shrink-0 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all duration-200"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd>
              to send • 
              <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Shift+Enter</kbd>
              for new line
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}