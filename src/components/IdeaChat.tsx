import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Sparkles, Bot, User, Target, TrendingUp, Users, Lightbulb } from 'lucide-react';
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "👋 Hi! I'm your PMF advisor. Tell me about your startup idea, and I'll help you refine it to maximize product-market fit and profitability. What problem are you trying to solve?",
      timestamp: new Date(),
      suggestions: ["I want to build an app that...", "I noticed a problem with...", "People struggle with..."]
    }
  ]);
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

  const generateBotResponse = (userMessage: string, stage: number): { message: string; suggestions?: string[]; nextStage: number } => {
    const responses = [
      // Stage 0: Initial idea
      {
        message: "Interesting! That sounds like a real pain point. Can you tell me more about WHO specifically faces this problem? What demographic would benefit most from your solution?",
        suggestions: ["Young professionals", "Small business owners", "Students", "Parents"],
        nextStage: 1
      },
      // Stage 1: Target audience
      {
        message: "Great target audience! Now, how do you plan to solve this problem? What's your unique approach that competitors aren't doing?",
        suggestions: ["Mobile app with AI", "Marketplace platform", "SaaS tool", "Community-driven solution"],
        nextStage: 2
      },
      // Stage 2: Solution approach
      {
        message: "That's innovative! 🚀 Let's talk money - how would you monetize this? What pricing model would work best for your target demographic?",
        suggestions: ["Subscription model", "Freemium", "One-time purchase", "Transaction fees"],
        nextStage: 3
      },
      // Stage 3: Monetization
      {
        message: "Smart monetization strategy! Who are your main competitors, and what makes you different? This will help us refine your unique value proposition.",
        suggestions: ["No direct competitors", "Better UX than existing solutions", "More affordable", "More features"],
        nextStage: 4
      },
      // Stage 4: Competition
      {
        message: "Excellent! Based on our conversation, I can see strong potential here. Would you like me to analyze your product-market fit score now? I'll show you detailed insights on demographics, profitability potential, and actionable recommendations.",
        suggestions: ["Yes, show me the PMF analysis!", "Let me refine more details first"],
        nextStage: 5
      }
    ];

    if (stage < responses.length) {
      // Update idea data based on stage
      const updatedData = { ...ideaData };
      switch (stage) {
        case 0:
          updatedData.problem = userMessage;
          break;
        case 1:
          updatedData.targetUsers = userMessage;
          break;
        case 2:
          updatedData.solution = userMessage;
          break;
        case 3:
          updatedData.monetization = userMessage;
          break;
        case 4:
          updatedData.competition = userMessage;
          updatedData.uniqueness = userMessage;
          break;
      }
      setIdeaData(updatedData);

      return responses[stage];
    }

    return {
      message: "Let me analyze that further. What specific features would be most valuable to your users?",
      suggestions: ["Analytics dashboard", "Automation features", "Integration capabilities", "Mobile app"],
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
    handleSend();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="bg-gradient-to-br from-background/80 via-background/60 to-background/80 backdrop-blur-xl border-primary/10 shadow-2xl">
        <div className="p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">PMF Advisor</h3>
              <p className="text-xs text-muted-foreground">AI-powered startup idea refinement</p>
            </div>
          </div>
        </div>

        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type === 'bot' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
              )}
              
              <div className={cn(
                "max-w-[70%] space-y-2",
                message.type === 'user' ? 'items-end' : 'items-start'
              )}>
                <div
                  className={cn(
                    "px-4 py-3 rounded-2xl",
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                
                {message.suggestions && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs hover:bg-primary/10 hover:border-primary/50"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <Lightbulb className="h-3 w-3 mr-1" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {message.type === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="p-2 rounded-full bg-secondary/10">
                    <User className="h-4 w-4 text-secondary" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 mt-1">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-muted rounded-bl-sm">
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

        <div className="p-4 border-t border-primary/10">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 bg-background/50 border-primary/20 focus:border-primary/50"
            />
            <Button
              onClick={handleSend}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default IdeaChat;