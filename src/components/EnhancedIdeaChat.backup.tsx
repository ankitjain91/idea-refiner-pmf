import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  RotateCcw,
  Edit2,
  SkipForward,
  Check
} from 'lucide-react';
import AITooltip from './AITooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to generate suggestion explanations
const generateSuggestionExplanation = (suggestionText: string): string => {
  if (suggestionText.toLowerCase().includes('market')) {
    return 'Understanding your market helps validate demand and identify competitors';
  } else if (suggestionText.toLowerCase().includes('monetiz')) {
    return 'Revenue strategy is crucial for sustainable business growth';
  } else if (suggestionText.toLowerCase().includes('risk')) {
    return 'Identifying risks early helps you prepare mitigation strategies';
  } else if (suggestionText.toLowerCase().includes('customer')) {
    return 'Customer insights drive product-market fit and growth strategies';
  } else if (suggestionText.toLowerCase().includes('mvp') || suggestionText.toLowerCase().includes('prototype')) {
    return 'Building an MVP helps validate your concept with minimal investment';
  } else {
    return 'This suggestion helps refine your idea and improve market positioning';
  }
};

// Helper function to generate fallback suggestions with explanations
const generateFallbackSuggestions = (content: string, mode: 'summary' | 'verbose'): any[] => {
  const baseSuggestions = [
    {
      text: 'Tell me about the target market',
      explanation: 'Understanding your target market is essential for validating demand and positioning your product effectively'
    },
    {
      text: 'What are the main risks?',
      explanation: 'Risk assessment helps you identify potential challenges and prepare contingency plans early'
    },
    {
      text: 'How should I monetize this?',
      explanation: 'Revenue strategy planning ensures your idea can become a sustainable and profitable business'
    }
  ];
  
  return mode === 'summary' ? baseSuggestions.slice(0, 2) : baseSuggestions;
};

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
  resetTrigger?: number; // Add reset trigger prop
}

const EnhancedIdeaChat: React.FC<EnhancedIdeaChatProps> = ({ onAnalysisReady, resetTrigger }) => {
  const [responseMode, setResponseMode] = useState<'summary' | 'verbose'>(() => {
    try {
      return (localStorage.getItem('responseMode') as 'summary' | 'verbose') || 'verbose';
    } catch {
      return 'verbose';
    }
  });
  const [currentIdea, setCurrentIdea] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showMarketPreview, setShowMarketPreview] = useState(false);
  const maxSteps = 8;
  
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
  
  // Reset chat when trigger changes
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'bot',
        content: "✨ Welcome to your AI-powered PMF advisor! Share your startup idea and I'll help transform it into a validated business concept through intelligent conversation.",
        timestamp: new Date(),
        suggestions: getRandomSuggestions(4)
      };
      setMessages([welcomeMessage]);
      setInput('');
      setIsTyping(false);
      setConversationStarted(false);
      setPMFData(null);
      setShowPMFAnalysis(false);
    }
  }, [resetTrigger]);
  
  // Reset function to start new analysis
  const resetChat = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'bot',
      content: "✨ Welcome to your AI-powered PMF advisor! Share your startup idea and I'll help transform it into a validated business concept through intelligent conversation.",
      timestamp: new Date(),
      suggestions: getRandomSuggestions(4)
    };
    setMessages([welcomeMessage]);
    setInput('');
    setIsTyping(false);
    setConversationStarted(false);
    setPMFData(null);
    setShowPMFAnalysis(false);
    
    // Clear all localStorage for completely fresh start
    localStorage.removeItem('userIdea');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('userRefinements');
    localStorage.removeItem('ideaMetadata');
    localStorage.removeItem('currentSessionId');
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
    
    // Set current idea if not already set and this looks like an idea description
    if (!currentIdea && textToSend.length > 20) {
      // Check if this looks like an idea description (not a question)
      const isIdeaDescription = !textToSend.toLowerCase().match(/^(what|how|why|when|where|can|should|would|could|tell me|explain)/);
      if (isIdeaDescription) {
        const ideaPreview = textToSend.length > 50 ? textToSend.substring(0, 50) + '...' : textToSend;
        setCurrentIdea(ideaPreview);
      }
    }
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

      // Add contextual grounding to the message
      const contextualMessage = currentIdea 
        ? `Context: We are discussing the idea "${currentIdea}". Please keep your response focused on this specific idea. ${textToSend}`
        : textToSend;

      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: contextualMessage,
          conversationHistory,
          responseMode: responseMode
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
        
        // Apply aggressive summarization if in summary mode
        if (responseMode === 'summary' && formattedContent.length > 100) {
          try {
            const { data: summaryData } = await supabase.functions.invoke('idea-chat', {
              body: { 
                message: `Please provide a very concise 2-3 sentence summary of this response, focusing only on the most critical points and actionable insights: "${formattedContent}"`,
                conversationHistory: [],
                responseMode: 'summary'
              }
            });
            if (summaryData?.response) {
              formattedContent = summaryData.response;
            }
          } catch (error) {
            console.error('Error summarizing response:', error);
            // Fallback: aggressive manual summarization
            const sentences = formattedContent.split(/[.!?]+/).filter(s => s.trim());
            if (sentences.length > 2) {
              // Take first 2 sentences and add a brief conclusion
              const firstTwo = sentences.slice(0, 2).join('. ');
              const keyPoints = formattedContent.match(/(?:key|important|critical|main|primary)[^.!?]*[.!?]/gi);
              const summary = keyPoints && keyPoints.length > 0 
                ? `${firstTwo}. Key takeaway: ${keyPoints[0]}`
                : `${firstTwo}.`;
              formattedContent = summary;
            }
          }
        }
        
        // Extract suggestions if they're in the response
        let suggestions = data.suggestions || [];
        
        // Generate AI-powered suggestions with explanations
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
              }, {} as Record<string, string>),
              includeExplanations: true,
              responseMode: responseMode
            }
          });
          if (suggestionData?.suggestions && suggestionData.suggestions.length > 0) {
            suggestions = suggestionData.suggestions.map((suggestion: any) => ({
              ...suggestion,
              explanation: suggestion.explanation || generateSuggestionExplanation(suggestion.text || suggestion)
            }));
          }
        } catch (error) {
          console.error('Error getting AI suggestions:', error);
          // Fallback: generate basic suggestions with explanations
          suggestions = generateFallbackSuggestions(formattedContent, responseMode);
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
      <div className="space-y-3 w-full">
        {lines.map((line, idx) => {
          // Handle emoji headers
          if (line.match(/^[💡📊🎯🚀📈💰🛡️⚡✨]/)) {
            return (
              <p key={idx} className="text-sm leading-relaxed font-medium enhanced-text-render">
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
                <span className="text-sm text-muted-foreground enhanced-text-render flex-1">{line.substring(2)}</span>
              </motion.div>
            );
          }
          // Regular text
          return line ? (
            <p key={idx} className="text-sm leading-relaxed text-foreground break-words overflow-wrap-anywhere whitespace-pre-wrap max-w-full">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                        <span className="break-words overflow-wrap-anywhere flex-1">{strength}</span>
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
                        <span className="break-words overflow-wrap-anywhere flex-1">{risk}</span>
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
                        <span className="break-words overflow-wrap-anywhere flex-1">{opp}</span>
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words overflow-wrap-anywhere">{step.action}</p>
                    <p className="text-xs text-muted-foreground break-words">{step.timeline}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <p className="text-sm text-center text-muted-foreground italic break-words overflow-wrap-anywhere">
          {analysis.summary}
        </p>
      </motion.div>
    );
  };

  return (
    <Card className="h-full w-full flex flex-col relative overflow-hidden border-2 border-always-visible">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 opacity-50" />
      
      {/* Header */}
      <div className="relative p-3 sm:p-4 lg:p-5 border-b backdrop-blur-sm bg-card/80">
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
              <p className="text-xs text-muted-foreground">
                Your intelligent startup companion
                {responseMode === 'summary' && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                    ⚡ Summary Mode
                  </span>
                )}
              </p>
              {currentIdea && (
                <p className="text-xs text-primary font-medium mt-1 truncate max-w-[200px]" title={currentIdea}>
                  💡 {currentIdea}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Mode:</span>
              <Button
                variant={responseMode === 'summary' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setResponseMode('summary');
                  localStorage.setItem('responseMode', 'summary');
                }}
                className="h-6 px-2 text-xs"
              >
                Summary
              </Button>
              <Button
                variant={responseMode === 'verbose' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setResponseMode('verbose');
                  localStorage.setItem('responseMode', 'verbose');
                }}
                className="h-6 px-2 text-xs"
              >
                Verbose
              </Button>
            </div>
            <Badge className="gap-1.5 bg-gradient-to-r from-primary to-primary/60 text-primary-foreground border-0">
              <Sparkles className="h-3 w-3" />
              GPT-5 Powered
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetChat}
              title="Start new analysis"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="relative flex-1 p-2 sm:p-4 lg:p-6">
        <div className="space-y-4 sm:space-y-6 w-full max-w-none sm:max-w-4xl mx-auto">
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
                  "w-full sm:max-w-[85%] lg:max-w-[75%] space-y-2 sm:space-y-3 min-w-0",
                  message.type === 'user' ? 'items-end' : 'items-start'
                )}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Card className={cn(
                      "p-3 sm:p-5 relative transition-all duration-300 w-full border-2",
                      message.type === 'user' 
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/30 shadow-lg shadow-primary/10' 
                        : 'bg-card border-border hover:shadow-lg overflow-visible'
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
                      className="flex flex-wrap gap-1 sm:gap-2"
                    >
                      {message.suggestions.map((suggestion, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          className="space-y-1 w-full sm:w-auto"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const suggestionText = typeof suggestion === 'string' ? suggestion : (suggestion as any)?.text || String(suggestion);
                              sendMessage(suggestionText);
                            }}
                            className="text-xs hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group touch-manipulation min-h-[32px] px-2 sm:px-3 break-words text-left justify-start w-full"
                          >
                            <Lightbulb className="h-3 w-3 mr-1 text-primary flex-shrink-0" />
                            <span className="break-words">
                              {typeof suggestion === 'string' ? suggestion : (suggestion as any)?.text || String(suggestion)}
                            </span>
                            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                          </Button>
                          {((typeof suggestion === 'object' && suggestion && (suggestion as any).explanation) || responseMode === 'summary') && (
                            <div className="text-xs text-muted-foreground italic px-2 py-1 bg-muted/30 rounded-md border border-muted-foreground/20">
                              <div className="flex items-start gap-1">
                                <span className="text-primary">💡</span>
                                <span className="break-words text-left">
                                  {typeof suggestion === 'object' && suggestion && (suggestion as any).explanation 
                                    ? (suggestion as any).explanation 
                                    : generateSuggestionExplanation(typeof suggestion === 'string' ? suggestion : (suggestion as any)?.text || String(suggestion))}
                                </span>
                              </div>
                            </div>
                          )}
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
      <div className="relative p-3 sm:p-4 lg:p-5 border-t border-border backdrop-blur-sm bg-card/80">
        <div className="flex gap-2 sm:gap-3 w-full max-w-none sm:max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe your startup idea or ask for guidance..."
              className="min-h-[50px] sm:min-h-[60px] resize-none pr-10 sm:pr-12 bg-background/95 border border-border focus:border-primary/50 transition-all duration-200 text-sm sm:text-base"
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
              className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full bg-primary hover:bg-primary/90 transition-all duration-200"
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

