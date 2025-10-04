// React must be imported BEFORE any React.lazy() calls to avoid TDZ errors
import React, { useEffect, useState, lazy, Suspense } from 'react';
// Keep LoggedOut eagerly loaded (tiny page needed for auth edge cases)
import LoggedOut from '@/pages/LoggedOut';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/EnhancedAuthContext";
import { SessionProvider } from "@/contexts/SimpleSessionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { DataModeProvider } from "@/contexts/DataModeContext";
import { FeatureFlagProvider } from "@/contexts/FeatureFlagContext";
import GlobalAlertCenter from "@/components/feedback/GlobalAlertCenter";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/components/ui/sidebar";

// Eager lightweight pages / critical shell
import LandingPage from './pages/LandingPage';

// Lazy heavy pages for code-splitting
const EnterpriseHub = lazy(() => import('./pages/EnterpriseHub'));
const Hub = lazy(() => import('./pages/Hub'));
const DeepDive = lazy(() => import('./pages/DeepDive'));
const IdeaChat = lazy(() => import('./pages/EnhancedIdeaChatPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const IdeaJournal = lazy(() => import('./pages/IdeaJournal'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Settings = lazy(() => import('./pages/Settings'));
const Logout = lazy(() => import('./pages/Logout'));
const Documentation = lazy(() => import('./pages/Documentation'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
import StatusAnnouncer from '@/components/accessibility/StatusAnnouncer';
import CommandPalette from '@/components/CommandPalette';
import EngagingLoader from '@/components/engagement/EngagingLoader';
import { useAuth } from '@/contexts/EnhancedAuthContext';
// (Documentation now lazy loaded above)
import { IdeasInitializer } from '@/components/IdeasInitializer';

const RouteTransitionWrapper = () => {
  const location = useLocation();
  return (
    <div className="flex-1 flex flex-col">
      <Routes>
        
    <Route path="/logged-out" element={<LoggedOut />} />
    <Route path="/" element={<LandingPage />} />
  <Route path="/logout" element={<Suspense fallback={<div className='p-8'>Loading...</div>}><Logout /></Suspense>} />
  <Route path="/documentation" element={<Suspense fallback={<div className='p-8'>Loading docs...</div>}><Documentation /></Suspense>} />
  <Route path="/hub" element={<ProtectedRoute><Suspense fallback={<div className='p-8'>Loading Hub...</div>}><AppLayout /><Hub /></Suspense></ProtectedRoute>} />
    {/* Deep dive publicly accessible for verification script (contains only static viz) */}
  <Route path="/deep-dive" element={<Suspense fallback={<div className='p-8'>Loading Deep Dive...</div>}><DeepDive /></Suspense>} />
        {/* Protected routes with shared layout */}
        <Route element={<ProtectedRoute><Suspense fallback={<div className='p-8'>Loading dashboard shell...</div>}><AppLayout /></Suspense></ProtectedRoute>}>
          <Route path="/home" element={<Suspense fallback={<div className='p-8'>Loading...</div>}><Dashboard /></Suspense>} />
          <Route path="/dashboard" element={<Suspense fallback={<div className='p-8'>Loading Enterprise Hub...</div>}><EnterpriseHub /></Suspense>} />
          <Route path="/enterprisehub" element={<Suspense fallback={<div className='p-8'>Loading Enterprise Hub...</div>}><EnterpriseHub /></Suspense>} />
          <Route path="/ideachat" element={<Suspense fallback={<div className='p-8'>Loading Chat...</div>}><IdeaChat /></Suspense>} />
          <Route path="/ideajournal" element={<Suspense fallback={<div className='p-8'>Loading Journal...</div>}><IdeaJournal /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<div className='p-8'>Loading Settings...</div>}><Settings /></Suspense>} />
          <Route path="/pricing" element={<Suspense fallback={<div className='p-8'>Loading Pricing...</div>}><Pricing /></Suspense>} />
          <Route path="/subscription-success" element={<Suspense fallback={<div className='p-8'>Loading...</div>}><Dashboard /></Suspense>} />
        </Route>
        <Route path="*" element={<Suspense fallback={<div className='p-8'>Loading...</div>}><NotFound /></Suspense>} />
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
      // Shift+D toggle dashboard (handled within pages via hash navigation)
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        const dashboardLink = document.querySelector('a[href="/dashboard"]') as HTMLAnchorElement | null;
        if (dashboardLink) dashboardLink.click();
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
