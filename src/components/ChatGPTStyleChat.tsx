import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
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
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage as Message, BriefFields } from '@/types/chat';
import { computeEvidenceMetrics, isVagueAnswer } from '@/lib/brief-scoring';
import { runEnterpriseAnalysis } from '@/lib/analysis-engine';
import type { AnalysisResult } from '@/types/analysis';
import { LS_KEYS } from '../lib/../lib/storage-keys';
import { LS_UI_KEYS } from '../lib/../lib/storage-keys';
import { buildMarkdownReport, triggerDownload } from '../lib/../lib/export-report';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SessionContext';
import { scheduleIdle } from '@/lib/idle';
import { SuggestionList } from './chat/SuggestionList';


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
  const [analysisCompletedFlag, setAnalysisCompletedFlag] = useState(() => localStorage.getItem(LS_KEYS.analysisCompleted) === 'true');
  // Brief fields (two required: problem, targetUser; others optional)
  const [brief, setBrief] = useState<BriefFields>({
    problem: '', targetUser: '', differentiation: '', alternatives: '', monetization: '', scenario: '', successMetric: ''
  });
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isRefinementMode, setIsRefinementMode] = useState(false); // start in idea mode
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
        content: '✨ Refinement Mode: You can iteratively sharpen positioning, differentiation and monetization before running full analysis. Ask for improvements or start the brief Q&A.',
        timestamp: new Date(),
        suggestions: [
          'Improve differentiation',
          'Clarify target user',
          'Start Brief Q&A',
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

  // Unified suggestion selection handler (supports brief Q&A, actions, defaults)
  const handleSuggestionSelection = (msg: Message, suggestion: string) => {
    // Handle Brief Q&A suggestion answers inline
    if (isBriefQAMode && msg.metadata?.briefQuestionKey) {
      const lower = suggestion.toLowerCase();
      if (suggestion === 'Regenerate answers' && msg.metadata?.briefQuestionKey) {
        const field = msg.metadata.briefQuestionKey as string;
        // Put question back into loading state briefly
        const regenId = msg.id + '-regen-' + Date.now();
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: true, suggestions: undefined } : m));
        fetchContextualBriefSuggestions([field]).then(newSug => {
          const arr = (newSug[field] || []).slice(0,4);
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false, suggestions: [...arr, 'Regenerate answers', 'Skip', 'Cancel'] } : m));
        });
        return;
      }
      if (lower === 'cancel') {
        setIsBriefQAMode(false);
        const cancelMsg: Message = { id: `msg-brief-cancel-${Date.now()}`, type: 'system', content: '🛑 Brief Q&A cancelled.', timestamp: new Date() };
        setMessages(prev => [...prev, cancelMsg]);
        return;
      }
      const skip = lower === 'skip';
      const qKey = msg.metadata.briefQuestionKey as keyof typeof brief;
      if (!skip) {
        setBrief(b => ({ ...b, [qKey]: suggestion }));
        const vague = isVagueAnswer(suggestion);
        vagueAnswerCountsRef.current[qKey] = (vagueAnswerCountsRef.current[qKey] || 0) + (vague ? 1 : 0);
        const userEcho: Message = { id: `msg-brief-answer-${Date.now()}`, type: 'user', content: suggestion, timestamp: new Date() };
        setMessages(prev => [...prev, userEcho]);
      }
      const nextIdx = (msg.metadata.briefQuestionIndex ?? 0) + 1;
      setBriefQuestionIndex(nextIdx);
      if (nextIdx >= briefQuestionsRef.current.length) {
        summarizeBriefAndOfferAnalysis();
        setIsBriefQAMode(false);
      } else {
        // prefetch for next question
        askBriefQuestionWithFreshFetch(nextIdx, undefined);
      }
      return;
    }
    // Handle special action suggestions
    if (suggestion === "Show Dashboard" || suggestion === "View detailed HyperFlux analysis") {
      // Check if we have analysis data
      const analysisMsg = messages.find(m => m.pmfAnalysis);
      if (analysisMsg?.pmfAnalysis && onAnalysisReady) {
        const analysisData = {
          idea: currentIdea,
          answers: undefined,
          pmfAnalysis: analysisMsg.pmfAnalysis,
          timestamp: new Date().toISOString()
        };
        onAnalysisReady(currentIdea, analysisData);
      } else {
        // No analysis data available
        const noDataMsg: Message = {
          id: `msg-no-data-${Date.now()}`,
          type: 'system',
          content: '⚠️ No analysis data available. Please run the analysis first.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, noDataMsg]);
      }
      return;
    }
    if (suggestion === 'Export report') {
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
    if (suggestion === "Re-analyze with changes" || suggestion === "Refine this idea further") {
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
          "Improve the value proposition",
          "Better define target audience",
          "Strengthen monetization model",
          "Differentiate from competitors"
        ]
      };
      setMessages(prev => [...prev, refineMsg]);
      return;
    }
    if (suggestion === "Refine my idea based on feedback") {
      setIsRefinementMode(true);
      handleSuggestionClick("Let me refine my idea based on the analysis feedback");
      return;
    }
    if (suggestion === 'Run HyperFlux Analysis') {
      if (!brief.problem || !brief.targetUser) {
        const warn: Message = { id: `msg-brief-warn-${Date.now()}`, type: 'system', content: 'Need problem and target user before running analysis. Start Brief Q&A to fill them in.', timestamp: new Date() };
        setMessages(prev => [...prev, warn]);
      } else {
        runBriefAnalysis();
      }
      return;
    }
    if (suggestion === 'Show live market signals') {
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
    if (suggestion === "Start with a new idea" || suggestion === "Start fresh with new approach") {
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
      return;
    }
    // Default: treat as normal suggestion click
    handleSuggestionClick(suggestion);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // External trigger to open analysis brief (from parent layout / dashboard panel)
  useEffect(() => {
    const openBrief = () => startBriefQnA();
    const closeBrief = () => { if (isBriefQAMode) { setIsBriefQAMode(false); window.dispatchEvent(new CustomEvent('analysis:briefEnded')); } };
    window.addEventListener('analysis:openBrief', openBrief);
    window.addEventListener('analysis:closeBrief', closeBrief);
    return () => {
      window.removeEventListener('analysis:openBrief', openBrief);
      window.removeEventListener('analysis:closeBrief', closeBrief);
    };
  }, [isBriefQAMode]);

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
  const resetChat = () => {
    if (isAnalyzing) return;
    setCurrentIdea('');
    try {
      localStorage.removeItem('userIdea');
      localStorage.removeItem('chatHistory');
      localStorage.removeItem(LS_KEYS.analysisCompleted);
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
    setIsRefinementMode(false);
    setAnalysisProgress(0);
    emitMode('idea');
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

  // Single-pass analysis generator using the brief
  const runBriefAnalysis = async () => {
    if (!brief.problem.trim() || !brief.targetUser.trim()) {
      toast({ title: 'Need more detail', description: 'Provide at least the problem and target user.' });
      return;
    }
  setIsBriefQAMode(false);
  setIsAnalyzing(true);
  emitMode('analysis');
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
      const result: AnalysisResult = await runEnterpriseAnalysis({ brief, idea: currentIdea || brief.problem }, (update) => {
        setAnalysisProgress(Math.min(98, Math.max(5, update.pct)));
        setMessages(prev => prev.map(m => m.id === analysisStartId ? { ...m, content: `${update.phase === 'validate' ? 'Validating brief...' : update.phase === 'fetch-model' ? 'Generating model insight...' : update.phase === 'structure' ? 'Structuring findings...' : update.phase === 'finalize' ? 'Finalizing results...' : 'Processing...'}\n${update.note ? '💡 ' + update.note : ''}` } : m));
      });

      const pmfScore = result.pmfAnalysis?.pmfScore ?? 0;
      const good = pmfScore >= 70;
      const completion: Message = {
        id: `msg-brief-complete-${Date.now()}`,
        type: 'system',
        content: `🎯 ${SCORE_LABEL} pipeline complete in ${(result.meta.durationMs/1000).toFixed(1)}s. Score: **${pmfScore}/100** (${result.meta.viabilityLabel || 'Unlabeled'}).\nWeak areas: ${result.meta.weakAreas.length ? result.meta.weakAreas.join(', ') : 'None emphasized.'}\n\n**Click "Show Dashboard" to view your detailed analysis.**`,
        timestamp: new Date(),
        pmfAnalysis: result.pmfAnalysis,
        suggestions: good ? [
          'Show Dashboard',
          'Show live market signals',
          'Refine further',
          'Export report'
        ] : [
          'Improve differentiation',
          'Clarify target user',
          'Strengthen monetization',
          'Show Dashboard',
          'Show live market signals'
        ]
      };
      setMessages(prev => [...prev, completion]);
      localStorage.setItem(LS_KEYS.analysisCompleted, 'true');
      localStorage.setItem(LS_KEYS.pmfScore, String(pmfScore));
      setAnalysisCompletedFlag(true);
      const metadata = { ...result.pmfAnalysis, meta: result.meta };
      localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(metadata));
      // Don't auto-show dashboard, wait for user to click "Show Dashboard"
    } catch (e) {
      console.error('Enterprise analysis failed', e);
      toast({ title: 'Analysis failed', description: 'Pipeline error. Please retry.' });
      setMessages(prev => prev.map(m => m.id === analysisStartId ? { ...m, content: '❌ Analysis pipeline failed. Please adjust brief and retry.' } : m));
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
    
    // If in Brief Q&A capture mode (takes precedence over refinement)
    if (isBriefQAMode && !isAnalyzing) {
      const questions = briefQuestionsRef.current;
      const currentQ = questions[briefQuestionIndex];
      const rawAnswer = input.trim();

      // Allow simple commands
      if (/^cancel$/i.test(rawAnswer)) {
        setIsBriefQAMode(false);
        const cancelMsg: Message = {
          id: `msg-brief-cancel-${Date.now()}`,
          type: 'system',
          content: '🛑 Brief Q&A cancelled. You can restart anytime with the Start Brief button.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, cancelMsg]);
        setInput('');
        return;
      }
      const skip = /^skip$/i.test(rawAnswer) || rawAnswer === '-';
      if (!skip && currentQ) {
        setBrief(b => ({ ...b, [currentQ.key]: rawAnswer }));
      }
      const nextIndex = briefQuestionIndex + 1;
      setBriefQuestionIndex(nextIndex);
      setInput('');
      // Finished?
      if (nextIndex >= questions.length) {
        summarizeBriefAndOfferAnalysis();
        setIsBriefQAMode(false);
      } else {
        askNextBriefQuestion(nextIndex);
      }
      return;
    }

    // Idea intake path (before refinement mode begins)
    if (!currentIdea && !isAnalyzing) {
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
      setIsRefinementMode(true);
      emitMode('refine');
      setInput('');
      return;
    }

    // Refinement conversational loop
    if (isRefinementMode && !isAnalyzing) {
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
    // If Q&A is active, cancel it
    if (isBriefQAMode) {
      setIsBriefQAMode(false);
      const cancelMsg: Message = {
        id: `msg-brief-cancel-${Date.now()}`,
        type: 'system',
        content: '🛑 Brief Q&A cancelled. Click "Start Analysis" to begin again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cancelMsg]);
      return;
    }
    
    // If we have enough brief data, run analysis directly
    if (brief.problem && brief.targetUser) {
      runBriefAnalysis();
    } else {
      // Start brief Q&A to gather information
      startBriefQnA();
    }
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
      content: `� Brief Q&A activated. Probable answers loading…`,
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
      problem: { key: 'problem', question: 'What specific core problem are you solving?', required: true, weight: 100 },
      targetUser: { key: 'targetUser', question: 'Who exactly is the primary target user? Be specific (segment / role / niche).', required: true, weight: 95 },
      differentiation: { key: 'differentiation', question: 'What is your unique differentiation versus existing alternatives?', weight: /competitor|alternative|unique|differen|moat/.test(convoText) ? 90 : 60 },
      alternatives: { key: 'alternatives', question: 'How do users address this problem today (current workaround / competitor)?', weight: /competitor|workaround|current|today/.test(convoText) ? 70 : 55 },
      monetization: { key: 'monetization', question: 'How will this make money (pricing model / revenue path)?', weight: /price|pricing|moneti|revenue|subscription|paid|plan/.test(convoText) ? 85 : 50 },
      scenario: { key: 'scenario', question: 'Describe a primary real-world usage scenario (when, where, how).', weight: /use case|scenario|workflow|flow|journey|example/.test(convoText) ? 65 : 45 },
      successMetric: { key: 'successMetric', question: 'What early metric would signal real traction?', weight: /metric|kpi|measure|retention|activation|engagement|conversion/.test(convoText) ? 75 : 40 }
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
      content: `🤔 ${q.question}${q.required ? ' (required)' : ''}${challengeSuffix}`,
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
      suggestions: complete ? ['Run HyperFlux Analysis', 'Refine my idea based on feedback'] : ['Run HyperFlux Analysis', 'Add more detail', 'Refine my idea based on feedback']
    };
    setMessages(prev => [...prev, summaryMsg]);
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
          content: '🛑 ' + randomResponse,
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
      {/* Unified top header with primary actions */}
      <div className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 py-2">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-muted-foreground">
              {modeRef.current === 'analysis' ? 'Analysis Mode' : modeRef.current === 'refine' ? 'Refinement Mode' : 'Idea Mode'}
            </span>
            {currentIdea && (
              <span className="text-[11px] truncate max-w-[220px] text-muted-foreground/80" title={currentIdea}>
                {currentIdea}
              </span>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            {/* Start / Cancel Analysis or Q&A */}
            {currentIdea && !isAnalyzing && (
              <Button
                size="sm"
                variant="outline"
                onClick={startAnalysis}
                className="h-8 px-3 text-[11px] gap-1.5 shadow-sm bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary"
              >
                <Brain className="h-3.5 w-3.5" />
                {isBriefQAMode ? 'Cancel Q&A' : 'Start Analysis'}
              </Button>
            )}
            {/* Reset */}
            {(currentIdea || messages.length > 1) && !isBriefQAMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCurrentIdea('');
                  setAnalysisProgress(0);
                  setIsAnalyzing(false);
                  setIsRefinementMode(true);
                  setShowStartAnalysisButton(false);
                  setIsBriefQAMode(false);
                  setBrief({
                    problem: '',
                    targetUser: '',
                    differentiation: '',
                    alternatives: '',
                    monetization: '',
                    scenario: '',
                    successMetric: ''
                  });
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
                  toast({
                    title: "Chat Reset",
                    description: "Ready for a new idea!",
                  });
                  emitMode('idea');
                }}
                className="h-8 px-2 sm:px-3 text-[11px] gap-1 shadow-sm hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
          </div>
        </div>
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
                          {msg.metadata?.liveData ? (
                            <div className="space-y-3">
                              <Suspense fallback={<div className='flex items-center gap-2 text-xs text-muted-foreground'><Loader2 className='h-3 w-3 animate-spin' /> Loading live signals…</div>}>
                                {currentIdea && <LiveDataCards idea={currentIdea} />}
                              </Suspense>
                            </div>
                          ) : (
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
                          )}
                        </div>
                      )}
                    </div>
                    
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                          AI-Powered Suggestions:
                        </p>
                        <SuggestionList
                          suggestions={msg.suggestions.map((s, idx) => ({
                            id: `${msg.id}-sugg-${idx}`,
                            text: s,
                            category: classifySuggestionCategory(s)
                          }))}
                          onSelect={(suggestion) => handleSuggestionSelection(msg, suggestion)}
                          maxHeight={280}
                          ideaMode={modeRef.current === 'idea'}
                        />
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
          {/* Analysis action banner removed (moved to top bar) */}

          {/* Drawer brief form removed in favor of inline Q&A */}
          
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
            {/* Removed AI button - now in top bar */}
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
      {/* Legacy brief drawer removed */}
    </div>
  );
}