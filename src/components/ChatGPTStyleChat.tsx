import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot,
  User,
  Loader2,
  BarChart,
  Sparkles,
  ArrowRight,
  Play,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SessionContext';
import { scheduleIdle } from '@/lib/idle';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  metadata?: any;
  isTyping?: boolean;
  pmfAnalysis?: any;
}

interface ChatGPTStyleChatProps {
  onAnalysisReady?: (idea: string, metadata: any) => void;
  showDashboard?: boolean;
  className?: string;
}

// Replaced step-based questions with a single detailed brief form

// Removed auto-seed idea pool – now we start with empty idea and AI brainstorming suggestions

export default function ChatGPTStyleChat({ 
  onAnalysisReady, 
  showDashboard = false,
  className 
}: ChatGPTStyleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIdea, setCurrentIdea] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCompletedFlag, setAnalysisCompletedFlag] = useState(() => localStorage.getItem('analysisCompleted') === 'true');
  // Brief fields (two required: problem, targetUser; others optional)
  const [brief, setBrief] = useState({
    problem: '',
    targetUser: '',
    differentiation: '',
    alternatives: '',
    monetization: '',
    scenario: '',
    successMetric: ''
  });
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRefinementMode, setIsRefinementMode] = useState(true);
  const [showStartAnalysisButton, setShowStartAnalysisButton] = useState(false);
  const [showBriefForm, setShowBriefForm] = useState(false);
  const [briefSuggestions, setBriefSuggestions] = useState<Record<string, string[]>>({});
  const [isFetchingBriefSuggestions, setIsFetchingBriefSuggestions] = useState(false);
  const briefFetchedRef = useRef(false);
  const suggestionCycleRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionBackoffRef = useRef<number>(30000); // start at 30s
  const suggestionIdleRef = useRef<boolean>(false);
  const abortBriefSuggestRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  // Removed legacy per-component session persistence (handled by SessionContext)
  const titleGeneratedRef = useRef(false);
  const { currentSession, createSession } = useSession();
  const lastIdeaSignatureRef = useRef<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const chatRestoredRef = useRef(false);
  const shuffleCooldownRef = useRef<number>(0); // still used for suggestion shuffle debounce

  const generateTwoWordTitle = useCallback(async (idea: string) => {
    if (!idea || titleGeneratedRef.current) return;
    titleGeneratedRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('generate-session-title', { body: { idea } });
      if (error) throw error;
      const finalTitle = (data as any)?.title || 'Idea Session';
      if (currentSession) {
        await supabase.from('brainstorming_sessions').update({ name: finalTitle }).eq('id', currentSession.id);
        localStorage.setItem('currentSessionTitle', finalTitle);
      }
    } catch (e) {
      console.error('Title generation failed', e);
      titleGeneratedRef.current = false; // allow retry on next idea change
    }
  }, [currentSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // External trigger to open analysis brief (from parent layout / dashboard panel)
  useEffect(() => {
    const openBrief = () => setShowBriefForm(true);
    window.addEventListener('analysis:openBrief', openBrief);
    return () => window.removeEventListener('analysis:openBrief', openBrief);
  }, []);

  // Fetch AI suggestions for brief fields
  const fetchBriefSuggestions = useCallback(async (force = false, enrich = false) => {
    if (isFetchingBriefSuggestions || (!force && !enrich && briefFetchedRef.current)) return;
    setIsFetchingBriefSuggestions(true);
    abortBriefSuggestRef.current?.abort();
    const controller = new AbortController();
    abortBriefSuggestRef.current = controller;
    try {
      const fieldKeys = ['problem','targetUser','differentiation','alternatives','monetization','scenario','successMetric'];
      const existing = briefSuggestions;
      // Build context for enrichment
      const contextObj: any = { brief, existingSuggestions: existing };
      const prompt = enrich
        ? `Improve & diversify suggestions for product idea: "${currentIdea || brief.problem || 'Unknown'}". Return JSON with keys ${fieldKeys.join(', ')}. Each key: up to 5 concise, non-redundant, high-signal options (max 12 words) prioritizing clarity, specificity, novelty. Avoid duplicates from existingSuggestions. Keep arrays small if high quality cannot be added.`
        : `Given the product idea: "${currentIdea || brief.problem || 'Unknown'}" generate concise structured suggestions for these fields in JSON with keys ${fieldKeys.join(', ')}. Each key should be an array of 3 short high-signal suggestions (max 12 words each). Focus on clarity and specificity.`;
      const { data, error } = await supabase.functions.invoke('idea-chat', { body: { message: prompt, suggestionMode: true, context: contextObj } });
      if (error) throw error;
      let suggestions: any = {};
      if (typeof data === 'string') {
        try { suggestions = JSON.parse(data); } catch { suggestions = {}; }
      } else if (typeof data === 'object') {
        suggestions = data.suggestions || data;
      }
      const merged: Record<string, string[]> = { ...existing };
      fieldKeys.forEach(k => {
        const incoming = suggestions?.[k];
        if (Array.isArray(incoming)) {
          const currentSet = new Set((merged[k] || []).map(s => s.trim()));
            incoming.forEach((raw: any) => {
              const s = String(raw).trim();
              if (!s) return;
              // basic dedupe ignoring case
              if (![...currentSet].some(existingVal => existingVal.toLowerCase() === s.toLowerCase())) {
                currentSet.add(s);
              }
            });
          // Keep top 5 (simple heuristic: shorter first then original order)
          const limited = [...currentSet].sort((a,b) => a.length - b.length).slice(0,5);
          merged[k] = limited;
        }
      });
      setBriefSuggestions(merged);
      briefFetchedRef.current = true;
      // cache
      try { localStorage.setItem('analysisBriefSuggestionsCache', JSON.stringify({ ts: Date.now(), data: merged })); } catch {}
      // reset backoff on success if enrichment returned new content
      if (enrich) {
        suggestionBackoffRef.current = Math.max(20000, suggestionBackoffRef.current * 0.75); // adaptive shorten a bit
      } else {
        suggestionBackoffRef.current = 30000;
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('Brief suggestions fetch failed', e);
        // gentle backoff increase on failure
        suggestionBackoffRef.current = Math.min(90000, suggestionBackoffRef.current * 1.4);
      }
    } finally {
      setIsFetchingBriefSuggestions(false);
    }
  }, [currentIdea, brief, briefSuggestions, isFetchingBriefSuggestions]);

  // Auto-fetch when brief form first opened
  useEffect(() => {
    if (showBriefForm) fetchBriefSuggestions();
  }, [showBriefForm, fetchBriefSuggestions]);

  // Load cached suggestions (if any) on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('analysisBriefSuggestionsCache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data) setBriefSuggestions(parsed.data);
      }
    } catch {}
  }, []);

  // Background enrichment cycle
  useEffect(() => {
    if (!showBriefForm || isAnalyzing) {
      if (suggestionCycleRef.current) {
        clearTimeout(suggestionCycleRef.current);
        suggestionCycleRef.current = null;
      }
      return;
    }
    const schedule = () => {
      if (!showBriefForm || isAnalyzing) return;
      suggestionCycleRef.current = setTimeout(async () => {
        // Only enrich if user hasn't recently typed in a field (heuristic: if problem & targetUser unchanged for cycle)
        await fetchBriefSuggestions(false, true);
        schedule();
      }, suggestionBackoffRef.current);
    };
    schedule();
    return () => {
      if (suggestionCycleRef.current) clearTimeout(suggestionCycleRef.current);
    };
  }, [showBriefForm, isAnalyzing, fetchBriefSuggestions]);

  // Listen for external session load trigger (from sidebar navigation) to rehydrate chat & focus input
  useEffect(() => {
    const handleSessionLoaded = () => {
      const raw = localStorage.getItem('chatHistory');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const restored: Message[] = parsed.map((m: any) => ({
            id: m.id || `restored-${Date.now()}-${Math.random()}`,
            type: m.type || 'bot',
            content: m.content || '',
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            suggestions: m.suggestions,
            metadata: m.metadata,
            pmfAnalysis: m.pmfAnalysis,
          }));
          setMessages(restored);
          chatRestoredRef.current = true;
        } catch {}
      }
      const idea = localStorage.getItem('userIdea');
      if (idea) setCurrentIdea(prev => prev || idea);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener('session:loaded', handleSessionLoaded);
    return () => window.removeEventListener('session:loaded', handleSessionLoaded);
  }, []);

  // Persist chat messages to localStorage for session autosave integration
  useEffect(() => {
    if (messages.length) {
      const serializable = messages.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        suggestions: m.suggestions,
        metadata: m.metadata,
        pmfAnalysis: m.pmfAnalysis,
      }));
      localStorage.setItem('chatHistory', JSON.stringify(serializable));
    }
  }, [messages]);

  // Restore chat/history & idea from brainstorming session when it changes
  useEffect(() => {
    if (!currentSession?.state) return;
    const st = currentSession.state as any;
    const alreadyMeaningful = messages.length > 0; // Prevent overwrite if user already typing / restored
    if (!alreadyMeaningful && !chatRestoredRef.current && Array.isArray(st.chatHistory) && st.chatHistory.length) {
      try {
        const restored: Message[] = st.chatHistory.map((m: any) => ({
          id: m.id || `restored-${Date.now()}-${Math.random()}`,
          type: m.type || 'bot',
          content: m.content || '',
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          suggestions: m.suggestions,
          metadata: m.metadata,
          pmfAnalysis: m.pmfAnalysis,
        }));
        setMessages(restored);
        chatRestoredRef.current = true;
      } catch {}
    } else if (!alreadyMeaningful && !chatRestoredRef.current) {
      const raw = localStorage.getItem('chatHistory');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const restored: Message[] = parsed.map((m: any) => ({
            id: m.id,
            type: m.type,
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            suggestions: m.suggestions,
            metadata: m.metadata,
            pmfAnalysis: m.pmfAnalysis,
          }));
          setMessages(restored);
          chatRestoredRef.current = true;
        } catch {}
      }
    }
    if (st.ideaData?.idea && !currentIdea) {
      setCurrentIdea(st.ideaData.idea);
    }
  }, [currentSession]);

  // Persist current idea to localStorage for session recovery & autosave
  useEffect(() => {
    if (currentIdea) {
      localStorage.setItem('userIdea', currentIdea);
      // Generate title on first meaningful idea OR when idea changes substantially (signature diff)
      const signature = currentIdea.split(/\s+/).slice(0,12).join(' ').toLowerCase();
      if (!lastIdeaSignatureRef.current) {
        lastIdeaSignatureRef.current = signature;
        scheduleIdle(() => generateTwoWordTitle(currentIdea));
      } else if (signature !== lastIdeaSignatureRef.current && currentIdea.length > 15) {
        lastIdeaSignatureRef.current = signature;
        // Allow regeneration once more by resetting flag
        titleGeneratedRef.current = false;
        scheduleIdle(() => generateTwoWordTitle(currentIdea));
      }
      try { window.dispatchEvent(new Event('idea:updated')); } catch {}
    }
  }, [currentIdea]);

  // Initial focus + inject brainstorming welcome (no automatic idea seeding)
  useEffect(() => {
    if (initializedRef.current) return;
    // If no existing chat history, create a brainstorming intro message
    const restored = localStorage.getItem('chatHistory');
    if (!restored && messages.length === 0) {
      const welcomeMessage: Message = {
        id: `msg-welcome-${Date.now()}`,
        type: 'system',
        content: "👋 Let's brainstorm a brilliant product to analyze. Pick one of the AI-suggested ideas below or type your own to begin refining.",
        timestamp: new Date(),
        suggestions: generateRandomSuggestions()
      };
      setMessages([welcomeMessage]);
    }
    inputRef.current?.focus();
    initializedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentSession]);

  // Removed legacy auto-save interval (SessionContext centralizes saving)

  const generateRandomSuggestions = () => {
    const allSuggestions = [
      "AI-powered personal finance assistant for millennials",
      "Sustainable fashion marketplace for Gen Z",
      "Mental health support platform with AI coaching",
      "Blockchain-based supply chain for small businesses",
      "EdTech platform for personalized learning",
      "Smart home automation for elderly care",
      "Virtual fitness trainer with real-time feedback",
      "Carbon footprint tracker for conscious consumers",
      "Remote team collaboration tool for startups",
      "Plant-based meal planning app with nutrition AI",
      "Freelancer marketplace with escrow payments",
      "Language learning app using VR technology",
      "Pet care platform connecting vets and owners",
      "Travel planning AI for budget backpackers",
      "Digital wellness app for screen time management",
      "Food waste reduction app for restaurants",
      "Cryptocurrency portfolio manager for beginners",
      "3D printing marketplace for custom products",
      "Virtual interior design assistant",
      "Skill-sharing platform for retirees"
    ];
    
    // Shuffle and pick 4 random suggestions
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  };

  // Shuffle brainstorming suggestions (only before an idea is chosen)
  const shuffleBrainstormIdeas = () => {
    if (isAnalyzing || currentIdea) return;
    const now = Date.now();
    if (now - shuffleCooldownRef.current < 800) return; // debounce
    shuffleCooldownRef.current = now;
    setMessages(prev => {
      if (!prev.length || prev[0].type !== 'system') return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], suggestions: generateRandomSuggestions() };
      return updated;
    });
  };

  // Reset chat but keep same session (clear idea + messages + local storage for chat/idea)
  const resetChat = () => {
    if (isAnalyzing) return;
    setCurrentIdea('');
    try {
      localStorage.removeItem('userIdea');
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('analysisCompleted');
      localStorage.removeItem('pmfScore');
      localStorage.removeItem('ideaMetadata');
      localStorage.removeItem('analysisBrief');
      localStorage.removeItem('analysisBriefSuggestionsCache');
      window.dispatchEvent(new Event('idea:updated'));
    } catch {}
    const welcomeMessage: Message = {
      id: `msg-welcome-${Date.now()}`,
      type: 'system',
      content: "🧼 Fresh start! Let's brainstorm a new product. Pick a suggestion or type your own idea to begin.",
      timestamp: new Date(),
      suggestions: generateRandomSuggestions()
    };
    setMessages([welcomeMessage]);
    setShowStartAnalysisButton(false);
    setIsRefinementMode(true);
    setAnalysisProgress(0);
  };

  // Listen for external idea injection / reset triggers from IdeaChat container UI
  useEffect(() => {
    const handleExternalIdea = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const idea = detail?.idea;
      if (idea && !currentIdea) {
        setCurrentIdea(idea);
        generateTwoWordTitle(idea);
      }
    };
    const handleExternalReset = () => {
      resetChat();
    };
    window.addEventListener('idea:externalSet', handleExternalIdea as any);
    window.addEventListener('chat:reset', handleExternalReset);
    return () => {
      window.removeEventListener('idea:externalSet', handleExternalIdea as any);
      window.removeEventListener('chat:reset', handleExternalReset);
    };
  }, [currentIdea, generateTwoWordTitle]);

  // Load brief from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('analysisBrief');
      if (raw) {
        const parsed = JSON.parse(raw);
        setBrief(prev => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);
  // Persist brief
  useEffect(() => {
    try { localStorage.setItem('analysisBrief', JSON.stringify(brief)); } catch {}
  }, [brief]);

  // Single-pass analysis generator using the brief
  const runBriefAnalysis = async () => {
    if (!brief.problem.trim() || !brief.targetUser.trim()) {
      toast({ title: 'Need more detail', description: 'Provide at least the problem and target user.' });
      return;
    }
    setIsAnalyzing(true);
    setAnalysisProgress(8);
    // Remove legacy step metadata
    try {
      localStorage.removeItem('analysisCurrentQuestion');
      localStorage.removeItem('analysisAnswers');
      localStorage.removeItem('analysisInProgress');
    } catch {}
    const progressInterval = setInterval(() => {
      setAnalysisProgress(p => (p < 92 ? p + Math.random() * 6 : p));
    }, 600);
    const loadingMsg: Message = {
      id: `msg-brief-start-${Date.now()}`,
      type: 'system',
      content: 'Generating a comprehensive PM-Fit analysis from your brief...',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, loadingMsg]);
    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: {
          message: currentIdea || brief.problem,
          generatePMFAnalysis: true,
          analysisContext: { brief }
        }
      });
      if (error) throw error;
      const pmfScore = data?.pmfAnalysis?.pmfScore || 0;
      const isGoodScore = pmfScore >= 70;
      const completionMessage: Message = {
        id: `msg-brief-complete-${Date.now()}`,
        type: 'system',
        content: `🎯 Analysis complete! Your PM-Fit score is **${pmfScore}/100**.`,
        timestamp: new Date(),
        pmfAnalysis: data?.pmfAnalysis,
        suggestions: isGoodScore ? [
          'Refine further',
          'View detailed dashboard',
          'Export report'
        ] : [
          'Improve differentiation',
          'Clarify target user',
          'Strengthen monetization'
        ]
      };
      setMessages(prev => [...prev, completionMessage]);
      localStorage.setItem('analysisCompleted', 'true');
      localStorage.setItem('pmfScore', String(pmfScore));
      setAnalysisCompletedFlag(true);
      // Persist brief into metadata for dashboard
      const metadata = {
        brief,
        pmfScore,
        pmfAnalysis: data?.pmfAnalysis
      };
      localStorage.setItem('ideaMetadata', JSON.stringify(metadata));
      if (onAnalysisReady) {
        onAnalysisReady(currentIdea || brief.problem, metadata);
      }
    } catch (e) {
      console.error('Brief analysis failed', e);
      toast({ title: 'Analysis failed', description: 'Could not generate analysis. Try again.' });
    } finally {
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setTimeout(() => setIsAnalyzing(false), 600);
    }
  };

  // remove legacy createNewSession (sessions now created explicitly elsewhere)

  // Removed saveSession (redundant)

  // Deprecated structured analysis flow removed.

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Lazy-create a session only when user first contributes meaningful content and no session exists yet
    if (!currentSession && user && messages.filter(m => m.type !== 'system').length === 0) {
      // Use first 6 words of input as context
      createSession(input.split(/\s+/).slice(0,6).join(' '));
    }
    
    // If in refinement mode and not analyzing
    if (isRefinementMode && !isAnalyzing) {
      // If this is the first message, validate it's an actual idea
      if (!currentIdea) {
        // Simple validation to check if it looks like an idea
        const looksLikeIdea = input.length > 10 && 
          !input.match(/^(hi|hello|hey|test|testing|ok|yes|no|help|thanks|bye|good|bad|nice|cool|wow|lol|haha|what|where|when|who|why|how)$/i) &&
          (input.includes(' ') || input.length > 20);
        
        if (!looksLikeIdea) {
          const funnyResponses = [
            "🎭 Nice try, but that's not an idea! That's like calling a potato a spaceship. Give me a real product idea!",
            "🤔 Hmm, that doesn't smell like an idea... it smells like... *sniff sniff*... procrastination! Come on, hit me with your best shot!",
            "🎪 Ladies and gentlemen, we have a trickster in the house! But I'm not falling for it. Give me a REAL idea, not whatever that was!",
            "🚨 IDEA POLICE HERE! That's not an idea, that's just words pretending to be an idea. Try again with something that actually solves a problem!",
            "🦄 I asked for an idea, not a unicorn's sneeze! Come on, give me something with substance - like 'an app that...' or 'a platform for...'",
            "🎮 Error 404: Idea not found! You've entered the cheat code for 'no effort'. Please insert a real product idea to continue!",
            "🍕 That's about as much of an idea as pineapple is a pizza topping (controversial, I know). Give me something real to work with!",
            "🤖 Beep boop! My idea detector is showing... nothing. Absolutely nothing. It's flatter than a pancake. Feed me a real idea!",
            "🎯 You missed the target by... oh, about a mile. That's not an idea, that's just keyboard gymnastics. Try again with an actual concept!",
            "🧙‍♂️ My crystal ball shows... cloudy with a chance of 'that's not an idea'. Cast a better spell and give me something innovative!"
          ];
          
          const randomResponse = funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
          
          const validationMessage: Message = {
            id: `msg-validation-${Date.now()}`,
            type: 'bot',
            content: randomResponse,
            timestamp: new Date(),
            suggestions: [
              "AI-powered personal finance assistant",
              "Sustainable fashion marketplace",
              "Mental health support platform",
              "Smart home automation for elderly"
            ]
          };
          
          setMessages(prev => [...prev, validationMessage]);
          setInput('');
          return;
        }
        
    setCurrentIdea(input);
    generateTwoWordTitle(input);
        setShowStartAnalysisButton(true);
      }
      
      setInput('');
      setIsLoading(true);
      
      // Add loading animation message with bot icon showing
      const loadingMessage: Message = {
        id: `msg-loading-${Date.now()}`,
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, loadingMessage]);
      
      try {
        // Get AI response for refinement
        const { data, error } = await supabase.functions.invoke('idea-chat', {
          body: { 
            message: input,
            conversationHistory: messages.map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            idea: currentIdea || input,
            refinementMode: true
          }
        });

        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));

        if (!error && data) {
          // Handle both string and object responses
          let responseContent = '';
          let responseSuggestions = [];
          
          if (!data) {
            throw new Error('No data received from server');
          }
          
          // Parse the response data
          if (typeof data === 'string') {
            // If data is a string, try to parse it as JSON
            try {
              const parsed = JSON.parse(data);
              responseContent = parsed.response || parsed.message || '';
              responseSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            } catch {
              // If parsing fails, use the string as is
              responseContent = data;
              responseSuggestions = [];
            }
          } else if (typeof data === 'object') {
            // Handle object response
            responseContent = data.response || data.message || '';
            responseSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
          }
          
          // Validate we have content
          if (!responseContent || responseContent.trim() === '') {
            console.error('Empty response content:', data);
            responseContent = "I understand. Let me help you refine your idea further.";
          }
          
          const botMessage: Message = {
            id: `msg-${Date.now()}-bot`,
            type: 'bot',
            content: responseContent,
            timestamp: new Date(),
            suggestions: responseSuggestions.length > 0 ? responseSuggestions : undefined
          };
          
          setMessages(prev => [...prev, botMessage]);
        } else {
          throw new Error('No data received');
        }
      } catch (error) {
        console.error('Chat error:', error);
        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        
        const errorMessage: Message = {
          id: `msg-error-${Date.now()}`,
          type: 'bot',
          content: "I apologize, I'm having trouble processing your request. Please try again.",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      
      return;
    }

    // Legacy step-analysis removed. If analysis is currently generating, ignore additional user input.
    if (isAnalyzing) {
      setInput('');
      return;
    }

    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: input,
          conversationHistory: messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          idea: currentIdea,
          analysisContext: { brief }
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Parse response with robust error handling
      let responseContent = '';
      let suggestions = [];
      let metadata = {};
      
      if (data) {
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            responseContent = parsed.response || parsed.message || '';
            suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            metadata = parsed.metadata || {};
          } catch {
            responseContent = data;
          }
        } else if (typeof data === 'object') {
          responseContent = data.response || data.message || '';
          suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
          metadata = data.metadata || {};
        }
      }
      
      if (!responseContent) {
        responseContent = "Let me help you with that...";
      }

      const botMessage: Message = {
        id: `msg-${Date.now()}-bot`,
        type: 'bot',
        content: responseContent,
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step-based analysis functions removed (completeAnalysis, askNextQuestion) as we now use a single brief.

  const startAnalysis = () => {
    // Toggle brief form visibility. If already generated, allow re-run.
    setShowBriefForm(prev => !prev);
  };

  const handleSuggestionRefinement = async (idea: string) => {
    setIsLoading(true);
    
    // Add loading animation message
    const loadingMessage: Message = {
      id: `msg-loading-${Date.now()}`,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, loadingMessage]);
    
    try {
      // Get AI response for refinement
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: `Tell me more about this idea: ${idea}`,
          idea: idea,
          refinementMode: true
        }
      });

      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isTyping));

      if (!error && data) {
        // Handle both string and object responses
        let responseContent = '';
        let responseSuggestions = [];
        
        try {
          if (typeof data === 'string') {
            // If data is a string, try to parse it as JSON first
            try {
              const parsed = JSON.parse(data);
              responseContent = parsed.response || parsed.message || data;
              responseSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            } catch {
              // If parsing fails, use the string as is
              responseContent = data;
            }
          } else if (typeof data === 'object') {
            // Handle object response
            responseContent = data.response || data.message || '';
            responseSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
          }
        } catch (parseError) {
          console.error('Error parsing refinement response:', parseError);
          responseContent = `Great idea! Let me help you explore "${idea}". What specific aspects would you like to refine or discuss?`;
        }
        
        const botMessage: Message = {
          id: `msg-${Date.now()}-bot`,
          type: 'bot',
          content: responseContent || `Great idea! Let me help you explore "${idea}". What specific aspects would you like to refine or discuss?`,
          timestamp: new Date(),
          suggestions: responseSuggestions.length > 0 ? responseSuggestions : [
            `What problem does ${idea} solve?`,
            `Who would use ${idea}?`,
            `How would ${idea} make money?`,
            `What makes ${idea} unique?`
          ]
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Remove loading message
      setMessages(prev => prev.filter(msg => !msg.isTyping));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Prevent duplicate processing
    if (isLoading) return;
    
    // Always create user message with consistent animation
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: suggestion,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add small delay to show user message animation before bot response
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Handle based on current state
    if (!currentIdea && !isAnalyzing) {
      // First message - validate and set as idea
      const looksLikeIdea = suggestion.length > 10;
      
      if (!looksLikeIdea) {
        const funnyResponses = [
          "🎭 Nice try, but that's not an idea! That's like calling a potato a spaceship. Give me a real product idea!",
          "🤔 Hmm, that doesn't smell like an idea... it smells like... *sniff sniff*... procrastination! Come on, hit me with your best shot!",
          "🎪 Ladies and gentlemen, we have a trickster in the house! But I'm not falling for it. Give me a REAL idea, not whatever that was!"
        ];
        
        const randomResponse = funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
        
        // Add loading animation
        const loadingMessage: Message = {
          id: `msg-loading-${Date.now()}`,
          type: 'bot',
          content: '',
          timestamp: new Date(),
          isTyping: true
        };
        setMessages(prev => [...prev, loadingMessage]);
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Remove loading and add response
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        
        const validationMessage: Message = {
          id: `msg-validation-${Date.now()}`,
          type: 'bot',
          content: randomResponse,
          timestamp: new Date(),
          suggestions: [
            "AI-powered personal finance assistant",
            "Sustainable fashion marketplace",
            "Mental health support platform",
            "Smart home automation for elderly"
          ]
        };
        
        setMessages(prev => [...prev, validationMessage]);
        return;
      }
      
  setCurrentIdea(suggestion);
  generateTwoWordTitle(suggestion);
      if (!currentSession && user) {
        createSession(suggestion.split(/\s+/).slice(0,6).join(' '));
      }
      setShowStartAnalysisButton(true);
      setInput('');
      
      // Get AI response about the idea for refinement
      await handleSuggestionRefinement(suggestion);
    } else if (isRefinementMode && !isAnalyzing) {
      // During refinement - process as regular message with consistent animation
      setInput('');
      setIsLoading(true);
      
      // Add loading animation message
      const loadingMessage: Message = {
        id: `msg-loading-${Date.now()}`,
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, loadingMessage]);
      
      // Add slight delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 600));
      
      try {
        // Get AI response for refinement
        const { data, error } = await supabase.functions.invoke('idea-chat', {
          body: { 
            message: suggestion,
            conversationHistory: messages.map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            idea: currentIdea || suggestion,
            refinementMode: true
          }
        });

        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));

        if (!error && data) {
          // Handle both string and object responses with better error handling
          let responseContent = '';
          let responseSuggestions = [];
          
          try {
            if (typeof data === 'string') {
              // If data is a string, try to parse it as JSON first
              try {
                const parsed = JSON.parse(data);
                responseContent = parsed.response || parsed.message || data;
                responseSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
              } catch {
                // If parsing fails, use the string as is
                responseContent = data;
              }
            } else if (typeof data === 'object') {
              // Handle object response
              responseContent = data.response || data.message || '';
              responseSuggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
            }
          } catch (parseError) {
            console.error('Error parsing suggestion response:', parseError);
            responseContent = 'I understand. Let me help you explore that further.';
          }
          
          if (responseContent) {
            const botMessage: Message = {
              id: `msg-${Date.now()}-bot`,
              type: 'bot',
              content: responseContent,
              timestamp: new Date(),
              suggestions: responseSuggestions
            };
            
            setMessages(prev => [...prev, botMessage]);
          } else {
            console.error('Invalid response structure:', data);
            throw new Error('Invalid response format');
          }
        } else {
          throw new Error('No data received');
        }
      } catch (error) {
        console.error('Chat error:', error);
        // Remove loading message
        setMessages(prev => prev.filter(msg => !msg.isTyping));
        
        const errorMessage: Message = {
          id: `msg-error-${Date.now()}`,
          type: 'bot',
          content: "I apologize, I'm having trouble processing your request. Please try again.",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
    
    setInput('');
  };

  return (
    <div ref={chatContainerRef} className={cn("flex flex-col h-full bg-background relative", className)}>
      {/* Top-right controls: shuffle (only before idea picked) + reset (always) */}
      <div className="absolute top-2 right-2 z-30 flex gap-2">
        {!currentIdea && messages.length === 1 && messages[0]?.type === 'system' && (
          <Button
            size="sm"
            variant="outline"
            onClick={shuffleBrainstormIdeas}
            className="h-8 px-2 text-[11px] gap-1 shadow-sm bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            title="Shuffle brainstorming ideas"
          >
            ↺ Shuffle Ideas
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={resetChat}
          className="h-8 px-2 text-[11px] gap-1 shadow-sm bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          title="Reset chat (keep session)"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
      {/* Header with Progress */}
            {isAnalyzing && (
              <div className="border-b p-3 bg-muted/10">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium">Analyzing Brief</h3>
                    <span className="text-xs text-muted-foreground">Working…</span>
                  </div>
                  <Progress value={analysisProgress} className="h-1.5" />
                </div>
              </div>
            )}

      {/* Main Chat Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4 pb-32">
          {/* Welcome Card with Suggestions */}
          {messages.length === 1 && messages[0].type === 'system' && (
            <div className="mb-8">
              <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
                <div className="relative p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                        <Bot className="h-8 w-8 text-primary-foreground" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-green-400 rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Welcome to PM-Fit Analyzer
                      </h2>
                      <p className="text-muted-foreground mt-2">
                        {messages[0].content}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <Sparkles className="h-3 w-3 text-yellow-400" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Popular startup ideas - Click to try:</p>
                    </div>
                    <div className="grid gap-3">
                      {messages[0].suggestions?.map((suggestion, idx) => {
                        // Beautiful emoji collection for suggestions
                        const suggestionEmojis = ['✨', '🚀', '💡', '🎯', '⚡', '🌟', '🔥', '💎'];
                        const emoji = suggestionEmojis[idx % suggestionEmojis.length];
                        
                        return (
                          <Button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            variant="outline"
                            className="relative justify-start text-left h-auto py-4 px-5 bg-card/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center gap-3 w-full">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-200 group-hover:scale-110">
                                <span className="text-lg animate-fade-in">{emoji}</span>
                              </div>
                              <span className="text-sm flex-1 text-foreground/90 group-hover:text-foreground transition-colors">{suggestion}</span>
                              <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0" />
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.type === 'user' && 'justify-end',
                msg.type === 'system' && 'justify-center'
              )}
            >
              {msg.type === 'system' ? (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm max-w-md text-center">
                  <ReactMarkdown 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    components={{
                      p: ({children}) => <p className="mb-0">{children}</p>,
                      strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <>
                  {msg.type === 'bot' && (
                    <div className="relative animate-fade-in">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[75%] space-y-2",
                    msg.type === 'user' ? 'items-end' : 'items-start'
                  )}>
                    <div
                      className={cn(
                        "rounded-2xl px-5 py-3.5 shadow-md transition-all duration-200",
                        msg.type === 'user' 
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground ml-auto' 
                          : 'bg-card border border-border/50 hover:shadow-lg'
                      )}
                    >
                      {msg.isTyping ? (
                        <div className="flex items-center gap-2 py-1 animate-fade-in">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed">
                          <ReactMarkdown 
                            className="prose prose-sm dark:prose-invert max-w-none"
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                              em: ({children}) => <em className="italic">{children}</em>,
                              ul: ({children}) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                              li: ({children}) => <li className="mb-1">{children}</li>,
                              code: ({children}) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                              pre: ({children}) => <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>,
                              blockquote: ({children}) => <blockquote className="border-l-2 border-primary pl-4 italic my-2">{children}</blockquote>,
                              h1: ({children}) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                              h2: ({children}) => <h2 className="text-lg font-semibold mb-2">{children}</h2>,
                              h3: ({children}) => <h3 className="text-base font-semibold mb-1">{children}</h3>,
                              a: ({children, href}) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                          AI-Powered Suggestions:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.suggestions.map((suggestion, idx) => {
                            // Beautiful emoji collection for inline suggestions
                            const inlineEmojis = ['💫', '🎨', '🔮', '🌈', '⭐', '🪄', '🌺', '🦋'];
                            const emoji = inlineEmojis[idx % inlineEmojis.length];
                            
                            return (
                              <Button
                                key={idx}
                                onClick={() => {
                                  // Handle special action suggestions
                                  if (suggestion === "View detailed PM-Fit analysis" && msg.pmfAnalysis) {
                                    if (onAnalysisReady) {
                                      const analysisData = {
                                        idea: currentIdea,
                                        answers: undefined,
                                        pmfAnalysis: msg.pmfAnalysis,
                                        timestamp: new Date().toISOString()
                                      };
                                      onAnalysisReady(currentIdea, analysisData);
                                    }
                                  } else if (suggestion === "Re-analyze with changes" || suggestion === "Refine this idea further") {
                                    // Enable refinement mode for iteration
                                    setShowStartAnalysisButton(true);
                                    setIsRefinementMode(true);
                                    setIsAnalyzing(false);
                                    setAnalysisProgress(0);
                                    const refineMsg: Message = {
                                      id: `msg-refine-${Date.now()}`,
                                      type: 'bot',
                                      content: "Let's refine your idea to improve the PM-Fit score. What specific aspects would you like to enhance?",
                                      timestamp: new Date(),
                                      suggestions: [
                                        "Improve the value proposition",
                                        "Better define target audience",
                                        "Strengthen monetization model",
                                        "Differentiate from competitors"
                                      ]
                                    };
                                    setMessages(prev => [...prev, refineMsg]);
                                  } else if (suggestion === "Refine my idea based on feedback") {
                                    setIsRefinementMode(true);
                                    handleSuggestionClick("Let me refine my idea based on the analysis feedback");
                                  } else if (suggestion === "Start with a new idea" || suggestion === "Start fresh with new approach") {
                                    // Reset everything for a new idea
                                    setCurrentIdea('');
                                    setAnalysisProgress(0);
                                    setIsAnalyzing(false);
                                    setIsRefinementMode(true);
                                    setShowStartAnalysisButton(false);
                                    setAnalysisProgress(0);
                                    const resetMsg: Message = {
                                      id: `msg-reset-${Date.now()}`,
                                      type: 'bot',
                                      content: "Let's start fresh! Share your new product idea and I'll help you refine and analyze it.",
                                      timestamp: new Date(),
                                      suggestions: [
                                        "AI-powered mental health app",
                                        "Sustainable fashion marketplace",
                                        "Remote work collaboration tool",
                                        "Educational platform for seniors"
                                      ]
                                    };
                                    setMessages([resetMsg]);
                                  } else {
                                    handleSuggestionClick(suggestion);
                                  }
                                }}
                                variant="outline"
                                size="sm"
                                className="text-xs h-auto py-2 px-3 hover:bg-primary/10 hover:border-primary transition-all group hover:scale-105 duration-200"
                              >
                                <span className="mr-1 group-hover:animate-bounce">{emoji}</span>
                                {suggestion}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          {/* Action Buttons */}
          {showStartAnalysisButton && isRefinementMode && !isAnalyzing && !showDashboard && (
            <div className="flex items-center justify-between mb-3 p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <BarChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {analysisProgress > 0 && analysisProgress < 100 ? 'Ready to re-analyze?' : 'Ready to analyze?'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analysisProgress === 100 ? 'Re-run analysis with your refined idea' : 'Run comprehensive PM-Fit analysis when you\'re ready'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => startAnalysis()}
                className="gap-2 shadow-lg"
                size="sm"
              >
                <Play className="h-4 w-4" />
                {showBriefForm ? 'Close Brief' : (analysisProgress === 100 ? 'Re-analyze Idea' : 'Open Analysis Brief')}
              </Button>
            </div>
          )}

          {showBriefForm && !isAnalyzing && (
            <Card className="mb-4 p-4 border-primary/30 bg-card/70 backdrop-blur-sm animate-fade-in">
              <h3 className="text-sm font-semibold mb-2">Analysis Brief</h3>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">Provide at least the problem and target user. The more detail you add, the better the PM-Fit analysis.</p>
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" size="sm" disabled={isFetchingBriefSuggestions} onClick={() => fetchBriefSuggestions(true)} className="h-7 text-[11px] px-2">
                    {isFetchingBriefSuggestions ? 'Suggesting…' : 'AI Suggest'}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Problem (required)</label>
                  <Input
                    value={brief.problem}
                    onChange={(e) => setBrief(b => ({ ...b, problem: e.target.value }))}
                    placeholder="What problem are you solving?"
                  />
                  {briefSuggestions.problem && briefSuggestions.problem.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {briefSuggestions.problem.map((s,i) => (
                        <button key={i} onClick={() => setBrief(b => ({ ...b, problem: s }))} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Target User (required)</label>
                  <Input
                    value={brief.targetUser}
                    onChange={(e) => setBrief(b => ({ ...b, targetUser: e.target.value }))}
                    placeholder="Who exactly will use it?"
                  />
                  {briefSuggestions.targetUser && briefSuggestions.targetUser.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {briefSuggestions.targetUser.map((s,i) => (
                        <button key={i} onClick={() => setBrief(b => ({ ...b, targetUser: s }))} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Differentiation</label>
                  <Input
                    value={brief.differentiation}
                    onChange={(e) => setBrief(b => ({ ...b, differentiation: e.target.value }))}
                    placeholder="What makes it unique?"
                  />
                  {briefSuggestions.differentiation && briefSuggestions.differentiation.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {briefSuggestions.differentiation.map((s,i) => (
                        <button key={i} onClick={() => setBrief(b => ({ ...b, differentiation: s }))} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Alternatives</label>
                  <Input
                    value={brief.alternatives}
                    onChange={(e) => setBrief(b => ({ ...b, alternatives: e.target.value }))}
                    placeholder="How do people solve it now?"
                  />
                  {briefSuggestions.alternatives && briefSuggestions.alternatives.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {briefSuggestions.alternatives.map((s,i) => (
                        <button key={i} onClick={() => setBrief(b => ({ ...b, alternatives: s }))} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Monetization</label>
                  <Input
                    value={brief.monetization}
                    onChange={(e) => setBrief(b => ({ ...b, monetization: e.target.value }))}
                    placeholder="How will it make money?"
                  />
                  {briefSuggestions.monetization && briefSuggestions.monetization.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {briefSuggestions.monetization.map((s,i) => (
                        <button key={i} onClick={() => setBrief(b => ({ ...b, monetization: s }))} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Primary Scenario</label>
                  <Input
                    value={brief.scenario}
                    onChange={(e) => setBrief(b => ({ ...b, scenario: e.target.value }))}
                    placeholder="When & how is it used?"
                  />
                  {briefSuggestions.scenario && briefSuggestions.scenario.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {briefSuggestions.scenario.map((s,i) => (
                        <button key={i} onClick={() => setBrief(b => ({ ...b, scenario: s }))} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium">Success Metric</label>
                  <Input
                    value={brief.successMetric}
                    onChange={(e) => setBrief(b => ({ ...b, successMetric: e.target.value }))}
                    placeholder="What metric shows success?"
                  />
                  {briefSuggestions.successMetric && briefSuggestions.successMetric.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {briefSuggestions.successMetric.map((s,i) => (
                        <button key={i} onClick={() => setBrief(b => ({ ...b, successMetric: s }))} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">We generate a weighted PM-Fit score & improvement suggestions.</p>
                <Button size="sm" onClick={runBriefAnalysis} disabled={isAnalyzing} className="gap-2">
                  <BarChart className="h-4 w-4" />
                  {analysisProgress > 0 && analysisProgress < 100 ? 'Analyzing...' : 'Generate Analysis'}
                </Button>
              </div>
            </Card>
          )}
          
          {/* Current idea badge removed per request (idea still tracked internally) */}

          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={
                !currentIdea 
                  ? "Describe your product idea..." 
                  : isAnalyzing 
                    ? "Type your answer..." 
                    : "Ask a follow-up question..."
              }
              className="flex-1"
              disabled={isLoading}
            />
            {/* Always visible Analyze button */}
            <Button
              onClick={() => {
                const ideaPresent = currentIdea || input.trim();
                if (!ideaPresent) {
                  toast({
                    title: "No idea to analyze",
                    description: "Please enter your product idea first",
                    variant: "destructive"
                  });
                  return;
                }
                if (!currentIdea && input.trim()) {
                  setCurrentIdea(input.trim());
                  generateTwoWordTitle(input.trim());
                  if (!currentSession && user) {
                    createSession(input.trim().split(/\s+/).slice(0,6).join(' '));
                  }
                  setInput('');
                }
                startAnalysis();
              }}
              disabled={isLoading || (!currentIdea && !input.trim())}
              size="icon"
              variant="secondary"
              className="hover:bg-primary hover:text-primary-foreground transition-colors"
              title={currentIdea ? "Re-analyze current idea" : "Analyze your idea"}
            >
              <BarChart className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}