import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  TrendingUp,
  Loader2,
  ChevronRight,
  BarChart3,
  Target,
  Users,
  DollarSign,
  Rocket,
  Shield,
  Zap,
  MessageSquare,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  isTyping?: boolean;
  pmfAnalysis?: any;
}

interface EnhancedIdeaChatProps {
  onAnalysisReady: (idea: string, metadata: any) => void;
}

const EnhancedIdeaChat: React.FC<EnhancedIdeaChatProps> = ({ onAnalysisReady }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showPMFAnalysis, setShowPMFAnalysis] = useState(false);
  const [pmfData, setPMFData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message on mount
    if (!conversationStarted) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'bot',
        content: "👋 Hi! I'm your AI-powered PMF advisor. I'll help you refine your startup idea through an intelligent conversation. Tell me about your idea, and I'll guide you to product-market fit!",
        timestamp: new Date(),
        suggestions: [
          "AI tool for content creators",
          "Marketplace for local services",
          "Health tracking for seniors",
          "Educational platform for kids"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    setConversationStarted(true);
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Build conversation history
      const conversationHistory = messages
        .filter(msg => !msg.isTyping && msg.id !== 'welcome')
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: textToSend,
          conversationHistory
        }
      });

      if (error) throw error;

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      setIsTyping(false);

      // Check for PMF analysis
      if (data?.pmfAnalysis) {
        setPMFData(data.pmfAnalysis);
        setShowPMFAnalysis(true);
        
        const analysisMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: "🎯 I've completed your comprehensive PMF analysis! Here's what I found:",
          timestamp: new Date(),
          pmfAnalysis: data.pmfAnalysis
        };
        
        setMessages(prev => [...prev, analysisMessage]);
        onAnalysisReady(textToSend, data.pmfAnalysis);
      } else {
        // Parse response for better formatting
        let formattedContent = data.response || "Let me help you explore that further.";
        
        // Extract suggestions if they're in the response
        let suggestions = data.suggestions || [];
        
        const botMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: formattedContent,
          timestamp: new Date(),
          suggestions
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      setIsTyping(false);
      
      toast({
        title: "Connection Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message: Message) => {
    if (message.isTyping) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">AI is thinking...</span>
        </div>
      );
    }

    if (message.pmfAnalysis) {
      return <PMFAnalysisCard analysis={message.pmfAnalysis} />;
    }

    // Format message content with better structure
    const lines = message.content.split('\n');
    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          // Handle emoji headers
          if (line.match(/^[💡📊🎯🚀📈💰🛡️⚡]/)) {
            return (
              <p key={idx} className="text-sm leading-relaxed">
                {line}
              </p>
            );
          }
          // Handle bullet points
          if (line.startsWith('- ') || line.startsWith('• ')) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-4">
                <span className="text-primary mt-1">•</span>
                <span className="text-sm">{line.substring(2)}</span>
              </div>
            );
          }
          // Regular text
          return line ? (
            <p key={idx} className="text-sm leading-relaxed">
              {line}
            </p>
          ) : null;
        })}
      </div>
    );
  };

  const PMFAnalysisCard = ({ analysis }: { analysis: any }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Score Display */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <div className="text-center space-y-2">
            <div className="text-5xl font-bold text-primary">
              {analysis.pmfScore || 75}/100
            </div>
            <p className="text-muted-foreground">Product-Market Fit Score</p>
          </div>
          
          {/* Score Breakdown */}
          {analysis.breakdown && (
            <div className="mt-6 space-y-3">
              {Object.entries(analysis.breakdown).map(([key, value]: [string, any]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-medium">{value}/100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Insights Grid */}
        {analysis.insights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <h4 className="font-medium">Strengths</h4>
              </div>
              <ul className="space-y-1">
                {analysis.insights.strengths?.map((strength: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {strength}</li>
                ))}
              </ul>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-yellow-600" />
                <h4 className="font-medium">Risks</h4>
              </div>
              <ul className="space-y-1">
                {analysis.insights.risks?.map((risk: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {risk}</li>
                ))}
              </ul>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium">Opportunities</h4>
              </div>
              <ul className="space-y-1">
                {analysis.insights.opportunities?.map((opp: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {opp}</li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* Next Steps */}
        {analysis.nextSteps && (
          <Card className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Next Steps
            </h4>
            <div className="space-y-2">
              {analysis.nextSteps.map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <Badge variant={step.priority === 'high' ? 'default' : 'secondary'}>
                    {step.priority}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.action}</p>
                    <p className="text-xs text-muted-foreground">{step.timeline}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <p className="text-sm text-center text-muted-foreground italic">
          {analysis.summary}
        </p>
      </motion.div>
    );
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="p-4 border-b bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI PMF Advisor</h3>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            GPT-5 Powered
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'bot' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] space-y-2",
                  message.type === 'user' ? 'items-end' : 'items-start'
                )}>
                  <Card className={cn(
                    "p-4",
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card'
                  )}>
                    {renderMessage(message)}
                  </Card>
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => sendMessage(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-card/50 backdrop-blur">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Describe your startup idea or ask for analysis..."
            className="min-h-[60px] resize-none"
            disabled={isTyping}
          />
          <Button 
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            size="lg"
            className="px-6"
          >
            {isTyping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-2 max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => sendMessage("Analyze my idea and give me a PMF score")}
            className="text-xs"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            Get PMF Analysis
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => sendMessage("What are the main risks?")}
            className="text-xs"
          >
            <Shield className="h-3 w-3 mr-1" />
            Risk Assessment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => sendMessage("How should I monetize this?")}
            className="text-xs"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Monetization
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EnhancedIdeaChat;