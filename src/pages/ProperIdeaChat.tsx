import { lazy, Suspense, useEffect, useState } from 'react';
import { LS_KEYS } from '@/lib/storage-keys';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { DynamicStatusBar } from './DynamicStatusBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SessionPicker } from '@/components/SessionPicker';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

const ChatGPTStyleChat = lazy(() => import('@/components/ChatGPTStyleChat'));

const IdeaChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentSession, saving } = useSession();
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const navigate = useNavigate();

  // Always redirect to auth if not logged in - no anonymous sessions
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Show session picker when user is logged in but has no current session AND no saved session ID
  useEffect(() => {
    if (!authLoading && user && !currentSession) {
      // Check if there's a saved session ID from previous visit
      const savedSessionId = localStorage.getItem('currentSessionId');
      if (!savedSessionId) {
        setShowSessionPicker(true);
      }
    }
  }, [authLoading, user, currentSession]);

  const handleAnalysisReady = (idea: string, metadata: any) => {
    // Store analysis data for dashboard access
    localStorage.setItem(LS_KEYS.userIdea, idea);
    localStorage.setItem(LS_KEYS.analysisCompleted, 'true');
    localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(metadata || {}));
    
    // Trigger save for authenticated sessions
    window.dispatchEvent(new CustomEvent('chat:activity'));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <SessionPicker 
          open={showSessionPicker} 
          onSessionSelected={() => setShowSessionPicker(false)} 
        />
        
        {/* Sidebar */}
        <AppSidebar />
        
        {/* Main Content */}
        <SidebarInset className="flex-1 min-h-0">
          <div className="flex flex-col h-screen max-h-screen">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <h1 className="text-lg font-semibold flex items-center gap-2">
                      <span>PMF Idea Refiner</span>
                      {currentSession && (
                        <span className="text-sm text-muted-foreground">
                          • {currentSession.name}

                          {saving && (
                            <span className="text-xs text-blue-500 ml-1">Saving...</span>
                          )}
                        </span>
                      )}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Brainstorm · Refine · Analyze
                      {currentSession && (
                        <span className="ml-2 text-green-600">✓ Auto-saving</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <UserMenu />
                </div>
              </div>
              
              {/* Action Bar */}
              <div className="flex items-center gap-3 px-4 pb-3 text-[11px] flex-wrap">
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

            {/* Chat Content */}
            <div className="flex-1 min-h-0 p-4">
              <div className="h-full flex flex-col rounded-xl bg-card border shadow-sm overflow-hidden">
                <Suspense 
                  fallback={
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  }
                >
                  <ChatGPTStyleChat onAnalysisReady={handleAnalysisReady} />
                </Suspense>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default IdeaChatPage;