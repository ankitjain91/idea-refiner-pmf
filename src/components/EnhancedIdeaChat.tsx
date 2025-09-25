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
  Brain,
  Lightbulb,
  Star,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// Pool of example suggestions
const suggestionPool = [
  "AI tool for content creators",
  "Marketplace for local services",
  "Health tracking for seniors",
  "Educational platform for kids",
  "Sustainable fashion marketplace",
  "Remote team collaboration tool",
  "Personal finance assistant",
  "Mental wellness app for teens",
  "Language learning with VR",
  "Smart home automation platform",
  "Eco-friendly delivery service",
  "Freelancer project management",
  "Recipe sharing community",
  "Virtual event planning tool",
  "Pet care marketplace",
  "Carbon footprint tracker",
  "Skill-sharing platform",
  "Digital nomad community app",
  "Elderly care coordination",
  "Fitness accountability app",
  "B2B procurement platform",
  "Social learning network",
  "Renewable energy marketplace",
  "Food waste reduction app",
  "AI resume builder",
  "Virtual interior design tool",
  "Community gardening platform",
  "Subscription box curator",
  "Voice-based productivity app",
  "Micro-investment platform"
];

// Fisher-Yates shuffle for true randomization
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Function to get random suggestions
const getRandomSuggestions = (count: number = 4): string[] => {
  return shuffleArray(suggestionPool).slice(0, count);
};

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
  // Force new suggestions on every render by not memoizing
  const [messages, setMessages] = useState<Message[]>(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'bot',
      content: "✨ Welcome to your AI-powered PMF advisor! I'm here to transform your startup idea into a validated business concept through intelligent conversation. Share your vision with me!",
      timestamp: new Date(),
      suggestions: getRandomSuggestions(4)
    };
    return [welcomeMessage];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showPMFAnalysis, setShowPMFAnalysis] = useState(false);
  const [pmfData, setPMFData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  // Reset function to start new analysis
  const resetChat = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'bot',
      content: "✨ Welcome to your AI-powered PMF advisor! I'm here to transform your startup idea into a validated business concept through intelligent conversation. Share your vision with me!",
      timestamp: new Date(),
      suggestions: getRandomSuggestions(4)
    };
    setMessages([welcomeMessage]);
    setInput('');
    setIsTyping(false);
    setConversationStarted(false);
    setPMFData(null);
    setShowPMFAnalysis(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        
        // Generate AI-powered suggestions based on context
        try {
          const { data: suggestionData } = await supabase.functions.invoke('generate-suggestions', {
            body: { 
              question: formattedContent,
              ideaDescription: messages.find(m => m.type === 'user')?.content || textToSend,
              previousAnswers: messages.reduce((acc, msg, idx) => {
                if (msg.type === 'user' && idx > 0) {
                  const prevBot = messages[idx - 1];
                  if (prevBot && prevBot.type === 'bot') {
                    const key = `answer_${idx}`;
                    acc[key] = msg.content;
                  }
                }
                return acc;
              }, {} as Record<string, string>)
            }
          });
          if (suggestionData?.suggestions && suggestionData.suggestions.length > 0) {
            suggestions = suggestionData.suggestions;
          }
        } catch (error) {
          console.error('Error getting AI suggestions:', error);
        }
        
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
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
          </div>
          <span className="text-sm text-muted-foreground">Analyzing your idea...</span>
        </div>
      );
    }

    if (message.pmfAnalysis) {
      return <PMFAnalysisCard analysis={message.pmfAnalysis} />;
    }

    // Format message content with better structure
    const lines = message.content.split('\n');
    return (
      <div className="space-y-3">
        {lines.map((line, idx) => {
          // Handle emoji headers
          if (line.match(/^[💡📊🎯🚀📈💰🛡️⚡✨]/)) {
            return (
              <p key={idx} className="text-sm leading-relaxed font-medium">
                {line}
              </p>
            );
          }
          // Handle bullet points
          if (line.startsWith('- ') || line.startsWith('• ')) {
            return (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start gap-2 ml-4"
              >
                <ChevronRight className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{line.substring(2)}</span>
              </motion.div>
            );
          }
          // Regular text
          return line ? (
            <p key={idx} className="text-sm leading-relaxed text-muted-foreground">
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
        <Card className="relative overflow-hidden p-8 border-2">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5" />
          <div className="relative">
            <motion.div 
              className="text-center space-y-3"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="relative inline-block">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-primary/40 blur-xl"
                />
                <div className="relative text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {analysis.pmfScore || 75}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <p className="text-sm font-medium text-muted-foreground">Product-Market Fit Score</p>
                <Star className="h-4 w-4 text-primary fill-primary" />
              </div>
            </motion.div>
            
            {/* Score Breakdown */}
            {analysis.breakdown && (
              <div className="mt-8 space-y-4">
                {Object.entries(analysis.breakdown).map(([key, value]: [string, any], idx) => (
                  <motion.div 
                    key={key} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-bold text-primary">{value}%</span>
                    </div>
                    <div className="h-3 bg-muted/50 rounded-full overflow-hidden backdrop-blur">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full relative"
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Insights Grid */}
        {analysis.insights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="relative p-5 h-full overflow-hidden group hover:shadow-lg transition-all duration-300 border-green-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <h4 className="font-semibold">Strengths</h4>
                  </div>
                  <ul className="space-y-2">
                    {analysis.insights.strengths?.map((strength: string, idx: number) => (
                      <motion.li 
                        key={idx} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <Sparkles className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="relative p-5 h-full overflow-hidden group hover:shadow-lg transition-all duration-300 border-yellow-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Shield className="h-4 w-4 text-yellow-500" />
                    </div>
                    <h4 className="font-semibold">Risks</h4>
                  </div>
                  <ul className="space-y-2">
                    {analysis.insights.risks?.map((risk: string, idx: number) => (
                      <motion.li 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.05 }}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <Zap className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span>{risk}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="relative p-5 h-full overflow-hidden group hover:shadow-lg transition-all duration-300 border-blue-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Rocket className="h-4 w-4 text-blue-500" />
                    </div>
                    <h4 className="font-semibold">Opportunities</h4>
                  </div>
                  <ul className="space-y-2">
                    {analysis.insights.opportunities?.map((opp: string, idx: number) => (
                      <motion.li 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + idx * 0.05 }}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <Lightbulb className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{opp}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </Card>
            </motion.div>
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
    <Card className="h-full flex flex-col relative overflow-hidden border-2">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 opacity-50" />
      
      {/* Header */}
      <div className="relative p-5 border-b backdrop-blur-sm bg-card/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <Brain className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg">AI PMF Advisor</h3>
              <p className="text-xs text-muted-foreground">Devil's advocate mode active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1.5 bg-gradient-to-r from-primary to-primary/60 text-primary-foreground border-0">
              <Sparkles className="h-3 w-3" />
              GPT-5 Powered
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetChat}
              title="Start new analysis"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="relative flex-1 p-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          <AnimatePresence>
            {messages.map((message, messageIdx) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                  "flex gap-4",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'bot' && (
                  <motion.div 
                    className="flex-shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
                      <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div className={cn(
                  "max-w-[75%] space-y-3",
                  message.type === 'user' ? 'items-end' : 'items-start'
                )}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Card className={cn(
                      "p-5 relative overflow-hidden transition-all duration-300",
                      message.type === 'user' 
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/20 shadow-lg shadow-primary/10' 
                        : 'bg-card/90 backdrop-blur border-2 hover:shadow-lg'
                    )}>
                      {message.type === 'user' && (
                        <div className="absolute inset-0 bg-white/5 opacity-50" />
                      )}
                      <div className="relative">
                        {renderMessage(message)}
                      </div>
                    </Card>
                  </motion.div>
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-wrap gap-2"
                    >
                      {message.suggestions.map((suggestion, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendMessage(suggestion)}
                            className="text-xs hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group"
                          >
                            <Lightbulb className="h-3 w-3 mr-1 text-primary" />
                            {suggestion}
                            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {message.type === 'user' && (
                  <motion.div 
                    className="flex-shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                  >
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center border-2">
                      <User className="h-5 w-5" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="relative p-5 border-t backdrop-blur-sm bg-card/80">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe your startup idea or ask for guidance..."
              className="min-h-[60px] resize-none pr-4 bg-background/95 border focus:border-primary/50 transition-all duration-200 text-sm"
              disabled={isTyping}
            />
            <Button 
              onClick={() => {
                if (input.trim() && !isTyping) {
                  sendMessage();
                }
              }}
              disabled={!input.trim() || isTyping}
              size="sm"
              className="absolute bottom-2 right-2 h-8 w-8 p-0 rounded-full bg-primary hover:bg-primary/90 transition-all duration-200"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-3 max-w-4xl mx-auto">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendMessage("Analyze my idea and give me a PMF score")}
              className="text-xs hover:bg-primary/10 hover:border-primary/50 group"
            >
              <BarChart3 className="h-3 w-3 mr-1.5 text-primary group-hover:scale-110 transition-transform" />
              Get PMF Analysis
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendMessage("What are the main risks?")}
              className="text-xs hover:bg-yellow-500/10 hover:border-yellow-500/50 group"
            >
              <Shield className="h-3 w-3 mr-1.5 text-yellow-500 group-hover:scale-110 transition-transform" />
              Risk Assessment
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendMessage("How should I monetize this?")}
              className="text-xs hover:bg-green-500/10 hover:border-green-500/50 group"
            >
              <DollarSign className="h-3 w-3 mr-1.5 text-green-500 group-hover:scale-110 transition-transform" />
              Monetization
            </Button>
          </motion.div>
        </div>
      </div>
    </Card>
  );
};

export default EnhancedIdeaChat;