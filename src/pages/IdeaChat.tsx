import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SessionPicker } from '@/components/SessionPicker';
import { IdeaChatHeader } from '@/components/IdeaChatHeader';
import EngagingLoader from '@/components/engagement/EngagingLoader';
import { useIdeaChatSession } from '@/hooks/useIdeaChatSession';
import { useIdeaChatState } from '@/hooks/useIdeaChatState';
import { handleAnalysisReady } from '@/utils/analysisUtils';

const ChatGPTStyleChat = lazy(() => import('@/components/ChatGPTStyleChat'));

const IdeaChatPage = () => {
  const navigate = useNavigate();
  
  // Session management
  const {
    user,
    authLoading,
    currentSession,
    saving,
    chatKey,
    sessionReloading,
    setSessionReloading,
    showOverlayLoader,
    showSessionPicker,
    handleSessionSelected,
    handleClose
  } = useIdeaChatSession();
  
  // Chat state management
  const {
    responseMode,
    toggleResponseMode
  } = useIdeaChatState();
  
  // Handle analysis completion
  const onAnalysisReady = (idea: string, metadata: any) => {
    handleAnalysisReady(idea, metadata, navigate);
  };
  
  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  // Auth check
  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col h-full">
      <IdeaChatHeader
        currentSession={currentSession}
        saving={saving}
        sessionReloading={sessionReloading}
        responseMode={responseMode}
        onToggleResponseMode={toggleResponseMode}
      />
      
      <div className='flex-1 relative p-2'>
        {showOverlayLoader && <EngagingLoader active={true} scope='dashboard' />}
        
        <SessionPicker 
          open={showSessionPicker} 
          onSessionSelected={handleSessionSelected}
          allowClose={currentSession !== null}
          onClose={handleClose}
        />
        
        <div className='absolute inset-0 flex flex-col'>
          <Suspense fallback={
            <div className='flex-1 flex items-center justify-center'>
              <Loader2 className='h-6 w-6 animate-spin' />
            </div>
          }>
            <div className='flex-1 m-2 rounded-xl glass-super-surface elevation-1 overflow-hidden'>
              <ChatGPTStyleChat 
                key={chatKey} 
                onAnalysisReady={onAnalysisReady} 
              />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default IdeaChatPage;