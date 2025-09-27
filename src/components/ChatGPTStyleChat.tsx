// Minimal rebuilt ChatGPTStyleChat (v2) — fixed syntax & missing refs
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

// --- small helpers ---
const estimateTokens = (t: string) => Math.ceil(t.length / 4);
const MAX_TOKENS = 6000;
const WELCOME_SUGGESTIONS = [
  'AI nutrition coach for busy parents',
  'Marketplace for renting high-end cameras',
  'Privacy-first personal CRM',
  'Automated code review assistant'
];
const DASHBOARD_PATTERNS = [/^show\s+dashboard/i,/^view\s+dashboard/i,/^open\s+dashboard/i,/^see\s+(my\s+)?analysis/i,/^dashboard$/i];
const CHAT_HISTORY_KEY = 'pmf.chat.history.v1';

export default function ChatGPTStyleChat({ onAnalysisReady, showDashboard, className }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentSession, createSession } = useSession();
  const navigate = useNavigate();

  // state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentIdea, setCurrentIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [isRefinementMode, setIsRefinementMode] = useState(false);

  // refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  // utils
  const startTyping = (status: string) => Date.now();
  const stopTyping = async (_startedAt: number) => {};
  const classifySuggestionCategory = () => 'General';
  const scheduleIdle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 1));

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
    if (!idea) return;
    try {
      const { data } = await supabase.functions.invoke('generate-session-title', { body: { idea } });
      if (data?.title) {
        const title = data.title.trim();
        localStorage.setItem('sessionTitle', title);
        window.dispatchEvent(new CustomEvent('sessionTitleGenerated', { detail: title }));
      }
    } catch (e) { console.error('title gen', e); }
  }, []);

  // welcome
  useEffect(() => {
    if (!messages.length) {
      setMessages([{ id: 'welcome', type: 'system', timestamp: new Date(), content: "👋 Welcome! Describe your product idea (or click a suggestion) and we'll refine it together.", suggestions: WELCOME_SUGGESTIONS }]);
    }
  }, [messages.length]);

  // auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // restore chat
  useEffect(() => {
    if (initializedRef.current) return;
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (raw) {
        const parsed: Message[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.map(m => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp as any) : new Date() })));
        }
      }
    } catch {}
    initializedRef.current = true;
    inputRef.current?.focus();
  }, []);

  // persist chat
  useEffect(() => {
    try {
      const compact = messages.slice(-200).map(m => ({ ...m, timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp }));
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(compact));
      localStorage.setItem('chatHistory', JSON.stringify(compact));
    } catch {}
  }, [messages]);

  // suggestion click
  const handleSuggestion = async (s: string) => {
    if (/Open Dashboard|View Dashboard/i.test(s)) { triggerDashboardOpen(); return; }
    if (/Start Analysis/i.test(s)) { startAnalysis(); return; }
    setInput(s.replace(/^[\p{Emoji}\p{Extended_Pictographic}]+\s*/u,''));
    inputRef.current?.focus();
  };

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
      const { personas, pains } = derivePersonasAndPains(messages);
      const { keywords } = extractKeywordFrequencies(messages);
      const pricing = parsePricingHints(messages);
      const raw = localStorage.getItem(LS_KEYS.ideaMetadata); const base = raw ? JSON.parse(raw) : {};
      base.derived = { personas, pains, keywordFrequencies: keywords, pricing };
      localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(base));
      setMessages(p => [...p, { id: `regen-${Date.now()}`, type: 'system', timestamp: new Date(), content: `✅ Updated insights (Personas: ${personas.length}).`, suggestions: ['Open Dashboard','Refine further'] }]);
    } catch { toast({ title: 'Regeneration failed', description: 'Could not refresh derived insights.' }); }
  };

  const runAnalysis = async () => {
    if (!currentIdea) return; setIsAnalyzing(true); setAnalysisProgress(5);
    setMessages(p => [...p, { id: `analysis-start-${Date.now()}`, type: 'system', timestamp: new Date(), content: '🔍 Running analysis...' }]);
    try {
      const pruned = pruneContext(messages.filter(m => m.type !== 'system'));
      const ctx = pruned.map(m => m.content).join('\n');
      const result: AnalysisResult = await runEnterpriseAnalysis(
        { brief: { problem: currentIdea }, idea: currentIdea, conversationContext: ctx },
        update => setAnalysisProgress(5 + Math.round(update.pct * 0.9))
      );
      setAnalysisCompleted(true);
      setMessages(p => [...p, { id: `analysis-done-${Date.now()}`, type: 'bot', timestamp: new Date(), content: '✅ Analysis ready. View dashboard or keep refining.', suggestions: ['Open Dashboard','Refine further','Export report'] }]);
      onAnalysisReady?.(currentIdea, result);
    } catch (e) {
      console.error(e); setMessages(p => [...p, { id: `analysis-fail-${Date.now()}`, type: 'bot', timestamp: new Date(), content: '⚠️ Analysis failed – try again.' }]);
    } finally { setIsAnalyzing(false); setAnalysisProgress(0); }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const trimmed = input.trim();
    if (DASHBOARD_PATTERNS.some(r => r.test(trimmed))) { triggerDashboardOpen(); setInput(''); return; }

    const userMessage: Message = { id: `msg-${Date.now()}`, type: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);

    // bootstrap session
    if (!currentSession && user && messages.filter(m => m.type !== 'system').length === 0) {
      createSession(input.split(/\s+/).slice(0,6).join(' '));
    }

    // first idea path
    if (!currentIdea && !isAnalyzing) {
      const looksLikeIdea = input.length > 10 && (input.includes(' ') || input.length > 20);
      if (!looksLikeIdea) {
        const validationMessage: Message = {
          id: `msg-validation-${Date.now()}`,
          type: 'bot',
          content: "😊 I need a bit more to work with. Describe a product or service idea you'd like to explore!",
          timestamp: new Date(),
          suggestions: [ '💡 Start with a problem you personally experience', '💡 Focus on one specific user group', '💡 Keep the first version simple' ]
        };
        setMessages(prev => [...prev, validationMessage]);
        setInput('');
        return;
      }
    }

    // record idea & switch to refinement
    if (!currentIdea) {
      setCurrentIdea(input);
      scheduleIdle(() => generateTwoWordTitle(input));
      setIsRefinementMode(true);
    }
    setInput('');

    // get refinement reply
    setIsLoading(true);
    const startedAt = startTyping('Thinking...');
    try {
      const { data } = await supabase.functions.invoke('idea-chat', { body: { message: `Tell me more about this idea: ${trimmed}`, idea: currentIdea || trimmed, refinementMode: true } });
      let responseContent = '';
      let responseSuggestions: string[] = [];
      if (typeof data === 'string') { try { const parsed = JSON.parse(data); responseContent = parsed.response || parsed.message || data; responseSuggestions = parsed.suggestions || []; } catch { responseContent = data; } }
      else if (data && typeof data === 'object') { responseContent = (data as any).response || (data as any).message || ''; responseSuggestions = (data as any).suggestions || []; }
      if (!responseContent) responseContent = `Let's explore your idea. What aspect would you like to refine first?`;
      const botMessage: Message = { id: `msg-${Date.now()}-bot`, type: 'bot', content: responseContent, timestamp: new Date(), suggestions: responseSuggestions.slice(0,6) };
      setMessages(prev => [...prev, botMessage]);
    } catch (e) {
      console.error('chat error', e);
      setMessages(prev => [...prev, { id: `msg-error-${Date.now()}`, type: 'bot', content: '⚠️ Minor hiccup – try again.', timestamp: new Date() }]);
    } finally { await stopTyping(startedAt); setIsLoading(false); }
  };

  const startAnalysis = () => { if (!isAnalyzing) runAnalysis(); };

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
            LiveDataCards={LiveDataCards}
            onSelectSuggestion={(s: string) => handleSuggestion(s)}
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
