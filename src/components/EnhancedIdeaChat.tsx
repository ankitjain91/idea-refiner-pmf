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
  AlertCircle,  // For error indicator
  Lightbulb     // For idea button
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/contexts/SimpleSessionContext';
import { LS_KEYS } from '@/lib/storage-keys';
import { backgroundProcessor } from '@/lib/background-processor';
import { AsyncDashboardButton } from '@/components/AsyncDashboardButton';
import { useIdeaContext } from '@/hooks/useIdeaContext';

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
import { ShareableReportCard } from './share/ShareableReportCard';
import { ConfettiAnimation } from './share/ConfettiAnimation';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { IdeaSummaryDialog } from './chat/IdeaSummaryDialog';
import { PersistenceIndicator } from './chat/PersistenceIndicator';
import { lockedIdeaManager } from '@/lib/lockedIdeaManager';

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
  const { currentSession, saveCurrentSession, saveMessagesNow } = useSession();
  const ideaContext = useIdeaContext(); // Hook must be called at component level
  const [anonymous, setAnonymous] = useState(false);
  const isDefaultSessionName = !currentSession?.name;
  const displaySessionName = currentSession?.name || sessionName || 'New Chat Session';
  
  // Response mode removed - always use detailed
  
  // Restore state from localStorage for authenticated sessions
  const [currentIdea, setCurrentIdea] = useState<string>(() => {
    if (!anonymous) {
      const sid = localStorage.getItem('currentSessionId');
      if (sid) {
        return localStorage.getItem(`session_${sid}_idea`) || '';
      }
      return '';
    }
    return '';
  });
  
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!anonymous) {
      const sid = localStorage.getItem('currentSessionId');
      if (sid) {
        const stored = localStorage.getItem(`session_${sid}_messages`);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (e) {
            console.error('Error parsing stored messages:', e);
          }
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
  
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  
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
  
  // Evolving conversation summary state
  const [conversationSummary, setConversationSummary] = useState<string>(() => {
    if (!anonymous) {
      const sid = localStorage.getItem('currentSessionId');
      if (sid) {
        return localStorage.getItem(`session_${sid}_summary`) || '';
      }
    }
    return '';
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [lastSummaryGeneration, setLastSummaryGeneration] = useState(() => {
    if (!anonymous) {
      const sid = localStorage.getItem('currentSessionId');
      if (sid) {
        const stored = localStorage.getItem(`session_${sid}_lastSummaryGen`);
        return stored ? parseInt(stored, 10) : 0;
      }
    }
    return 0;
  });

  // Persisted chat persona (allows custom tone/style)
  const [chatPersona, setChatPersona] = useState<any>(() => {
    if (!anonymous) {
      const raw = localStorage.getItem('chatPersona');
      try { return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    return null;
  });

  // Viral growth state
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareCardData, setShareCardData] = useState<{
    ideaTitle: string;
    score: number;
    marketSize?: string;
    insights: string[];
  } | null>(null);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const subscriptionContext = useSubscription();

  // Persistence state
  const [persistenceStatus, setPersistenceStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [persistenceError, setPersistenceError] = useState<string | undefined>();
  const [isPinned, setIsPinned] = useState(() => lockedIdeaManager.isPinned());

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
  
  // ALWAYS load session from DB on mount
  useEffect(() => {
    const loadSessionFromDB = async () => {
      const sid = localStorage.getItem('currentSessionId');
      if (!sid) {
        console.log('[EnhancedIdeaChat] No session ID found');
        return;
      }
      
      console.log('[EnhancedIdeaChat] Loading session from database:', sid);
      
      try {
        const { data, error } = await supabase
          .from('brainstorming_sessions')
          .select('state')
          .eq('id', sid)
          .maybeSingle();
          
        if (error) {
          console.error('[EnhancedIdeaChat] Database fetch error:', error);
          return;
        }
        
        if (!data) {
          console.log('[EnhancedIdeaChat] No session found in database with ID:', sid);
          return;
        }
        
        const state = data.state as any;
        
        // Restore chat history
        if (state?.chatHistory && Array.isArray(state.chatHistory) && state.chatHistory.length > 0) {
          console.log(`[EnhancedIdeaChat] ✅ Loaded ${state.chatHistory.length} messages from DB`);
          setMessages(state.chatHistory);
          setConversationStarted(true);
          localStorage.setItem(`session_${sid}_messages`, JSON.stringify(state.chatHistory));
        }
        
        // Restore idea
        if (state?.currentIdea) {
          console.log('[EnhancedIdeaChat] ✅ Restored idea from DB');
          setCurrentIdea(state.currentIdea);
          setHasValidIdea(true);
          localStorage.setItem('currentIdea', state.currentIdea);
          localStorage.setItem(`session_${sid}_idea`, state.currentIdea);
        }
        
        // Restore wrinkle points
        if (typeof state?.wrinklePoints === 'number') {
          setWrinklePoints(state.wrinklePoints);
          localStorage.setItem('wrinklePoints', state.wrinklePoints.toString());
        }
        
        // Restore conversation summary
        if (state?.conversationSummary) {
          setConversationSummary(state.conversationSummary);
          localStorage.setItem(`session_${sid}_summary`, state.conversationSummary);
        }
      } catch (e) {
        console.error('[EnhancedIdeaChat] Failed to load from database:', e);
      }
    };
    
    loadSessionFromDB();
    
    window.addEventListener('session:loaded', loadSessionFromDB);
    
    return () => {
      window.removeEventListener('session:loaded', loadSessionFromDB);
    };
  }, []);
  
  // Update user message count whenever messages change
  useEffect(() => {
    const validMessages = messages.filter(m => !m.isTyping && m.content && m.content.length > 5);
    const validUserMessages = validMessages.filter(m => m.type === 'user');
    const count = validUserMessages.length;
    
    console.log('[Summary] Messages changed - User count:', count, 'Total messages:', messages.length);
    setUserMessageCount(count);
  }, [messages]);
  
  // Effects
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      resetChat();
    }
  }, [resetTrigger]);

  // Save to DB on EVERY user action (immediately)
  useEffect(() => {
    if (messages.length > 0 && !anonymous) {
      const sid = localStorage.getItem('currentSessionId');
      if (sid) {
        // Update localStorage immediately
        localStorage.setItem(`session_${sid}_messages`, JSON.stringify(messages));
        
        // Save to database immediately (no debounce)
        saveCurrentSession();
      }
    }
  }, [messages, anonymous, saveCurrentSession]);
  
  // Save idea to DB on every change
  useEffect(() => {
    if (currentIdea && !anonymous) {
      const sid = localStorage.getItem('currentSessionId');
      if (sid) {
        localStorage.setItem(`session_${sid}_idea`, currentIdea);
        localStorage.setItem('currentIdea', currentIdea);
        saveCurrentSession();
      }
    }
  }, [currentIdea, anonymous, saveCurrentSession]);
  
  // Save wrinkle points on change
  useEffect(() => {
    if (!anonymous && wrinklePoints > 0) {
      localStorage.setItem('wrinklePoints', wrinklePoints.toString());
      saveCurrentSession();
    }
  }, [wrinklePoints, anonymous, saveCurrentSession]);

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
        const sid = localStorage.getItem('currentSessionId');
        const storedMessages = sid ? localStorage.getItem(`session_${sid}_messages`) : null;
        const storedIdea = sid ? localStorage.getItem(`session_${sid}_idea`) : null;
        const storedWrinkles = localStorage.getItem('wrinklePoints');
        const storedPMFAnalysis = localStorage.getItem('pmfAnalysisData');
        
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
              
              // PMF analysis will be injected via useEffect after restore
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

  // Inject stored PMF analysis after messages are restored
  useEffect(() => {
    // Skip for anonymous users or empty message history
    if (anonymous || messages.length === 0) {
      return;
    }
    
    const storedPMFAnalysis = localStorage.getItem('pmfAnalysisData');
    if (!storedPMFAnalysis) {
      return;
    }
    
    try {
      const pmfData = JSON.parse(storedPMFAnalysis);
      console.log('Checking stored PMF analysis:', pmfData);
      
      // Check if analysis message already exists
      const hasAnalysisMessage = messages.some(msg => 
        msg.type === 'bot' && msg.pmfAnalysis
      );
      
      if (hasAnalysisMessage) {
        console.log('PMF analysis message already exists in chat');
        return;
      }
      
      // Show a temporary typing/loader message in chat
      const typingId = `typing-pmf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const typingMessage: Message = {
        id: typingId,
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, typingMessage]);
      
      // Check for valid pmfScore (handle both string and number)
      const score = typeof pmfData.pmfScore === 'string' 
        ? parseFloat(pmfData.pmfScore) 
        : pmfData.pmfScore;
        
      if (!score || isNaN(score)) {
        console.log('No valid PMF score found in stored data');
        // remove typing indicator
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        return;
      }
      
      console.log('Injecting PMF analysis message with score:', score);
      
      // Normalize the pmfAnalysis object with fallbacks
      const normalizedAnalysis = {
        score: score,
        pmfScore: score,
        breakdown: pmfData.breakdown || pmfData.scoreBreakdown || [],
        insights: pmfData.insights || pmfData.keyInsights || [],
        nextSteps: pmfData.nextSteps || pmfData.recommendations || [],
        summary: pmfData.summary || `PMF Score: ${score}/100`
      };
      
      // Add the PMF analysis message and remove typing
      const analysisMessage: Message = {
        id: `pmf-${Date.now()}`,
        type: 'bot',
        content: 'Here is your Product-Market Fit analysis based on our conversation:',
        timestamp: new Date(),
        pmfAnalysis: normalizedAnalysis
      };
      
      setMessages(prevMessages => [...prevMessages.filter(msg => !msg.isTyping), analysisMessage]);
    } catch (e) {
      console.error('Error loading stored PMF analysis:', e);
      // Ensure typing indicator is removed on error
      setMessages(prev => prev.filter(msg => !msg.isTyping));
    }
  }, [messages.length, anonymous]);

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

  // Listen for session reset event with conditional clearing
  useEffect(() => {
    const handleSessionReset = () => {
      // Check if idea is locked or conversation is pinned
      const isIdeaLocked = lockedIdeaManager.hasLockedIdea();
      const isConversationPinned = lockedIdeaManager.isPinned();
      
      console.log('[EnhancedIdeaChat] Session reset event:', {
        isIdeaLocked,
        isConversationPinned,
        currentIdea: currentIdea?.slice(0, 50)
      });
      
      // Don't clear if pinned
      if (isConversationPinned) {
        console.log('[EnhancedIdeaChat] Skipping reset - conversation is pinned');
        return;
      }
      
      // Clear messages unless pinned
      setMessages([]);
      
      // Clear idea unless locked
      if (!isIdeaLocked) {
        setCurrentIdea('');
        setIdeaSummaryName('');
        setHasValidIdea(false);
      }
      
      // Reset other state
      setWrinklePoints(0);
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
  }, [initializeChat, currentIdea]);

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

  // Persist messages for authenticated users with debouncing
  useEffect(() => {
    if (!anonymous && messages.length > 0) {
      // Always save to localStorage immediately for fast recovery
      const sid = localStorage.getItem('currentSessionId');
      if (sid) {
        try {
          localStorage.setItem(`session_${sid}_messages`, JSON.stringify(messages));
        } catch {}
      }
      
      // Debounce database saves to prevent excessive writes
      const saveTimeout = setTimeout(async () => {
        setPersistenceStatus('saving');
        try {
          await saveCurrentSession();
          console.log('[EnhancedIdeaChat] Session saved to database');
          setPersistenceStatus('saved');
          setPersistenceError(undefined);
          
          // Clear "saved" indicator after 2 seconds
          setTimeout(() => setPersistenceStatus('idle'), 2000);
        } catch (error) {
          console.error('[EnhancedIdeaChat] Failed to save session:', error);
          setPersistenceStatus('error');
          setPersistenceError('Failed to save');
        }
      }, 2000); // Wait 2 seconds before saving to DB
      
      // Save immediately on unmount
      return () => {
        clearTimeout(saveTimeout);
        saveCurrentSession().catch(console.error);
      };
    }
  }, [messages, anonymous, saveCurrentSession]);
  
  // Persist current idea for authenticated users
  useEffect(() => {
    if (!anonymous && currentIdea) {
      // Validate that this is a real startup idea, not a chat suggestion
      const isChatSuggestion = 
        currentIdea.length < 30 ||
        currentIdea.startsWith('What') ||
        currentIdea.startsWith('How') ||
        currentIdea.startsWith('Why') ||
        currentIdea.includes('would you') ||
        currentIdea.includes('could you') ||
        currentIdea.includes('?');
      
      if (!isChatSuggestion) {
        console.log('Persisting validated startup idea:', currentIdea);
        localStorage.setItem('currentIdea', currentIdea);
        localStorage.setItem(LS_KEYS.userIdea, currentIdea);
        localStorage.setItem('dashboardIdea', currentIdea);
        const sid = localStorage.getItem('currentSessionId');
        if (sid) {
          localStorage.setItem(`session_${sid}_idea`, currentIdea);
        }
        localStorage.setItem('ideaText', currentIdea);
        // Trigger session save
        window.dispatchEvent(new Event('chat:activity'));
      } else {
        console.log('Skipping persistence - detected chat suggestion:', currentIdea.substring(0, 50));
      }
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
  const generateIdeaSummaryName = async (idea: string, messages?: any[]) => {
    // If we have messages, generate AI summary first
    if (messages && messages.length > 0) {
      try {
        const { generateIdea } = useIdeaContext();
        await generateIdea(messages);
      } catch (error) {
        console.error('Failed to generate AI summary:', error);
      }
    }
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
    
    // Check AI credits before sending message
    const creditsCheck = subscriptionContext.canUseFeature('use_ai_credits');
    if (!creditsCheck.allowed) {
      toast({
        title: "Out of AI Credits",
        description: creditsCheck.reason || "You've used all your AI credits for this month. Upgrade to continue chatting.",
        variant: "destructive"
      });
      return;
    }
    
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
            "How do I validate this with real customers?",
            "What's my minimum viable product?",
            "Who are my main competitors?",
            "What are the biggest risks?"
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
        
        // Immediately save session after bot response
        if (!anonymous) {
          try {
            await saveCurrentSession();
            console.log('[EnhancedIdeaChat] Session saved after bot response');
          } catch (error) {
            console.error('[EnhancedIdeaChat] Failed to save session after response:', error);
          }
        }
        
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
      // BUT: Don't save chat suggestions or questions as the main idea
      const isChatSuggestion = 
        ideaPreview.length < 30 ||
        ideaPreview.startsWith('What') ||
        ideaPreview.startsWith('How') ||
        ideaPreview.startsWith('Why') ||
        ideaPreview.includes('would you') ||
        ideaPreview.includes('could you') ||
        ideaPreview.includes('?');
      
      if (!isChatSuggestion) {
        console.log('Saving validated startup idea to localStorage:', { 
          ideaText: messageText, 
          currentIdea: ideaPreview,
          userIdea: ideaPreview 
        });
        
        localStorage.setItem('ideaText', messageText);
        localStorage.setItem('currentIdea', ideaPreview);
        localStorage.setItem('userIdea', ideaPreview);
        localStorage.setItem('dashboardIdea', ideaPreview); // Ensure dashboard gets the right idea
      } else {
        console.log('Skipping idea save - detected chat suggestion/question:', ideaPreview.substring(0, 50));
      }

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

        // Trigger confetti and share card for completed analysis
        if (data.pmfAnalysis.pmfScore) {
          setTriggerConfetti(true);
          setTimeout(() => {
            setShareCardData({
              ideaTitle: currentIdea || ideaSummaryName || 'My Idea',
              score: data.pmfAnalysis.pmfScore,
              marketSize: data.pmfAnalysis.growthMetrics?.marketSize,
              insights: [
                ...(data.pmfAnalysis.improvements?.slice(0, 2) || []),
              ],
            });
            setShowShareCard(true);
          }, 1000);
        }
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
        
        // Immediately save session after bot response
        if (!anonymous) {
          try {
            await saveCurrentSession();
            console.log('[EnhancedIdeaChat] Session saved after bot response');
          } catch (error) {
            console.error('[EnhancedIdeaChat] Failed to save session after response:', error);
          }
        }
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
          <div>
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
          </div>
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
    console.log('[EnhancedIdeaChat] Resetting chat - clearing idea from everywhere');
    
    // SINGLE SOURCE OF TRUTH: Clear locked idea (clears from DB too)
    const manager = lockedIdeaManager;
    if (manager.hasLockedIdea()) {
      console.log('[EnhancedIdeaChat] Clearing locked idea:', manager.getLockedIdea().substring(0, 100));
      manager.clearLockedIdea(); // This also clears from database
    }
    
    // Also clear via context for backward compat
    const currentIdeaText = ideaContext.getIdea();
    if (currentIdeaText) {
      await ideaContext.clearIdea();
    }
    
    // Clear idea summary state
    setIdeaSummaryName('');
    
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
      'ideaSummaryName',
      'appIdea',
      'market_size_value',
      'competition_value',
      'sentiment_value',
      'smoothBrainsScore',
      
      // Session related  
      // Keep currentSessionId - we are resetting within the same session
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
    
    const allKeys = Object.keys(localStorage);
    const sid = localStorage.getItem('currentSessionId');
    allKeys.forEach(key => {
      const isSessionScoped = sid ? key.startsWith(`session_${sid}_`) : false;
      const matchesPattern = keysToRemove.some(pattern => key.includes(pattern)) ||
        key.includes('pmf') || key.includes('idea') || key.includes('tile_cache') ||
        key.includes('tile_last_refresh') || key.includes('analysis') || key.includes('wrinkle');

      // Only remove session_* keys for the CURRENT session; do not touch other sessions
      if (isSessionScoped || (!key.startsWith('session_') && matchesPattern)) {
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
    setUserMessageCount(0);
    setLastSummaryGeneration(0);
    setConversationSummary('');
    setSummaryLoading(false);
    setConversationStarted(false);
    onReset?.();
  }, [onReset, fetchRandomIdeas, anonymous, ideaContext]);
  
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

  // Local fallback summary from conversation history
  const createLocalSummary = useCallback((messageList: Message[], ideaText: string) => {
    try {
      const conv = messageList
        .filter(m => m.content)
        .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }));
      const sum = createConversationSummary(conv as any, ideaText || '');
      return sum;
    } catch (e) {
      console.warn('[Summary] Local fallback failed:', e);
      const text = messageList.slice(-4).map(m => m.content).join(' ');
      const sentences = text.split(/[.!?]+/).filter(s => s.trim()).slice(0, 2);
      return sentences.join('. ') + (sentences.length ? '.' : '');
    }
  }, []);

  // Track last message count to avoid regenerating on every render
  const lastSummaryMessageCount = useRef(0);

  // Generate evolving conversation summary (cumulative)
  const generateConversationSummary = useCallback(async (messageList: Message[]) => {
    const validMessages = messageList.filter(m => !m.isTyping && m.content);
    const validUserMessages = validMessages.filter(m => m.type === 'user');

    // Only generate if we have enough user messages
    if (summaryLoading || validUserMessages.length < 3) {
      return;
    }

    console.log('[Summary] Starting generation for', validUserMessages.length, 'user messages');
    setSummaryLoading(true);

    const persistSummary = (text: string, userMsgCount: number) => {
      setConversationSummary(text);
      setLastSummaryGeneration(userMsgCount);
      const sid = localStorage.getItem('currentSessionId');
      if (sid) {
        localStorage.setItem(`session_${sid}_summary`, text);
        localStorage.setItem(`session_${sid}_lastSummaryGen`, userMsgCount.toString());
      }
      // Auto-lock idea to enable dashboard when summary is ready
      if (text && text.trim().length >= 20) {
        lockedIdeaManager.setLockedIdea(text);
        // CRITICAL: Also update currentIdea state so tiles use latest
        setCurrentIdea(text);
        localStorage.setItem('currentIdea', text);
        // Dispatch event for listeners
        window.dispatchEvent(new CustomEvent('idea:changed', { detail: text }));
      }
    };

    try {
      const { data, error } = await supabase.functions.invoke('groq-conversation-summary', {
        body: {
          messages: validMessages.map(m => ({
            type: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
            isTyping: m.isTyping
          })),
          existingSummary: conversationSummary || null
        }
      });

      if (error) {
        console.error('[Summary] Edge function error:', error);
        toast({
          title: "Summary generated locally",
          description: "AI summary unavailable - using basic summary",
          variant: "default",
          duration: 3000,
        });
        const fallback = createLocalSummary(validMessages, currentIdea || '');
        persistSummary(fallback, validUserMessages.length);
        return;
      }

      if (data?.summary && typeof data.summary === 'string') {
        console.log('[Summary] Generated via edge function:', data.summary);
        persistSummary(data.summary, validUserMessages.length);
        
        // Show success toast
        toast({
          title: "✨ Your idea summary is ready!",
          description: "Click 'View Your Idea' to see it",
          duration: 3000,
        });
      } else {
        console.warn('[Summary] No summary in response, using local fallback');
        const fallback = createLocalSummary(validMessages, currentIdea || '');
        persistSummary(fallback, validUserMessages.length);
      }
    } catch (err) {
      console.error('[Summary] Exception generating summary:', err);
      toast({
        title: "Summary generated locally",
        description: "AI summary unavailable - using basic summary",
        variant: "default",
        duration: 3000,
      });
      const fallback = createLocalSummary(validMessages, currentIdea || '');
      persistSummary(fallback, validUserMessages.length);
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryLoading, conversationSummary, currentIdea, createLocalSummary]);

  // Auto-trigger summary generation based on user message thresholds (placed after declaration)
  useEffect(() => {
    if (summaryLoading) {
      console.log('[Summary] Skipping trigger - already loading');
      return;
    }
    
    console.log('[Summary] Checking threshold - userMessageCount:', userMessageCount, 'lastGen:', lastSummaryGeneration);
    
    if (userMessageCount === 3 && lastSummaryGeneration === 0) {
      console.log('[Summary] ✅ Threshold reached: 3 user messages. Triggering generation.');
      generateConversationSummary(messages);
    } else if (lastSummaryGeneration > 0 && userMessageCount >= lastSummaryGeneration + 2) {
      console.log('[Summary] ✅ Threshold reached: +2 user messages since last generation. Triggering regeneration.');
      generateConversationSummary(messages);
    } else {
      console.log('[Summary] ⏸️ Threshold not met yet');
    }
  }, [userMessageCount, lastSummaryGeneration, summaryLoading, messages, generateConversationSummary]);

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
        // BUT: Don't save chat suggestions or questions as the main idea
        const isChatSuggestion = 
          ideaPreview.length < 30 ||
          ideaPreview.startsWith('What') ||
          ideaPreview.startsWith('How') ||
          ideaPreview.startsWith('Why') ||
          ideaPreview.includes('would you') ||
          ideaPreview.includes('could you') ||
          ideaPreview.includes('?');
        
        if (!isChatSuggestion) {
          console.log('Saving validated startup idea to localStorage (validation approved):', { 
            ideaText: messageText, 
            currentIdea: ideaPreview,
            userIdea: ideaPreview 
          });
          
          localStorage.setItem('ideaText', messageText);
          localStorage.setItem('currentIdea', ideaPreview);
          localStorage.setItem('userIdea', ideaPreview);
          localStorage.setItem('dashboardIdea', ideaPreview);
        } else {
          console.log('Skipping idea save - detected chat suggestion/question:', ideaPreview.substring(0, 50));
        }
      } catch (e) {
        console.error('Idea validation failed, falling back to heuristic only.', e);
        if (isIdeaDescription(messageText)) {
          const ideaPreview = createIdeaPreview(messageText);
          setCurrentIdea(ideaPreview);
          setHasValidIdea(true);
          
          // Generate AI summary name for the idea
          generateIdeaSummaryName(ideaPreview);
          
          // Save the idea text to localStorage for dashboard
          // BUT: Don't save chat suggestions or questions as the main idea
          const isChatSuggestion = 
            ideaPreview.length < 30 ||
            ideaPreview.startsWith('What') ||
            ideaPreview.startsWith('How') ||
            ideaPreview.startsWith('Why') ||
            ideaPreview.includes('would you') ||
            ideaPreview.includes('could you') ||
            ideaPreview.includes('?');
          
          if (!isChatSuggestion) {
            console.log('Saving validated startup idea to localStorage (fallback):', { 
              ideaText: messageText, 
              currentIdea: ideaPreview,
              userIdea: ideaPreview 
            });
            
            localStorage.setItem('ideaText', messageText);
            localStorage.setItem('currentIdea', ideaPreview);
            localStorage.setItem('userIdea', ideaPreview);
            localStorage.setItem('dashboardIdea', ideaPreview);
          } else {
            console.log('Skipping idea save - detected chat suggestion/question:', ideaPreview.substring(0, 50));
          }
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
          
          // Track user message count and auto-generate summary
          const validMessages = newMessages.filter(m => !m.isTyping && m.content);
          const validUserMessages = validMessages.filter(m => m.type === 'user');
          console.log('[Summary] User message count:', validUserMessages.length, 'Last gen:', lastSummaryGeneration);
          setUserMessageCount(validUserMessages.length);
          
          // Generate at exactly 3 user messages (first time)
          if (validUserMessages.length === 3 && lastSummaryGeneration === 0) {
            console.log('[Summary] Auto-generating at 3 user messages');
            generateConversationSummary(newMessages);
          }
          // Regenerate every 2 new user messages after initial generation
          else if (lastSummaryGeneration > 0 && validUserMessages.length >= lastSummaryGeneration + 2) {
            console.log('[Summary] Regenerating after 2 new user messages');
            generateConversationSummary(newMessages);
          }
          
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
  }, [input, isTyping, messages, wrinklePoints, currentIdea, hasValidIdea, toast, generateConversationSummary]); // Properly close the sendMessageHandler function

  // Handle pin toggle - locks in the conversation summary
  const handlePinToggle = useCallback(() => {
    const newPinned = !isPinned;
    
    if (newPinned && conversationSummary) {
      // Just update pin status, don't auto-lock
      lockedIdeaManager.setPinned(true);
      console.log('[EnhancedIdeaChat] Conversation pinned (idea not locked)');
      toast({
        title: "Conversation Pinned! 📌",
        description: "Your conversation is pinned. Use the Lock button to lock the idea for dashboard.",
      });
    } else if (!newPinned) {
      // Clear lock when unpinning
      lockedIdeaManager.clearLockedIdea();
      toast({
        title: "Idea Unlocked",
        description: "You can now work on a different idea.",
      });
    }
    
    setIsPinned(newPinned);
    lockedIdeaManager.setPinned(newPinned);
  }, [isPinned, conversationSummary, toast]);

  // Handle save retry
  const handleSaveRetry = useCallback(async () => {
    setPersistenceStatus('saving');
    try {
      await saveCurrentSession();
      setPersistenceStatus('saved');
      setPersistenceError(undefined);
      setTimeout(() => setPersistenceStatus('idle'), 2000);
    } catch (error) {
      setPersistenceStatus('error');
      setPersistenceError('Failed to save');
    }
  }, [saveCurrentSession]);

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
          <div className="flex flex-col gap-2">
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
            <p className="fluid-text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[0.75rem] tracking-tight text-primary/90">{wrinklePoints.toFixed(1)}</span>
              <span className="text-[0.65rem] uppercase tracking-wide font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">Wrinkles</span>
            {currentSession?.is_anonymous && (
              <span className="text-[0.65rem] uppercase tracking-wide font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Anonymous</span>
            )}
          </p>
          
          {/* Idea Summary Button with Progress */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={conversationSummary ? "default" : "outline"}
                  size="sm"
                  onClick={() => conversationSummary && setShowSummaryDialog(true)}
                  disabled={!conversationSummary && !summaryLoading}
                  className={cn(
                    "gap-2 w-fit relative overflow-hidden transition-all duration-500",
                    conversationSummary && "bg-gradient-to-r from-primary via-primary/90 to-primary shadow-lg hover:shadow-xl hover:scale-105 animate-in",
                    summaryLoading && "cursor-wait",
                    !conversationSummary && !summaryLoading && "opacity-50"
                  )}
                >
                  {/* Progress fill background for loading */}
                  {summaryLoading && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ 
                        duration: 2, 
                        ease: "easeInOut",
                        repeat: Infinity
                      }}
                    />
                  )}
                  
                  {/* Shimmer effect when ready */}
                  {conversationSummary && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{ 
                        duration: 2, 
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 1
                      }}
                    />
                  )}
                  
                  {/* Button content */}
                  <div className="relative z-10 flex items-center gap-2">
                    {summaryLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Refining Idea...</span>
                      </>
                    ) : conversationSummary ? (
                      <>
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: [0, -10, 10, -10, 0] }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        >
                          <Lightbulb className="h-4 w-4 fill-current" />
                        </motion.div>
                        <span className="font-semibold">View Your Idea</span>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-4 w-4 opacity-50" />
                        <span>Chat to unlock ({userMessageCount}/3)</span>
                      </>
                    )}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {conversationSummary 
                    ? "Click to see your refined idea summary" 
                    : userMessageCount < 3 
                      ? `Share ${3 - userMessageCount} more message${3 - userMessageCount === 1 ? '' : 's'} to unlock your idea summary`
                      : "Your idea summary is being generated..."}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          </div>
        </div>
      </div>
    </div>

    {/* Confetti Animation */}
    <ConfettiAnimation trigger={triggerConfetti} />

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

        {/* Share Card */}
        {showShareCard && shareCardData && (
          <div className="max-w-3xl mx-auto mt-8">
            <ShareableReportCard
              ideaTitle={shareCardData.ideaTitle}
              score={shareCardData.score}
              marketSize={shareCardData.marketSize}
              insights={shareCardData.insights}
              isPaid={subscriptionContext.subscription.tier === 'enterprise'}
              showBranding={subscriptionContext.subscription.tier !== 'enterprise'}
            />
          </div>
        )}

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
      <div className="flex gap-2 mt-3 max-w-4xl mx-auto flex-wrap">
        <AsyncDashboardButton />
        <motion.div whileTap={hasValidIdea ? { scale: 0.98 } : {}}>
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
        <motion.div whileTap={hasValidIdea ? { scale: 0.98 } : {}}>
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

    {/* Idea Summary Dialog */}
    <IdeaSummaryDialog 
      open={showSummaryDialog}
      onOpenChange={setShowSummaryDialog}
      summary={conversationSummary || ''}
      isPinned={isPinned}
      onPinToggle={handlePinToggle}
      messages={messages}
      onRefine={(refinedIdea) => {
        setConversationSummary(refinedIdea);
        setCurrentIdea(refinedIdea);
        localStorage.setItem('currentIdea', refinedIdea);
        window.dispatchEvent(new CustomEvent('idea:changed', { detail: { idea: refinedIdea } }));
      }}
    />
  </Card>
  </TooltipProvider>
  );
};

export default EnhancedIdeaChat;