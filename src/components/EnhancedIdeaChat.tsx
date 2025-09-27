import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  Layers        // Better icon for verbose mode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/contexts/SimpleSessionContext';

// Import refactored components and utilities
import { Message, ResponseMode, SuggestionItem } from './chat/types';
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
  // State management
  const [responseMode, setResponseMode] = useState<ResponseMode>(() => {
    try {
      return (localStorage.getItem('responseMode') as ResponseMode) || 'verbose';
    } catch {
      return 'verbose';
    }
  });
  
  const [currentIdea, setCurrentIdea] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [wrinklePoints, setWrinklePoints] = useState(0); // can now store decimals
  const [hoveringBrain, setHoveringBrain] = useState(false);
  const [hasValidIdea, setHasValidIdea] = useState(false);
  const [persistenceLevel, setPersistenceLevel] = useState(0);
  const { currentSession } = useSession();
  const [anonymous, setAnonymous] = useState(false);
  const isDefaultSessionName = !currentSession?.name;
  const displaySessionName = currentSession?.name || sessionName || 'New Chat Session';

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

  // Initialize welcome message with random ideas
  useEffect(() => {
    const initializeChat = async () => {
      if (currentSession?.name && messages.length === 0) {
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
          content: `🧠 Welcome to ${currentSession.name}! Ready to dive deep into your startup idea? Let's develop some serious brain wrinkles together!

Share your business concept and I'll help you refine it with sharp questions, market insights, and strategic analysis. No generic fluff allowed - I'm here to push you toward real product-market fit.

What's your startup idea?`,
          timestamp: new Date(),
          suggestions
        };
        setMessages([welcomeMessage]);
      }
    };
    
    initializeChat();
  }, [currentSession?.name, messages.length, fetchRandomIdeas]);

  useEffect(() => {
    if (!anonymous) {
      localStorage.setItem('responseMode', responseMode);
    }
  }, [responseMode, anonymous]);

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
      responseMode: ResponseMode;
      sendMessage: (m?: string) => void;
      handleSuggestionClick: (s: string) => void;
    }> = ({ message, responseMode, sendMessage, handleSuggestionClick }) => {
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
                      responseMode={responseMode}
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
    return memo(Item, (prev, next) => prev.message === next.message && prev.responseMode === next.responseMode);
  }, []);
  const resetChat = () => {
    setMessages([]); // No auto-welcome; user must name session then provide idea
    setInput('');
    setIsTyping(false);
    setConversationStarted(false);
    setIsRefining(false);
    setCurrentIdea('');
    setWrinklePoints(0);
    setHasValidIdea(false);
    setAnonymous(false);
    onReset?.();
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
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
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
          id: Date.now().toString(),
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
          id: Date.now().toString(),
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

        // Always ground the conversation in the established idea for focused refinement
        const contextualMessage = `CRITICAL CONTEXT: We are refining the specific idea "${currentIdea}". 
        All responses must focus on making THIS EXACT idea successful. Do not suggest alternatives.
        Challenge assumptions, identify risks, and push for validation, but always within the scope of improving "${currentIdea}".
        User says: ${messageText}`;

        const { data, error } = await supabase.functions.invoke('idea-chat', {
          body: { 
            message: contextualMessage,
            conversationHistory,
            responseMode: responseMode,
            refinementMode: true, // Always in refinement mode once idea is validated
            idea: currentIdea
          }
        });

        if (error) throw error;

        // Don't remove typing indicator yet - keep it visible until response is ready

        // Use ChatGPT to evaluate wrinkle points
        let pointChange = 0;
        let pointsExplanation = '';
        
        try {
          const { data: evaluationData } = await supabase.functions.invoke('evaluate-wrinkle-points', {
            body: { 
              userMessage: messageText,
              botResponse: data.response || 'AI response processing...',
              conversationHistory: conversationHistory.slice(-4),
              currentWrinklePoints: wrinklePoints
            }
          });
          
          if (evaluationData?.pointChange !== undefined) {
            pointChange = evaluationData.pointChange;
            pointsExplanation = evaluationData.explanation || '';
          }
        } catch (error) {
          console.error('Error evaluating wrinkle points:', error);
          pointChange = (Math.random() * 2) + 1; // 1-3 points for refinement
          pointsExplanation = 'Refining your idea!';
        }

        // Generate contextual suggestions
        let suggestions = data.suggestions || [];
        if (suggestions.length === 0) {
          suggestions = [
            "How can I validate this with real customers quickly?",
            "What's the minimum viable version I could build?",
            "Who are my direct competitors and how do I differentiate?",
            "What are the biggest risks and how do I mitigate them?"
          ];
        }

        const botMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: data.response || "Let's continue refining your idea to maximize success.",
          timestamp: new Date(),
          suggestions,
          pointsEarned: pointChange,
          pointsExplanation: pointsExplanation
        };
        
        // Remove typing indicator right before adding the real message
        setMessages(prev => [...prev.filter(msg => !msg.isTyping), botMessage]);
        setIsTyping(false);
        
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
      
      return; // Exit early to avoid re-validation
    }

    // If we don't have a valid idea yet, attempt validation first
    if (!hasValidIdea) {
      try {
        // More lenient heuristic check
        const heuristicLooksLikeIdea = messageText.length > 25 && 
          (messageText.includes('build') || messageText.includes('create') || 
           messageText.includes('help') || messageText.includes('solve') ||
           messageText.includes('automate') || messageText.includes('platform') ||
           messageText.includes('tool') || messageText.includes('app') ||
           messageText.includes('service') || messageText.includes('product') ||
           messageText.includes('business') || messageText.includes('startup') ||
           messageText.includes('idea') || messageText.includes('want'));
        
        const validationPrompt = `You are a helpful startup idea validator. Determine if the user submission contains a startup idea. Be VERY LENIENT - accept anything that remotely looks like they're trying to share a business concept.
Respond ONLY with minified JSON: {"valid": true|false, "reason": "short feedback"}.
User submission: """${messageText}"""`;

        const { data: validationData, error: validationError } = await supabase.functions.invoke('idea-chat', {
          body: { message: validationPrompt, conversationHistory: [] }
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

        // Be very lenient - accept if either validation passes
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
            id: Date.now().toString(),
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
        setCurrentIdea(createIdeaPreview(messageText));
        setHasValidIdea(true);
      } catch (e) {
        console.error('Idea validation failed, falling back to heuristic only.', e);
        if (isIdeaDescription(messageText)) {
          setCurrentIdea(createIdeaPreview(messageText));
          setHasValidIdea(true);
        } else {
          const fallbackGate: Message = {
            id: Date.now().toString(),
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
          responseMode: responseMode
        }
      });

      if (error) throw error;

      // Don't remove typing indicator yet - keep it visible until response is ready

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
          id: Date.now().toString(),
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
        
        // Generate contextual AI-powered suggestions
        try {
          // Determine if bot is asking questions or providing answers
          const isBotAsking = formattedContent.includes('?') || 
                             formattedContent.toLowerCase().includes('what') ||
                             formattedContent.toLowerCase().includes('how') ||
                             formattedContent.toLowerCase().includes('why') ||
                             formattedContent.toLowerCase().includes('when') ||
                             formattedContent.toLowerCase().includes('describe');
          
          // Generate suggestions that are contextually appropriate
          const suggestionType = isBotAsking ? 'answers' : 'followup_questions';
          
          const { data: suggestionData } = await supabase.functions.invoke('generate-suggestions', {
            body: { 
              question: formattedContent,
              ideaDescription: currentIdea || messageText,
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
              responseMode: responseMode,
              suggestionType: suggestionType,
              contextualMode: true
            }
          });
          
          if (suggestionData?.suggestions && suggestionData.suggestions.length > 0) {
            suggestions = suggestionData.suggestions.map((suggestion: any) => ({
              ...suggestion,
              text: typeof suggestion === 'string' ? suggestion : suggestion.text,
              explanation: suggestion.explanation || generateSuggestionExplanation(suggestion.text || suggestion)
            }));
          }
        } catch (error) {
          console.error('Error getting AI suggestions:', error);
          // Fallback: generate contextually appropriate suggestions
          const isBotAsking = formattedContent.includes('?');
          if (isBotAsking) {
            // Bot is asking - provide potential answers
            suggestions = [
              "My target users face this problem daily when they...",
              "The current manual workaround involves [specific steps]...",
              "I've validated this pain point by talking to [number] potential customers",
              "The unique insight I have is based on my experience with..."
            ];
          } else {
            // Bot is answering - provide follow-up questions
            suggestions = [
              "How would this scale with 1000+ users?",
              "What's the competitive moat here?",
              "Can you elaborate on the pricing strategy?",
              "What's the customer acquisition strategy?"
            ];
          }
        }
        
        // Generate static suggestion explanation
        const suggestionTexts = suggestions.map(s => typeof s === 'string' ? s : s?.text || String(s));
        const staticSuggestionExplanation = suggestionTexts.length > 0 ? 
          generateBrainExplanation(suggestionTexts, formattedContent) : '';

        const botMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: formattedContent,
          timestamp: new Date(),
          suggestions,
          pointsEarned: pointChange,
          pointsExplanation: pointsExplanation,
          suggestionExplanation: staticSuggestionExplanation
        };
        
        // Remove typing indicator right before adding the real message
        setMessages(prev => [...prev.filter(msg => !msg.isTyping), botMessage]);
        setIsTyping(false);
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
    responseMode: ResponseMode;
    sendMessage: (m?: string) => void;
    handleSuggestionClick: (s: string) => void;
  }> = ({ message, responseMode, sendMessage, handleSuggestionClick }) => {
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
                    responseMode={responseMode}
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
  return React.memo(Item, (prev, next) => prev.message === next.message && prev.responseMode === next.responseMode);
}, []);
  const resetChatHandler = useCallback(() => {
    setMessages([]); // No auto-welcome; user must name session then provide idea
    setInput('');
    setIsTyping(false);
    setConversationStarted(false);
    setIsRefining(false);
    setCurrentIdea('');
    setWrinklePoints(0);
    setHasValidIdea(false);
    setAnonymous(false);
    onReset?.();
  }, [onReset]);

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
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
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
          id: Date.now().toString(),
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
          id: Date.now().toString(),
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
          body: { message: validationPrompt, conversationHistory: [] }
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
            id: Date.now().toString(),
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
        setCurrentIdea(createIdeaPreview(messageText));
        setHasValidIdea(true);
      } catch (e) {
        console.error('Idea validation failed, falling back to heuristic only.', e);
        if (isIdeaDescription(messageText)) {
          setCurrentIdea(createIdeaPreview(messageText));
          setHasValidIdea(true);
        } else {
          const fallbackGate: Message = {
            id: Date.now().toString(),
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
          responseMode: responseMode
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
          id: Date.now().toString(),
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
        
        // Generate static suggestion explanation
        const suggestionTexts = suggestions.map(s => typeof s === 'string' ? s : s?.text || String(s));
        const staticSuggestionExplanation = suggestionTexts.length > 0 ? 
          generateBrainExplanation(suggestionTexts, formattedContent) : '';

        const botMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: formattedContent,
          timestamp: new Date(),
          suggestions,
          pointsEarned: pointChange,
          pointsExplanation: pointsExplanation,
          suggestionExplanation: staticSuggestionExplanation
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
  }, [input, isTyping, messages, wrinklePoints, currentIdea, hasValidIdea, responseMode, toast]); // Properly close the sendMessageHandler function

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
            <h3 className="font-extrabold tracking-tight fluid-text-xl leading-tight select-text">
              {displaySessionName}
            </h3>
            <p className="fluid-text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[0.75rem] tracking-tight text-primary/90">{wrinklePoints.toFixed(1)}</span>
              <span className="text-[0.65rem] uppercase tracking-wide font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">Wrinkles</span>
              {currentSession?.is_anonymous && (
                <span className="text-[0.65rem] uppercase tracking-wide font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Anonymous</span>
              )}
              {responseMode === 'summary' && (
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded fluid-text-xs font-medium inline-flex items-center gap-1">
                  <ListMinus className="w-3 h-3" />
                  Summary
                </span>
              )}
              {responseMode === 'verbose' && (
                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded fluid-text-xs font-medium inline-flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Detailed
                </span>
              )}
            </p>
            {currentIdea && (
              <p className="fluid-text-xs text-primary font-medium mt-1 max-w-[320px] break-words" title={currentIdea}>
                💡 {currentIdea}
              </p>
            )}
          </div>
        </div>
          <div className="flex items-center fluid-gap">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={responseMode === 'summary' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setResponseMode('summary');
                      if (!anonymous) localStorage.setItem('responseMode', 'summary');
                    }}
                    className="h-8 w-8 p-0 transition-all duration-200"
                  >
                    <ListMinus className={cn(
                      "h-4 w-4 transition-colors",
                      responseMode === 'summary' ? 'text-primary-foreground' : 'text-muted-foreground'
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="flex items-start gap-2">
                    <ListMinus className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="fluid-text-xs leading-relaxed">Summary mode: Get concise, focused responses that hit the key points</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={responseMode === 'verbose' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setResponseMode('verbose');
                      if (!anonymous) localStorage.setItem('responseMode', 'verbose');
                    }}
                    className="h-8 w-8 p-0 transition-all duration-200"
                  >
                    <Layers className={cn(
                      "h-4 w-4 transition-colors",
                      responseMode === 'verbose' ? 'text-primary-foreground' : 'text-muted-foreground'
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="flex items-start gap-2">
                    <Layers className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="fluid-text-xs leading-relaxed">Verbose mode: Get detailed, comprehensive analysis with deep insights</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>          <Button
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
    <ScrollArea className="flex-1 relative">
      <div className="fluid-pad-sm lg:fluid-pad-md space-y-4 sm:space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              responseMode={responseMode}
              sendMessage={sendMessageHandler}
              handleSuggestionClick={handleSuggestionClickHandler}
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
        <motion.div whileHover={hasValidIdea ? { scale: 1.02 } : {}} whileTap={hasValidIdea ? { scale: 0.98 } : {}}>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasValidIdea}
            onClick={() => hasValidIdea && sendMessage("Add more wrinkles to my brain! Give me a comprehensive analysis of my refined idea")}
            className={`fluid-text-xs group ${hasValidIdea 
              ? 'hover:bg-primary/10 hover:border-primary/50' 
              : 'opacity-50 cursor-not-allowed bg-muted'}`}
          >
            <BarChart3 className={`h-3 w-3 mr-1.5 ${hasValidIdea 
              ? 'text-primary group-hover:scale-110 transition-transform' 
              : 'text-muted-foreground'}`} />
            Grow More Wrinkles
          </Button>
        </motion.div>
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
    
    {/* GPT-5 Powered - Floating text with sparkles */}
<div className="absolute bottom-3 right-3 flex items-center gap-1 text-slate-500 dark:text-slate-400 fluid-text-xs font-medium">
      <Sparkles className="h-3 w-3 text-amber-400" />
      <span>GPT-5</span>
      <Sparkles className="h-2 w-2 text-yellow-300" />
    </div>
  </Card>
  </TooltipProvider>
  );
};

export default EnhancedIdeaChat;