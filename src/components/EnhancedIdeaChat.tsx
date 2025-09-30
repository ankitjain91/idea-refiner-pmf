import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createConversationSummary } from '@/utils/conversationUtils';
import { 
  Loader2,
  BarChart3,
  DollarSign,
  Shield,
  Bot,
  Brain,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Zap,
  FileText,
  ListMinus,    // Better icon for summary mode
  Layers,       // Better icon for verbose mode
  RefreshCw,    // For retry button
  AlertCircle   // For error indicator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/contexts/SimpleSessionContext';
import { LS_KEYS } from '@/lib/storage-keys';
import { backgroundProcessor } from '@/lib/background-processor';

// Import refactored components and utilities
import { Message, SuggestionItem } from './chat/types';
import { 
  isIdeaDescription, 
  createIdeaPreview, 
  getRandomSuggestions, 
  generateSuggestionExplanation, 
  generateFallbackSuggestions,
  detectTrickery,
  getSaltyResponse,
  generateBrainExplanation
} from './chat/utils';
import MessageRenderer from './chat/MessageRenderer';
import AnimatedBrain from './AnimatedBrain';
import { BrainHeader } from './enhanced/BrainHeader';
import { validateFirstIdea } from './enhanced/ideaValidation';

interface EnhancedIdeaChatProps {
  sessionName?: string;
  onAnalysisReady?: (question: string, analysis: any) => void;
  onAnalyze?: (question: string) => void;
  onReset?: () => void;
  resetTrigger?: number;
}

const EnhancedIdeaChat: React.FC<EnhancedIdeaChatProps> = ({ 
  onAnalysisReady, 
  resetTrigger,
  onReset,
  onAnalyze,
  sessionName = 'New Chat Session'
}) => {
  const navigate = useNavigate();
  // State management
  const { currentSession, saveCurrentSession } = useSession();
  const [anonymous, setAnonymous] = useState(false);
  const isDefaultSessionName = !currentSession?.name;
  const displaySessionName = currentSession?.name || sessionName || 'New Chat Session';
  
  // Response mode removed - always use detailed
  
  // Restore state from localStorage for authenticated sessions
  const [currentIdea, setCurrentIdea] = useState<string>(() => {
    if (!anonymous) {
      return localStorage.getItem('currentIdea') || '';
    }
    return '';
  });
  
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!anonymous) {
      const stored = localStorage.getItem('enhancedIdeaChatMessages');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Error parsing stored messages:', e);
        }
      }
    }
    return [];
  });
  
  const [wrinklePoints, setWrinklePoints] = useState(() => {
    if (!anonymous) {
      const stored = localStorage.getItem('wrinklePoints');
      if (stored) {
        return parseInt(stored) || 0;
      }
    }
    return 0;
  });
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [hoveringBrain, setHoveringBrain] = useState(false);
  const [hasValidIdea, setHasValidIdea] = useState(false);
  const [persistenceLevel, setPersistenceLevel] = useState(0);
  const [offTopicAttempts, setOffTopicAttempts] = useState(0);
  const [ideaSummaryName, setIdeaSummaryName] = useState<string>(() => {
    if (!anonymous) {
      return localStorage.getItem('ideaSummaryName') || '';
    }
    return '';
  });

  // Persisted chat persona (allows custom tone/style)
  const [chatPersona, setChatPersona] = useState<any>(() => {
    if (!anonymous) {
      const raw = localStorage.getItem('chatPersona');
      try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    return null;
  });

  // Derived: wrinkle tier + dynamic tooltip messaging
  const wrinkleTier = useMemo(() => {
    const w = wrinklePoints;
    if (w < 5) return 0; // embryonic
    if (w < 20) return 1; // forming
    if (w < 50) return 2; // structuring
    if (w < 100) return 3; // networked
    if (w < 200) return 4; // compounding
    return 5; // legendary
  }, [wrinklePoints]);

  const wrinkleTierLabel = [
    'Embryonic',
    'Forming',
    'Structuring',
    'Networked',
    'Compounding',
    'Legendary'
  ][wrinkleTier];

  const dynamicBrainTooltip = useMemo(() => {
    if (!hasValidIdea) {
      return 'No valid idea yet. Provide: specific user + painful workflow moment + wedge feature. Wrinkles unlock after validation.';
    }
    switch (wrinkleTier) {
      case 0:
        return 'Embryonic: You have a seed. Add the exact manual workaround and why it is painful.';
      case 1:
        return 'Forming: Good start. Narrow the wedge further—identify one atomic job to automate.';
      case 2:
        return 'Structuring: Solid direction. Add quant (time wasted, error rate, cost) to unlock deeper wrinkles.';
      case 3:
        return 'Networked: You are layering insight. Now articulate unique data loops or defensibility.';
      case 4:
        return 'Compounding: Strong refinement. Stress test pricing, adoption friction, and expansion motion.';
      case 5:
        return 'Legendary: Brain compounding at elite level. Explore sequencing + moat maturation timeline next.';
      default:
        return 'Keep refining with specificity and measurable outcomes.';
    }
  }, [wrinkleTier, hasValidIdea]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const location = useLocation();
  
  // Effects
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      resetChat();
    }
  }, [resetTrigger]);

  useEffect(() => {
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fetch random startup ideas from database
  const fetchRandomIdeas = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_random_startup_ideas', { limit_count: 8 });
      
      if (error) {
        console.error('Error fetching random ideas:', error);
        return null;
      }
      
      return data?.map((idea: any) => idea.idea_text) || [];
    } catch (error) {
      console.error('Error fetching random ideas:', error);
      return null;
    }
  }, []);

  // Define initializeChat function
  const initializeChat = useCallback(async () => {
    // If we have a session but no messages, check if we need to restore from localStorage
    if (currentSession?.name && messages.length === 0) {
      // For authenticated users, check if there are stored messages to restore
      if (!anonymous) {
        const storedMessages = localStorage.getItem('enhancedIdeaChatMessages');
        const storedIdea = localStorage.getItem('currentIdea');
        const storedWrinkles = localStorage.getItem('wrinklePoints');
        
        if (storedMessages) {
          try {
            const parsedMessages = JSON.parse(storedMessages);
            if (parsedMessages.length > 0) {
              // Restore the conversation
              setMessages(parsedMessages);
              if (storedIdea) {
                setCurrentIdea(storedIdea);
                setHasValidIdea(true);
                setConversationStarted(true);
                // Try to restore summary name
                const storedSummaryName = localStorage.getItem('ideaSummaryName');
                if (storedSummaryName) {
                  setIdeaSummaryName(storedSummaryName);
                }
              }
              if (storedWrinkles) {
                setWrinklePoints(parseInt(storedWrinkles) || 0);
              }
              return; // Don't show welcome message if restoring
            }
          } catch (e) {
            console.error('Error restoring messages:', e);
          }
        }
      }
      
      // No stored messages, show welcome
      // Fetch random ideas from database
      const randomIdeas = await fetchRandomIdeas();
      
      // Use random ideas if available, otherwise use defaults
      const suggestions = randomIdeas && randomIdeas.length > 0 
        ? randomIdeas.slice(0, 4)
        : [
            "AI-powered mental health companion that detects emotional patterns through voice analysis",
            "Blockchain-based skill verification platform where professionals earn NFT badges",
            "Micro-learning app that teaches coding through 5-minute AR puzzles",
            "Smart grocery list that predicts what you need based on purchase patterns"
          ];
      
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'bot',
        content: `🧠 Welcome to ${currentSession?.name || 'New Session'}! I'm your profit-focused startup advisor.

Share your startup idea and I'll help you maximize its profitability through strategic analysis, market insights, and revenue optimization. Focus on WHO has WHAT problem and HOW you'll solve it profitably.

What's your startup idea?`,
        timestamp: new Date(),
        suggestions
      };
      setMessages([welcomeMessage]);
    }
  }, [currentSession?.name, anonymous, fetchRandomIdeas, messages.length]);

  // Listen for background request completions
  useEffect(() => {
    const handleBackgroundComplete = (event: CustomEvent) => {
      const { requestId, result, type, sessionId } = event.detail;
      
      // Only handle results for the current session
      if (sessionId !== currentSession?.id) return;
      
      console.log(`Background ${type} request completed:`, requestId);
      
      // If we navigated away and came back, the typing indicator might still be showing
      if (type === 'chat' && result.success) {
        setMessages(prev => {
          const hasTyping = prev.some(msg => msg.isTyping);
          if (hasTyping) {
            // Remove typing indicator and add the completed message
            return prev.filter(msg => !msg.isTyping);
          }
          return prev;
        });
        setIsTyping(false);
      }
    };
    
    const handleBackgroundError = (event: CustomEvent) => {
      const { requestId, error, type, sessionId } = event.detail;
      
      // Only handle errors for the current session
      if (sessionId !== currentSession?.id) return;
      
      console.error(`Background ${type} request failed:`, requestId, error);
      
      // Remove typing indicator on error
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      setIsTyping(false);
    };
    
    window.addEventListener('background-request-complete', handleBackgroundComplete as EventListener);
    window.addEventListener('background-request-error', handleBackgroundError as EventListener);
    
    return () => {
      window.removeEventListener('background-request-complete', handleBackgroundComplete as EventListener);
      window.removeEventListener('background-request-error', handleBackgroundError as EventListener);
    };
  }, [currentSession?.id]);

  // Listen for session reset event
  useEffect(() => {
    const handleSessionReset = () => {
      // Clear all chat state
      setMessages([]);
      setCurrentIdea('');
      setIdeaSummaryName('');
      setWrinklePoints(0);
      setHasValidIdea(false);
      setConversationStarted(false);
      setPersistenceLevel(0);
      setOffTopicAttempts(0);
      setInput('');
      
      // Show welcome message for the new session after a brief delay
      setTimeout(() => {
        initializeChat();
      }, 100);
    };
    
    window.addEventListener('session:reset', handleSessionReset);
    
    return () => {
      window.removeEventListener('session:reset', handleSessionReset);
    };
  }, [initializeChat]);

  // Initialize chat on mount or session change
  useEffect(() => {
    initializeChat();
  }, [currentSession?.name, anonymous, fetchRandomIdeas]);

  // Handle pending question from dashboard - runs when location changes
  useEffect(() => {
    const checkPendingQuestion = () => {
      const pendingQuestion = localStorage.getItem('pendingQuestion');
      if (pendingQuestion) {
        console.log('Found pending question:', pendingQuestion);
        // Small delay to ensure component is ready
        const timer = setTimeout(() => {
          setInput(pendingQuestion);
          localStorage.removeItem('pendingQuestion');
          // Focus the input
          inputRef.current?.focus();
          // Scroll to bottom to show the input
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          
          // Show a helpful message
          toast({
            title: "Dashboard Analysis",
            description: "Answer these questions to unlock your full dashboard insights.",
          });
        }, 100);
        
        return () => clearTimeout(timer);
      }
    };
    
    checkPendingQuestion();
  }, [location, toast]); // Re-run when location changes

  // Persist messages for authenticated users
  useEffect(() => {
    if (!anonymous && messages.length > 0) {
      localStorage.setItem('enhancedIdeaChatMessages', JSON.stringify(messages));
      // Trigger session save
      window.dispatchEvent(new Event('chat:activity'));
    }
  }, [messages, anonymous]);
  
  // Persist current idea for authenticated users
  useEffect(() => {
    if (!anonymous && currentIdea) {
      console.log('Persisting current idea:', currentIdea);
      localStorage.setItem('currentIdea', currentIdea);
      localStorage.setItem(LS_KEYS.userIdea, currentIdea);
      localStorage.setItem('ideaText', currentIdea); // Also save as ideaText
      // Trigger session save
      window.dispatchEvent(new Event('chat:activity'));
    }
  }, [currentIdea, anonymous]);
  
  // Persist wrinkle points for authenticated users
  useEffect(() => {
    if (!anonymous) {
      localStorage.setItem('wrinklePoints', String(wrinklePoints));
      // Trigger session save
      window.dispatchEvent(new Event('chat:activity'));
    }
  }, [wrinklePoints, anonymous]);
  
  // Response mode removed - always use detailed

  // Recompute total wrinkles from bot message history ensuring consistency
  useEffect(() => {
    const total = messages
      .filter(m => m.type === 'bot' && typeof m.pointsEarned === 'number')
      .reduce((acc, m) => acc + (m.pointsEarned || 0), 0);
    if (total !== wrinklePoints) {
      const delta = total - wrinklePoints;
      setWrinklePoints(Math.max(0, total));
      if (Math.abs(delta) >= 3) {
        setIsRefining(true);
        const t = setTimeout(() => setIsRefining(false), 800);
        return () => clearTimeout(t);
      }
    }
  }, [messages]);
  
  // Functions
  const ChatMessageItemMemo = useMemo(() => {
    const Item: React.FC<{
      message: Message;
      sendMessage: (m?: string) => void;
      handleSuggestionClick: (s: string) => void;
    }> = ({ message, sendMessage, handleSuggestionClick }) => {
      return (
        <motion.div
          layout
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
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
                transition: {
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1
                }
              }}
            >
              <motion.div 
                className="relative"
                animate={message.isTyping ? {
                  rotate: [0, 5, -5, 5, 0],
                  transition: {
                    duration: 0.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                } : {}}
              >
                <motion.div 
                  className="absolute inset-0 bg-primary/20 blur-lg rounded-full"
                  animate={message.isTyping ? {
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                  } : {}}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 backdrop-blur-sm">
                  {message.isTyping ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Brain className="h-5 w-5 text-primary" />
                    </motion.div>
                  ) : (
                    <Bot className="h-5 w-5 text-primary" />
                  )}
                </div>
              </motion.div>
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
                  {message.type === 'user' ? (
                    <div className="text-sm opacity-90 break-words overflow-wrap-anywhere whitespace-pre-wrap max-w-full">
                      {message.content}
                    </div>
                  ) : (
                    <MessageRenderer 
                      message={message} 
                      onSendMessage={sendMessage}
                      onSuggestionClick={handleSuggestionClick}
                    />
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          {message.type === 'user' && (
            <motion.div 
              className="flex-shrink-0"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 blur-lg rounded-full" />
                <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20">
                  <span className="text-sm font-medium text-primary">You</span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      );
    };
    return memo(Item, (prev, next) => prev.message === next.message);
  }, []);
  const resetChat = async () => {
    // Fetch new random ideas for the reset
    const randomIdeas = await fetchRandomIdeas();
    const suggestions = randomIdeas && randomIdeas.length > 0 
      ? randomIdeas.slice(0, 4)
      : [
          "AI tool that automates invoice processing for accountants",
          "Platform connecting local farmers directly with restaurants",
          "Smart scheduling assistant for remote teams across timezones",
          "Subscription box for personalized wellness products"
        ];
    
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'bot',
      content: `🧠 Fresh session! Share your startup idea and I'll help you maximize its profitability.

Tell me: WHO has WHAT problem and HOW you'll solve it profitably.`,
      timestamp: new Date(),
      suggestions
    };
    
    setMessages([welcomeMessage]);
    setInput('');
    setIsTyping(false);
    setConversationStarted(false);
    setIsRefining(false);
    setCurrentIdea('');
    setIdeaSummaryName('');
    setWrinklePoints(0);
    setHasValidIdea(false);
    setAnonymous(false);
    setOffTopicAttempts(0);
    onReset?.();
  };

  // No longer generating shortened idea names - storing full idea as-is
  const generateIdeaSummaryName = async (idea: string) => {
    // We're now storing the full idea without shortening
    setIdeaSummaryName(idea);
    localStorage.setItem('ideaSummaryName', idea);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    // Put suggestion in input for user to edit
    setInput(suggestionText);
    // Focus the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const sendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input.trim();
    if (!messageText || isTyping) return;
    if (isDefaultSessionName) {
      // Gating: require explicit session name
      setMessages(prev => {
        if (prev.some(m => m.id === 'name_gate')) return prev; // avoid duplicates
        return [...prev, {
          id: 'name_gate',
          type: 'bot',
          content: '📝 Please name this session before starting. Give it something meaningful like "HVAC Dispatch Automation" or "Nurse Shift Triage Tool".',
          timestamp: new Date(),
          suggestions: [
            'Session name: AI Claims Triage',
            'Session name: Inventory Sync Agent',
            'Session name: B2B Onboarding Optimizer'
          ],
          pointsEarned: 0,
          pointsExplanation: 'Session naming required to begin.'
        }];
      });
      return;
    }

    setInput('');
    setConversationStarted(true);
    setIsTyping(true);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Create an AbortController for this specific request
    const controller = new AbortController();
    
    // Store the controller so we can abort on unmount
    const messageId = Date.now().toString();
    
    // Check for trickery attempts first
    const trickeryCheck = detectTrickery(messageText);
    if (trickeryCheck.isTricky) {
      // Remove typing indicator and show salty response
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      setIsTyping(false);
      
  // Brain disappointment animation could be triggered here if desired (removed direct point mutation)
      
      // Increase persistence level - user is being tricky
      const newPersistenceLevel = persistenceLevel + 1;
      setPersistenceLevel(newPersistenceLevel);
      
      try {
        // Enhance the salty response with ChatGPT for more dynamic, corny responses
        const { data: enhancedData } = await supabase.functions.invoke('enhance-salty-response', {
          body: { 
            baseResponse: trickeryCheck.response,
            userMessage: messageText,
            persistenceLevel: newPersistenceLevel,
            wrinklePoints: wrinklePoints
          }
        });
        
        const enhancedResponse = enhancedData?.enhancedResponse || trickeryCheck.response;
        const dynamicSuggestions = enhancedData?.suggestions || [
          "Alright, here's my ACTUAL startup idea...",
          "Fine, let me share my real business concept...",
          "Okay, I'll be serious - my startup idea is..."
        ];
        
        const saltyMessage: Message = {
          id: messageId,
          type: 'bot',
          content: enhancedResponse,
          timestamp: new Date(),
          suggestions: dynamicSuggestions,
          pointsEarned: -5,
          pointsExplanation: "Trickery detected - brain wrinkles disappointed!"
        };
        
        setMessages(prev => [...prev, saltyMessage]);
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request aborted due to navigation');
          return;
        }
        console.error('Error enhancing salty response:', error);
        
        // Fallback to escalated responses
        let escalatedResponse = trickeryCheck.response;
        let escalatedSuggestions = [
          "Alright, here's my ACTUAL startup idea...",
          "Fine, let me share my real business concept...",
          "Okay, I'll be serious - my startup idea is..."
        ];
        
        if (newPersistenceLevel >= 3) {
          escalatedResponse += " \n\n🤬 SERIOUSLY?! This is attempt #" + newPersistenceLevel + "! My brain wrinkles are getting WRINKLED from frustration! Just give me ONE real idea!";
          escalatedSuggestions = [
            "FINE! Here's my real business idea...",
            "You're right, I'm being ridiculous - my genuine concept is...",
            "I surrender! What I genuinely want to build is..."
          ];
        } else if (newPersistenceLevel >= 2) {
          escalatedResponse += " \n\n😤 I'm starting to lose my patience here! This is your second strike!";
        }
        
        const saltyMessage: Message = {
          id: messageId,
          type: 'bot',
          content: escalatedResponse,
          timestamp: new Date(),
          suggestions: escalatedSuggestions,
          pointsEarned: -5,
          pointsExplanation: "Trickery detected - brain wrinkles disappointed!"
        };
        
        setMessages(prev => [...prev, saltyMessage]);
      }
      
      return;
    }
    
    // Reset persistence level when user provides legitimate input
    if (persistenceLevel > 0) {
      setPersistenceLevel(0);
    }

    // Once we have a valid idea, skip validation and focus on refinement
    if (hasValidIdea && currentIdea) {
      // Add typing indicator immediately for responsiveness
      const typingMessageId = `typing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const typingMessage: Message = {
        id: typingMessageId,
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, typingMessage]);

      // Generate a unique request ID for tracking
      const requestId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sessionId = currentSession?.id;

      try {
        // Build conversation history
        const conversationHistory = messages
          .filter(msg => !msg.isTyping)
          .map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }));

        // Always ground the conversation in the established idea for focused refinement
        const contextualMessage = `CRITICAL CONTEXT: We are refining the specific idea "${currentIdea}". 
        All responses must focus on making THIS EXACT idea successful. Do not suggest alternatives.
        Challenge assumptions, identify risks, and push for validation, but always within the scope of improving "${currentIdea}".
        User says: ${messageText}`;

        // Get current session for auth
        const { data: { session } } = await supabase.auth.getSession();
        
        // Register the main chat request for background processing
        const chatPromise = supabase.functions.invoke('idea-chat', {
          body: { 
            message: contextualMessage,
            conversationHistory,
            responseMode: 'concise', // Use concise mode to avoid verbose detailed responses
            refinementMode: true, // Always in refinement mode once idea is validated
            idea: currentIdea,
            persona: chatPersona || undefined
          },
          headers: session ? {
            Authorization: `Bearer ${session.access_token}`
          } : undefined
        });

        backgroundProcessor.register(requestId, chatPromise, 'chat', sessionId);

        const { data, error } = await chatPromise;

        if (error) throw error;

        // Don't remove typing indicator yet - keep it visible until response is ready
        const messageId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Use ChatGPT to evaluate wrinkle points
        let pointChange = 0;
        let pointsExplanation = '';
        
        const evalRequestId = `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          const evalPromise = supabase.functions.invoke('evaluate-wrinkle-points', {
            body: { 
              userMessage: messageText,
              botResponse: data.response || 'AI response processing...',
              conversationHistory: conversationHistory.slice(-4),
              currentWrinklePoints: wrinklePoints
            }
          });

          backgroundProcessor.register(evalRequestId, evalPromise, 'evaluation', sessionId);
          
          const { data: evaluationData } = await evalPromise;
          
          if (evaluationData?.pointChange !== undefined) {
            pointChange = evaluationData.pointChange;
            pointsExplanation = evaluationData.explanation || '';
          }
        } catch (error: any) {
          console.error('Error evaluating wrinkle points:', error);
          pointChange = (Math.random() * 2) + 1; // 1-3 points for refinement
          pointsExplanation = 'Refining your idea!';
        }

        // Generate contextual suggestions
        let suggestions = data.suggestions || [];
        if (suggestions.length === 0) {
          suggestions = [
            "I need to validate this with customers by...",
            "My minimum viable version would include...",
            "My main competitors are... but I differentiate by...",
            "The biggest risks are... and I'll mitigate them by..."
          ];
        }

        // Store both detailed and summary versions
        const botMessage: Message = {
          id: messageId,
          type: 'bot',
          content: data.response || "Let's continue refining your idea to maximize success.",
          detailedContent: data.detailedResponse || data.response,  // Store the detailed version
          summaryContent: data.summaryResponse || data.response,    // Store the summary version
          timestamp: new Date(),
          suggestions,
          pointsEarned: pointChange,
          pointsExplanation: pointsExplanation
        };
        
        // Remove typing indicator right before adding the real message
        setMessages(prev => [...prev.filter(msg => !msg.isTyping), botMessage]);
        setIsTyping(false);
        
      } catch (error: any) {
        console.error('Error:', error);
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        setIsTyping(false);
        toast({
          title: "Connection Error",
          description: "Failed to get AI response. Please try again.",
          variant: "destructive"
        });
      }
      
      return; // Exit early to avoid re-validation
    }

    // If we don't have a valid idea yet, attempt validation first
    if (!hasValidIdea) {
      const validation = await validateFirstIdea(messageText, wrinklePoints, hasValidIdea);
      
      if (!validation.valid) {
        setMessages(prev => [...prev, validation.gateMessage!]);
        setIsTyping(false);
        setOffTopicAttempts(prev => prev + 1);
        return;
      }
      
      // Approved idea
      const ideaPreview = validation.preview || createIdeaPreview(messageText);
      setCurrentIdea(ideaPreview);
      setHasValidIdea(true);
      setOffTopicAttempts(0);
      
      // Generate AI summary name for the idea
      generateIdeaSummaryName(ideaPreview);
      
      // Save the idea text to localStorage for dashboard
      console.log('Saving idea to localStorage:', { 
        ideaText: messageText, 
        currentIdea: ideaPreview,
        userIdea: ideaPreview 
      });
      
      localStorage.setItem('ideaText', messageText);
      localStorage.setItem('currentIdea', ideaPreview);
      localStorage.setItem('userIdea', ideaPreview); // Also save as userIdea for compatibility

    }

    // Check if message is off-topic (after we have a valid idea)
    if (hasValidIdea && offTopicAttempts < 5) {
      const topicCheckPrompt = `The startup idea is: "${currentIdea}". User message: "${messageText}". 
      Is this message related to discussing/refining the startup idea, business strategy, profitability, market fit, or implementation? 
      Respond with JSON: {"onTopic": true/false, "redirect": "funny message to bring them back if off-topic"}`;
      
      const topicRequestId = `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sessionId = currentSession?.id;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const topicPromise = supabase.functions.invoke('idea-chat', {
          body: { message: topicCheckPrompt, conversationHistory: [], persona: chatPersona || undefined },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
        });
        
        backgroundProcessor.register(topicRequestId, topicPromise, 'chat', sessionId);
        
        const { data: topicData } = await topicPromise;
        
        let topicCheck = { onTopic: true, redirect: '' };
        try {
          const jsonMatch = topicData?.response?.match(/\{[\s\S]*\}/);
          if (jsonMatch) topicCheck = JSON.parse(jsonMatch[0]);
        } catch {}
        
        if (!topicCheck.onTopic) {
          setOffTopicAttempts(prev => prev + 1);
          const redirectLines = [
            "🎯 Whoa there! Let's lasso this back to your startup. What's the biggest implementation challenge?",
            "🚀 Houston, we're off course! Back to profit mode - how will you monetize this?",
            "🧠 My wrinkles are smoothing! Quick, tell me about your pricing strategy!",
            "💡 That's cool but... let's talk money! What's your customer acquisition cost?",
            "🌮 Interesting but not as tasty as profit margins! What's your revenue model?"
          ];
          
          const redirectMessage: Message = {
            id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'bot',
            content: topicCheck.redirect || redirectLines[Math.min(offTopicAttempts, 4)],
            timestamp: new Date(),
            suggestions: [
              "I can maximize revenue by...",
              "My pricing strategy will be...",
              "I'll beat competitors through...",
              "My growth strategy involves..."
            ],
            pointsEarned: -0.25,
            pointsExplanation: 'Stay focused on profit to earn wrinkles!'
          };
          
          setMessages(prev => [...prev, redirectMessage]);
          setIsTyping(false);
          
          if (offTopicAttempts >= 4) {
            const finalWarning: Message = {
              id: `bot-final-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'bot',
              content: "🛑 Last chance! I'm here to maximize your startup's profitability. One more off-topic and I stop. What profit-related aspect would you like to explore?",
              timestamp: new Date(),
              suggestions: [
                "I need help with my pricing model",
                "I want to discuss customer acquisition",
                "Let me explain my revenue strategy",
                "I'm thinking about market positioning"
              ]
            };
            setMessages(prev => [...prev, finalWarning]);
          }
          return;
        } else {
          setOffTopicAttempts(0);
        }
      } catch (error) {
        console.error('Topic check failed:', error);
      }
    }
    
    // Stop after 5 off-topic attempts
    if (offTopicAttempts >= 5) {
      const stopMessage: Message = {
        id: `bot-stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'bot',
        content: "🔚 I'm a profit-focused startup advisor, not a general chatbot. Start a new session when ready to maximize your business success! 🚀",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, stopMessage]);
      setIsTyping(false);
      return;
    }

    // Add typing indicator with unique ID
    const typingId = `typing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const typingMessage: Message = {
      id: typingId,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    const mainRequestId = `main-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = currentSession?.id;

    try {
      // Build conversation history
      const conversationHistory = messages
        .filter(msg => !msg.isTyping)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      // Add contextual grounding to maximize profitability focus
      const contextualMessage = currentIdea 
        ? `Context: We are refining the startup idea "${currentIdea}" to maximize profitability and success. Focus on actionable insights for market fit, revenue optimization, growth strategies, and competitive advantages. User message: ${messageText}`
        : messageText;

      const { data: { session } } = await supabase.auth.getSession();
      const chatPromise = supabase.functions.invoke('idea-chat', {
        body: { 
          message: contextualMessage,
          conversationHistory,
          responseMode: 'concise', // Use concise mode to avoid verbose detailed responses
          persona: chatPersona || undefined
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
      });

      backgroundProcessor.register(mainRequestId, chatPromise, 'chat', sessionId);

      const { data, error } = await chatPromise;

      if (error) throw error;

      // Don't remove typing indicator yet - keep it visible until response is ready

      // Evaluate wrinkle points based on USER's input quality
      let pointChange = 0;
      let pointsExplanation = '';
      
      const evalRequestId = `eval-main-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        const evalPromise = supabase.functions.invoke('evaluate-wrinkle-points', {
          body: { 
            userMessage: messageText,
            currentIdea: currentIdea,
            conversationHistory: conversationHistory.slice(-4), // Last 4 messages for context
            currentWrinklePoints: wrinklePoints
          }
        });
        
        backgroundProcessor.register(evalRequestId, evalPromise, 'evaluation', sessionId);
        
        const { data: evaluationData } = await evalPromise;
        
        if (evaluationData?.pointChange !== undefined) {
          pointChange = evaluationData.pointChange;
          pointsExplanation = evaluationData.explanation || '';
        }
      } catch (error) {
        console.error('Error evaluating wrinkle points:', error);
        // Fallback: evaluate based on USER's message quality
        const userWords = messageText.toLowerCase().split(' ');
        const hasSpecifics = /\d+|\$|%|users?|customers?|revenue|cost|price/i.test(messageText);
        const hasStrategy = /strategy|plan|approach|method|process|system/i.test(messageText);
        const hasEvidence = /validated|tested|research|data|feedback|survey/i.test(messageText);
        const isDetailed = messageText.length > 100;
        
        if (hasSpecifics && hasStrategy) {
          pointChange = (Math.random() * 2) + 4; // 4.00 - 6.00
          pointsExplanation = 'Excellent specificity and strategic thinking!';
        } else if (hasEvidence || isDetailed) {
          pointChange = (Math.random() * 2) + 2.5; // 2.50 - 4.50
          pointsExplanation = 'Good depth and evidence in your response!';
        } else if (messageText.length > 50) {
          pointChange = (Math.random() * 1.5) + 1; // 1.00 - 2.50
          pointsExplanation = 'Contributing to the discussion!';
        } else {
          pointChange = (Math.random() * 0.5) + 0.25; // 0.25 - 0.75
          pointsExplanation = 'Keep adding more detail for more wrinkles!';
        }
      }

      // Do not directly mutate wrinklePoints here; accumulation handled in effect after message commit
      
      // Check for comprehensive analysis
      if (data?.pmfAnalysis) {
        const analysisMessage: Message = {
          id: `bot-analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'bot',
          content: "🧠✨ Your brain has developed some serious wrinkles! Here's your refined idea analysis:",
          timestamp: new Date(),
          pmfAnalysis: data.pmfAnalysis
        };
        
        // Remove typing indicator right before adding the real message
        setMessages(prev => [...prev.filter(msg => !msg.isTyping), analysisMessage]);
        setIsTyping(false);
        onAnalysisReady(messageText, data.pmfAnalysis);
      } else {
        // Use the pre-generated detailed and summary responses from the edge function
        const detailedContent = data.detailedResponse || data.response || "Let me help you explore that further.";
        const summaryContent = data.summaryResponse || data.response || "Let's explore further.";
        
        const botMessage: Message = {
          id: messageId,
          type: 'bot',
          content: data.response || "Let me help you explore that further.", // Current response based on mode
          detailedContent: detailedContent,  // Always store the full detailed version
          summaryContent: summaryContent,    // Always store the summary version
          timestamp: new Date(),
          suggestions: data.suggestions || [],
          pointsEarned: pointChange,
          pointsExplanation: pointsExplanation
        };
        
        // Remove typing indicator right before adding the real message
        setMessages(prev => [...prev.filter(msg => !msg.isTyping), botMessage]);
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Mark the user's message as failed to get response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isTyping);
        
        // Find the last user message and mark it as failed
        const updatedMessages = [...filtered];
        for (let i = updatedMessages.length - 1; i >= 0; i--) {
          if (updatedMessages[i].type === 'user') {
            updatedMessages[i] = {
              ...updatedMessages[i],
              failedToGetResponse: true,
              awaitingResponse: false
            };
            break;
          }
        }
        
        return updatedMessages;
      });
      
      setIsTyping(false);
      
      toast({
        title: "Connection Error",
        description: "Failed to get AI response. Click retry on your message to try again.",
        variant: "destructive"
      });
    }
  }; // Properly close the sendMessageHandler function

  // Ensure unique variable declarations
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);useEffect(() => {
  if (messages.length > 1) {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages]);

// Rename conflicting variables to avoid redeclaration
const ChatMessageItem = useMemo(() => {
  const Item: React.FC<{
    message: Message;
    sendMessage: (m?: string) => void;
    handleSuggestionClick: (s: string) => void;
    retryMessage: (msg: Message) => void;
  }> = ({ message, sendMessage, handleSuggestionClick, retryMessage }) => {
    return (
      <motion.div
        layout
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
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
                transition: {
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1
                }
              }}
            >
              <motion.div 
                className="relative"
                animate={message.isTyping ? {
                  rotate: [0, 5, -5, 5, 0],
                  transition: {
                    duration: 0.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                } : {}}
              >
                <motion.div 
                  className="absolute inset-0 bg-primary/20 blur-lg rounded-full"
                  animate={message.isTyping ? {
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                  } : {}}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 backdrop-blur-sm">
                  {message.isTyping ? (
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Brain className="h-5 w-5 text-primary" />
                    </motion.div>
                  ) : (
                    <Bot className="h-5 w-5 text-primary" />
                  )}
                </div>
              </motion.div>
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
                {message.type === 'user' ? (
                  <>
                    <div className="text-sm opacity-90 break-words overflow-wrap-anywhere whitespace-pre-wrap max-w-full">
                      {message.content}
                    </div>
                    {message.failedToGetResponse && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-destructive">Failed to get response</span>
                        <Button
                          onClick={() => retryMessage(message)}
                          variant="outline"
                          size="sm"
                          className="ml-auto h-7 px-2 text-xs flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <MessageRenderer 
                    message={message} 
                    onSendMessage={sendMessage}
                    onSuggestionClick={handleSuggestionClick}
                    onRetry={retryMessage}
                  />
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {message.type === 'user' && (
          <motion.div 
            className="flex-shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-lg rounded-full" />
              <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20">
                <span className="text-sm font-medium text-primary">You</span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };
  return React.memo(Item, (prev, next) => prev.message === next.message);
}, []);
  const resetChatHandler = useCallback(async () => {
    // Clear ALL persisted state - both generic and session-specific
    const keysToRemove = [
      // Chat and idea related
      'enhancedIdeaChatMessages',
      'pmfCurrentIdea',
      'pmfScore',
      'pmfFeatures',
      'pmfTabHistory',
      'pmfUserIdea',
      'pmfAnalysisData',
      'userIdea',
      'currentIdea',
      'ideaText',
      'ideaInput',
      'ideaMetadata',
      'ideaChatAnswers',
      'ideaDescription',
      'market_size_value',
      'competition_value',
      'sentiment_value',
      'smoothBrainsScore',
      
      // Session related  
      'currentSessionId',
      'currentSession',
      
      // User progress
      'userAnswers',
      'hasAnalyzed',
      'analysisCompleted',
      'analysisInProgress',
      'hasCompletedOnboarding',
      
      // UI state
      'expandedSections',
      'activeTab',
      'pmf.ui.returnToChat',
      'insightsExpanded',
      'promptHistory',
      
      // Chat metadata
      'streamlinedProgress',
      'streamlinedMessages',
      'streamlinedIdeas',
      
      // Wrinkling system
      'wrinkleLevel',
      'wrinklePoints',
      'wrinkleHistory',
      'accumulatedWrinkles',
      
      // Dashboard tiles cache - clear all tile caches
      ...Array.from({ length: 10 }, (_, i) => [
        `tile_cache_pmf-score_`,
        `tile_cache_market-size_`,
        `tile_cache_competition_`,
        `tile_cache_sentiment_`,
        `tile_last_refresh_pmf-score_`,
        `tile_last_refresh_market-size_`,
        `tile_last_refresh_competition_`,
        `tile_last_refresh_sentiment_`,
      ]).flat()
    ];
    
    // Clear all localStorage keys that match patterns
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      // Remove if it matches any of our patterns
      if (keysToRemove.some(pattern => key.includes(pattern)) ||
          key.includes('pmf') ||
          key.includes('idea') ||
          key.includes('session') ||
          key.includes('tile_cache') ||
          key.includes('tile_last_refresh') ||
          key.includes('analysis') ||
          key.includes('wrinkle')) {
        try {
          localStorage.removeItem(key);
        } catch (err) {
          console.warn(`Failed to clear ${key}:`, err);
        }
      }
    });
    
    // Clear sessionStorage as well
    try {
      sessionStorage.clear();
    } catch (err) {
      console.warn('Failed to clear sessionStorage:', err);
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('session:fullReset'));
    
    // If we're on the dashboard, reload the page to ensure clean state
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard' || currentPath === '/') {
      // Small delay to ensure storage is cleared before reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return; // Exit early since page will reload
    }
    
    // Fetch new random ideas for the reset
    const randomIdeas = await fetchRandomIdeas();
    const suggestions = randomIdeas && randomIdeas.length > 0 
      ? randomIdeas.slice(0, 4)
      : [
        "AI-powered personal nutritionist app",
        "Sustainable packaging marketplace", 
        "Virtual interior design assistant",
        "Peer-to-peer skill sharing platform"
      ];
    
    setMessages([{
      id: 'welcome',
      type: 'bot',
      content: `Welcome to SmoothBrains advisor! I'm here to help transform your startup idea into reality. 🚀\n\nI'll guide you through analyzing your concept, understanding your market, and developing a solid strategy.`,
      timestamp: new Date(),
      suggestions
    }]);
    
    setCurrentIdea('');
    setIdeaSummaryName('');
    setIsTyping(false);
    setInput('');
    setWrinklePoints(0);
    setHasValidIdea(false);
    setAnonymous(false);
    setOffTopicAttempts(0);
    onReset?.();
  }, [onReset, fetchRandomIdeas, anonymous]);
  
  // Add retry handler for failed messages
  const retryMessageHandler = useCallback((failedMessage: Message) => {
    // For user messages that failed to get response
    if (failedMessage.type === 'user' && failedMessage.failedToGetResponse) {
      // Clear the failed flag on the message
      setMessages(prev => prev.map(msg => 
        msg.id === failedMessage.id 
          ? { ...msg, failedToGetResponse: false, awaitingResponse: true }
          : msg
      ));
      
      // Resend the message
      setTimeout(() => {
        sendMessageHandler(failedMessage.content);
      }, 100);
    }
  }, []);

  const handleSuggestionClickHandler = useCallback((suggestionText: string) => {
    setInput(suggestionText);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const sendMessageHandler = useCallback(async (textToSend?: string) => {
    const messageText = textToSend || input.trim();
    if (!messageText || isTyping) return;
    // Session management is handled by parent component/SessionContext

    setInput('');
    setConversationStarted(true);
    setIsTyping(true);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: messageText,
      timestamp: new Date(),
      awaitingResponse: true // Mark as awaiting response
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Detect and save persona JSON
    try {
      const maybeJson = messageText.trim();
      if (maybeJson.startsWith('{') && maybeJson.includes('"persona"')) {
        const parsed = JSON.parse(maybeJson);
        if (parsed?.persona || parsed?.style || parsed?.boundaries) {
          setChatPersona(parsed);
          if (!anonymous) {
            try { localStorage.setItem('chatPersona', JSON.stringify(parsed)); } catch {}
          }
          const confirmMsg: Message = {
            id: `bot-persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'bot',
            content: `✅ Persona saved: ${parsed?.persona?.name || 'Custom Persona'}. I’ll use this style going forward.`,
            timestamp: new Date(),
            suggestions: [
              'Share your startup idea',
              'Ask for monetization strategies',
              'Request a quick validation checklist'
            ],
            pointsEarned: 0.5,
            pointsExplanation: 'Persona configured'
          };
          setMessages(prev => [...prev, confirmMsg]);
          setIsTyping(false);
          return;
        }
      }
    } catch {}
    
    // Check for trickery attempts first
    const trickeryCheck = detectTrickery(messageText);
    if (trickeryCheck.isTricky) {
      // Remove typing indicator and show salty response
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      setIsTyping(false);
      
  // Brain disappointment animation could be triggered here if desired (removed direct point mutation)
      
      // Increase persistence level - user is being tricky
      const newPersistenceLevel = persistenceLevel + 1;
      setPersistenceLevel(newPersistenceLevel);
      
      try {
        // Enhance the salty response with ChatGPT for more dynamic, corny responses
        const { data: enhancedData } = await supabase.functions.invoke('enhance-salty-response', {
          body: { 
            baseResponse: trickeryCheck.response,
            userMessage: messageText,
            persistenceLevel: newPersistenceLevel,
            wrinklePoints: wrinklePoints
          }
        });
        
        const enhancedResponse = enhancedData?.enhancedResponse || trickeryCheck.response;
        const dynamicSuggestions = enhancedData?.suggestions || [
          "Alright alright, here's my ACTUAL idea this time",
          "Fine, you caught me - here's what I really want to build",
          "Okay okay, let me be serious about my startup concept"
        ];
        
        const saltyMessage: Message = {
          id: `bot-salty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'bot',
          content: enhancedResponse,
          timestamp: new Date(),
          suggestions: dynamicSuggestions,
          pointsEarned: -5,
          pointsExplanation: "Trickery detected - brain wrinkles disappointed!"
        };
        
        setMessages(prev => [...prev, saltyMessage]);
        
      } catch (error) {
        console.error('Error enhancing salty response:', error);
        
        // Fallback to escalated responses
        let escalatedResponse = trickeryCheck.response;
        let escalatedSuggestions = [
          "Alright alright, here's my ACTUAL idea this time",
          "Fine, you caught me - here's what I really want to build",
          "Okay okay, let me be serious about my startup concept"
        ];
        
        if (newPersistenceLevel >= 3) {
          escalatedResponse += " \n\n🤬 SERIOUSLY?! This is attempt #" + newPersistenceLevel + "! My brain wrinkles are getting WRINKLED from frustration! Just give me ONE real idea!";
          escalatedSuggestions = [
            "FINE! Here's a real business idea I actually want to pursue",
            "You're right, I'm being ridiculous - here's my genuine concept",
            "I surrender! Here's what I genuinely want to build"
          ];
        } else if (newPersistenceLevel >= 2) {
          escalatedResponse += " \n\n😤 I'm starting to lose my patience here! This is your second strike!";
        }
        
        const saltyMessage: Message = {
          id: `bot-escalated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'bot',
          content: escalatedResponse,
          timestamp: new Date(),
          suggestions: escalatedSuggestions,
          pointsEarned: -5,
          pointsExplanation: "Trickery detected - brain wrinkles disappointed!"
        };
        
        setMessages(prev => [...prev, saltyMessage]);
      }
      
      return;
    }
    
    // Reset persistence level when user provides legitimate input
    if (persistenceLevel > 0) {
      setPersistenceLevel(0);
    }

    // If we have not yet validated an idea, attempt validation first before normal flow.
    if (!hasValidIdea) {
      try {
        // Quick heuristic pre-filter: must have some structure before we even ask model.
        const heuristicLooksLikeIdea = isIdeaDescription(messageText);
        const validationPrompt = `You are a STRICT startup idea validator. Determine if the user submission is a CONCRETE startup idea (must specify: target user or segment, a real painful problem or workflow friction, and a hint of the proposed solution or wedge). If it is vague (e.g. 'an AI app to help everyone be productive'), purely aspirational, joke content, or missing key specifics, mark it invalid.
Respond ONLY with minified JSON: {"valid": true|false, "reason": "short reason why or what is missing", "improvementHints": ["array of 2-4 very tactical improvement prompts the user can answer" ]}.
User submission: """${messageText}"""`;

        const { data: validationData, error: validationError } = await supabase.functions.invoke('idea-chat', {
          body: { message: validationPrompt, conversationHistory: [], persona: chatPersona || undefined }
        });

        if (validationError) throw validationError;

        let parsed: { valid?: boolean; reason?: string; improvementHints?: string[] } = {};
        try {
          const jsonMatch = validationData?.response?.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
          console.warn('Failed to parse validation JSON, fallback to heuristic', e);
        }

        // Be more lenient - accept if either validation passes
        const isValid = parsed.valid === true || (heuristicLooksLikeIdea && parsed.valid !== false);

        if (!isValid) {
          const funnyLines = [
            "That wasn't a startup idea, that was a vibe. I need specifics.",
            "My cortical folds refuse to wrinkle for abstract fluff. Give me WHO has WHAT pain.",
            "That was like ordering 'food' at a restaurant. I need the dish, spice level, and plating concept.",
            "Your submission was a motivational poster, not a wedge. Niche it down hard."
          ];
          const randomFunny = funnyLines[Math.floor(Math.random() * funnyLines.length)];
          const improvementHints = (parsed.improvementHints && Array.isArray(parsed.improvementHints) && parsed.improvementHints.length > 0)
            ? parsed.improvementHints
            : [
                "Who EXACTLY experiences this pain (role / segment / context)?",
                "Describe the awkward manual workaround they do today.",
                "What narrow starting wedge feature solves one painful slice?",
                "What unique data/signals do you get by starting there?"
              ];

          const gateMessage: Message = {
            id: `bot-gate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'bot',
            content: `🧪 Idea Validation: NOT APPROVED\n\n${randomFunny}\n\nReason: ${parsed.reason || 'Missing concrete target, problem, or wedge.'}\n\nAnswer one of these to refine:\n- ${improvementHints.join('\n- ')}`,
            timestamp: new Date(),
            suggestions: improvementHints.map(h => `Answer: ${h}`),
            pointsEarned: -0.5,
            pointsExplanation: 'Session naming required to begin.'
          };
          setMessages(prev => [...prev, gateMessage]);
          setIsTyping(false);
          return; // STOP normal flow until validated
        }

        // Approved idea: capture preview + unlock analyses
        const ideaPreview = createIdeaPreview(messageText);
        setCurrentIdea(ideaPreview);
        setHasValidIdea(true);
        
        // Generate AI summary name for the idea
        generateIdeaSummaryName(ideaPreview);
        
        // Save the idea text to localStorage for dashboard
        console.log('Saving idea to localStorage (validation approved):', { 
          ideaText: messageText, 
          currentIdea: ideaPreview,
          userIdea: ideaPreview 
        });
        
        localStorage.setItem('ideaText', messageText);
        localStorage.setItem('currentIdea', ideaPreview);
        localStorage.setItem('userIdea', ideaPreview); // Also save as userIdea for compatibility
      } catch (e) {
        console.error('Idea validation failed, falling back to heuristic only.', e);
        if (isIdeaDescription(messageText)) {
          const ideaPreview = createIdeaPreview(messageText);
          setCurrentIdea(ideaPreview);
          setHasValidIdea(true);
          
          // Generate AI summary name for the idea
          generateIdeaSummaryName(ideaPreview);
          
          // Save the idea text to localStorage for dashboard
          console.log('Saving idea to localStorage (fallback):', { 
            ideaText: messageText, 
            currentIdea: ideaPreview,
            userIdea: ideaPreview 
          });
          
          localStorage.setItem('ideaText', messageText);
          localStorage.setItem('currentIdea', ideaPreview);
          localStorage.setItem('userIdea', ideaPreview); // Also save as userIdea for compatibility
        } else {
          const fallbackGate: Message = {
            id: `bot-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'bot',
            content: `🧪 Idea Validation Glitch: I couldn't fully evaluate that, but it still feels too vague. Give me: WHO specifically + their painful moment + your narrow starting feature.`,
            timestamp: new Date(),
            suggestions: [
              'Target user: [role / segment] facing [specific recurring pain]',
              'Manual workaround today: [exact hack / spreadsheet / duct tape process]',
              'Starting wedge feature: [ultra-specific capability]',
              'Why now / unique insight: [data / behavior / timing]'
            ],
            pointsEarned: -0.25,
            pointsExplanation: 'Need clearer idea before wrinkling.'
          };
          setMessages(prev => [...prev, fallbackGate]);
          setIsTyping(false);
          return;
        }
      }
    }

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
        .filter(msg => !msg.isTyping)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      // Add contextual grounding to the message
      const contextualMessage = currentIdea 
        ? `Context: We are discussing the idea "${currentIdea}". Please keep your response focused on this specific idea. ${messageText}`
        : messageText;

      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: contextualMessage,
          conversationHistory,
          responseMode: 'concise', // Use concise mode to avoid verbose detailed responses
          persona: chatPersona || undefined
        }
      });

      if (error) throw error;

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => !msg.isTyping));
      setIsTyping(false);

      // Use ChatGPT to evaluate wrinkle points for this conversation turn
  let pointChange = 0;
      let pointsExplanation = '';
      
      try {
        const { data: evaluationData } = await supabase.functions.invoke('evaluate-wrinkle-points', {
          body: { 
            userMessage: messageText,
            botResponse: data.response || 'AI response processing...',
            conversationHistory: conversationHistory.slice(-4), // Last 4 messages for context
            currentWrinklePoints: wrinklePoints
          }
        });
        
        if (evaluationData?.pointChange !== undefined) {
          pointChange = evaluationData.pointChange;
          pointsExplanation = evaluationData.explanation || '';
        }
      } catch (error) {
        console.error('Error evaluating wrinkle points:', error);
        // Fallback to simple evaluation
        const isRefinement = data?.content && (
          data.content.includes('refined') || 
          data.content.includes('improved') || 
          data.content.includes('better') ||
          data.content.includes('enhanced') ||
          data.content.includes('clarified')
        );
        
        if (isRefinement) {
          pointChange = (Math.random() * 2) + 3; // 3.00 - 5.00
          pointsExplanation = 'Good refinement detected!';
        } else {
          pointChange = (Math.random() * 1.5) + 0.75; // 0.75 - 2.25
          pointsExplanation = 'Making progress!';
        }
      }

      // Do not directly mutate wrinklePoints here; accumulation handled in effect after message commit
      
      // Check for comprehensive analysis
      if (data?.pmfAnalysis) {
        const analysisMessage: Message = {
          id: `bot-pmf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'bot',
          content: "🧠✨ Your brain has developed some serious wrinkles! Here's your refined idea analysis:",
          timestamp: new Date(),
          pmfAnalysis: data.pmfAnalysis
        };
        
        setMessages(prev => [...prev, analysisMessage]);
        onAnalysisReady(messageText, data.pmfAnalysis);
      } else {
        // Parse response for better formatting
        let formattedContent = data.response || "Let me help you explore that further.";
        
        // Always show detailed content - summary handled by UI button
        
        // Extract suggestions if they're in the response
        let suggestions = data.suggestions || [];
        
        // Generate AI-powered suggestions with explanations
        let suggestionsError = false;
        try {
          const { data: suggestionData } = await supabase.functions.invoke('generate-suggestions', {
            body: { 
              question: formattedContent,
              ideaDescription: messages.find(m => m.type === 'user')?.content || messageText,
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
              responseMode: 'concise' // Use concise mode to avoid verbose detailed responses
            }
          });
          if (suggestionData?.suggestions && suggestionData.suggestions.length > 0) {
            suggestions = suggestionData.suggestions.map((s: any) => {
              const text = typeof s === 'string' ? s : (s?.text ?? String(s ?? '').trim());
              return { text, explanation: generateSuggestionExplanation(text) };
            });
          } else {
            suggestionsError = true;
          }
        } catch (error) {
          console.error('Error getting AI suggestions:', error);
          suggestionsError = true;
        }
        
        // Generate static suggestion explanation only if we have suggestions
        const suggestionTexts = suggestions.map(s => typeof s === 'string' ? s : s?.text || String(s));
        const staticSuggestionExplanation = suggestionTexts.length > 0 ? 
          generateBrainExplanation(suggestionTexts, formattedContent) : '';
        
        // Prepare detailed and summary versions
        const detailed = data.detailedResponse || formattedContent;
        const summary = data.summaryResponse || (() => {
          const sentences = formattedContent.split(/[.!?]+/).filter(s => s.trim());
          const short = sentences.slice(0, 2).join('. ').trim();
          return short ? short + (short.endsWith('.') ? '' : '.') : formattedContent;
        })();

        const botMessage: Message = {
          id: `bot-response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'bot',
          content: formattedContent,
          detailedContent: detailed,
          summaryContent: summary,
          timestamp: new Date(),
          suggestions,
          pointsEarned: pointChange,
          pointsExplanation: pointsExplanation,
          suggestionExplanation: staticSuggestionExplanation,
          suggestionsError // Pass the error flag to the message
        };
        
        setMessages(prev => {
          const newMessages = [...prev, botMessage];
          
          // Save conversation history to localStorage
          const conversationHistory = newMessages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: msg.timestamp
          }));
          localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
          
          // Extract and save metadata
          const extractFromMessage = (keyword: string, text: string) => {
            const pattern = new RegExp(`${keyword}[^.!?]*[.!?]`, 'gi');
            const matches = text.match(pattern);
            return matches ? matches[0] : '';
          };
          
          const metadata = {
            refined: currentIdea || '',
            targetAudience: extractFromMessage('target|audience|customer', formattedContent),
            problemSolving: extractFromMessage('problem|solve|pain', formattedContent),
            businessModel: extractFromMessage('business model|revenue|pricing', formattedContent),
            uniqueValue: extractFromMessage('unique|different|special', formattedContent),
            marketSize: extractFromMessage('market|size|billion|million', formattedContent),
            competitorAnalysis: extractFromMessage('competitor|competition|rival', formattedContent)
          };
          
          const existingMetadata = localStorage.getItem('ideaMetadata');
          if (existingMetadata) {
            try {
              const existing = JSON.parse(existingMetadata);
              Object.keys(metadata).forEach(key => {
                if (!metadata[key] && existing[key]) {
                  metadata[key] = existing[key];
                }
              });
            } catch {}
          }
          
          localStorage.setItem('ideaMetadata', JSON.stringify(metadata));
          
          return newMessages;
        });
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
  }, [input, isTyping, messages, wrinklePoints, currentIdea, hasValidIdea, toast]); // Properly close the sendMessageHandler function

  return (
    <TooltipProvider>
    <Card className="h-full w-full flex flex-col relative overflow-visible border-2 border-always-visible chat-shell fluid-pad-sm z-0">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 opacity-50" />
    
    {/* Header */}
<div className="relative fluid-pad-sm lg:fluid-pad-md border-b border-border backdrop-blur-sm bg-card/80 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center fluid-gap">
          <BrainHeader
            wrinklePoints={wrinklePoints}
            isRefining={isRefining}
            hoveringBrain={hoveringBrain}
            setHoveringBrain={setHoveringBrain}
            hasValidIdea={hasValidIdea}
            wrinkleTierLabel={wrinkleTierLabel}
            dynamicBrainTooltip={dynamicBrainTooltip}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold tracking-tight fluid-text-xl leading-tight select-text">
                {displaySessionName}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetChatHandler}
                title="Start new analysis"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="fluid-text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[0.75rem] tracking-tight text-primary/90">{wrinklePoints.toFixed(1)}</span>
              <span className="text-[0.65rem] uppercase tracking-wide font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">Wrinkles</span>
            {currentSession?.is_anonymous && (
              <span className="text-[0.65rem] uppercase tracking-wide font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Anonymous</span>
            )}
          </p>
          </div>
        </div>
      </div>
    </div>

    {/* Messages Area */}
    <ScrollArea className="flex-1 relative">
      <div className="fluid-pad-sm lg:fluid-pad-md space-y-4 sm:space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              sendMessage={sendMessageHandler}
              handleSuggestionClick={handleSuggestionClickHandler}
              retryMessage={retryMessageHandler}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>

    {/* Input Area */}
<div className="relative fluid-pad-sm lg:fluid-pad-md border-t border-border backdrop-blur-sm bg-card/80">
      <div className="flex gap-2 sm:gap-3 w-full max-w-none sm:max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Describe your startup idea or ask for guidance..."
            className="min-h-[50px] sm:min-h-[60px] resize-none pr-10 sm:pr-12 bg-background/95 border border-border focus:border-primary/50 transition-all duration-200 text-sm sm:text-base"
            disabled={isTyping || isDefaultSessionName}
          />
          <Button 
            onClick={() => {
              if (input.trim() && !isTyping) {
                sendMessage();
              }
            }}
            disabled={!input.trim() || isTyping || isDefaultSessionName}
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
        <Button
          onClick={() => {
            // Extract the actual idea from conversation history
            const extractIdeaFromHistory = () => {
              // Try to find the most relevant idea from messages
              for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.type === 'user' && msg.content && msg.content.length > 20) {
                  // Check if this looks like an idea description
                  const lowerContent = msg.content.toLowerCase();
                  if (!lowerContent.includes('what') && 
                      !lowerContent.includes('how') && 
                      !lowerContent.includes('can you') &&
                      !lowerContent.includes('tell me') &&
                      !lowerContent.includes('explain')) {
                    return msg.content;
                  }
                }
              }
              return currentIdea;
            };
            
            const ideaToStore = hasValidIdea ? (currentIdea || extractIdeaFromHistory()) : extractIdeaFromHistory();
            
            // Store the idea properly before navigation
            if (ideaToStore) {
              localStorage.setItem('dashboardIdea', ideaToStore);
              localStorage.setItem('currentIdea', ideaToStore);
              localStorage.setItem(LS_KEYS.userIdea, ideaToStore);
              localStorage.setItem('ideaText', ideaToStore);
            }
            
            // Store the summarized conversation context for dashboard
            const conversationSummary = createConversationSummary(messages, ideaToStore);
            
            localStorage.setItem('dashboardIdea', conversationSummary);
            localStorage.setItem('dashboardConversationHistory', JSON.stringify(messages));
            
            navigate('/dashboard');
          }}
          variant="outline"
          size="sm"
          className="fluid-text-xs group hover:bg-primary/10 hover:border-primary/50"
        >
          <BarChart3 className="h-3 w-3 mr-1.5 text-primary group-hover:scale-110 transition-transform" />
          Dashboard
        </Button>
        <motion.div whileHover={hasValidIdea ? { scale: 1.02 } : {}} whileTap={hasValidIdea ? { scale: 0.98 } : {}}>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasValidIdea}
            onClick={() => hasValidIdea && sendMessage("What are the main risks?")}
            className={`fluid-text-xs group ${hasValidIdea 
              ? 'hover:bg-yellow-500/10 hover:border-yellow-500/50' 
              : 'opacity-50 cursor-not-allowed bg-muted'}`}
          >
            <Shield className={`h-3 w-3 mr-1.5 ${hasValidIdea 
              ? 'text-yellow-500 group-hover:scale-110 transition-transform' 
              : 'text-muted-foreground'}`} />
            Risk Assessment
          </Button>
        </motion.div>
        <motion.div whileHover={hasValidIdea ? { scale: 1.02 } : {}} whileTap={hasValidIdea ? { scale: 0.98 } : {}}>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasValidIdea}
            onClick={() => hasValidIdea && sendMessage("How should I monetize this?")}
            className={`fluid-text-xs group ${hasValidIdea 
              ? 'hover:bg-green-500/10 hover:border-green-500/50' 
              : 'opacity-50 cursor-not-allowed bg-muted'}`}
          >
            <DollarSign className={`h-3 w-3 mr-1.5 ${hasValidIdea 
              ? 'text-green-500 group-hover:scale-110 transition-transform' 
              : 'text-muted-foreground'}`} />
            Monetization
          </Button>
        </motion.div>
      </div>
    </div>
    
    {/* GPT-5 Powered - Floating text */}
    <div className="absolute bottom-3 right-3 flex items-center gap-1 text-slate-500 dark:text-slate-400 fluid-text-xs font-medium">
      <span>Powered by GPT-5</span>
    </div>
  </Card>
  </TooltipProvider>
  );
};

export default EnhancedIdeaChat;