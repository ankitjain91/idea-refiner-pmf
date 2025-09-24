import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Bot, User, Target, TrendingUp, Users, Lightbulb, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  showPMF?: boolean;
}

interface IdeaChatProps {
  onAnalysisReady: (idea: string, metadata: any) => void;
}

const IdeaChat: React.FC<IdeaChatProps> = ({ onAnalysisReady }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialIdea, setInitialIdea] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ideaData, setIdeaData] = useState({
    problem: '',
    solution: '',
    targetUsers: '',
    uniqueness: '',
    demographics: '',
    monetization: '',
    competition: ''
  });
  const [conversationStage, setConversationStage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startConversation = () => {
    if (!initialIdea.trim()) return;

    // Start transition animation
    setIsTransitioning(true);
    
    // After animation starts, set up the chat
    setTimeout(() => {
      setHasStarted(true);
      
      // Add user's initial idea as first message
      const userMessage: Message = {
        id: '1',
        type: 'user',
        content: initialIdea,
        timestamp: new Date()
      };

      setMessages([userMessage]);
      setIdeaData(prev => ({ ...prev, problem: initialIdea }));

      // Add bot response after a delay
      setTimeout(() => {
        const botMessage: Message = {
          id: '2',
          type: 'bot',
          content: "👋 Great idea! I'm your PMF advisor and I'll help you refine this to maximize product-market fit. Let me ask you a few questions to better understand your vision. First, who specifically faces this problem? What demographic would benefit most?",
          timestamp: new Date(),
          suggestions: ["Young professionals aged 25-35", "Small business owners", "Students and educators", "Parents with young children"]
        };
        setMessages(prev => [...prev, botMessage]);
      }, 800);
    }, 600);
  };

  const generateBotResponse = (userMessage: string, stage: number): { message: string; suggestions?: string[]; nextStage: number } => {
    const responses = [
      // Stage 0: Target audience
      {
        message: "Excellent target audience! 🎯 Now, let's talk about your solution. How exactly do you plan to solve this problem? What makes your approach unique compared to existing solutions?",
        suggestions: ["AI-powered automation", "Marketplace connecting users", "Educational platform", "Mobile-first solution"],
        nextStage: 1
      },
      // Stage 1: Solution approach
      {
        message: "That's innovative! 🚀 For this to be profitable, we need the right monetization strategy. How would you charge for this? What pricing model fits your target demographic best?",
        suggestions: ["$9.99/month subscription", "Freemium with premium features", "One-time purchase", "Transaction-based fees"],
        nextStage: 2
      },
      // Stage 2: Monetization
      {
        message: "Smart pricing strategy! 💰 Now let's understand your competitive landscape. Who are your main competitors, and what's your unique advantage over them?",
        suggestions: ["No direct competitors yet", "Better UX and simpler onboarding", "50% more affordable", "Unique features they don't have"],
        nextStage: 3
      },
      // Stage 3: Competition
      {
        message: "Great competitive analysis! One more thing - what's your go-to-market strategy? How will you reach your first 100 customers?",
        suggestions: ["Social media marketing", "Content marketing & SEO", "Direct B2B sales", "Product Hunt launch"],
        nextStage: 4
      },
      // Stage 4: Go-to-market
      {
        message: "Perfect! 🎉 Based on our conversation, I can see strong potential here. Your idea addresses a real problem with a clear monetization path. Would you like me to calculate your detailed PMF score now? I'll show you demographic insights, profitability projections, and actionable next steps.",
        suggestions: ["Yes, show me the PMF analysis!", "Let me add more details first"],
        nextStage: 5
      }
    ];

    if (stage < responses.length) {
      // Update idea data based on stage
      const updatedData = { ...ideaData };
      switch (stage) {
        case 0:
          updatedData.targetUsers = userMessage;
          break;
        case 1:
          updatedData.solution = userMessage;
          updatedData.uniqueness = userMessage;
          break;
        case 2:
          updatedData.monetization = userMessage;
          break;
        case 3:
          updatedData.competition = userMessage;
          break;
      }
      setIdeaData(updatedData);

      return responses[stage];
    }

    return {
      message: "Let me analyze that further. What specific features would be most valuable to your users?",
      suggestions: ["Real-time analytics", "Team collaboration", "API integrations", "Mobile app"],
      nextStage: stage
    };
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Check if user wants to see PMF analysis
    if (input.toLowerCase().includes('show') && input.toLowerCase().includes('pmf') || 
        input.toLowerCase().includes('analysis') || 
        input.toLowerCase().includes('yes') && conversationStage === 4) {
      
      // Trigger PMF analysis
      setTimeout(() => {
        const fullIdea = `${ideaData.problem} Solution: ${ideaData.solution} Target: ${ideaData.targetUsers} Monetization: ${ideaData.monetization}`;
        onAnalysisReady(fullIdea, ideaData);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'bot',
          content: "🎯 Perfect! I'm calculating your PMF score based on our conversation. This will include demographic analysis, market potential, and profitability projections...",
          timestamp: new Date(),
          showPMF: true
        }]);
        setIsTyping(false);
      }, 1500);
      return;
    }

    // Simulate bot typing and response
    setTimeout(() => {
      const response = generateBotResponse(input, conversationStage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, botMessage]);
      setConversationStage(response.nextStage);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  // Initial idea input interface with morph animation
  if (!hasStarted) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className={cn(
          "text-center mb-6 sm:mb-8 transition-all duration-700 ease-out",
          isTransitioning ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
        )}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 gradient-text">
            What's Your Big Idea? 🚀
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-4">
            Describe your startup concept and I'll help you maximize its potential
          </p>
        </div>
        
        <div className={cn(
          "transition-all duration-700 ease-out transform-gpu",
          isTransitioning ? "scale-95 opacity-0" : "scale-100 opacity-100"
        )}>
          <Card className="bg-gradient-to-br from-background/80 via-background/60 to-background/80 backdrop-blur-xl border-primary/10 shadow-2xl p-4 sm:p-6 md:p-8">
            <div className="relative">
              <Textarea
                value={initialIdea}
                onChange={(e) => setInitialIdea(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    startConversation();
                  }
                }}
                placeholder="I want to build an app that helps people..."
                className={cn(
                  "min-h-[100px] sm:min-h-[120px] text-sm sm:text-base md:text-lg bg-background/50 border-primary/20 focus:border-primary/50 resize-none transition-all duration-700",
                  isTransitioning && "transform scale-95"
                )}
                disabled={isTransitioning}
              />
              
              {/* Morphing bubble preview - shows during transition */}
              {isTransitioning && (
                <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
                  <div className="bg-primary text-primary-foreground px-3 sm:px-4 py-2 sm:py-3 rounded-2xl rounded-br-sm max-w-[70%] animate-slide-in-right opacity-0" 
                       style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                    <p className="text-xs sm:text-sm leading-relaxed break-words">{initialIdea}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className={cn(
              "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 transition-all duration-500",
              isTransitioning ? "opacity-0" : "opacity-100"
            )}>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Press Enter to start • {initialIdea.length} characters
              </p>
              <Button
                onClick={startConversation}
                disabled={!initialIdea.trim() || isTransitioning}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 w-full sm:w-auto text-sm"
              >
                Start Analysis <Sparkles className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="w-full max-w-3xl mx-auto px-4 animate-fade-in">
      <Card className="bg-gradient-to-br from-background/80 via-background/60 to-background/80 backdrop-blur-xl border-primary/10 shadow-2xl">
        <div className="p-3 sm:p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base md:text-lg">PMF Advisor</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Refining your idea for maximum profitability</p>
            </div>
          </div>
        </div>

        <div className="h-[350px] sm:h-[400px] md:h-[450px] lg:h-[500px] overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2 sm:gap-3",
                message.type === 'user' ? 'justify-end' : 'justify-start',
                index === 0 ? 'animate-slide-in-right' : 'animate-fade-in'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {message.type === 'bot' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                    <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                </div>
              )}
              
              <div className={cn(
                "max-w-[80%] sm:max-w-[70%] space-y-2",
                message.type === 'user' ? 'items-end' : 'items-start'
              )}>
                <div
                  className={cn(
                    "px-3 sm:px-4 py-2 sm:py-3 rounded-2xl",
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  <p className="text-xs sm:text-sm leading-relaxed break-words">{message.content}</p>
                </div>
                
                {message.suggestions && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
                    {message.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1.5 px-2 sm:px-3 hover:bg-primary/10 hover:border-primary/50 transition-all"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <Lightbulb className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="break-words">{suggestion}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {message.type === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="p-1.5 sm:p-2 rounded-full bg-secondary/10">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-secondary" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 sm:gap-3 justify-start animate-fade-in">
              <div className="flex-shrink-0 mt-1">
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                  <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
              </div>
              <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-2xl bg-muted rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 sm:p-4 border-t border-primary/10">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 text-sm bg-background/50 border-primary/20 focus:border-primary/50"
            />
            <Button
              onClick={handleSend}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 px-3 sm:px-4"
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default IdeaChat;