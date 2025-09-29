import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
      content: "🎉 YO SMOOTHBRAIN! Welcome to the chat zone! I'm your slightly-unhinged Site Guru.\n\n💡 I know EVERYTHING about this brain-wrinkle-inducing startup advisor tool:\n• How to maximize your brain wrinkles 🧠\n• Secret tricks for better SmoothBrains scores 📈\n• Why our brain animation is HYPNOTIC ✨\n• The deep lore of SmoothBrains© philosophy\n\nAsk me anything or just vibe! What's on your mind?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "Why is the brain so wrinkly?",
    "What's the deal with brain points?",
    "Tell me a startup joke!",
    "How do I become legendary?"
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
      
      // Generate fun suggested questions
      const funSuggestions = [
        "What's your favorite brain fact?",
        "How do I get LEGENDARY status?",
        "Tell me about the secret features!",
        "Why SmoothBrains?",
        "What's the highest SmoothBrains score possible?",
        "Can you roast my startup idea?",
        "What's the brain animation's secret?",
        "How many wrinkles do YOU have?"
      ];
      
      // Randomly pick 4 suggestions
      const shuffled = funSuggestions.sort(() => 0.5 - Math.random());
      setSuggestedQuestions(shuffled.slice(0, 4));
      
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
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary animate-pulse" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">
              Site Guru Chat Zone 
            </span>
            <Sparkles className="w-4 h-4 text-yellow-500 animate-spin" />
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 overflow-hidden">
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 animate-pulse">
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
                        Consulting the wisdom wrinkles...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && !isLoading && (
            <div className="px-4 pb-2 border-t pt-2">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Rocket className="w-3 h-3" />
                Quick questions:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {suggestedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    className="text-xs text-left justify-start h-auto py-2 px-3 whitespace-normal hover:bg-primary/5 hover:border-primary/30 transition-all"
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
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about the site... or life! 🧠"
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="bg-gradient-to-br from-primary to-accent hover:opacity-90 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
              <Heart className="w-3 h-3 text-red-500" />
              Powered by wrinkly wisdom
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}