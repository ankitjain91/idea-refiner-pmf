import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
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
import GlobalAlertCenter from "@/components/feedback/GlobalAlertCenter";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/components/ui/sidebar";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import IdeaChat from "./pages/EnhancedIdeaChatPage";
import IdeaJournal from "./pages/IdeaJournal";
import Pricing from "./pages/Pricing";
import AuthPage from "./pages/Auth";
import Settings from "./pages/Settings";
import Logout from "./pages/Logout";
import NotFound from "./pages/NotFound";
import StatusAnnouncer from '@/components/accessibility/StatusAnnouncer';
import CommandPalette from '@/components/CommandPalette';
import React, { useEffect, useState } from 'react';
import EngagingLoader from '@/components/engagement/EngagingLoader';
import { useInitializeIdeas } from '@/hooks/useInitializeIdeas';
import { useAuth } from '@/contexts/EnhancedAuthContext';

const RouteTransitionWrapper = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex-1 flex flex-col"
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/ideachat" element={<ProtectedRoute><IdeaChat /></ProtectedRoute>} />
          <Route path="/ideajournal" element={<ProtectedRoute><IdeaJournal /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/subscription-success" element={<ProtectedRoute><IdeaChat /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
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
  // Initialize startup ideas in database on app load
  useInitializeIdeas();
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
                    <div className="app-root-shell">
                      {/* Ambient decorative layers */}
                      <div className="app-gradient-orbs" aria-hidden="true" />
                      <div className="app-bg-animated" aria-hidden="true" />
                      <div className="app-noise-layer" aria-hidden="true" />
                      <a href="#main" className="sr-only focus:not-sr-only focus-ring-custom absolute left-2 top-2 z-50 bg-background/80 backdrop-fade px-3 py-1 rounded-md text-sm">Skip to content</a>
                      {/* Legacy toasters (will be phased out) */}
                      <Toaster />
                      <Sonner />
                      {/* New global alert center */}
                      <GlobalAlertCenter position="top" />
                      <AuthGate>
                        <RouteTransitionWrapper />
                      </AuthGate>
                      <StatusAnnouncer message={undefined} />
                      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
                    </div>
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
