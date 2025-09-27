import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, RotateCcw, Lightbulb, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import EngagingLoader from '@/components/engagement/EngagingLoader';
import { cn } from '@/lib/utils';

const ChatGPTStyleChat = lazy(() => import('@/components/ChatGPTStyleChat'));

const IdeaChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentSession, createSession, loadSession, loading: sessionLoading, isSaving, lastSavedAt } = useSession();
  const [chatKey, setChatKey] = useState(0);
  const sessionCreatedRef = useRef(false);
  const [sessionReloading, setSessionReloading] = useState(false);
  const [showOverlayLoader, setShowOverlayLoader] = useState(false);
  const navigate = useNavigate();
  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(() => {
    try { return localStorage.getItem('analysisCompleted') === 'true'; } catch { return false; }
  });
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

  // Listen for analysis completion (custom event + storage changes)
  useEffect(() => {
    const handleAnalysisComplete = () => {
      try { if (localStorage.getItem('analysisCompleted') === 'true') setAnalysisCompleted(true); } catch {}
    };
    window.addEventListener('analysis:completed', handleAnalysisComplete as any);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'analysisCompleted') handleAnalysisComplete();
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

  const handleAnalysisReady = (idea: string, metadata: any) => {
    // Chat component already stores needed localStorage artifacts
    // After analysis we navigate user to dashboard to view results
    try {
      window.dispatchEvent(new CustomEvent('analysis:completed', { detail: { idea } }));
    } catch {}
    navigate('/dashboard');
  };

  const handleNewChat = () => {
    const keys = [
      'currentSessionId','userIdea','userAnswers','userRefinements','ideaMetadata','pmfCurrentIdea','pmfTabHistory','pmfFeatures','pmfAuthMethod','pmfTheme','pmfScreens','chatHistory','analysisCompleted'
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
                className={cn('text-lg font-semibold cursor-pointer flex items-center gap-3 group', sessionReloading && 'opacity-70')}
                title={currentSession ? `Reload session: ${currentSession.name}` : 'No session yet'}
                onClick={async () => {
                  if (!currentSession) return;
                  try {
                    setSessionReloading(true);
                    await loadSession(currentSession.id);
                    setChatKey(k => k + 1);
                  } finally {
                    setTimeout(() => setSessionReloading(false), 600);
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <span>{currentSession?.name || 'Idea Chat'}</span>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium relative gap-1 transition-all duration-200"
                    title="Idea Mode"
                  >
                    <Lightbulb className='h-3.5 w-3.5 text-yellow-400' />
                    {/* Text hidden on narrow screens to become icon-only pill */}
                    <span className="hidden sm:inline">Idea Mode</span>
                  </span>
                </span>
                {sessionReloading && <Loader2 className='h-4 w-4 animate-spin text-primary' />}
              </h1>
              <p className='text-xs text-muted-foreground'>Brainstorm · Refine · Analyze
                {currentSession && (
                  <span className='ml-2 inline-flex items-center gap-1 text-[10px] tracking-wide'>
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
              </p>
            </div>
          </div>
            <div className='flex items-center gap-2'>
              <ThemeToggle />
              <TooltipProvider delayDuration={50}>
                <Tooltip open={showDashboardLockedHint} onOpenChange={(o) => { if (!analysisCompleted) setShowDashboardLockedHint(o); }}>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={analysisCompleted ? 'outline' : 'secondary'}
                      onClick={() => {
                        if (analysisCompleted) {
                          navigate('/dashboard');
                        } else {
                          setShowDashboardLockedHint(true);
                          setTimeout(() => setShowDashboardLockedHint(false), 2200);
                        }
                      }}
                      aria-disabled={!analysisCompleted}
                      className={'gap-1 transition-colors ' + (!analysisCompleted ? 'opacity-50 grayscale' : '')}
                    >
                      <ArrowRight className='h-4 w-4' />
                      <span className='hidden sm:inline'>View Dashboard</span>
                    </Button>
                  </TooltipTrigger>
                  {!analysisCompleted && (
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      Complete the brief & run analysis to enable the dashboard.
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <UserMenu />
            </div>
          </div>
          {/* Idea focus utility bar */}
          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            <Button
              size="icon"
              variant="outline"
              className='h-7 w-7 shrink-0'
              onClick={() => window.dispatchEvent(new Event('chat:reset'))}
              aria-label='Reset brainstorming'
              title='Reset'
            >
              <RotateCcw className='h-3.5 w-3.5' />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className='h-7 w-7 shrink-0'
              onClick={() => window.dispatchEvent(new CustomEvent('analysis:openBrief'))}
              aria-label='Start Brief'
              title='Brief'
            >
              <Sparkles className='h-3.5 w-3.5' />
            </Button>
            <span className='text-muted-foreground hidden sm:inline'>Refine until confident, then analyze.</span>
          </div>
        </div>
        <div className='flex-1 relative p-2'>
          {showOverlayLoader && <EngagingLoader active={true} scope='dashboard' />}
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
