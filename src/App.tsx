import { useEffect, useState, lazy, Suspense } from 'react';
import LoggedOut from '@/pages/LoggedOut';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/EnhancedAuthContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { DataModeProvider } from "@/contexts/DataModeContext";
import { FeatureFlagProvider } from "@/contexts/FeatureFlagContext";
import GlobalAlertCenter from "@/components/feedback/GlobalAlertCenter";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/components/ui/sidebar";
import LandingPage from './pages/LandingPage';
import AppLayout from '@/components/layout/AppLayout';
import StatusAnnouncer from '@/components/accessibility/StatusAnnouncer';
import CommandPalette from '@/components/CommandPalette';
import EngagingLoader from '@/components/engagement/EngagingLoader';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { IdeasInitializer } from '@/components/IdeasInitializer';
import IdeaJournal from './pages/IdeaJournal';
import Homepage from './pages/Homepage';

// Lazy load only heavy pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Hub = lazy(() => import('./pages/Hub'));
const DeepDive = lazy(() => import('./pages/DeepDive'));
const IdeaChat = lazy(() => import('./pages/EnhancedIdeaChatPage'));
const EnterpriseHub = lazy(() => import('./pages/EnterpriseHub'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Settings = lazy(() => import('./pages/Settings'));
const Logout = lazy(() => import('./pages/Logout'));
const Documentation = lazy(() => import('./pages/Documentation'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PublicLeaderboard = lazy(() => import('./pages/PublicLeaderboard'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const OwnedIdeas = lazy(() => import('./pages/OwnedIdeas'));

const RouteTransitionWrapper = () => {
  const location = useLocation();
  return (
    <div className="flex-1 flex flex-col">
      <Routes>
        <Route path="/logged-out" element={<LoggedOut />} />
        <Route path="/" element={<ProtectedRoute requireAuth={false}><LandingPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><LeaderboardPage /></Suspense>} />
        <Route path="/logout" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><Logout /></Suspense>} />
        <Route path="/documentation" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><Documentation /></Suspense>} />
        {/*
         * The deep-dive analysis view renders detailed market insights for a user's idea.
         * Because this page surfaces personalized data, it should only be accessible
         * to authenticated users. Previously it was available without authentication,
         * which resulted in an empty page and confusing UX. Wrapping it in
         * ProtectedRoute ensures non‑signed‑in visitors are redirected to the
         * auth flow before accessing the deep-dive.
         */}
        <Route
          path="/deep-dive"
          element={
            <ProtectedRoute>
              <Suspense fallback={<EngagingLoader active={true} scope='generic' />}>
                <DeepDive />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Protected routes with shared layout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/home" element={<Homepage />} />
          <Route path="/dashboard" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><Dashboard /></Suspense>} />
          <Route path="/hub" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><Hub /></Suspense>} />
          <Route path="/ideachat" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><IdeaChat /></Suspense>} />
          <Route path="/ideajournal" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><IdeaJournal /></Suspense>} />
          <Route path="/owned-ideas" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><OwnedIdeas /></Suspense>} />
          <Route path="/ai-insights" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><AIInsights /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><Settings /></Suspense>} />
          <Route path="/pricing" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><Pricing /></Suspense>} />
          <Route path="/subscription-success" element={<Homepage />} />
        </Route>
        <Route path="*" element={<Suspense fallback={<EngagingLoader active={true} scope='generic' />}><NotFound /></Suspense>} />
      </Routes>
    </div>
  );
};

const queryClient = new QueryClient();

// Gate rendered inside AuthProvider so normal hook usage is safe
const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized } = useAuth();
  return (
    <div id="main" className="relative z-10 min-h-screen flex flex-col">
      {!initialized && <EngagingLoader active={true} scope='auth' />}
      {initialized && children}
    </div>
  );
};

const App = () => {
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
      // Shift+D toggle main dashboard (prefer /home, fallback /dashboard)
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const selectorOrder = [
          'a[href="/home"]',
          'a[href="/dashboard"]',
        ];
        for (const sel of selectorOrder) {
          const link = document.querySelector(sel) as HTMLAnchorElement | null;
            if (link) { link.click(); break; }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <SessionProvider>
              <SidebarProvider>
                <TooltipProvider>
              <ThemeProvider>
                    <DataModeProvider>
                      <FeatureFlagProvider>
                        <div className="app-root-shell">
                          {/* Ambient decorative layers */}
                          <div className="app-gradient-orbs" aria-hidden="true" />
                          <div className="app-bg-animated" aria-hidden="true" />
                          <div className="app-noise-layer" aria-hidden="true" />
                          <a href="#main" className="sr-only focus:not-sr-only focus-ring-custom absolute left-2 top-2 z-50 bg-background/80 backdrop-fade px-3 py-1 rounded-md text-sm">Skip to content</a>
                          <Toaster />
                          {/* New global alert center */}
                          <GlobalAlertCenter position="top" />
                          <AuthGate>
                            <IdeasInitializer>
                              <RouteTransitionWrapper />
                            </IdeasInitializer>
                          </AuthGate>
                          <StatusAnnouncer message={undefined} />
                          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
                        </div>
                      </FeatureFlagProvider>
                    </DataModeProvider>
                  </ThemeProvider>
                </TooltipProvider>
              </SidebarProvider>
            </SessionProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  </QueryClientProvider>
  );
};

export default App;
