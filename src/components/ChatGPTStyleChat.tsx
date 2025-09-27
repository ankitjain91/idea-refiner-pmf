// Minimal rebuilt ChatGPTStyleChat (v2) under 200 lines
// Scope: idea intake -> refinement -> optional analysis trigger + derived regeneration.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage as Message } from '@/types/chat';
import type { AnalysisResult } from '@/types/analysis';
import { runEnterpriseAnalysis } from '@/lib/analysis-engine';
import { derivePersonasAndPains, extractKeywordFrequencies, parsePricingHints } from '@/lib/idea-extraction';
import { LS_KEYS, LS_UI_KEYS } from '@/lib/storage-keys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SessionContext';
import { cn } from '@/lib/utils';
import { ChatHeader } from './chat/ChatHeader';
import { MessageBubble } from './chat/MessageBubble';
import { ChatInputBar } from './chat/ChatInputBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, ArrowRight, Sparkles } from 'lucide-react';
import LiveDataCards from './LiveDataCards';
import { BRAND } from '@/branding';

interface Props { onAnalysisReady?: (idea: string, metadata: any) => void; showDashboard?: boolean; className?: string; }

const estimateTokens = (t: string) => Math.ceil(t.length / 4);
const MAX_TOKENS = 6000;
const WELCOME_SUGGESTIONS = [
  'AI nutrition coach for busy parents',
  'Marketplace for renting high-end cameras',
  'Privacy-first personal CRM',
  'Automated code review assistant'
];
const DASHBOARD_PATTERNS = [
  /^show\s+dashboard/i,
  /^view\s+dashboard/i,
  /^open\s+dashboard/i,
  /^see\s+(my\s+)?analysis/i,
  /^dashboard$/i
];

export default function ChatGPTStyleChat({ onAnalysisReady, showDashboard, className }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentSession, createSession } = useSession();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentIdea, setCurrentIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [isBriefQAMode, setIsBriefQAMode] = useState(false);
  const [briefQuestionIndex, setBriefQuestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const regenOfferRef = useRef<string>('');
  const briefQuestionsRef = useRef<any[]>([]);
  const briefSuggestionsRef = useRef<Record<string, string[]>>({});
  const vagueAnswerCountsRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);
  const modeRef = useRef('idea');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastIdeaSignatureRef = useRef<string>('');
  const titleGeneratedRef = useRef(false);
  const [typingStatus, setTypingStatus] = useState('');
  const [showStartAnalysisButton, setShowStartAnalysisButton] = useState(false);
  const [isRefinementMode, setIsRefinementMode] = useState(false);
  const [brief, setBrief] = useState<any>({});
  
  // Constants
  const TOKEN_BUDGET = 6000;
  
  // Helper functions
  const emitMode = (mode: string) => {
    modeRef.current = mode;
    try {
      window.dispatchEvent(new CustomEvent('chatMode:changed', { detail: mode }));
      localStorage.setItem('chatMode', mode);
    } catch {}
  };
  
  const validateIdea = (t: string) => t.split(/\s+/).length > 3 && t.length > 15;
  
  const scheduleIdle = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(callback);
    } else {
      setTimeout(callback, 1);
    }
  };
  
  const startTyping = (status: string) => {
    setTypingStatus(status);
    return Date.now();
  };
  
  const classifySuggestionCategory = () => 'General';
  
  const triggerDashboardOpen = () => {
    if (onAnalysisReady) {
      const analysisData = localStorage.getItem(LS_KEYS.analysisData);
      if (analysisData) {
        const parsed = JSON.parse(analysisData);
        onAnalysisReady(currentIdea || parsed.idea, parsed);
      }
    }
    navigate('/dashboard');
  };
  
  const generateTwoWordTitle = useCallback(async (idea: string) => {
    if (!idea || titleGeneratedRef.current) return;
    
    try {
      const { data } = await supabase.functions.invoke('generate-session-title', {
        body: { idea }
      });
      
      if (data?.title) {
        const title = data.title.trim();
        localStorage.setItem('sessionTitle', title);
        window.dispatchEvent(new CustomEvent('sessionTitleGenerated', { detail: title }));
        titleGeneratedRef.current = true;
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }
  }, []);
  
  const handleSuggestionSelection = async (msg: Message, suggestion: string) => {
    if (isLoading) return;
    
    // Handle special actions
    if (suggestion === 'Open Dashboard' || suggestion === 'View Dashboard') {
      triggerDashboardOpen();
      return;
    }
    
    if (suggestion === 'Start Analysis') {
      startAnalysis();
      return;
    }
    
    // Otherwise treat as regular input
    setInput(suggestion);
    await handleSend();
  };

  useEffect(() => {
    if (!messages.length) {
      setMessages([{ id: 'welcome', type: 'system', timestamp: new Date(), content: "👋 Welcome! Describe your product idea (or click a suggestion) and we'll refine it together.", suggestions: WELCOME_SUGGESTIONS }]);
    }
  }, [messages.length]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const validateIdea = (t: string) => t.split(/\s+/).length > 3 && t.length > 15;
  const pruneContext = (msgs: Message[]) => {
    const clone = [...msgs];
    let total = estimateTokens(clone.map(m => m.content).join('\n'));
    while (total > MAX_TOKENS && clone.length > 4) {
      const idx = clone.findIndex(m => m.type !== 'system');
      if (idx === -1) break; clone.splice(idx,1);
      total = estimateTokens(clone.map(m => m.content).join('\n'));
    }
    return clone;
  };

  const regenerateDerived = async () => {
    try {
      // Use full message objects for derivation helpers
      const { personas, pains } = derivePersonasAndPains(messages);
      const { keywords } = extractKeywordFrequencies(messages);
      const pricing = parsePricingHints(messages);
      const raw = localStorage.getItem(LS_KEYS.ideaMetadata); const base = raw ? JSON.parse(raw) : {};
      base.derived = { personas, pains, keywordFrequencies: keywords, pricing };
      localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(base));
      localStorage.setItem('pmf.derived.personas', JSON.stringify(personas));
      localStorage.setItem('pmf.derived.pains', JSON.stringify(pains));
      localStorage.setItem('pmf.derived.keywords', JSON.stringify(keywords));
      localStorage.setItem('pmf.derived.pricing', JSON.stringify(pricing));
      setMessages(p => [...p, { id: `regen-${Date.now()}`, type: 'system', timestamp: new Date(), content: `✅ Updated insights (Personas: ${personas.length}, Keywords: ${keywords.keywords.length}${pricing.avgPrice? ', Avg Price ~$'+Math.round(pricing.avgPrice):''}).`, suggestions: ['Open Dashboard','Refine further'] }]);
    } catch { toast({ title: 'Regeneration failed', description: 'Could not refresh derived insights.' }); }
  };

  const runAnalysis = async () => {
    if (!currentIdea) return; setIsAnalyzing(true); setAnalysisProgress(5);
    setMessages(p => [...p, { id: `analysis-start-${Date.now()}`, type: 'system', timestamp: new Date(), content: '🔍 Running analysis...' }]);
    try {
      const pruned = pruneContext(messages.filter(m => m.type !== 'system'));
      const ctx = pruned.map(m => m.content).join('\n');
      // runEnterpriseAnalysis expects options object per signature
      const result = await runEnterpriseAnalysis(
        { brief: { problem: currentIdea, targetUser: '', differentiation: '', alternatives: '', monetization: '', scenario: '', successMetric: '' }, idea: currentIdea, conversationContext: ctx },
        update => setAnalysisProgress(5 + Math.round(update.pct * 0.9))
      );
      setAnalysisCompleted(true);
      setMessages(p => [...p, { id: `analysis-done-${Date.now()}`, type: 'bot', timestamp: new Date(), content: '✅ Analysis ready. View dashboard or keep refining.', suggestions: ['Open Dashboard','Refine further','Export report'] }]);
      onAnalysisReady?.(currentIdea, result);
    } catch (e) {
      console.error(e); setMessages(p => [...p, { id: `analysis-fail-${Date.now()}`, type: 'bot', timestamp: new Date(), content: '⚠️ Analysis failed – try again.' }]);
    } finally { setIsAnalyzing(false); setAnalysisProgress(0); }
  };

  const sendRefinement = async (text: string) => {
    setIsLoading(true); const tempId = `typing-${Date.now()}`;
    setMessages(p => [...p, { id: tempId, type: 'bot', timestamp: new Date(), content: '', isTyping: true } as any]);
    try {
      const { data } = await supabase.functions.invoke('idea-chat', { body: { message: text, refinementMode: true } });
      let response=''; let sugg: string[] = [];
      if (data) {
        if (typeof data === 'string') { try { const parsed = JSON.parse(data); response = parsed.response || parsed.message || data; sugg = parsed.suggestions || []; } catch { response = data; } }
        else { response = (data as any).response || (data as any).message || ''; sugg = (data as any).suggestions || []; }
      }
      if (!response) response = "Let's keep refining your idea.";
      if (!/^[\p{Emoji}\p{Extended_Pictographic}]/u.test(response)) response = '🤖 '+response;
      setMessages(p => p.filter(m => m.id !== tempId).concat({ id: `bot-${Date.now()}`, type: 'bot', timestamp: new Date(), content: response, suggestions: sugg.slice(0,6) }));
    } catch { setMessages(p => p.filter(m => m.id !== tempId).concat({ id: `err-${Date.now()}`, type: 'bot', timestamp: new Date(), content: '⚠️ Minor hiccup – try again.' })); }
    finally { setIsLoading(false); }
  };

  const maybeOfferRegeneration = (userText: string) => {
    if (!analysisCompleted || userText.length < 60) return;
    const last = messages[messages.length-1];
    if (regenOfferRef.current === last?.id) return;
    if (messages.some(m => m.content.includes('Regenerate Derived Insights'))) return;
    regenOfferRef.current = last?.id || '';
    setMessages(p => [...p, { id: `offer-regen-${Date.now()}`, type: 'system', timestamp: new Date(), content: '🧠 New context detected. Refresh derived personas, pains, keywords & pricing?', suggestions: ['Regenerate Derived Insights','Ignore'] }]);
  };

  // Removed duplicate handleSend - the main implementation is below

  const handleSuggestion = async (s: string) => {
    if (s === 'Regenerate Derived Insights') { await regenerateDerived(); return; }
    if (/Open Dashboard/i.test(s)) { try { window.dispatchEvent(new CustomEvent('dashboard:open')); } catch {} if (showDashboard) navigate('/dashboard'); return; }
    if (/Start Analysis/i.test(s)) { runAnalysis(); return; }
    setInput(s.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u,'')); inputRef.current?.focus();
  };

  const classifySuggestionCategory = () => 'General';

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <ChatHeader isAnalyzing={isAnalyzing} analysisProgress={analysisProgress} />
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 1 && messages[0].id === 'welcome' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Welcome</h2>
            <p className="text-sm mb-4">{messages[0].content}</p>
            <div className="grid gap-2">
              {messages[0].suggestions?.map(s => (
                <Button key={s} variant="outline" className="justify-start" onClick={() => handleSuggestion(s)}>{s}</Button>
              ))}
            </div>
          </Card>
        )}
        {messages.filter(m => m.id !== 'welcome').map(m => (
          <MessageBubble
            key={m.id}
            msg={m}
            typingStatus={''}
            classifySuggestionCategory={classifySuggestionCategory}
            // Provide no-op LiveDataCards to satisfy prop (original component expected it)
            LiveDataCards={React.lazy(() => Promise.resolve({ default: () => null })) as any}
            onSelectSuggestion={(s) => handleSuggestion(s)}
            currentIdea={currentIdea}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t bg-background p-4">
        <ChatInputBar
          input={input}
          setInput={setInput}
          onSend={handleSend}
          disabled={isLoading}
          placeholder={!currentIdea ? 'Describe your product idea...' : isAnalyzing ? 'Analyzing...' : 'Refine or ask something...'}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
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
      content: "🌟 Fresh start, here we go! What's a new idea you'd like to explore? It could be anything - an app, a service, or even just something you wish existed!",
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
  // Restore prior chat messages (if user reloads before analysis)
  useEffect(() => {
    if (chatRestoredRef.current) return;
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (raw) {
        const parsed: Message[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.map(m => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : new Date() })));
          chatRestoredRef.current = true;
        }
      }
    } catch {}
  }, []);
  // Persist chat history (last 200 messages)
  useEffect(() => {
    try {
      const compact = messages.slice(-200).map(m => ({ ...m, timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp }));
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(compact));
      // Backward compatibility: also write to legacy key used by SessionContext
      localStorage.setItem('chatHistory', JSON.stringify(compact));
    } catch {}
  }, [messages]);
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
    // Walk from most recent backwards to capture the latest substantive idea description
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type !== 'user') continue;
      const text = (m.content || '').trim();
      if (!text) continue;
      // Skip trivial greetings / thanks
      if (/^(hi|hello|hey|thanks|thank you|cool|ok|okay|yo)$/i.test(text)) continue;
      const words = text.split(/\s+/);
      const longEnough = words.length >= 3 || text.length >= 18; // relaxed threshold
      const hasVerb = /build|launch|create|make|help|solve|platform|app|tool|service|market|improv/i.test(text);
      if (longEnough || hasVerb) {
        return text;
      }
    }
    // Secondary very relaxed pass: any user message > 12 chars with a space
    const loose = [...messages].filter(m => m.type==='user' && m.content && m.content.length > 12 && m.content.includes(' ')).shift();
    return loose?.content;
  }, [messages]);

  // Single-pass analysis generator using the brief
  const runBriefAnalysis = async () => {
  setIsBriefQAMode(false);
  if (isAnalyzing) return;
  // Guard: ensure we have at least a core idea/problem statement before running analysis
  let primaryIdea = (currentIdea || brief.problem || '').trim();
  if (!primaryIdea) {
    const inferred = inferIdeaFromHistory();
    if (inferred) {
      primaryIdea = inferred.trim();
      // Show preview instead of auto-accepting
      setPendingInferredIdea(primaryIdea);
      const preview: Message = {
        id: `msg-inferred-preview-${Date.now()}`,
        type: 'system',
        content: `🔍 I inferred this idea: “${primaryIdea.slice(0,200)}${primaryIdea.length>200?'…':''}”.\nConfirm or edit before running analysis.`,
        timestamp: new Date(),
        suggestions: ['Confirm inferred idea','Edit idea first','Start Analysis']
      };
      setMessages(prev => [...prev, preview]);
      setIsAnalyzing(false);
      return; // Wait for user confirmation path
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
      // Build aggregated context string from all prior user messages for richer analysis input
      // Build enriched context & derived artifacts
      // Create dual window: recent user lines + mixed role window for deeper nuance
      const userOnlyLines = messages.filter(m=>m.type==='user').map(m=>m.content?.trim()).filter(Boolean) as string[];
      const assistantLines = messages.filter(m=>m.type==='bot').map(m=>m.content?.trim()).filter(Boolean) as string[];
      // Limit to keep payload manageable
      const recentUser = userOnlyLines.slice(-80);
      const recentAssistant = assistantLines.slice(-40);
      // Full mixed window (chronological slice of last 120 messages any type)
      const mixed = messages.slice(-120).map(m => `${m.type==='user'?'U':'A'}: ${(m.content||'').replace(/\s+/g,' ').trim()}`).filter(l=>l.length>3);
      // Truncate by character budget (approx) 8000 chars
      const charBudget = 8000;
      let used = 0;
      const prunedMixed: string[] = [];
      for (const line of mixed) {
        if (used + line.length + 1 > charBudget) break;
        prunedMixed.push(line); used += line.length + 1;
      }
      let conversationContext = [
        '# Conversation Context',
        '## Recent User Statements',
        ...recentUser.slice(-50).map((c,i)=>`U${i+1}: ${c}`),
        '## Assistant Responses (sample)',
        ...recentAssistant.slice(-25).map((c,i)=>`A${i+1}: ${c}`),
        '## Mixed Window',
        ...prunedMixed
      ].join('\n');
      // Token budget pruning (soft ~6k tokens)
      const TOKEN_BUDGET = 6000; // adjustable threshold
      if (estimateTokens(conversationContext) > TOKEN_BUDGET) {
        // Strategy: progressively drop assistant sample, then oldest user lines, then compress mixed
        const segments: { label: string; content: string[] }[] = [
          { label: 'Recent User Statements', content: recentUser.slice(-50) },
          { label: 'Assistant Responses (sample)', content: recentAssistant.slice(-25) },
          { label: 'Mixed Window', content: prunedMixed }
        ];
        const rebuild = () => [
          '# Conversation Context',
          '## Recent User Statements',
          ...segments[0].content.map((c,i)=>`U${i+1}: ${c}`),
          '## Assistant Responses (sample)',
          ...segments[1].content.map((c,i)=>`A${i+1}: ${c}`),
          '## Mixed Window',
          ...segments[2].content
        ].join('\n');
        let safety = 12;
        while (estimateTokens(conversationContext = rebuild()) > TOKEN_BUDGET && safety-- > 0) {
          // Drop assistant lines first
          if (segments[1].content.length > 5) segments[1].content.splice(0,5);
          else if (segments[0].content.length > 20) segments[0].content.splice(0,5);
          else if (segments[2].content.length > 40) segments[2].content.splice(0,10);
          else break; // can't reduce further without losing recency
        }
        if (estimateTokens(conversationContext) > TOKEN_BUDGET) {
          conversationContext += '\n[Context truncated due to token budget]';
        }
      }
      const { personas, pains } = derivePersonasAndPains(messages);
      const { keywords } = extractKeywordFrequencies(messages, 40);
      const pricingHints = parsePricingHints(messages);
      const result: AnalysisResult = await runEnterpriseAnalysis({ brief, idea: primaryIdea || 'Untitled Idea', conversationContext }, (update) => {
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
      localStorage.setItem(LS_KEYS.analysisCompleted, 'true');
      localStorage.setItem(LS_KEYS.pmfScore, String(pmfScore));
  // Persist inferred or current idea
  localStorage.setItem(LS_KEYS.userIdea, primaryIdea || currentIdea);
      localStorage.setItem(LS_KEYS.userAnswers, JSON.stringify(brief));
      setAnalysisCompletedFlag(true);
      const metadata = { 
        ...result.pmfAnalysis,
        meta: result.meta,
        answers: brief,
        conversationContext,
        derived: {
          personas,
          pains,
            keywordFrequencies: keywords,
          pricing: pricingHints
        }
      };
      localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(metadata));
      // Persist personas & pricing hints separately for quick dashboard access (optional lightweight keys)
      try {
        localStorage.setItem('pmf.derived.personas', JSON.stringify(personas));
        localStorage.setItem('pmf.derived.pains', JSON.stringify(pains));
        localStorage.setItem('pmf.derived.keywords', JSON.stringify(keywords));
        localStorage.setItem('pmf.derived.pricing', JSON.stringify(pricingHints));
      } catch {}
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
          "🧩 What problem do you see around you that needs solving? That could be your next big idea!",
          "💭 Every great business starts with solving a real problem. What's something that frustrates you or others?",
          "🔥 I can sense you have ideas brewing! What's something you wish existed to make life easier?",
          "🎨 Let your creativity flow! What's a product or service you think the world needs?"
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
    }

    // If user significantly edits conversation (long message) after analysis completed -> offer regenerate derived insights
    try {
      if (analysisCompletedFlag && trimmed.length > 60) {
        const alreadyOffered = messages.some(m => m.content?.includes('Regenerate Derived Insights'));
        if (!alreadyOffered) {
          const regenMsg: Message = {
            id: `msg-offer-regen-${Date.now()}`,
            type: 'system',
            content: '🧠 You added substantial new context. Want to refresh personas, pains, keyword frequencies & pricing hints?',
            timestamp: new Date(),
            suggestions: ['Regenerate Derived Insights','Ignore']
          };
          setMessages(prev => [...prev, regenMsg]);
        }
      }
    } catch {}
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
        title: "Oops!",
        description: "Couldn't get a response right now. Let's give it another shot! 🔄",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

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

  const fetchBriefSuggestions = (reset?: boolean) => {
    // Placeholder for brief suggestions
    if (reset) {
      briefSuggestionsRef.current = {};
    }
  };
  
  const updateBriefSuggestions = (suggestions: Record<string, string[]>) => {
    briefSuggestionsRef.current = suggestions;
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
  
  const summarizeBriefAndOfferAnalysis = () => {
    // Placeholder for brief summary
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

  return (
    <div ref={chatContainerRef} className={cn("flex flex-col h-full bg-background relative", className)}>
      {/* Header with Progress (refactored) */}
      <ChatHeader isAnalyzing={isAnalyzing} analysisProgress={analysisProgress} />

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
  <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInputBar
            input={input}
            setInput={setInput}
            onSend={handleSend}
            disabled={isLoading}
            placeholder={!currentIdea ? 'Describe your product idea...' : isAnalyzing ? 'Type your answer...' : 'Ask a follow-up question...'}
            inputRef={inputRef}
          />
        </div>
      </div>
    </div>
  );
}