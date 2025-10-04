import { useEffect, useState } from 'react';
import { LS_KEYS } from '@/lib/storage-keys';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '@/components/UserMenu';
import { Loader2, FolderOpen, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DynamicStatusBar } from './DynamicStatusBar';
import { AsyncDashboardButton } from '@/components/AsyncDashboardButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SessionPicker } from '@/components/SessionPicker';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createConversationSummary } from '@/utils/conversationUtils';


import EnhancedIdeaChat from '@/components/EnhancedIdeaChat';

const EnhancedIdeaChatPage = () => {
  const { user, loading: authLoading, initialized } = useAuth();
  const { currentSession, saving, setAutoSaveEnabled, autoSaveEnabled } = useSession();
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const navigate = useNavigate();

  // Always redirect to login modal if not logged in - no anonymous sessions allowed
  useEffect(() => {
    if (initialized && !authLoading && !user) {
      navigate('/', { state: { from: { pathname: '/ideachat' }, openAuthModal: true } });
    }
  }, [initialized, authLoading, user, navigate]);

  // Show session picker when needed, but allow user to close it
  useEffect(() => {
    if (!authLoading && user && !currentSession && !saving) {
      // Show picker but allow closing
      setShowSessionPicker(true);
    } else if (currentSession) {
      setShowSessionPicker(false);
    }
  }, [authLoading, user, currentSession, saving]);

  const handleAnalysisReady = (idea: string, metadata: any) => {
    // Get full conversation history for dashboard context
    const storedMessages = localStorage.getItem('enhancedIdeaChatMessages');
    let conversationSummary = idea;
    
    if (storedMessages) {
      try {
        const messages = JSON.parse(storedMessages);
        // Create intelligent summary of the conversation
        conversationSummary = createConversationSummary(messages, idea);
      } catch (e) {
        console.error('Failed to parse chat messages:', e);
      }
    }
    
    // Store analysis data for dashboard access
    localStorage.setItem(LS_KEYS.userIdea, idea);
    localStorage.setItem('dashboardIdea', conversationSummary); // Full conversation for dashboard
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
    <div className="flex flex-col h-screen max-h-screen">
      <SessionPicker 
        open={showSessionPicker} 
        onSessionSelected={() => setShowSessionPicker(false)}
        allowClose={true}
        onClose={() => setShowSessionPicker(false)}
      />
      
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
            <h1 className="text-sm sm:text-lg font-semibold flex items-center gap-1 sm:gap-2">
              {currentSession && (
                <span className="text-xs sm:text-sm text-foreground">
                  {currentSession.name}
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              Refine · Analyze · Iterate
            </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <AsyncDashboardButton />
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-save" className="text-xs flex items-center gap-1 cursor-pointer">
                <Save className="w-3 h-3" />
                <span className="hidden sm:inline">Auto-save</span>
              </Label>
              <Switch
                id="auto-save"
                checked={autoSaveEnabled}
                onCheckedChange={setAutoSaveEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Chat Content - reduced padding on left side */}
      <div className="flex-1 min-h-0 pl-1 pr-2 sm:pl-2 sm:pr-4 lg:pl-3 lg:pr-6 py-2 lg:py-4">
        <EnhancedIdeaChat 
          onAnalysisReady={handleAnalysisReady} 
          sessionName={currentSession?.name || 'New Chat Session'}
        />
      </div>

      {/* Status Bar */}
      <DynamicStatusBar />
    </div>
  );
};

export default EnhancedIdeaChatPage;