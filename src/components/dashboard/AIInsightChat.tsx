import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Sparkles, Brain, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

interface AIInsightChatProps {
  idea: string;
  metadata: any;
  className?: string;
  planTrigger?: number; // when this changes, auto-send plan prompt
}

const SYSTEM_BASE = `You are an expert product strategist and PMF analyst.
You have structured analysis data about a user's startup idea. Answer with:
- Clear, concise, high-signal insights
- Bullet lists when enumerating
- Tactical recommendations referencing data
If user asks for a summary, produce a crisp one-liner, then key bullets.
Never hallucinate unknown metrics; if absent say you lack evidence.`;

export const AIInsightChat: React.FC<AIInsightChatProps> = ({ idea, metadata, className, planTrigger }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'sys-1', role: 'system', content: `Loaded analysis for: "${idea}". Ask me anything about audience, risks, competitors, differentiation, monetization, or quick wins.`, createdAt: Date.now() }
  ]);
  const [input, setInput] = useState('What are the three riskiest assumptions?');
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [planStreamingId, setPlanStreamingId] = useState<string | null>(null); // track strategic plan stream
  const [lastPlanCompletedAt, setLastPlanCompletedAt] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingId]);

  const sendMessage = async (content: string, { overrideInputClear = true, plan = false } = {}) => {
    if (!content.trim() || loading) return;
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content, createdAt: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Prepare lightweight context – limit size
    const contextSummary = {
      pmfScore: metadata?.pmfScore || metadata?.meta?.pmfScore,
      competitors: (metadata?.competitors || []).slice(0,5).map((c: any) => ({ name: c.name, strengths: c.strengths, weaknesses: c.weaknesses })),
      refinements: (metadata?.refinements || []).slice(0,6),
      audience: metadata?.audience?.primary || metadata?.audience,
      scoreBreakdown: metadata?.scoreBreakdown,
    };

    try {
      const streamUrl = `${(supabase as any).restUrl || ''}/functions/v1/idea-chat`;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
  const partialId = `a-${Date.now()}`;
      setStreamingId(partialId);
  if (plan) setPlanStreamingId(partialId);
      setMessages(prev => [...prev, { id: partialId, role: 'assistant', content: '', createdAt: Date.now() }]);

      const resp = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-stream': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          message: content,
          idea,
          conversationHistory: messages.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' : (m.role === 'user' ? 'user' : 'system'), content: m.content })),
          refinementMode: true, // ensures structured challenge style
          analysisContext: { brief: metadata?.answers || {} },
          systemPrompt: SYSTEM_BASE + `\nDATA JSON:` + JSON.stringify(contextSummary)
        })
      });
      if (!resp.ok || !resp.body) throw new Error('Stream failed');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        chunk.split('\n').forEach(line => {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (!payload) return;
            try {
              const evt = JSON.parse(payload);
              if (evt.type === 'token') {
                accumulated += evt.token;
                setMessages(prev => prev.map(msg => msg.id === partialId ? { ...msg, content: accumulated } : msg));
              } else if (evt.type === 'final') {
                if (evt.response) accumulated = evt.response;
                setMessages(prev => prev.map(msg => msg.id === partialId ? { ...msg, content: accumulated } : msg));
              }
            } catch {}
          }
        });
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.map(m => m.id === streamingId ? { ...m, content: '⚠️ Stream interrupted. Try again.' } : m));
    } finally {
      if (planStreamingId && streamingId === planStreamingId) {
        setLastPlanCompletedAt(Date.now());
        setPlanStreamingId(null);
      }
      setStreamingId(null);
      setLoading(false);
    }
  };

  const ask = () => {
    if (!input.trim()) return; 
    return sendMessage(input.trim());
  };

  // Auto strategic plan injection when planTrigger changes
  useEffect(() => {
    if (!planTrigger) return;
    const strategicPrompt = `Create a crisp, data-aware strategic execution plan for the startup idea "${idea}".
Return:
1. One-line positioning
2. Top 3 high-risk assumptions (why risky + how to test)
3. 30-day validation roadmap (week by week)
4. Core metrics (activation, retention, leading indicator)
5. Smallest viable wedge to launch
6. 3 experiment ideas (format: experiment, goal metric, success threshold)
Be concise. Use bullet points. No fluff.`;
    // Avoid duplicate if last user message is identical
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser && lastUser.content === strategicPrompt) return;
    sendMessage(strategicPrompt, { overrideInputClear: false, plan: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planTrigger]);

  const resetChat = () => {
    setMessages([{ id: 'sys-reset', role: 'system', content: `Fresh context loaded for: "${idea}". Ask about risks, moat, validation, monetization, or next experiments.`, createdAt: Date.now() }]);
  };

  return (
    <div className={cn('flex flex-col h-full rounded-xl border glass-super-surface overflow-hidden', className)}>
      <div className='px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 bg-background/60 backdrop-blur-sm'>
        <div className='flex items-center gap-3 min-w-0'>
          <div className='flex items-center gap-2 text-sm font-medium'>
            <Brain className='h-4 w-4 text-primary' /> AI Insight Chat
          </div>
          {planStreamingId && streamingId === planStreamingId && (
            <span className='inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 animate-pulse'>
              <Sparkles className='h-3 w-3' /> Generating Plan
            </span>
          )}
          {!planStreamingId && lastPlanCompletedAt && Date.now() - lastPlanCompletedAt < 16000 && (
            <span className='inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'>
              <Sparkles className='h-3 w-3' /> Plan Ready
            </span>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Button size='sm' variant='ghost' onClick={resetChat} disabled={loading} className='h-7 px-2 text-xs'><Trash2 className='h-3.5 w-3.5' /></Button>
        </div>
      </div>
      <div ref={containerRef} className='flex-1 overflow-y-auto p-4 space-y-4 soft-scroll'>
        {messages.map(m => {
          const isStream = m.id === streamingId && !m.content;
          const isPlanStream = isStream && planStreamingId === streamingId;
          return (
            <div key={m.id} className={cn('text-sm leading-relaxed whitespace-pre-wrap',
              m.role === 'user' ? 'ml-auto max-w-[78%] rounded-lg bg-primary/15 px-3 py-2 shadow-sm' :
              m.role === 'assistant' ? 'mr-auto max-w-[82%] rounded-lg bg-muted/40 px-3 py-2 shadow-sm' :
              'mx-auto max-w-[85%] text-muted-foreground text-xs italic')}
            >
              {m.content || (isStream ? (
                <span className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' /> {isPlanStream ? 'Drafting strategic plan…' : 'Thinking…'}
                </span>
              ) : null)}
            </div>
          );
        })}
      </div>
      <div className='border-t p-3 bg-background/60 backdrop-blur-sm'>
        <div className='flex gap-2 items-end'>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='Ask about risks, differentiation, next experiments…'
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
            rows={1}
            className='flex-1 resize-none text-sm rounded-md bg-muted/40 focus:bg-background border border-transparent focus:border-border px-3 py-2 outline-none'
          />
          <Button size='sm' onClick={ask} disabled={loading || !input.trim()} className='h-9 px-3 gap-1'>
            {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
            <span className='hidden md:inline text-[11px] font-medium'>Send</span>
          </Button>
        </div>
        <div className='mt-2 flex flex-wrap gap-2'>
          {['Key risks','Differentiation','Monetization options','Fast validation experiment','Ideal early adopters'].map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); ask(); }}
              className='text-[10px] px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors'
            >{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIInsightChat;
