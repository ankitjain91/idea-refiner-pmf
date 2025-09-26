import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Send, 
  X, 
  Bot, 
  User,
  Loader2,
  MessageCircle
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

export default function HelpSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hi! I'm your PM-FIT assistant. I can help you with:\n• Understanding PMF scores\n• Using analysis features\n• Improving your product idea\n• Technical support\n\nWhat can I help you with today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "How do I improve my PMF score?",
    "What data sources does PM-FIT use?",
    "How does competitor analysis work?",
    "What's included in the Pro plan?"
  ]);
  const { toast } = useToast();

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

      // Call the help-support edge function
      const { data, error } = await supabase.functions.invoke('help-support', {
        body: {
          message: messageText,
          chatHistory
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update suggested questions if provided
      if (data.suggestedQuestions) {
        setSuggestedQuestions(data.suggestedQuestions);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response. Please try again.',
        variant: 'destructive'
      });
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
    <>
      {/* Floating Help Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-40",
          "bg-gradient-primary hover:opacity-90 transition-all",
          isOpen && "hidden"
        )}
        size="icon"
      >
        <HelpCircle className="w-6 h-6" />
      </Button>

      {/* Help Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] z-50 shadow-2xl flex flex-col glass-card">
          {/* Header */}
          <div className="p-4 border-b bg-gradient-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <h3 className="font-semibold">PM-FIT Support</h3>
                <Badge variant="secondary" className="text-xs">AI Powered</Badge>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
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
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
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
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && (
            <div className="px-4 pb-2">
              <ScrollArea className="w-full">
                <div className="flex gap-2">
                  {suggestedQuestions.slice(0, 3).map((question, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      className="text-xs whitespace-nowrap"
                      onClick={() => sendMessage(question)}
                      disabled={isLoading}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="bg-gradient-primary hover:opacity-90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}