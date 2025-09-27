import { useEffect, useState, useRef } from "react";
import { LS_KEYS } from '@/lib/storage-keys';
import { useNavigate } from "react-router-dom";
import { Suspense, lazy } from 'react';
import { UserMenu } from "@/components/UserMenu";
import { AppSidebar } from "@/components/AppSidebar";
import ResizableSplit from '@/components/layout/ResizableSplit';
const EnhancedPMFDashboard = lazy(() => import('@/components/EnhancedPMFDashboard'));
const HelpSupport = lazy(() => import('@/components/HelpSupport'));

import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSession } from "@/contexts/SessionContext";
import { useAutoSaveSession } from "@/hooks/useAutoSaveSession";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BarChart, Sparkles, CheckCircle, HelpCircle, Activity, Brain, Database, CloudDownload, ListChecks, ChevronUp, ChevronDown } from "lucide-react";
import DashboardRealDataPanel from '@/components/dashboard/DashboardRealDataPanel';
import EngagingLoader from '@/components/engagement/EngagingLoader';
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { currentSession, createSession, sessions, loadSession, isSaving, lastSavedAt, loading: sessionLoading } = useSession();
  const [analysisData, setAnalysisData] = useState<any>(null);
  // dashboard panel toggle state replaced by resizable split ratio
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const sessionCreatedRef = useRef(false);
  const [sessionReloading, setSessionReloading] = useState(false);
  const [showOverlayLoader, setShowOverlayLoader] = useState(false);
  const [sessionLoadProgress, setSessionLoadProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [loaderDetail, setLoaderDetail] = useState<string>('Initializing');
  const factIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Collapsible App Bar
  const [appBarCollapsed, setAppBarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('dashboardAppBarCollapsed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('dashboardAppBarCollapsed', String(appBarCollapsed)); } catch {}
  }, [appBarCollapsed]);

  // Check for analysis data and redirect if not present
  useEffect(() => {
    if (!loading && user && !sessionLoading) {
      // Check for analysis data
      const analysisCompleted = localStorage.getItem(LS_KEYS.analysisCompleted);
      const idea = localStorage.getItem(LS_KEYS.userIdea);
      const metadata = localStorage.getItem(LS_KEYS.ideaMetadata);
      
      // If no analysis data or no idea, redirect to ideachat
      if (!analysisCompleted || analysisCompleted !== 'true' || !idea || !metadata) {
        console.log('No analysis data found, redirecting to ideachat');
        // Small delay to prevent race conditions
        setTimeout(() => {
          navigate('/ideachat', { replace: true });
        }, 100);
      } else {
        // We have analysis data, load it immediately
        try {
          const parsedMetadata = JSON.parse(metadata);
          const answers = localStorage.getItem(LS_KEYS.userAnswers);
          const pmfAnalysisData = localStorage.getItem('pmfAnalysisData');
          
          let fullMetadata: any = parsedMetadata;
          if (pmfAnalysisData) {
            try {
              const pmfData = JSON.parse(pmfAnalysisData);
              fullMetadata = { ...fullMetadata, ...pmfData };
            } catch (e) {
              console.error('Error parsing PMF data:', e);
            }
          }
          
          if (answers) {
            try {
              fullMetadata.answers = JSON.parse(answers);
            } catch (e) {
              fullMetadata.answers = {};
            }
          }
          
          setAnalysisData({ idea, metadata: fullMetadata });
        } catch (e) {
          console.error('Error loading analysis data:', e);
        }
      }
    }
  }, [loading, user, sessionLoading, navigate]);

  const PRODUCT_FACTS = [
    'Ideas with clear niche focus often reach first 100 users 2x faster.',
    'Refining positioning early can reduce wasted feature dev by ~30%.',
    'Startups that talk to 10 users before building retain 70% more.',
    'A narrow “who it is NOT for” statement accelerates clarity.',
    'User phrased problem statements outperform internal phrasing.',
    'Consistent language in landing + product boosts trust conversion.',
    'Sharpening value prop copy is often higher ROI than a new feature.',
    'Early churn reasons inform your next messaging iteration.',
    'A metric instrumentation plan prevents blind scaling decisions.',
    '“What surprised you?” is a power user interview question.',
    'High-friction onboarding can still win if aha-moment is undeniable.',
    'Retention > Acquisition: PMF signals hide in week 2 usage patterns.',
    'Users rarely lack features; they lack perceived outcomes.',
    'Premium features discovered organically convert better than gating.',
    'A crisp tagline is an artifact of clarity, not a precursor to it.',
  ];

  const LOAD_STAGES = [
    { label: 'Validating auth & context', weight: 8, icon: <Activity className='h-3 w-3 text-primary' /> },
    { label: 'Fetching session record', weight: 22, icon: <Database className='h-3 w-3 text-primary' /> },
    { label: 'Rehydrating conversation', weight: 18, icon: <Brain className='h-3 w-3 text-primary' /> },
    { label: 'Restoring idea + metadata', weight: 16, icon: <CloudDownload className='h-3 w-3 text-primary' /> },
    { label: 'Preparing analysis panels', weight: 14, icon: <BarChart className='h-3 w-3 text-primary' /> },
    { label: 'Stitching UI layout', weight: 12, icon: <ListChecks className='h-3 w-3 text-primary' /> },
    { label: 'Finalizing & polishing', weight: 10, icon: <Sparkles className='h-3 w-3 text-primary' /> },
  ];

  // Simulated progressive loader when session loading flag active
  useEffect(() => {
    const active = sessionLoading || sessionReloading;
    if (active) {
      // Delay showing overlay to prevent flash on ultra-fast operations
      const delay = setTimeout(() => setShowOverlayLoader(true), 220);
      // Reset state
      setSessionLoadProgress(3);
      setLoaderDetail('Initializing');
      let accumulated = 0;
      const totalWeight = LOAD_STAGES.reduce((a, s) => a + s.weight, 0);
      // Sequential staged progress
      let stageIdx = 0;
      stageIntervalRef.current = setInterval(() => {
        if (stageIdx < LOAD_STAGES.length) {
          const stage = LOAD_STAGES[stageIdx];
            accumulated += stage.weight;
            setLoaderDetail(stage.label);
            setSessionLoadProgress(Math.min(97, Math.round((accumulated / totalWeight) * 100)));
            stageIdx++;
        }
      }, 600);
      // Facts rotation every 5s
      factIntervalRef.current = setInterval(() => {
        setFactIndex(prev => (prev + 1) % PRODUCT_FACTS.length);
      }, 5000);
    } else {
      // Complete
      if (sessionLoadProgress > 0) {
        setLoaderDetail('Done');
        setSessionLoadProgress(100);
        const t = setTimeout(() => {
          setSessionLoadProgress(0);
          setLoaderDetail('');
          setShowOverlayLoader(false);
        }, 600);
        return () => clearTimeout(t);
      }
      setShowOverlayLoader(false);
    }
    return () => {
      if (factIntervalRef.current) clearInterval(factIntervalRef.current);
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    };
  }, [sessionLoading, sessionReloading]);

  // Realtime updates: soft-refresh current session data if updated elsewhere
  useEffect(() => {
    if (!user || !currentSession) return;
    const channel = supabase
      .channel('dashboard-session-watch')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'brainstorming_sessions', filter: `id=eq.${currentSession.id}` },
        async () => {
          try {
            setSessionReloading(true);
            await loadSession(currentSession.id);
          } finally {
            setTimeout(() => setSessionReloading(false), 500);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, currentSession, loadSession]);
  
  // Use auto-save hook
  const { saveState, restoreState } = useAutoSaveSession(currentSession?.id || null);
  
  
  // Auto-create session when user starts interacting
  useEffect(() => {
    const handleFirstInteraction = async () => {
      if (!user || sessionCreatedRef.current || currentSession) return;
      
      const idea = localStorage.getItem('userIdea');
      // Create session if user starts typing an idea
      if (idea && idea.length > 5) {
        sessionCreatedRef.current = true;
        const snippet = idea.split(/\s+/).slice(0,6).join(' ');
        await createSession(snippet);
      }
    };

    // Listen for idea changes
    const interval = setInterval(handleFirstInteraction, 1000);
    
    return () => clearInterval(interval);
  }, [user, currentSession, createSession]);

  // Set up real-time session updates with fast reload
  useEffect(() => {
    if (!user) return;

    let rafId: number;
    
    // Fast state reload using requestAnimationFrame
    const fastStateReload = () => {
      const sessionId = localStorage.getItem('currentSessionId');
      const idea = localStorage.getItem('userIdea');
      const answers = localStorage.getItem('userAnswers');
      const metadata = localStorage.getItem('ideaMetadata');
      const analysisCompleted = localStorage.getItem(LS_KEYS.analysisCompleted);
      
      if (sessionId && sessionId !== currentSessionId) {
        setCurrentSessionId(sessionId);
        
        if (idea && analysisCompleted === 'true') {
          const parsedAnswers = answers ? JSON.parse(answers) : {};
          const parsedMetadata = metadata ? JSON.parse(metadata) : {};
          
          // Get PMF analysis data from various sources
          const pmfAnalysisData = localStorage.getItem('pmfAnalysisData');
          const pmfCurrentIdea = localStorage.getItem('pmfCurrentIdea');
          
          // Merge all metadata sources
          let fullMetadata = { ...parsedMetadata };
          
          if (pmfAnalysisData) {
            try {
              const pmfData = JSON.parse(pmfAnalysisData);
              fullMetadata = { ...fullMetadata, ...pmfData };
            } catch (e) {
              console.error('Error parsing PMF analysis data:', e);
            }
          }
          
          // Ensure answers are included
          fullMetadata.answers = parsedAnswers;
          
          setAnalysisData({ 
            idea: pmfCurrentIdea || idea || '', 
            metadata: fullMetadata
          });
          // analysis data will trigger display automatically in analysis-only layout
        }
      }
      
      rafId = window.requestAnimationFrame(fastStateReload);
    };
    
    rafId = window.requestAnimationFrame(fastStateReload);

    const channel = supabase
      .channel('session-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brainstorming_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Session update:', payload);
          // Session list will auto-update via context
        }
      )
      .subscribe();

    return () => {
      window.cancelAnimationFrame(rafId);
      supabase.removeChannel(channel);
    };
  }, [user, currentSessionId]);
  
  // Restore session state when session changes
  useEffect(() => {
    if (currentSession && currentSession.id !== currentSessionId) {
      setCurrentSessionId(currentSession.id);
      restoreState(currentSession);
      
      // Check if we have analysis data to show
      const analysisCompleted = localStorage.getItem(LS_KEYS.analysisCompleted);
      if (analysisCompleted === 'true') {
        const idea = localStorage.getItem(LS_KEYS.userIdea) || localStorage.getItem('userIdea');
        const answers = localStorage.getItem(LS_KEYS.userAnswers) || localStorage.getItem('userAnswers');
        const metadata = localStorage.getItem(LS_KEYS.ideaMetadata) || localStorage.getItem('ideaMetadata');
        const pmfAnalysisData = localStorage.getItem('pmfAnalysisData');
        const pmfCurrentIdea = localStorage.getItem('pmfCurrentIdea');
        
        let fullMetadata: any = {};
        
        // Parse metadata safely
        try {
          fullMetadata = metadata ? JSON.parse(metadata) : {};
        } catch (e) {
          console.error('Error parsing metadata:', e);
        }
        
        // Parse PMF analysis data if available
        if (pmfAnalysisData) {
          try {
            const pmfData = JSON.parse(pmfAnalysisData);
            fullMetadata = { ...fullMetadata, ...pmfData };
          } catch (e) {
            console.error('Error parsing PMF analysis data:', e);
          }
        }
        
        // Parse and include answers
        try {
          fullMetadata.answers = answers ? JSON.parse(answers) : {};
        } catch (e) {
          console.error('Error parsing answers:', e);
          fullMetadata.answers = {};
        }
        
        setAnalysisData({ 
          idea: pmfCurrentIdea || idea || 'Unknown Idea', 
          metadata: fullMetadata
        });
      }
    }
  }, [currentSession, currentSessionId, restoreState]);
  
  useEffect(() => {
    // Redirect to auth if not logged in and not loading
    if (!loading && !user) {
      navigate('/auth', { state: { from: { pathname: '/dashboard' } } });
    }
  }, [user, loading, navigate]);

  // Navigate to desired path after session load without full reload
  useEffect(() => {
    if (!currentSession) return;
    const desired = '/dashboard'; // force canonical route for session view
    if (window.location.pathname !== desired) {
      navigate(desired, { replace: true });
    }
  }, [currentSession, navigate]);

  const handleAnalysisReady = (idea: string, metadata: any) => {
    setAnalysisData({ idea, metadata });
    localStorage.setItem('pmfCurrentIdea', idea);
    localStorage.setItem('userAnswers', JSON.stringify(metadata?.answers || {}));
    localStorage.setItem('ideaMetadata', JSON.stringify(metadata || {}));
    localStorage.setItem(LS_KEYS.analysisCompleted, 'true');
    if (currentSession) saveState(true);
  };

  const handleNewChat = () => {
    try { localStorage.setItem('returnToChat', '1'); } catch {}
    navigate('/ideachat');
  };
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }
  
  // Don't render content if not authenticated
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex w-full bg-background/40 backdrop-fade">
      <AppSidebar onNewChat={handleNewChat} />
      
      <div className="flex-1 flex flex-col h-screen gap-0">
        {/* Header with loading bar */}
        <div
          className={cn(
            "flex items-stretch justify-between px-4 sm:px-6 border-b glass-super-surface sticky top-0 z-40 backdrop-fade transition-all duration-300",
            appBarCollapsed ? 'py-1 h-11' : 'py-3'
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setAppBarCollapsed(c => !c)}
              aria-label={appBarCollapsed ? 'Expand app bar' : 'Collapse app bar'}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border/50 hover:bg-muted/50 transition-colors"
            >
              {appBarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="group flex items-center gap-2 min-w-0">
                <h1
                  className={cn(
                    'text-sm sm:text-base font-semibold cursor-pointer flex-1 min-w-0 text-glow break-words tracking-tight',
                    sessionReloading && 'opacity-70'
                  )}
                  title={currentSession ? `Click to reload session: ${currentSession.name}` : 'No session yet'}
                  onClick={async () => {
                    if (!currentSession) return;
                    try { setSessionReloading(true); await loadSession(currentSession.id); } finally { setTimeout(() => setSessionReloading(false), 600); }
                  }}
                >
                  <span className="inline-block align-top max-w-full truncate [direction:rtl] [unicode-bidi:plaintext]">
                    {(currentSession?.name || 'Session')}
                  </span>
                  {sessionReloading && <Loader2 className='inline-block ml-1 h-4 w-4 animate-spin text-primary align-middle' />}
                </h1>
                {!appBarCollapsed && currentSession && isSaving && (
                  <Loader2 className='h-3 w-3 animate-spin text-muted-foreground' />
                )}
              </div>
              {!appBarCollapsed && (
                <p className='text-[11px] sm:text-xs text-muted-foreground mt-0.5'>
                  Analysis Dashboard
                  {currentSession && (
                    <span className='ml-2 inline-flex items-center gap-1 text-[10px] tracking-wide'>
                      {isSaving ? (
                        <>
                          <Loader2 className='h-3 w-3 animate-spin' />
                          Saving…
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
              )}
            </div>
          </div>
          <div className={cn("flex items-center gap-2 transition-all", appBarCollapsed && 'gap-1')}>
            {!appBarCollapsed && <ThemeToggle />}
            <Button
              onClick={() => { try { localStorage.setItem('returnToChat','1'); } catch {}; navigate('/ideachat'); }}
              variant={appBarCollapsed ? 'ghost' : 'outline'}
              size={appBarCollapsed ? 'icon' : 'sm'}
              className={cn('gap-2', appBarCollapsed && 'h-7 w-7')}
              aria-label="Open Idea Chat"
              title="Open Idea Chat"
            >
              <Brain className="h-4 w-4" />
              {!appBarCollapsed && <span>Idea Chat</span>}
            </Button>
            <div className={cn(appBarCollapsed && 'scale-90 origin-right')}>
              <UserMenu />
            </div>
          </div>
          {sessionLoadProgress > 0 && (
            <div className="absolute left-0 bottom-0 w-full h-px overflow-hidden bg-border/40">
              <div
                className="h-full bg-primary/70 transition-[width] duration-300 ease-out"
                style={{ width: `${sessionLoadProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Analysis Only Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative px-4 py-4 gap-4">
          {showOverlayLoader && <EngagingLoader active={true} scope='dashboard' />}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 overflow-auto">
            <div className="xl:col-span-2 flex flex-col gap-4">
              <div className="rounded-xl glass-super-surface elevation-1 p-4 border">
                <h2 className="text-sm font-semibold mb-1 tracking-wide uppercase text-muted-foreground">Current Session</h2>
                {currentSession ? (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{currentSession.name}</p>
                    <p className="text-xs text-muted-foreground">Last accessed: {new Date(currentSession.last_accessed).toLocaleString()}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No session loaded. Start in Idea Chat.</p>
                )}
                <div className="mt-3">
                  <Button size='sm' variant='outline' onClick={() => { try { localStorage.setItem('returnToChat','1'); } catch {}; navigate('/ideachat'); }}>Open Idea Chat</Button>
                </div>
              </div>
              <div className="rounded-xl glass-super-surface elevation-1 p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">Analysis Dashboard</h2>
                  <Button size='sm' variant='ghost' onClick={() => { try { localStorage.setItem('returnToChat','1'); } catch {}; navigate('/ideachat'); }}>Back to Chat</Button>
                </div>
                <div className="flex-1 overflow-auto">
                  <Suspense fallback={<div className='flex items-center justify-center h-full text-sm text-muted-foreground'>Loading analysis…</div>}>
                    {analysisData ? (
                      <EnhancedPMFDashboard idea={analysisData.idea} userAnswers={analysisData.metadata?.answers || {}} />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="grid gap-6 w-full max-w-2xl px-6">
                          <div className="flex flex-col gap-4">
                            <div className="skeleton h-8 w-64 rounded-md" />
                            <div className="skeleton h-4 w-96 rounded" />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="skeleton h-24 rounded-xl" />
                            <div className="skeleton h-24 rounded-xl" />
                            <div className="skeleton h-24 rounded-xl" />
                          </div>
                          <div className="skeleton h-40 rounded-xl" />
                          <div className="skeleton h-32 rounded-xl" />
                          <p className="text-center text-sm text-muted-foreground">Run an analysis in Idea Chat to see insights here.</p>
                        </div>
                      </div>
                    )}
                  </Suspense>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl glass-super-surface elevation-1 p-4 border">
                <h2 className="text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Tips</h2>
                <ul className="text-xs space-y-2 list-disc pl-4 text-muted-foreground/90">
                  <li>Refine your idea iteratively—small changes compound.</li>
                  <li>Capture user phrasing; reuse it in positioning.</li>
                  <li>Track when clarity increases retention markers.</li>
                </ul>
              </div>
              <DashboardRealDataPanel idea={analysisData?.idea || localStorage.getItem('userIdea') || undefined} />
              <div className="rounded-xl glass-super-surface elevation-1 p-4 border">
                <h2 className="text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">Next Actions</h2>
                <div className="space-y-2 text-xs">
                  <p>- Run competitor differentiation analysis (coming soon)</p>
                  <p>- Attach qualitative interview snippets</p>
                  <p>- Enrich with early adopter segmentation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Help & Support Chat Window */}
      {showHelpSupport && (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.95 }}
          className="fixed bottom-20 left-4 z-50 w-96 h-[500px] bg-background/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-2xl"
        >
          <div className="p-4 border-b border-border/50 flex justify-between items-center">
            <h3 className="font-semibold">Help & Support</h3>
            <Button
              onClick={() => setShowHelpSupport(false)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
          <div className="h-[calc(100%-4rem)]">
            <HelpSupport />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;