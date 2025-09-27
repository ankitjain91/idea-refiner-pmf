import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { LS_KEYS } from '@/lib/storage-keys';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, RotateCcw, Lightbulb, Sparkles, BarChart, Plus, Clock } from 'lucide-react';
import { AIQnAToggle } from '../components/ui/AIQnAToggle';
import { DynamicStatusBar } from './DynamicStatusBar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import EngagingLoader from '@/components/engagement/EngagingLoader';
import { SessionPicker } from '@/components/SessionPicker';
import { cn } from '@/lib/utils';

const ChatGPTStyleChat = lazy(() => import('@/components/ChatGPTStyleChat'));

const IdeaChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentSession, createSession, loadSession, loading: sessionLoading, saving, sessions } = useSession();
  const [chatKey, setChatKey] = useState(0);
  const sessionCreatedRef = useRef(false);
  const [sessionReloading, setSessionReloading] = useState(false);
  const [showOverlayLoader, setShowOverlayLoader] = useState(false);
  const navigate = useNavigate();
  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEYS.analysisCompleted) === 'true'; } catch { return false; }
  });
  // Session picker overlay state
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const sessionDecisionKey = 'pmf.session.decisionMade';
  const [chatMode, setChatMode] = useState<'idea'|'refine'|'analysis'>('idea');
  const [showDashboardLockedHint, setShowDashboardLockedHint] = useState(false);
  // Resizable sidebar width (sessions list vs idea chat)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = localStorage.getItem('ideaChatSidebarWidth');
    const parsed = stored ? parseInt(stored, 10) : 260;
    return isNaN(parsed) ? 260 : parsed;
  });
  const draggingRef = useRef(false);
  // Track whether we were in 'collapsed' visual mode to auto-expand
  const [autoCollapsed, setAutoCollapsed] = useState<boolean>(() => sidebarWidth < 200);

  useEffect(() => {
    try { localStorage.setItem('ideaChatSidebarWidth', String(sidebarWidth)); } catch {}
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const min = 160; // min sidebar width
      const max = Math.min(window.innerWidth - 340, 520); // leave room for chat
      const next = Math.min(Math.max(e.clientX, min), max);
      setSidebarWidth(next);
      // If user drags outward beyond 200 and previously collapsed, toggle to expanded state (visual only)
      if (next >= 200 && autoCollapsed) {
        setAutoCollapsed(false);
      } else if (next < 190 && !autoCollapsed) {
        setAutoCollapsed(true);
      }
    };
    const stop = () => { draggingRef.current = false; document.body.classList.remove('select-none','dragging-col-resize'); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stop);
    };
  }, []);

  // Listen for chat mode changes dispatched from Chat component
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.mode) setChatMode(detail.mode);
    };
    window.addEventListener('chat:mode', handler as any);
    return () => window.removeEventListener('chat:mode', handler as any);
  }, []);

  // Listen for analysis completion (custom event + storage changes)
  useEffect(() => {
    const handleAnalysisComplete = () => {
  try { if (localStorage.getItem(LS_KEYS.analysisCompleted) === 'true') setAnalysisCompleted(true); } catch {}
    };
    window.addEventListener('analysis:completed', handleAnalysisComplete as any);
    const handleStorage = (e: StorageEvent) => {
  if (e.key === LS_KEYS.analysisCompleted) handleAnalysisComplete();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('analysis:completed', handleAnalysisComplete as any);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Restore last conversation state if returning from dashboard
  useEffect(() => {
    const fromDash = localStorage.getItem('returnToChat');
    // If there's a stored desired path (e.g., after session load) and we're not on it, navigate.
    try {
      const desired = localStorage.getItem('sessionDesiredPath');
      if (desired && desired !== window.location.pathname) {
        navigate(desired, { replace: true });
      }
    } catch {}
    if (fromDash === '1') {
      // Clear the flag immediately
      try { localStorage.removeItem('returnToChat'); } catch {}
      // Attempt to rehydrate session + chat history and idea
      const storedSessionId = localStorage.getItem('currentSessionId');
      const chatHistoryRaw = localStorage.getItem('chatHistory');
      const idea = localStorage.getItem('userIdea');
      if (storedSessionId && !currentSession) {
        loadSession(storedSessionId).then(() => {
          // force rerender of chat component to pick up restored history
          setChatKey(k => k + 1);
        }).catch(() => {
          // fallback: still refresh chat component
          setChatKey(k => k + 1);
        });
      } else if (chatHistoryRaw) {
        // Just force chat reload so internal effect rehydrates from localStorage
        setChatKey(k => k + 1);
      }
      if (idea && !currentSession) {
        // Lazy create session if needed when user resumes
        if (!sessionCreatedRef.current && idea.length > 5) {
          sessionCreatedRef.current = true;
          createSession(idea.split(/\s+/).slice(0,6).join(' '));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delay overlay loader to avoid flashing on fast operations
  useEffect(() => {
    const active = sessionLoading || sessionReloading;
    let t: any;
    if (active) {
      t = setTimeout(() => setShowOverlayLoader(true), 220);
    } else {
      setShowOverlayLoader(false);
    }
    return () => t && clearTimeout(t);
  }, [sessionLoading, sessionReloading]);

  // Removed auto-create session on refresh to satisfy requirement
  // After login: ensure sessions list is loaded or create new session for current idea if none exists
  useEffect(() => {
    if (!user || sessionLoading) return;
    if (currentSession) return; // already have one
    const decisionMade = sessionStorage.getItem(sessionDecisionKey);
    if (!decisionMade && sessions && sessions.length > 0) {
      // Show picker instead of auto-loading
      setShowSessionPicker(true);
      return;
    }
    if (!decisionMade && sessions && sessions.length === 0 && !localStorage.getItem('sessionCreateInProgress')) {
      // No prior sessions; create automatically (first-time user)
      if (!sessionCreatedRef.current) {
        sessionCreatedRef.current = true;
        const idea = localStorage.getItem('userIdea') || '';
        const context = idea.trim().length > 5 ? idea.split(/\s+/).slice(0,6).join(' ') : 'Idea Session';
        createSession(context).then(() => sessionStorage.setItem(sessionDecisionKey, 'created')); 
      }
    }
  }, [user, currentSession, sessions, sessionLoading, createSession]);

  const handleSelectExisting = async (id: string) => {
    await loadSession(id);
    try { sessionStorage.setItem(sessionDecisionKey, 'selected'); } catch {}
    setShowSessionPicker(false);
  };

  const handleCreateNew = async () => {
    if (localStorage.getItem('sessionCreateInProgress')) return;
    const idea = localStorage.getItem('userIdea') || '';
    const context = idea.trim().length > 5 ? idea.split(/\s+/).slice(0,6).join(' ') : 'New Idea Session';
    await createSession(context);
    try { sessionStorage.setItem(sessionDecisionKey, 'created'); } catch {}
    setShowSessionPicker(false);
  };

  const handleAnalysisReady = (idea: string, metadata: any) => {
    // Store all necessary data for dashboard
    localStorage.setItem('pmfCurrentIdea', idea);
    localStorage.setItem(LS_KEYS.userIdea, idea);
    localStorage.setItem(LS_KEYS.userAnswers, JSON.stringify(metadata?.answers || {}));
    localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(metadata || {}));
    localStorage.setItem(LS_KEYS.analysisCompleted, 'true');
    try {
      // Upgrade existing grant (if any) or create new
      const raw = localStorage.getItem('dashboardAccessGrant');
      let grant: any = null;
      try { grant = raw ? JSON.parse(raw) : null; } catch { grant = null; }
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      const newNonce = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
      const sessionId = localStorage.getItem('currentSessionId') || null;
      const expiresMs = Date.now() + 10 * 60 * 1000; // 10 minute validity window
      const upgraded = {
        v: 1,
        state: 'granted',
        nonce: newNonce,
        sid: sessionId,
        ts: Date.now(),
        exp: expiresMs
      };
      localStorage.setItem('dashboardAccessGrant', JSON.stringify(upgraded));
    } catch {}
    
    if (metadata?.pmfAnalysis) {
      localStorage.setItem('pmfAnalysisData', JSON.stringify(metadata.pmfAnalysis));
    }
    
    // Notify and navigate
    try {
      window.dispatchEvent(new CustomEvent('analysis:completed', { detail: { idea, metadata } }));
    } catch {}
    navigate('/dashboard');
  };

  const handleNewChat = () => {
    const keys = [
      'currentSessionId','userIdea','userAnswers','userRefinements','ideaMetadata','pmfCurrentIdea','pmfTabHistory','pmfFeatures','pmfAuthMethod','pmfTheme','pmfScreens','chatHistory',LS_KEYS.analysisCompleted
    ];
    keys.forEach(k => localStorage.removeItem(k));
    setChatKey(k => k + 1);
    sessionCreatedRef.current = false;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen flex w-full bg-background/40 backdrop-fade overflow-hidden">
      {/* Resizable Sidebar Wrapper */}
      <div className="relative flex h-screen" style={{ width: sidebarWidth, transition: draggingRef.current ? 'none' : 'width 140ms ease' }}>
        <div className="flex-1 h-full border-r glass-super-surface overflow-hidden">
          <AppSidebar
            onNewChat={handleNewChat}
            className={autoCollapsed ? 'data-[collapsed=true]:w-[72px]' : ''}
            style={{
              width: '100%',
              transition: draggingRef.current ? 'none' : 'width 140ms ease',
            }}
          />
        </div>
      </div>
      {/* Drag Handle sits between sidebar and chat to eliminate gap */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sessions sidebar"
        tabIndex={0}
        onMouseDown={(e) => { draggingRef.current = true; document.body.classList.add('select-none','dragging-col-resize'); e.preventDefault(); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setSidebarWidth(w => Math.max(w - 16, 160));
          if (e.key === 'ArrowRight') setSidebarWidth(w => Math.min(w + 16, 520));
        }}
        className="relative z-20 h-screen w-1.5 cursor-col-resize group flex items-stretch"
        style={{
          // prevent accidental text selection overlay issues
          background: 'linear-gradient(to bottom, hsl(var(--primary)/0.55), hsl(var(--primary)/0.25))'
        }}
      >
        <div className="flex-1 bg-primary/20 group-hover:bg-primary/30 transition-colors" />
        <div className="absolute inset-y-0 left-0 right-0 w-full opacity-0 group-hover:opacity-80 transition-opacity" />
      </div>
      <div className="flex-1 flex flex-col h-screen">
        <div className="flex flex-col gap-1 px-6 py-3 border-b glass-super-surface sticky top-0 z-40">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1
                className={cn('text-lg font-semibold flex items-center gap-3', sessionReloading && 'opacity-70')}
              >
                <span className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-400" />
                  <span>{currentSession?.name || 'Idea Chat'}</span>
                  {currentSession && (
                    <span className='ml-2 inline-flex items-center gap-1 text-[10px] tracking-wide text-muted-foreground'>
                      {isSaving ? (
                        <>
                          <Loader2 className='h-3 w-3 animate-spin' /> Saving…
                        </>
                      ) : lastSavedAt ? (
                        <>
                          <span className='inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
                          Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : null}
                    </span>
                  )}
                </span>
                {sessionReloading && <Loader2 className='h-4 w-4 animate-spin text-primary' />}
              </h1>
              <p className='text-xs text-muted-foreground'>Brainstorm · Refine · Analyze</p>
            </div>
          </div>
            <div className='flex items-center gap-2'>
              <ThemeToggle />
              {/* Dashboard button removed – dashboard access now lives inside chat after analysis completion */}
              <UserMenu />
            </div>
          </div>
          {/* Idea focus utility bar */}
          <div className="flex items-center gap-3 text-[11px] flex-wrap">
            <Button
              size="sm"
              variant="default"
              className="h-8 px-3 text-[11px] gap-1.5 font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 shadow-sm hover:shadow-md transition-all duration-200"
              onClick={() => window.dispatchEvent(new CustomEvent('analysis:openBrief'))}
              title="Run comprehensive PMF analysis"
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              <span className="hidden sm:inline">Start Analysis</span>
              <span className="sm:hidden">Analyze</span>
            </Button>
            <DynamicStatusBar />
          </div>
        </div>
        <div className='flex-1 relative p-2'>
          {showOverlayLoader && <EngagingLoader active={true} scope='dashboard' />}
          {showSessionPicker && !currentSession && (
            <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/70">
              <div className="w-full max-w-lg mx-auto rounded-xl glass-super-surface border p-5 shadow-xl animate-in fade-in slide-in-from-top-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-400" /> Pick a Session</h2>
                    <p className="text-xs text-muted-foreground mt-1">Select a previous brainstorming session or start a fresh one.</p>
                  </div>
                </div>
                <div className="max-h-72 overflow-auto pr-1 space-y-2">
                  {(!sessions || sessionLoading) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…</div>
                  )}
                  {sessions && sessions.length > 0 && sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectExisting(s.id)}
                      className="w-full text-left group rounded-lg border border-border/60 hover:border-primary/50 hover:bg-primary/5 px-3 py-2 transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-primary/15 text-[10px] text-primary group-hover:bg-primary/25">{s.name?.charAt(0) || 'S'}</span>
                          <span className="truncate max-w-[240px]" title={s.name}>{s.name || 'Untitled Session'}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(s.last_accessed).toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Open</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-5">
                  <Button size="sm" variant="outline" onClick={handleCreateNew} className="gap-1"><Plus className="h-3 w-3" /> New Session</Button>
                  <div className="text-[10px] text-muted-foreground">You can always switch later from the sidebar.</div>
                </div>
              </div>
            </div>
          )}
          <div className='absolute inset-0 flex flex-col'>
            <Suspense fallback={<div className='flex-1 flex items-center justify-center'><Loader2 className='h-6 w-6 animate-spin' /></div>}>
              <div className='flex-1 m-2 rounded-xl glass-super-surface elevation-1 overflow-hidden'>
                <ChatGPTStyleChat key={chatKey} onAnalysisReady={handleAnalysisReady} />
              </div>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdeaChatPage;

