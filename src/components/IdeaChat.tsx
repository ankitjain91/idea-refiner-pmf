import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Bot, User, Target, TrendingUp, Users, Lightbulb, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

  const validateIdea = (idea: string): { isValid: boolean; message?: string } => {
    const trimmedIdea = idea.trim();
    
    // Check minimum length
    if (trimmedIdea.length < 20) {
      return { isValid: false, message: "Please provide more detail about your startup idea (at least 20 characters)" };
    }
    
    // Check for repetitive characters
    const uniqueChars = new Set(trimmedIdea.toLowerCase().replace(/\s/g, ''));
    if (uniqueChars.size < 10) {
      return { isValid: false, message: "Please describe a real startup concept" };
    }
    
    // Check for business-related keywords
    const businessKeywords = ['app', 'platform', 'service', 'product', 'help', 'solve', 'business', 'market', 'users', 'customers', 'tool', 'software', 'solution', 'connect', 'automate', 'improve', 'create', 'build', 'develop', 'manage', 'provide', 'enable', 'streamline', 'optimize', 'sell', 'buy', 'marketplace', 'network', 'community', 'system'];
    const hasBusinessContext = businessKeywords.some(keyword => 
      trimmedIdea.toLowerCase().includes(keyword)
    );
    
    if (!hasBusinessContext) {
      return { isValid: false, message: "Please describe a business or product idea that solves a problem" };
    }
    
    // Check if it's just nonsense (all same word repeated, random letters, etc)
    const words = trimmedIdea.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size < 3) {
      return { isValid: false, message: "Please provide a meaningful description of your startup idea" };
    }
    
    return { isValid: true };
  };

  const startConversation = () => {
    if (!initialIdea.trim()) {
      toast({
        title: "Empty idea",
        description: "Please describe your startup idea before continuing",
        variant: "destructive"
      });
      return;
    }

    const validation = validateIdea(initialIdea);
    if (!validation.isValid) {
      toast({
        title: "Invalid idea",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }

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

  const generateBotResponse = async (userMessage: string): Promise<{ message: string; suggestions: string[] }> => {
    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: userMessage,
          conversationHistory
        }
      });

      if (error) throw error;

      // Check if it's a quota error
      if (data.error && data.error.includes('quota exceeded')) {
        toast({
          title: "OpenAI Quota Exceeded",
          description: "The OpenAI API key has reached its usage limit. Please add credits to your OpenAI account or update the API key.",
          variant: "destructive"
        });
      }

      return {
        message: data.response || "I'm here to help refine your idea. Could you tell me more?",
        suggestions: data.suggestions || []
      };
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Provide intelligent fallback responses based on conversation context
      const lowerMessage = userMessage.toLowerCase();
      let fallbackMessage = "";
      let fallbackSuggestions: string[] = [];
      
      // Determine conversation context and provide appropriate fallback
      if (messages.length <= 2) {
        fallbackMessage = "👋 Great idea! Let me help you refine it. First, who specifically would benefit most from this? What's your target demographic?";
        fallbackSuggestions = ["Young professionals aged 25-35", "Small business owners", "Students and educators", "Parents with young children"];
      } else if (lowerMessage.includes('professional') || lowerMessage.includes('business') || lowerMessage.includes('student')) {
        fallbackMessage = "Excellent target audience! 🎯 Now, how exactly do you plan to solve their problem? What makes your approach unique?";
        fallbackSuggestions = ["AI-powered automation", "Marketplace connecting users", "Educational platform", "Mobile-first solution"];
      } else if (lowerMessage.includes('ai') || lowerMessage.includes('marketplace') || lowerMessage.includes('platform')) {
        fallbackMessage = "That's innovative! 🚀 For this to be profitable, what pricing model would work best for your target demographic?";
        fallbackSuggestions = ["$9.99/month subscription", "Freemium with premium features", "One-time purchase", "Transaction-based fees"];
      } else if (lowerMessage.includes('subscription') || lowerMessage.includes('freemium') || lowerMessage.includes('price')) {
        fallbackMessage = "Smart pricing strategy! 💰 Who are your main competitors, and what's your unique advantage?";
        fallbackSuggestions = ["No direct competitors yet", "Better UX and simpler onboarding", "50% more affordable", "Unique features they don't have"];
      } else if (lowerMessage.includes('competitor') || lowerMessage.includes('better') || lowerMessage.includes('unique')) {
        fallbackMessage = "Great competitive analysis! What's your go-to-market strategy? How will you reach your first 100 customers?";
        fallbackSuggestions = ["Social media marketing", "Content marketing & SEO", "Direct B2B sales", "Product Hunt launch"];
      } else {
        fallbackMessage = "Perfect! 🎉 Based on our conversation, I can see strong potential. Would you like me to calculate your PMF score now?";
        fallbackSuggestions = ["Yes, show me the PMF analysis!", "Let me add more details first"];
      }
      
      return {
        message: fallbackMessage,
        suggestions: fallbackSuggestions
      };
    }
  };

  const handleSend = async () => {
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
    if (input.toLowerCase().includes('pmf') || 
        input.toLowerCase().includes('score') || 
        input.toLowerCase().includes('calculate') ||
        input.toLowerCase().includes('analyze') ||
        (input.toLowerCase().includes('yes') && messages.length > 6)) {
      
      // Request PMF analysis from ChatGPT via edge function
      const pmfResponse = await generateBotResponse(input);
      
      // Check if we got PMF analysis data
      if (pmfResponse && typeof pmfResponse === 'object' && 'pmfAnalysis' in pmfResponse) {
        const pmfData = (pmfResponse as any).pmfAnalysis;
        
        // Update idea data with ChatGPT's analysis
        const enrichedIdeaData = {
          ...ideaData,
          pmfScore: pmfData.pmfScore,
          targetAge: pmfData.demographics.targetAge,
          incomeRange: pmfData.demographics.incomeRange,
          interests: pmfData.demographics.interests,
          marketSize: pmfData.demographics.marketSize,
          competition: pmfData.demographics.competition,
          features: pmfData.features,
          refinements: pmfData.refinements,
          actionTips: pmfData.actionTips
        };
        
        // Trigger analysis with enriched data
        const fullIdea = `${ideaData.problem} Solution: ${ideaData.solution} Target: ${ideaData.targetUsers} Monetization: ${ideaData.monetization}`;
        onAnalysisReady(fullIdea, enrichedIdeaData);
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'bot',
          content: pmfData.summary || "🎯 Perfect! I've calculated your PMF score and created a comprehensive analysis...",
          timestamp: new Date(),
          showPMF: true,
          suggestions: (pmfResponse as any).suggestions || []
        }]);
        setIsTyping(false);
      }
      return;
    }

    // Get AI response
    try {
      const response = await generateBotResponse(input);
      
      // Update idea data based on conversation content
      const lowerInput = input.toLowerCase();
      const updatedData = { ...ideaData };
      
      if (!updatedData.targetUsers && (lowerInput.includes('professional') || lowerInput.includes('business') || lowerInput.includes('student') || lowerInput.includes('parent'))) {
        updatedData.targetUsers = input;
      } else if (!updatedData.solution && (lowerInput.includes('ai') || lowerInput.includes('marketplace') || lowerInput.includes('platform') || lowerInput.includes('app'))) {
        updatedData.solution = input;
        updatedData.uniqueness = input;
      } else if (!updatedData.monetization && (lowerInput.includes('subscription') || lowerInput.includes('freemium') || lowerInput.includes('purchase') || lowerInput.includes('fee'))) {
        updatedData.monetization = input;
      } else if (!updatedData.competition && (lowerInput.includes('competitor') || lowerInput.includes('better') || lowerInput.includes('unique'))) {
        updatedData.competition = input;
      }
      
      setIdeaData(updatedData);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, botMessage]);
      setConversationStage(prev => prev + 1);
    } catch (error) {
      console.error('Error in handleSend:', error);
    } finally {
      setIsTyping(false);
    }
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
      <div className="w-full max-w-xl mx-auto px-4">
        <div className={cn(
          "text-center mb-4 transition-all duration-700 ease-out",
          isTransitioning ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
        )}>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 gradient-text">
            What's Your Big Idea? 🚀
          </h2>
          <p className="text-muted-foreground text-sm">
            Describe your startup concept and I'll help you maximize its potential
          </p>
        </div>
        
        <div className={cn(
          "transition-all duration-700 ease-out transform-gpu",
          isTransitioning ? "scale-95 opacity-0" : "scale-100 opacity-100"
        )}>
          <Card className="bg-card/95 backdrop-blur border shadow-lg p-4">
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
                placeholder="Example: I want to build a marketplace that connects local farmers directly with consumers, eliminating middlemen and ensuring fresh produce delivery..."
                className={cn(
                  "min-h-[80px] text-sm bg-background border resize-none transition-all duration-700 placeholder:text-muted-foreground/60",
                  isTransitioning && "transform scale-95"
                )}
                disabled={isTransitioning}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Try ideas like:</span>
                <button 
                  onClick={() => setInitialIdea("An AI-powered platform that helps small businesses automate their social media marketing")}
                  className="text-xs text-primary hover:underline"
                >
                  AI Marketing
                </button>
                <button 
                  onClick={() => setInitialIdea("A mobile app that connects elderly people with local volunteers for daily assistance")}
                  className="text-xs text-primary hover:underline"
                >
                  Elder Care
                </button>
                <button 
                  onClick={() => setInitialIdea("A SaaS tool that helps remote teams track productivity and wellbeing metrics")}
                  className="text-xs text-primary hover:underline"
                >
                  Remote Work
                </button>
              </div>
              
              {/* Morphing bubble preview - shows during transition */}
              {isTransitioning && (
                <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
                  <div className="bg-primary text-primary-foreground px-3 py-2 rounded-2xl rounded-br-sm max-w-[70%] animate-slide-in-right opacity-0" 
                       style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                    <p className="text-sm leading-relaxed break-words">{initialIdea}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className={cn(
              "flex items-center justify-between gap-2 mt-3 transition-all duration-500",
              isTransitioning ? "opacity-0" : "opacity-100"
            )}>
              <p className="text-xs text-muted-foreground">
                Press Enter to start • {initialIdea.length} characters
              </p>
              <Button
                onClick={startConversation}
                disabled={!initialIdea.trim() || isTransitioning}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                Start Analysis <Sparkles className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="w-full max-w-2xl mx-auto px-4 animate-fade-in">
      <Card className="bg-card/95 backdrop-blur border shadow-lg">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">PMF Advisor</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Refining your idea for maximum profitability</p>
            </div>
          </div>
        </div>

        <div className="h-[400px] overflow-y-auto p-3 space-y-3">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2",
                message.type === 'user' ? 'justify-end' : 'justify-start',
                index === 0 ? 'animate-slide-in-right' : 'animate-fade-in'
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {message.type === 'bot' && (
                <div className="flex-shrink-0">
                  <div className="p-1 rounded-full bg-primary/10">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                </div>
              )}
              
              <div className={cn(
                "max-w-[75%] space-y-2",
                message.type === 'user' ? 'items-end' : 'items-start'
              )}>
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl",
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  <p className="text-sm leading-relaxed break-words">{message.content}</p>
                </div>
                
                {message.suggestions && (
                  <div className="flex flex-wrap gap-1.5 mt-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
                    {message.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2 hover:bg-primary/10 hover:border-primary/50"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <Lightbulb className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{suggestion}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {message.type === 'user' && (
                <div className="flex-shrink-0">
                  <div className="p-1 rounded-full bg-secondary/10">
                    <User className="h-3 w-3 text-secondary" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 justify-start animate-fade-in">
              <div className="flex-shrink-0">
                <div className="p-1 rounded-full bg-primary/10">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              </div>
              <div className="px-3 py-2 rounded-2xl bg-muted rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isTyping) {
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 text-sm"
              disabled={isTyping}
            />
            <Button
              onClick={handleSend}
              size="sm"
              disabled={isTyping || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Show Analyze button after collecting enough information */}
          {messages.length >= 6 && !messages.some(m => m.showPMF) && (
            <div className="mt-3 flex justify-center">
              <Button
                onClick={() => {
                  const analyzeMessage = "Calculate my PMF score and provide detailed analysis";
                  setInput(analyzeMessage);
                  setTimeout(() => handleSend(), 100);
                }}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                size="sm"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyze PMF Score
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default IdeaChat;