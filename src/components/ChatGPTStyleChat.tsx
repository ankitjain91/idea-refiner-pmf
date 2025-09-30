import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND, SCORE_LABEL, ANALYSIS_VERB } from '@/branding';
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
  Sparkles,
  ArrowRight,
  Play,
  RefreshCw,
  Brain,
  Lightbulb,
  BarChart3,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage as Message, BriefFields } from '@/types/chat';
import { computeEvidenceMetrics, isVagueAnswer } from '@/lib/brief-scoring';
import { runEnterpriseAnalysis } from '@/lib/analysis-engine';
import type { AnalysisResult } from '@/types/analysis';
// Normalized import paths
import { LS_KEYS, LS_UI_KEYS } from '@/lib/storage-keys';
import { buildMarkdownReport, triggerDownload } from '@/lib/export-report';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { scheduleIdle } from '@/lib/idle';
import { SuggestionList } from './chat/SuggestionList';
import { ChatHeader } from './chat/ChatHeader';
import { MessageBubble } from './chat/MessageBubble';
import { ChatInputBar } from './chat/ChatInputBar';


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
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentIdea, setCurrentIdea] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCompletedFlag, setAnalysisCompletedFlag] = useState(() => localStorage.getItem(LS_KEYS.analysisCompleted) === 'true');
  const [typingStatus, setTypingStatus] = useState<string>('');
  // Brief fields (two required: problem, targetUser; others optional)
  const [brief, setBrief] = useState<BriefFields>({
    problem: '', targetUser: '', differentiation: '', alternatives: '', monetization: '', scenario: '', successMetric: ''
  });
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRefinementMode, setIsRefinementMode] = useState(false); // start in idea mode
  // Response mode removed - always use detailed
  let persistedMode: 'idea'|'refine'|'analysis' = 'idea';
  try {
    const stored = localStorage.getItem('chatMode');
    if (stored === 'refine' || stored === 'analysis' || stored === 'idea') persistedMode = stored;
  } catch {}
  const modeRef = useRef<'idea'|'refine'|'analysis'>(persistedMode);
  let persistedBanner = false;
  try { persistedBanner = localStorage.getItem('refineBannerShown') === '1'; } catch {}
  const refinementBannerShownRef = useRef<boolean>(persistedBanner);
  const emitMode = (mode: 'idea'|'refine'|'analysis') => {
    modeRef.current = mode;
    try { localStorage.setItem('chatMode', mode); } catch {}
    try { window.dispatchEvent(new CustomEvent('chat:mode', { detail: { mode } })); } catch {}
    if (mode === 'refine' && !refinementBannerShownRef.current) {
      // Inject subtle one-time banner message
      refinementBannerShownRef.current = true;
      try { localStorage.setItem('refineBannerShown', '1'); } catch {}
      const banner: Message = {
        id: `msg-refine-banner-${Date.now()}`,
        type: 'system',
        content: '✨ Refinement Mode: You can iteratively sharpen positioning, differentiation and monetization before running full analysis. Ask for improvements or start the analysis.',
        timestamp: new Date(),
        suggestions: [
          'Improve differentiation',
          'Clarify target user',
          'Start Analysis',
          'Show examples of strong positioning'
        ]
      };
      setMessages(prev => [ ...prev, banner ]);
    }
  };
  const [showStartAnalysisButton, setShowStartAnalysisButton] = useState(false);
  // Deprecated drawer brief form flag (kept for backward compatibility but no longer used)
  const [showBriefForm, setShowBriefForm] = useState(false);
  // Inline Q&A brief capture state
  const [isBriefQAMode, setIsBriefQAMode] = useState(false);
  const [briefQuestionIndex, setBriefQuestionIndex] = useState(0);
  // Will be populated dynamically when Q&A starts based on current context
  const briefQuestionsRef = useRef<Array<{ key: keyof typeof brief; question: string; required?: boolean }>>([]);
  const [briefSuggestions, setBriefSuggestions] = useState<Record<string, string[]>>({});
  // Keep a ref in sync to avoid stale closure in polling loops (e.g., askNextBriefQuestion)
  const briefSuggestionsRef = useRef<Record<string, string[]>>({});
  const updateBriefSuggestions = (next: Record<string,string[]>) => {
    briefSuggestionsRef.current = next;
    setBriefSuggestions(next);
  };
  // Evidence coverage & critique state
  const [evidenceScore, setEvidenceScore] = useState<number>(0); // 0-100 heuristic
  const [briefWeakAreas, setBriefWeakAreas] = useState<string[]>([]);
  const positivityUnlockedRef = useRef(false);
  const vagueAnswerCountsRef = useRef<Record<string, number>>({});
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
  const LiveDataCards = React.useMemo(() => React.lazy(() => import('./LiveDataCards')), []);

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

  // Typing indicator helpers to ensure visibility for at least a minimal duration
  const MIN_TYPING_MS = 900;
  const startTyping = (status: string) => {
    setTypingStatus(status);
    const loadingMessage: Message = {
      id: `msg-typing-${Date.now()}`,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, loadingMessage]);
    return Date.now();
  };
  const stopTyping = async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, MIN_TYPING_MS - elapsed);
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    setMessages(prev => prev.filter(msg => !msg.isTyping));
    setTypingStatus('');
  };

  // Classify suggestion for badge category (used by modular SuggestionList)
  const classifySuggestionCategory = (suggestion: string): string | undefined => {
    const lower = suggestion.toLowerCase();
    if (lower === 'skip' || lower === 'cancel') return undefined;
    if (/(analyz|analysis|run|re-analyze|metric|score)/.test(lower)) return 'action';
    if (/(problem|user|monet|differen|market|signal|scenario|alternative|metric)/.test(lower)) return 'brief';
    if (/^show |^view |^open /.test(lower)) return 'view';
    if (/^improve|^refine|^strengthen|^optimi/.test(lower)) return 'refine';
    if (/(start fresh|new idea)/.test(lower)) return 'reset';
    return undefined;
  };

  // Unified suggestion selection handler (supports actions and defaults)
  const DASHBOARD_PATTERNS = [/^open dashboard$/i, /^view dashboard$/i, /^go to dashboard$/i, /^show dashboard$/i];
  const canOpenDashboard = () => {
    try { return localStorage.getItem(LS_KEYS.analysisCompleted) === 'true'; } catch { return false; }
  };
  const triggerDashboardOpen = () => {
    const canOpen = canOpenDashboard();
    console.log('triggerDashboardOpen - canOpen:', canOpen);
    console.log('triggerDashboardOpen - analysisCompleted localStorage:', localStorage.getItem(LS_KEYS.analysisCompleted));
    
    if (canOpen) {
      console.log('Navigating to /dashboard');
      navigate('/dashboard');
      
      // Add a confirmation message to let user know navigation happened
      const confirmMsg: Message = {
        id: `msg-dashboard-open-${Date.now()}`,
        type: 'system',
        content: '🎯 Opening your analysis dashboard...',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMsg]);
    } else {
      const warn: Message = {
        id: `msg-dashboard-block-${Date.now()}`,
        type: 'system',
        content: '📊 The dashboard unlocks after you run an analysis. Add your idea & brief, then choose Start Analysis.',
        timestamp: new Date(),
        suggestions: ['Start Analysis', 'Refine further', 'Improve differentiation']
      };
      setMessages(prev => [...prev, warn]);
    }
  };
  const handleSuggestionSelection = (msg: Message, suggestion: string) => {
    // Strip any leading emoji / decoration for comparison while preserving original for input
    const normalized = suggestion.trim().replace(/^([\p{Emoji}\p{Extended_Pictographic}]+\s*)/u, '').replace(/^[-•\d\.\s]+/, '').trim();

    // Dashboard open intents
    if (DASHBOARD_PATTERNS.some(r => r.test(normalized)) || normalized.toLowerCase() === 'open dashboard') {
      triggerDashboardOpen();
      return;
    }

    // Export report (use latest pmfAnalysis containing message or fallback)
    if (normalized === 'Export report') {
      const target = msg.pmfAnalysis ? msg : [...messages].reverse().find(m => m.pmfAnalysis) as Message | undefined;
      if (!target?.pmfAnalysis) return;
      const result: AnalysisResult = {
        pmfAnalysis: target.pmfAnalysis,
        meta: {
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 0,
            briefSnapshot: brief,
          validationIssues: [],
          evidenceScore: 0,
          weakAreas: [],
          viabilityLabel: ''
        }
      };
      const md = buildMarkdownReport(result);
      triggerDownload('pmf-analysis-report.md', md);
      return;
    }

    if (normalized === 'Re-analyze with changes' || normalized === 'Refine this idea further' || normalized === 'Refine further') {
      setShowStartAnalysisButton(true);
      setIsRefinementMode(true);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      const refineMsg: Message = {
        id: `msg-refine-${Date.now()}`,
        type: 'bot',
        content: `Let's refine your idea to improve the ${SCORE_LABEL}. What specific aspects would you like to enhance?`,
        timestamp: new Date(),
        suggestions: [
          'Improve the value proposition',
          'Better define target audience',
          'Strengthen monetization model',
          'Differentiate from competitors'
        ]
      };
      setMessages(prev => [...prev, refineMsg]);
      return;
    }

    if (normalized === 'Refine my idea based on feedback') {
      setIsRefinementMode(true);
      handleSuggestionClick('Let me refine my idea based on the analysis feedback');
      return;
    }

  if (normalized === 'Run SmoothBrains Analysis' || normalized === 'Start Analysis') {
      runBriefAnalysis();
      return;
    }

    if (normalized === 'Show live market signals') {
      const already = messages.some(m => m.metadata?.liveDataForIdea === currentIdea);
      if (!already && currentIdea) {
        const liveMsg: Message = {
          id: `msg-live-${Date.now()}`,
          type: 'bot',
          content: `📡 Live market signals for **${currentIdea}**`,
          timestamp: new Date(),
          metadata: { liveData: true, liveDataForIdea: currentIdea }
        };
        setMessages(prev => [...prev, liveMsg]);
      }
      return;
    }

    if (normalized === 'Start with a new idea' || normalized === 'Start fresh with new approach') {
      setCurrentIdea('');
      setAnalysisProgress(0);
      setIsAnalyzing(false);
      setIsRefinementMode(true);
      setShowStartAnalysisButton(false);
      setAnalysisProgress(0);
      const resetMsg: Message = {
        id: `msg-reset-${Date.now()}`,
        type: 'bot',
        content: "Let's try something new! Share any product or service idea you have and I'll help you think it through step by step.",
        timestamp: new Date(),
        suggestions: [
          '💡 Think about problems you face daily',
          '💡 Look for gaps in existing solutions',
          '💡 Consider what would save you time/money',
          '💡 Start with your own experience and needs'
        ]
      };
      setMessages([resetMsg]);
      return;
    }

    // Default: populate input for user to optionally edit/send
    setInput(suggestion.replace(/^([\p{Emoji}\p{Extended_Pictographic}]+\s*)/u, ''));
    inputRef.current?.focus();
  };

  useEffect(() => {
    // Only scroll to bottom if there are more than 1 message (not just the initial welcome)
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  // External trigger to open analysis brief (from parent layout / dashboard panel)
  useEffect(() => {
    const openBrief = () => { if (!isAnalyzing) runBriefAnalysis(); };
    const closeBrief = () => { if (isBriefQAMode) { setIsBriefQAMode(false); window.dispatchEvent(new CustomEvent('analysis:briefEnded')); } };
    window.addEventListener('analysis:openBrief', openBrief);
    window.addEventListener('analysis:closeBrief', closeBrief);
    return () => {
      window.removeEventListener('analysis:openBrief', openBrief);
      window.removeEventListener('analysis:closeBrief', closeBrief);
    };
  }, [isBriefQAMode, isAnalyzing]);

  // Fetch AI suggestions for brief fields
  const fetchBriefSuggestions = useCallback(async (force = false, enrich = false) => {
    if (isFetchingBriefSuggestions || (!force && !enrich && briefFetchedRef.current)) return;
    setIsFetchingBriefSuggestions(true);
    window.dispatchEvent(new CustomEvent('chat:status', { detail: { kind: 'brief-suggestions', message: 'Fetching brief answer suggestions...' } }));
    abortBriefSuggestRef.current?.abort();
    const controller = new AbortController();
    abortBriefSuggestRef.current = controller;
    try {
      const fieldKeys = ['problem','targetUser','differentiation','alternatives','monetization','scenario','successMetric'];
      const existing = briefSuggestions;
      // Build context for enrichment
      const contextObj: any = { brief, existingSuggestions: existing };
      const prompt = enrich
        ? `Improve & diversify ANSWER suggestions for product idea: "${currentIdea || brief.problem || 'Unknown'}". Return JSON with keys ${fieldKeys.join(', ')}. Each key: up to 5 concise, non-redundant, high-signal *answer statements* (max 12 words) – NEVER questions, do not end with '?', no generic fluff (avoid 'innovative platform', 'revolutionary'). Prioritize clarity, specificity, novelty. Avoid duplicates from existingSuggestions. Keep arrays small if high quality cannot be added.`
        : `Given the product idea: "${currentIdea || brief.problem || 'Unknown'}" generate concise structured ANSWER suggestions (NOT questions) for these fields in JSON with keys ${fieldKeys.join(', ')}. Each key should be an array of 3 short, high-signal, declarative answer statements (max 12 words each). No question marks. Focus on clarity + specificity.`;
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
              let s = String(raw).trim();
              if (!s) return;
              if (s.endsWith('?')) s = s.replace(/\?+$/,'').trim();
              if (/^(what|who|how|why|when|where)\b/i.test(s)) return; // discard questions
              if (!s) return;
              if (![...currentSet].some(existingVal => existingVal.toLowerCase() === s.toLowerCase())) {
                currentSet.add(s);
              }
            });
          // Keep top 5 (simple heuristic: shorter first then original order)
          const limited = [...currentSet].sort((a,b) => a.length - b.length).slice(0,5);
          merged[k] = limited;
        }
      });
  updateBriefSuggestions(merged);
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
      window.dispatchEvent(new CustomEvent('chat:status', { detail: { kind: 'idle', message: '' } }));
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
    if (!currentSession?.data) return;
    const st = currentSession.data as any;
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
        content: "👋 Hi there! I'm excited to help you explore your product idea! You can pick one of the suggestions below to get started, or just tell me about any idea that's on your mind - even if it's just a rough thought!",
        timestamp: new Date(),
        suggestions: generateRandomSuggestions()
      };
      setMessages([welcomeMessage]);
      emitMode(modeRef.current); // restore persisted mode (or idea)
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
  const resetChat = async () => {
    if (isAnalyzing) return;
    
    // Clear all component state
    setCurrentIdea('');
    setShowStartAnalysisButton(false);
    setIsRefinementMode(false);
    setAnalysisProgress(0);
    setIsBriefQAMode(false);
    setBriefQuestionIndex(0);
    setBriefSuggestions({});
    setEvidenceScore(0);
    setBriefWeakAreas([]);
    setIsFetchingBriefSuggestions(false);
    
    // Clear refs
    briefQuestionsRef.current = [];
    briefSuggestionsRef.current = {};
    briefFetchedRef.current = false;
    positivityUnlockedRef.current = false;
    vagueAnswerCountsRef.current = {};
    
    // Get current session ID for targeted clearing
    const sessionId = currentSession?.id || localStorage.getItem('currentSessionId');
    
    try {
      // Clear ALL local storage items related to ideas, analysis, and sessions
      const keysToRemove = [
        'userIdea',
        'chatHistory',
        'enhancedIdeaChatMessages',
        'currentIdea',
        'pmfCurrentIdea',
        'pmfScore',
        'ideaMetadata',
        'analysisBrief',
        'analysisBriefSuggestionsCache',
        'conversationHistory',
        'userAnswers',
        'dashboardValidation',
        'pendingQuestion',
        'analysisId',
        'pmfAnalysisData',
        'dashboardAccessGrant',
        'wrinklePoints',
        LS_KEYS.analysisCompleted,
        LS_KEYS.userIdea,
        LS_KEYS.pmfScore,
        LS_KEYS.ideaMetadata,
        LS_KEYS.userAnswers,
      ];
      
      // Clear session-specific keys if we have a session ID
      if (sessionId) {
        keysToRemove.push(
          `session_${sessionId}_idea`,
          `session_${sessionId}_metadata`,
          `session_${sessionId}_conversation`,
          `session_${sessionId}_answers`,
          `session_${sessionId}_analysis`,
          `session_${sessionId}_brief`
        );
        
        // Clear from database if authenticated
        if (user && currentSession && !currentSession.is_anonymous) {
          try {
            // Update the session in database to clear idea-related data
            const { error } = await supabase
              .from('analysis_sessions')
              .update({
                idea: '',
                refinements: null,
                metadata: null,
                pmf_score: 0,
                insights: null,
                user_answers: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionId)
              .eq('user_id', user.id);
              
            if (error) {
              console.error('[ChatGPTStyleChat] Error clearing session in DB:', error);
            } else {
              console.log('[ChatGPTStyleChat] Successfully cleared session data in DB');
            }
          } catch (dbError) {
            console.error('[ChatGPTStyleChat] Failed to clear DB session:', dbError);
          }
        }
      }
      
      // Remove all the keys from localStorage
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {}
      });
      
      // Also clear any keys with dynamic prefixes
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.includes('session_') || 
            key.includes('analysis_') || 
            key.includes('pmf') ||
            key.includes('idea') ||
            key.includes('conversation')) {
          try {
            localStorage.removeItem(key);
          } catch {}
        }
      });
      
      // Dispatch events to notify other components
      window.dispatchEvent(new Event('idea:updated'));
      window.dispatchEvent(new CustomEvent('session:cleared', { detail: { sessionId } }));
      
    } catch (error) {
      console.error('[ChatGPTStyleChat] Error during reset:', error);
    }
    
    // Set fresh welcome message
    const welcomeMessage: Message = {
      id: `msg-welcome-${Date.now()}`,
      type: 'system',
      content: "🌟 Fresh start! Everything has been cleared. What's a new idea you'd like to explore? It could be anything - an app, a service, or even just something you wish existed!",
      timestamp: new Date(),
      suggestions: generateRandomSuggestions()
    };
    setMessages([welcomeMessage]);
    
    // Update mode
    emitMode('idea');
    
    // Update session context to reflect the cleared state
    if (currentSession) {
      window.dispatchEvent(new CustomEvent('session:reset'));
    }
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
    try { localStorage.setItem(LS_KEYS.analysisBrief, JSON.stringify(brief)); } catch {}
    // Broadcast remaining required field count for UI (problem + targetUser currently required)
    try {
      const remainingRequired = ['problem','targetUser'].filter(k => !(brief as any)[k]?.trim()).length;
      window.dispatchEvent(new CustomEvent('analysis:briefState', { detail: { remainingRequired } }));
    } catch {}
  }, [brief]);

  // Attempt to infer an idea from existing chat history (first substantial user message)
  const inferIdeaFromHistory = useCallback((): string | undefined => {
    // Find the longest meaningful user message
    const candidates = messages
      .filter(m => m.type === 'user' && m.content?.trim())
      .map(m => m.content.trim())
      .filter(text => {
        // Skip very short or trivial messages
        if (text.length < 8) return false;
        if (/^(hi|hello|hey|thanks|thank you|cool|ok|okay|yo|yes|no)$/i.test(text)) return false;
        return true;
      })
      .sort((a, b) => b.length - a.length); // Longest first
    
    return candidates[0] || undefined;
  }, [messages]);

  // Single-pass analysis generator using the brief
  const runBriefAnalysis = async () => {
  setIsBriefQAMode(false);
  if (isAnalyzing) return;
  
  // Debug info
  console.log('runBriefAnalysis - currentIdea:', currentIdea);
  console.log('runBriefAnalysis - brief.problem:', brief.problem);
  console.log('runBriefAnalysis - messages count:', messages.length);
  
  // Guard: ensure we have at least a core idea/problem statement before running analysis
  let primaryIdea = (currentIdea || brief.problem || '').trim();
  if (!primaryIdea) {
    const inferred = inferIdeaFromHistory();
    if (inferred) {
      primaryIdea = inferred.trim();
      setCurrentIdea(primaryIdea);
      // Let user know we picked up prior context
      const notice: Message = {
        id: `msg-inferred-idea-${Date.now()}`,
        type: 'system',
        content: `🔍 Using your earlier idea from this session: “${primaryIdea.slice(0,140)}${primaryIdea.length>140?'…':''}”. If that's not right, type a new idea before re-running.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, notice]);
    }
  }
  if (!primaryIdea) {
    const warn: Message = {
      id: `msg-analysis-missing-idea-${Date.now()}`,
      type: 'system',
      content: '📝 I looked for an existing idea in this session but could not find one. Please describe your product idea or the core problem you want to solve before starting the analysis. A single clear sentence helps generate meaningful insights.',
      timestamp: new Date(),
      suggestions: [
        'My idea solves...',
        'The core problem is...',
        'Users struggle with...',
        'I want to help people who...'
      ]
    };
    setMessages(prev => [...prev, warn]);
    setIsAnalyzing(false);
    return;
  }
  setIsAnalyzing(true);
  emitMode('analysis');
  const activatedMsg: Message = {
    id: `msg-analysis-activated-${Date.now()}`,
    type: 'system',
    content: '✅ Analysis Activated. Processing your idea now…',
    timestamp: new Date()
  };
  setMessages(prev => [...prev, activatedMsg]);
  try { window.dispatchEvent(new CustomEvent('analysis:running', { detail: { running: true } })); } catch {}
    setAnalysisProgress(3);
    const analysisStartId = `msg-brief-start-${Date.now()}`;
    const loadingMsg: Message = {
      id: analysisStartId,
      type: 'system',
      content: `Initializing enterprise-grade ${SCORE_LABEL} pipeline...`,
      timestamp: new Date(),
      metadata: { phase: 'init' }
    };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const result: AnalysisResult = await runEnterpriseAnalysis({ brief, idea: primaryIdea || 'Untitled Idea' }, (update) => {
        setAnalysisProgress(Math.min(98, Math.max(5, update.pct)));
        setMessages(prev => prev.map(m => m.id === analysisStartId ? { ...m, content: `${update.phase === 'validate' ? 'Checking your idea details...' : update.phase === 'fetch-model' ? 'Getting smart insights...' : update.phase === 'structure' ? 'Organizing the findings...' : update.phase === 'finalize' ? 'Putting it all together...' : 'Working on it...'}\n${update.note ? '💡 ' + update.note : ''}` } : m));
      });

      const pmfScore = result.pmfAnalysis?.pmfScore ?? 0;
      const good = pmfScore >= 70;
      const completion: Message = {
        id: `msg-brief-complete-${Date.now()}`,
        type: 'system',
        content: `🎯 ${SCORE_LABEL} pipeline complete in ${(result.meta.durationMs/1000).toFixed(1)}s. Score: **${pmfScore}/100** (${result.meta.viabilityLabel || 'Unlabeled'}).\nWeak areas: ${result.meta.weakAreas.length ? result.meta.weakAreas.join(', ') : 'None emphasized.'}`,
        timestamp: new Date(),
        pmfAnalysis: result.pmfAnalysis,
        suggestions: good ? [
          'Show live market signals',
          'Refine further',
          'Export report'
        ] : [
          'Improve differentiation',
          'Clarify target user',
          'Strengthen monetization',
          'Show live market signals'
        ]
      };
      setMessages(prev => [...prev, completion]);
      // Create conversation summary for dashboard
      const conversationSummary = messages
        .filter(m => !m.isTyping && m.content && m.type !== 'system')
        .map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      
      localStorage.setItem(LS_KEYS.analysisCompleted, 'true');
      localStorage.setItem(LS_KEYS.pmfScore, String(pmfScore));
      localStorage.setItem(LS_KEYS.userIdea, primaryIdea || currentIdea); // Use the actual idea that was analyzed
      localStorage.setItem('dashboardIdea', conversationSummary || primaryIdea || currentIdea); // Full conversation for dashboard
      localStorage.setItem(LS_KEYS.userAnswers, JSON.stringify(brief));
      setAnalysisCompletedFlag(true);
      
      // Debug logging for dashboard access
      console.log('Analysis completed - localStorage set:');
      console.log('primaryIdea used:', primaryIdea);
      console.log('currentIdea:', currentIdea);
      console.log('analysisCompleted:', localStorage.getItem(LS_KEYS.analysisCompleted));
      console.log('userIdea stored:', localStorage.getItem(LS_KEYS.userIdea));
      console.log('pmfScore:', localStorage.getItem(LS_KEYS.pmfScore));
      const metadata = { ...result.pmfAnalysis, meta: result.meta, answers: brief };
      localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(metadata));
      // Inject inline dashboard CTA panel card beneath completion message
      const dashboardCard: Message = {
        id: `msg-dashboard-cta-${Date.now()}`,
        type: 'bot',
        content: `Your detailed analysis dashboard is ready. It includes score breakdowns, quick wins, improvement levers, market signals and more.\n\nClick below to open it when you're ready.`,
        timestamp: new Date(),
        suggestions: ['Open Dashboard', 'Refine further', 'Export report']
      };
      setMessages(prev => [...prev, dashboardCard]);
    } catch (e) {
      console.error('Enterprise analysis failed', e);
      toast({ title: 'Analysis ran into trouble', description: 'Something went sideways! Let\'s try running the analysis again. 🔄' });
      setMessages(prev => prev.map(m => m.id === analysisStartId ? { ...m, content: '😔 The analysis couldn\'t complete this time. Could you try tweaking your brief details and running it again?' } : m));
    } finally {
      setAnalysisProgress(100);
      setTimeout(() => {
        setIsAnalyzing(false);
        emitMode('refine');
        try { window.dispatchEvent(new CustomEvent('analysis:running', { detail: { running: false } })); } catch {}
      }, 500);
    }
  };

  // remove legacy createNewSession (sessions now created explicitly elsewhere)

  // Removed saveSession (redundant)

  // Deprecated structured analysis flow removed.

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const trimmed = input.trim();
    if (DASHBOARD_PATTERNS.some(r => r.test(trimmed))) {
      triggerDashboardOpen();
      setInput('');
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Trigger auto-save for authenticated sessions
    window.dispatchEvent(new CustomEvent('chat:activity'));

    // Lazy-create a session only when user first contributes meaningful content and no session exists yet
    if (!currentSession && user && messages.filter(m => m.type !== 'system').length === 0) {
      // Use first 6 words of input as context
      createSession(input.split(/\s+/).slice(0,6).join(' '));
    }
    
    // Brief Q&A disabled
    // Proceed with normal send flow

    // Idea intake path (before refinement mode begins)
    if (!currentIdea && !isAnalyzing) {
      // Simple validation to check if it looks like an idea
      const looksLikeIdea = input.length > 10 && 
        !input.match(/^(hi|hello|hey|test|testing|ok|yes|no|help|thanks|bye|good|bad|nice|cool|wow|lol|haha|what|where|when|who|why|how)$/i) &&
        (input.includes(' ') || input.length > 20);
      if (!looksLikeIdea) {
        const funnyResponses = [
          "😊 I'd love to help, but I need a bit more to work with! Could you describe a product or service idea you'd like to explore?",
          "🤔 That's a good start, but I'm looking for a product idea! What's something you think people would find useful?",
          "💡 Let's try this: think of a problem you or others face daily. What could solve that problem? That's your idea!",
          "🌟 I'm excited to help you brainstorm! Could you share a product or service concept you'd like to develop?",
          "🚀 Ready to dive in! What's a business idea that's been on your mind? Even a rough concept works!",
          "✨ Think of something like 'an app that helps people...' or 'a service for...' - what comes to mind?",
          "� What problem do you see around you that needs solving? That could be your next big idea!",
          "💭 Every great business starts with solving a real problem. What's something that frustrates you or others?",
          "🔥 I can sense you have ideas brewing! What's something you wish existed to make life easier?",
          "� Let your creativity flow! What's a product or service you think the world needs?"
        ];
        const randomResponse = funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
        const validationMessage: Message = {
          id: `msg-validation-${Date.now()}`,
          type: 'bot',
          content: randomResponse,
          timestamp: new Date(),
          suggestions: [
            "💡 Start with a problem you personally experience",
            "💡 Talk to 10 people who might use your solution",
            "💡 Focus on one specific user group initially",
            "💡 Keep your first version simple and focused"
          ]
        };
        setMessages(prev => [...prev, validationMessage]);
        setInput('');
        return;
      }
      setCurrentIdea(input);
      generateTwoWordTitle(input);
      setShowStartAnalysisButton(true);
      setIsRefinementMode(true);
      emitMode('refine');
      setInput('');
      // Immediately engage with an initial AI response about the idea
      await handleSuggestionRefinement(input);
      return;
    }

    // Refinement conversational loop
    if (isRefinementMode && !isAnalyzing) {
      setInput('');
      setIsLoading(true);
      const startedAt = startTyping('Formulating a helpful reply...');
      
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
            refinementMode: true,
            userFriendlyMode: true,
            systemPrompt: "You are a friendly business advisor helping someone refine their product idea. Use simple, everyday language that anyone can understand. Avoid technical jargon, complex business terms, or industry acronyms. Be encouraging and practical. Focus on real-world examples and clear explanations. Ask follow-up questions to help them think through their idea step by step."
          }
        });

        await stopTyping(startedAt);

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
            responseContent = "That's interesting! Let me help you think through this idea. What's the main problem your product would solve for people?";
          }
          
          // Apply summarization if in summary mode
          const finalContent = await summarizeResponse(responseContent);
          
          const botMessage: Message = {
            id: `msg-${Date.now()}-bot`,
            type: 'bot',
            content: finalContent,
            timestamp: new Date(),
            suggestions: responseSuggestions.length > 0 ? responseSuggestions : undefined
          };
          
          setMessages(prev => [...prev, botMessage]);
        } else {
          throw new Error('No data received');
        }
      } catch (error) {
        console.error('Chat error:', error);
        await stopTyping(startedAt);
        
        const errorMessage: Message = {
          id: `msg-error-${Date.now()}`,
          type: 'bot',
          content: "Hmm, that didn't work quite right! 🤔 Could you try rephrasing your idea? I'm here to help!",
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

      // Apply summarization if in summary mode
      const finalContent = await summarizeResponse(responseContent);

      const botMessage: Message = {
        id: `msg-${Date.now()}-bot`,
        type: 'bot',
        content: finalContent,
        timestamp: new Date(),
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Oops!",
        description: "Couldn't get a response right now. Let's give it another shot! 🔄",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step-based analysis functions removed (completeAnalysis, askNextQuestion) as we now use a single brief.

  const startAnalysis = () => {
    if (isBriefQAMode) setIsBriefQAMode(false);
    if (!isAnalyzing) runBriefAnalysis();
  };

  const startBriefQnA = () => {
    if (isAnalyzing) return;
    setIsBriefQAMode(true);
    setBriefQuestionIndex(0);
    // Derive the most relevant questions now (dynamic ordering, skip filled)
    deriveBriefQuestions();
    try { window.dispatchEvent(new CustomEvent('analysis:briefStarted')); } catch {}
    try { localStorage.setItem(LS_UI_KEYS.aiQnAToggleActive, 'true'); } catch {}
    emitMode('refine');
    // Intro + immediate loading placeholder for first question
    const intro: Message = {
      id: `msg-brief-intro-${Date.now()}`,
      type: 'system',
      content: `✅ Analysis Activated.`,
      timestamp: new Date()
    };
    const loadingFirst: Message = {
      id: `msg-brief-first-loading-${Date.now()}`,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isTyping: true,
      metadata: { briefLoading: true, bootstrap: true }
    };
    setMessages(prev => [...prev, intro, loadingFirst]);
    // Fetch suggestions only for first question's field, then render.
    setTimeout(() => askBriefQuestionWithFreshFetch(0, loadingFirst.id), 60);
  };

  const deriveBriefQuestions = () => {
    const convoText = messages.map(m => m.content.toLowerCase()).join(' \n ');
    const need = (k: keyof typeof brief) => !(brief as any)[k]?.trim();
    // Base question templates (without numbering)
    const templates: Record<string, { question: string; required?: boolean; key: keyof typeof brief; weight: number }> = {
      problem: { key: 'problem', question: 'What problem does your idea solve? Tell me about the frustration or need people have.', required: true, weight: 100 },
      targetUser: { key: 'targetUser', question: 'Who would use this? Describe the person who has this problem - their job, situation, or what makes them different.', required: true, weight: 95 },
      differentiation: { key: 'differentiation', question: 'What makes your idea different or better than what already exists? What\'s your special sauce?', weight: /competitor|alternative|unique|differen|moat/.test(convoText) ? 90 : 60 },
      alternatives: { key: 'alternatives', question: 'How do people deal with this problem right now? What are they using or doing as a workaround?', weight: /competitor|workaround|current|today/.test(convoText) ? 70 : 55 },
      monetization: { key: 'monetization', question: 'How would you make money from this? Would people pay per use, monthly, or something else?', weight: /price|pricing|moneti|revenue|subscription|paid|plan/.test(convoText) ? 85 : 50 },
      scenario: { key: 'scenario', question: 'Walk me through how someone would actually use this. When would they need it and what would they do?', weight: /use case|scenario|workflow|flow|journey|example/.test(convoText) ? 65 : 45 },
      successMetric: { key: 'successMetric', question: 'How would you know if this is working? What would show you that people actually want and use it?', weight: /metric|kpi|measure|retention|activation|engagement|conversion/.test(convoText) ? 75 : 40 }
    };
    // Collect, filter already provided, order by: required first then weight desc
    const ordered = Object.values(templates)
      .filter(t => need(t.key))
      .sort((a,b) => (+(!!b.required) - + (!!a.required)) || b.weight - a.weight);
    // Fallback if somehow empty (should not happen unless all filled)
    if (!ordered.length) {
      ordered.push(templates.problem, templates.targetUser);
    }
    briefQuestionsRef.current = ordered.map(o => ({ key: o.key, question: o.question, required: o.required }));
  };

  const fetchContextualBriefSuggestions = async (limitToFields?: string[]): Promise<Record<string,string[]>> => {
    try {
      const fieldKeysAll = ['problem','targetUser','differentiation','alternatives','monetization','scenario','successMetric'];
      const fieldKeys = limitToFields && limitToFields.length ? limitToFields : fieldKeysAll;
      const convo = messages
        .filter(m => m.type !== 'system')
        .slice(-30) // last 30 exchanges for better context
        .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content.substring(0, 400) }));
      
      const prompt = `You are analyzing the conversation about "${currentIdea || brief.problem || 'Unknown'}" to predict the most likely answers for each analysis field.
      
Conversation history (chronological):
${convo.map(c => `- ${c.role}: ${c.content}`).join('\n')}

Current idea: "${currentIdea}"

For each field below, generate 3-5 highly specific, probable answers based on what has been discussed. These should be complete answers the user would likely choose, not questions.

Fields to analyze:
- problem: The specific problem being solved (include metrics like time/cost saved)
- targetUser: The exact target user segment (be specific about demographics/role)
- differentiation: What makes this unique vs competitors
- alternatives: Current solutions users use today
- monetization: How it will make money (include price points)
- scenario: Primary use case scenario
- successMetric: How to measure early success (be specific)

Return JSON with keys ${fieldKeys.join(', ')}. Each value: array of 4 specific, actionable answers (max 20 words each).
These should be ANSWERS the user would select, not questions. Be extremely specific based on the conversation context.`;

      const { data, error } = await supabase.functions.invoke('idea-chat', { 
        body: { 
          message: prompt, 
          suggestionMode: true, 
          context: { 
            conversation: convo, 
            idea: currentIdea,
            analysisMode: true 
          } 
        } 
      });
      
      if (error) throw error;
      let suggestions: any = {};
      if (typeof data === 'string') {
        try { suggestions = JSON.parse(data); } catch { suggestions = {}; }
      } else if (typeof data === 'object') {
        suggestions = data.suggestions || data;
      }
      
      const merged: Record<string, string[]> = {};
      fieldKeys.forEach(k => {
        const incoming = suggestions?.[k];
        if (Array.isArray(incoming)) {
          merged[k] = incoming
            .filter((s: any) => {
              let str = String(s).trim();
              return str && !str.endsWith('?') && str.length > 0;
            })
            .slice(0, 4);
        }
      });
      if (!limitToFields) {
        updateBriefSuggestions(merged);
        briefFetchedRef.current = true;
        try { 
          localStorage.setItem('analysisBriefSuggestionsCache', JSON.stringify({ 
            ts: Date.now(), 
            data: merged,
            idea: currentIdea 
          })); 
        } catch {}
      } else {
        // Merge partial fetch into existing suggestions
        updateBriefSuggestions({ ...briefSuggestionsRef.current, ...merged });
      }
      return merged;
    } catch (e) {
      console.error('Error fetching contextual suggestions:', e);
      // Fallback to generic suggestions if contextual fetch fails
      try { fetchBriefSuggestions(true); } catch {}
      return {};
    }
  };

  // Fetch probable answers FIRST, then show the question (bootstrap + each step)
  const askBriefQuestionWithFreshFetch = async (index: number, loadingMessageId?: string) => {
    const q = briefQuestionsRef.current[index];
    if (!q || !isBriefQAMode) return;
    const fieldKey = q.key as string;
    // Insert loading placeholder if not provided
    let tempId = loadingMessageId;
    if (!tempId) {
      tempId = `msg-brief-loading-${Date.now()}-${index}`;
      const loadingMsg: Message = {
        id: tempId,
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isTyping: true,
        metadata: { briefLoading: true, briefQuestionKey: q.key, briefQuestionIndex: index }
      };
      setMessages(prev => [...prev, loadingMsg]);
    }
    try {
      await fetchContextualBriefSuggestions([fieldKey]);
    } catch (e) {
      console.warn('Contextual suggestion fetch failed; falling back', e);
    }
    if (!isBriefQAMode) return; // aborted mid-fetch
    let fieldSuggestions = briefSuggestionsRef.current[q.key] || [];
    // Provide a minimal intelligent fallback if API produced nothing
    if (!fieldSuggestions.length) {
      if (q.key === 'problem') {
        fieldSuggestions = [
          'Manual process wastes hours weekly',
          'High churn from poor onboarding',
          'Fragmented data across tools',
          'Expensive legacy workflows'
        ];
      } else if (q.key === 'targetUser') {
        fieldSuggestions = [
          'Solo SaaS founders (ARR < $50k)',
          'Remote product managers (Series A)',
          'Indie Shopify sellers (1-3 staff)',
          'Data analysts in mid-size SaaS'
        ];
      } else {
        fieldSuggestions = ['Needs clarity', 'Early adopters need proof', 'Differentiate vs incumbents', 'Refine positioning'];
      }
    }
    const augmented = fieldSuggestions.slice(0,4);
    const vagueCount = vagueAnswerCountsRef.current[q.key] || 0;
    const challengeSuffix = vagueCount >= 2 ? ' Please be concrete (add a number, segment, or comparison).' : '';
    const questionMsg: Message = {
      id: `msg-brief-q-${Date.now()}-${index}`,
      type: 'bot',
      content: `🤔 ${q.question}${q.required ? ' (we need this one!)' : ''}${challengeSuffix}`,
      timestamp: new Date(),
      suggestions: [...augmented, 'Regenerate answers', 'Skip', 'Cancel'],
      metadata: { briefQuestionKey: q.key, briefQuestionIndex: index }
    };
    setMessages(prev => prev.map(m => m.id === tempId ? questionMsg : m));
    fetchPerQuestionSuggestions(q.key, questionMsg.id, augmented);
    if (q.key === 'problem') {
      const helper: Message = {
        id: `msg-problem-helper-${Date.now()}`,
        type: 'system',
        content: `💡 When stating the core problem, anchor it in: who is blocked, tangible pain (time, cost, accuracy), and current workaround. Optionally hint the solution approach (not features) e.g. "Solo Shopify sellers waste 4-6 hrs weekly fixing mis-synced inventory across channels; current CSV exports are error-prone."`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, helper]);
    }
  };

  // askNextBriefQuestion now simply delegates to the unified fresh-fetch flow
  const askNextBriefQuestion = (index: number, existingLoadingId?: string) => {
    askBriefQuestionWithFreshFetch(index, existingLoadingId);
  };

  const fetchPerQuestionSuggestions = async (field: keyof typeof brief, messageId: string, existing: string[]) => {
    try {
      const convo = messages
        .filter(m => m.type !== 'system')
        .slice(-40) // More context for better suggestions
        .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content.substring(0, 500) }));
      
      const baseIdea = currentIdea || brief.problem || '';
      const currentAnswers = Object.entries(brief)
        .filter(([k,v]) => typeof v === 'string' && v.trim())
        .map(([k,v]) => `${k}: ${v}`)
        .join('\n');
      
      const fieldLabelMap: Record<string,string> = {
        problem: 'core problem statement with measurable pain points',
        targetUser: 'precise target user segment with demographics',
        differentiation: 'unique differentiation or unfair advantage vs competitors',
        alternatives: 'current alternatives or workarounds users use today',
        monetization: 'monetization model with specific pricing',
        scenario: 'primary usage scenario or use case',
        successMetric: 'early traction metric with specific target'
      };
      
      const prompt = `Based on our discussion about "${baseIdea}", generate the 5 most probable answers for: ${fieldLabelMap[field] || field}.

Conversation context (recent):
${convo.slice(-10).map(c => `- ${c.role}: ${c.content}`).join('\n')}

Current brief (may be partial):
${currentAnswers || '(none yet)'}

Generate 5 highly specific, probable answers based on the conversation. These should be:
- Complete answers the user would likely select (not questions)
- Specific with numbers, segments, or comparisons where relevant
- Based on what has been discussed in the conversation
- Max 20 words each
- Actionable and concrete

Return ONLY a JSON array of 5 strings. Example format: ["Answer 1", "Answer 2", ...]`;

      const { data, error } = await supabase.functions.invoke('idea-chat', { 
        body: { 
          message: prompt, 
          suggestionMode: true, 
          context: { 
            field, 
            idea: baseIdea,
            conversation: convo.slice(-5) // Recent context for API
          } 
        } 
      });
      
      if (error) throw error;
      
      let suggestions: string[] = [];
      if (typeof data === 'string') {
        try { suggestions = JSON.parse(data); } catch { suggestions = []; }
      } else if (Array.isArray(data)) {
        suggestions = data as string[];
      } else if (data && typeof data === 'object') {
        if (Array.isArray((data as any).suggestions)) suggestions = (data as any).suggestions;
      }
      
      // Deduplicate and merge with existing
      const merged = [...existing];
      suggestions.forEach(s => {
        let trimmed = String(s).trim();
        if (!trimmed || trimmed.endsWith('?')) return;
        if (!merged.some(e => e.toLowerCase() === trimmed.toLowerCase())) {
          merged.push(trimmed);
        }
      });
      
      const finalList = merged.slice(0, 5);
      
      // Update the message with new suggestions
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, suggestions: [...finalList, 'Skip', 'Cancel'] };
        }
        return m;
      }));
      
      // Also update the brief suggestions cache
      setBriefSuggestions(prev => ({
        ...prev,
        [field]: finalList
      }));
    } catch (e) {
      console.error('Error fetching per-question suggestions:', e);
      // Suggestions already present will remain
    }
  };

  const summarizeBriefAndOfferAnalysis = () => {
    const summaryLines: string[] = [];
    const order = briefQuestionsRef.current;
    order.forEach(q => {
      const val = (brief as any)[q.key];
      if (val) summaryLines.push(`**${q.key.charAt(0).toUpperCase() + q.key.slice(1)}:** ${val}`);
    });
  const metrics = computeEvidenceMetrics(brief, positivityUnlockedRef.current);
  setEvidenceScore(metrics.score);
  setBriefWeakAreas(metrics.weakAreas);
  if (metrics.positivityUnlocked) positivityUnlockedRef.current = true;
    const missingRequired = order.filter(q => q.required && !(brief as any)[q.key]);
    const complete = missingRequired.length === 0;
  const weakSection = metrics.weakAreas.length ? `\n\n**What’s still weak:** ${metrics.weakAreas.map(w => '`'+w+'`').join(', ')}` : '';
  const summaryContent = `${complete ? '✅ Brief captured.' : '⚠️ Brief partially captured.'}\n${metrics.viabilityLabel} (evidence score: ${metrics.score}).\n\n${summaryLines.join('\n\n')}${weakSection}\n\n${complete ? (positivityUnlockedRef.current ? 'You can now run a full analysis.' : 'Add more specificity (numbers & differentiation) to unlock stronger guidance.') : 'Provide missing required fields for best analysis.'}`;
    const summaryMsg: Message = {
      id: `msg-brief-summary-${Date.now()}`,
      type: 'system',
      content: summaryContent,
      timestamp: new Date(),
  suggestions: complete ? ['Run SmoothBrains Analysis', 'Refine my idea based on feedback'] : ['Run SmoothBrains Analysis', 'Add more detail', 'Refine my idea based on feedback']
    };
    setMessages(prev => [...prev, summaryMsg]);
  };

  const handleSuggestionRefinement = async (idea: string) => {
    setIsLoading(true);
    const startedAt = startTyping('Thinking through your idea...');
    try {
      // Get AI response for refinement
      const { data, error } = await supabase.functions.invoke('idea-chat', {
        body: { 
          message: `Tell me more about this idea: ${idea}`,
          idea: idea,
          refinementMode: true
        }
      });

      if (!error && data) {
        let responseContent = '';
        let responseSuggestions: string[] = [];
        
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
        
        
        // Use full response content without truncation
        let fullContent = (responseContent || `Let's explore your idea: "${idea}". What specific aspects would you like to discuss or refine?`).trim();
        
        // Apply summarization if in summary mode
        fullContent = await summarizeResponse(fullContent);
        
        // Ensure emoji prefix for visual consistency
        if (!/^([\p{Emoji}\p{Extended_Pictographic}])/u.test(fullContent)) fullContent = '💬 ' + fullContent;
        // Normalize & enrich suggestions
        const normalized = (responseSuggestions || []).map(String)
          .map(s => s.replace(/^[-•\d\.\s]+/, '').trim())
          .filter(s => s)
          // do not truncate suggestions
          .slice(0,6);
        const seen: string[] = [];
        normalized.forEach(s => { if (!seen.some(d => d.toLowerCase() === s.toLowerCase())) seen.push(s); });
        const seeds = ['✨','🔍','🧠','🚀','🧪','⚡'];
        const sprinkled = seen.map((s,i) => `${seeds[i % seeds.length]} ${s}`);
        const fallback = [
          '✨ Clarify problem',
          '🔍 Define target user',
          '🧪 Differentiate more',
          '🚀 Revenue angle'
        ];
        const botMessage: Message = {
          id: `msg-${Date.now()}-bot`,
          type: 'bot',
          content: fullContent,
          timestamp: new Date(),
          suggestions: sprinkled.length ? sprinkled : fallback
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      await stopTyping(startedAt);
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Populate input and wait for explicit send; do NOT auto-send to server
    setInput(suggestion);
    inputRef.current?.focus();
    return;
    // --- legacy auto-send logic below (kept for reference) ---
    // Prevent duplicate processing
    if (isLoading) return;
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
          "😊 I'd love to help, but I need a bit more to work with! Could you describe a product or service idea you'd like to explore?",
          "🤔 That's a good start, but I'm looking for a product idea! What's something you think people would find useful?",
          "💡 Let's try this: think of a problem you or others face daily. What could solve that problem? That's your idea!"
        ];
        
        const randomResponse = funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
        
        // Add typing indicator
        const startedAt = startTyping('Thinking about your idea...');
        
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Ensure visible for minimum duration then stop
        await stopTyping(startedAt);
        
        const validationMessage: Message = {
          id: `msg-validation-${Date.now()}`,
          type: 'bot',
          content: randomResponse,
          timestamp: new Date(),
          suggestions: [
            '✨ AI finance coach',
            '🌱 Sustainable fashion hub',
            '🧠 Mental wellness app',
            '🏠 Smart elder care automation'
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
      
      // Stay in refinement mode - just get AI response about the idea
      await handleSuggestionRefinement(suggestion);
    } else if (isRefinementMode && !isAnalyzing) {
      // During refinement - process as regular message with consistent animation
      setInput('');
      setIsLoading(true);
      setTypingStatus('Formulating a helpful reply...');
      
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
          let responseContent = '';
          let responseSuggestions: string[] = [];
          
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
          
          if (!responseContent) responseContent = 'Let me help you explore and refine your idea further.';
          // Use full response without truncation, just add emoji for visual consistency
          let fullContent = responseContent.trim();
          if (!/^([\p{Emoji}\p{Extended_Pictographic}])/u.test(fullContent)) fullContent = '🤖 ' + fullContent;
          const norm = (responseSuggestions || []).map(String)
            .map(s => s.replace(/^[-•\d\.\s]+/, '').trim())
            .filter(s => s)
            // do not truncate suggestions
            .slice(0,6);
          const ded: string[] = [];
          norm.forEach(s => { if (!ded.some(d => d.toLowerCase() === s.toLowerCase())) ded.push(s); });
          const seeds2 = ['💡','🛠️','📊','⚡','🧪','🚀'];
          const sprinkled = ded.map((s,i) => `${seeds2[i % seeds2.length]} ${s}`);
          const fallback2 = [
            '💡 Sharpen problem',
            '📊 User specifics',
            '⚡ Monetization angle',
            '🛠️ Differentiate more'
          ];
          const botMessage: Message = {
            id: `msg-${Date.now()}-bot`,
            type: 'bot',
            content: fullContent,
            timestamp: new Date(),
            suggestions: sprinkled.length ? sprinkled : fallback2
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
          content: "Oops, something didn't work there! 😅 Let's try again - maybe rephrase your idea or question?",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setTypingStatus('');
      }
    }
    
    setInput('');
  };

  const handleReset = () => {
    // Clear all chat data
    setMessages([]);
    setCurrentIdea('');
    setInput('');
    setBrief({
      problem: '', targetUser: '', differentiation: '', alternatives: '', monetization: '', scenario: '', successMetric: ''
    });
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setIsRefinementMode(false);
    setIsBriefQAMode(false);
    setBriefQuestionIndex(0);
    setAnalysisCompletedFlag(false);
    
    // Clear localStorage
    localStorage.removeItem(LS_KEYS.userIdea);
    localStorage.removeItem(LS_KEYS.analysisCompleted);
    localStorage.removeItem(LS_KEYS.ideaMetadata);
    localStorage.removeItem('chatMode');
    localStorage.removeItem('refineBannerShown');
    
    // Trigger session reset
    window.dispatchEvent(new CustomEvent('chat:reset'));
    
    // Start fresh with welcome message
    const welcomeMessage: Message = {
      id: `msg-welcome-${Date.now()}`,
      type: 'system',
      content: `I'm here to help you ${ANALYSIS_VERB.toLowerCase()} your startup idea for Product-Market Fit! 🚀\n\nShare your product concept, and I'll guide you through refining it before running a comprehensive SmoothBrains analysis.`,
      timestamp: new Date(),
      suggestions: [
        'AI-powered personal finance app for Gen Z',
        'Subscription box for sustainable home products',
        'Remote team collaboration tool with VR integration',
        'Plant-based protein powder for athletes',
        'Local food waste reduction marketplace'
      ]
    };
    setMessages([welcomeMessage]);
  };

  const handleAnalyze = () => {
    if (!currentIdea.trim()) return;
    
    // Trigger analysis
    emitMode('analysis');
    runBriefAnalysis();
    setShowStartAnalysisButton(false);
  };

  // Response mode removed - always use detailed

  // Check if we can analyze (have an idea)
  const canAnalyze = currentIdea.trim().length > 0;

  // Function to summarize bot responses (no longer used - summary handled by UI)
  const summarizeResponse = async (content: string): Promise<string> => {
    return content; // Always return original content
  };

  return (
    <div ref={chatContainerRef} className={cn("flex flex-col h-full bg-background relative", className)}>
      {/* Header with Progress (refactored) */}
      <ChatHeader 
        isAnalyzing={isAnalyzing} 
        analysisProgress={analysisProgress}
        onReset={handleReset}
        onAnalyze={handleAnalyze}
        canAnalyze={canAnalyze}
      />

  {/* Main Chat Area */}
  <ScrollArea className="flex-1 min-h-0 p-4">
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
                        Welcome to {BRAND} Analyzer
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

          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              typingStatus={typingStatus}
              classifySuggestionCategory={classifySuggestionCategory}
              onSelectSuggestion={(s) => handleSuggestionSelection(msg, s)}
              LiveDataCards={LiveDataCards}
              currentIdea={currentIdea}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

  {/* Input Area - Fixed at Bottom (refactored) */}
  <div className="shrink-0 border-t bg-background p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              size="sm"
              className="bg-card hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button
              onClick={() => navigate('/realtime')}
              variant="outline"
              size="sm"
              className="bg-card hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Analyzer
            </Button>
            <Button
              onClick={() => navigate('/pricing')}
              variant="outline"
              size="sm"
              className="bg-card hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <Crown className="h-4 w-4 mr-2" />
              Monetization
            </Button>
          </div>
          
          <ChatInputBar
            input={input}
            setInput={setInput}
            onSend={handleSend}
            disabled={isLoading}
            placeholder={!currentIdea ? 'Describe your product idea...' : isAnalyzing ? 'Type your answer...' : 'Ask a follow-up question...'}
            inputRef={inputRef}
            onReset={resetChat}
          />
        </div>
      </div>
    </div>
  );
}