import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Send, 
  Bot, 
  User,
  Loader2,
  Sparkles,
  Brain,
  Rocket,
  Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HelpSupportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpSupport({ open, onOpenChange }: HelpSupportProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome to Help & Support! I'm here to assist you with any questions about the platform.\n\n💡 I can help you with:\n• Understanding how to use features\n• Best practices for startup evaluation\n• Technical questions and issues\n• Account and subscription inquiries\n\nWhat can I help you with today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "How does the scoring work?",
    "What are brain points?",
    "How do I save my progress?",
    "What features are included?"
  ]);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText: string = input) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare chat history for context  
      const chatHistory = messages.slice(-10).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      // Call the help-support edge function with the actual user message
      const { data, error } = await supabase.functions.invoke('help-support', {
        body: {
          message: messageText,  // Send the actual user message
          chatHistory
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || "🧠 Hmm, my brain wrinkles are temporarily smooth... Try asking again!",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update suggestions if available from response
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestedQuestions(data.suggestions.slice(0, 4));
      } else {
        // Generate helpful suggestions
        const helpfulSuggestions = [
          "How can I improve my score?",
          "What features are available?",
          "How do I save my progress?",
          "Explain the scoring system"
        ];
        setSuggestedQuestions(helpfulSuggestions);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fun fallback responses when API fails
      const fallbackResponses = [
        "🤯 My brain just BLUE-SCREENED! The wisdom was too powerful. Try again?",
        "😅 Oops! My neural pathways got tangled. Give me another shot!",
        "🌊 Brain waves disrupted by cosmic interference! Let's try that again.",
        "💫 Too many wrinkles forming at once! System overload! Retry?"
      ];
      
      const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: randomFallback,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[80vh] max-h-[650px] flex flex-col p-0">
        <DialogHeader className="p-4 pb-3 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              Help & Support
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages */}
          <div 
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto p-4 scroll-smooth"
          >
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.role === 'user'
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                        : "bg-muted border border-primary/10"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-pulse">
                    <Brain className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg p-3 border border-primary/10">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground animate-pulse">
                        Processing your request...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Suggested Questions - Simplified and More Compact */}
          {suggestedQuestions.length > 0 && !isLoading && (
            <div className="px-4 py-2 border-t flex-shrink-0 max-h-24 overflow-y-auto">
              <div className="flex gap-2 flex-wrap">
                {suggestedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
                    onClick={() => sendMessage(question)}
                    disabled={isLoading}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question here..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}