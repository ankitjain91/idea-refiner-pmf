import { useEffect, useState } from 'react';
import { LS_KEYS } from '@/lib/storage-keys';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { UserMenu } from '@/components/UserMenu';
import { Loader2 } from 'lucide-react';
import { DynamicStatusBar } from './DynamicStatusBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SessionPicker } from '@/components/SessionPicker';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import EnhancedIdeaChat from '@/components/EnhancedIdeaChat';

const EnhancedIdeaChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentSession, saving } = useSession();
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const navigate = useNavigate();

  // Always redirect to login modal if not logged in - no anonymous sessions allowed
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { state: { from: { pathname: '/ideachat' }, openAuthModal: true } });
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
    
    // Trigger save for all authenticated sessions
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
      <div className="min-h-screen max-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
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
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
              <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <h1 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
                      {currentSession && (
                        <span className="text-xs sm:text-sm text-foreground">
                          {currentSession.name}
                          {saving && (
                            <span className="text-xs text-blue-500 ml-1">Saving...</span>
                          )}
                        </span>
                      )}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Refine · Analyze · Iterate
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
            </div>

            {/* Chat Content */}
            <div className="flex-1 min-h-0 p-1 sm:p-2 lg:p-4">
              <EnhancedIdeaChat 
                onAnalysisReady={handleAnalysisReady} 
                sessionName={currentSession?.name || 'New Chat Session'}
              />
            </div>

            {/* Status Bar */}
            <DynamicStatusBar />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default EnhancedIdeaChatPage;