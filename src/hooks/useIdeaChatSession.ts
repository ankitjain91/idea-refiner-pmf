import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { LS_KEYS } from '@/lib/storage-keys';

export function useIdeaChatSession() {
  const { user, loading: authLoading } = useAuth();
  const { currentSession, createSession, loadSession, loading: sessionLoading, saving, sessions } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [chatKey, setChatKey] = useState(0);
  const [sessionReloading, setSessionReloading] = useState(false);
  const [showOverlayLoader, setShowOverlayLoader] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [requireSessionSelection, setRequireSessionSelection] = useState(false);
  const sessionCreatedRef = useRef(false);
  
  // Check for session ID in URL and load it
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionIdFromUrl = params.get('session');
    
    console.log('[IdeaChat] URL check:', { sessionIdFromUrl, currentSession: currentSession?.id, sessionLoading });
    
    // If URL has a session ID and it's different from current, load it
    if (sessionIdFromUrl && !sessionLoading && currentSession?.id !== sessionIdFromUrl) {
      console.log('[IdeaChat] Loading session from URL:', sessionIdFromUrl);
      loadSession(sessionIdFromUrl).then(() => {
        setChatKey(k => k + 1);
      });
      return;
    }
    
    // If user is authenticated and has no current session, show picker
    if (user && !sessionLoading && !currentSession && !sessionIdFromUrl) {
      console.log('[IdeaChat] Showing session picker - no current session');
      setShowSessionPicker(true);
      setRequireSessionSelection(true);
    }
    
    // Handle navigation from auth
    if (location.state?.showSessionPicker) {
      console.log('[IdeaChat] Showing session picker - from auth');
      setShowSessionPicker(true);
      setRequireSessionSelection(true);
      // Clear the state to prevent re-opening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [user, currentSession, sessionLoading, location.search, location.state, location.pathname, navigate, sessions?.length, loadSession]);
  
  // Restore last conversation state if returning from dashboard
  useEffect(() => {
    // Don't auto-load session if coming from auth
    if (requireSessionSelection) {
      return;
    }
    
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
          // Don't trigger initializeChat for existing sessions
          // Only force rerender to pick up restored history
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
  }, [requireSessionSelection]);
  
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
  
  const handleSessionSelected = () => {
    setShowSessionPicker(false);
    setRequireSessionSelection(false);
  };
  
  const handleClose = () => {
    if (currentSession) {
      setShowSessionPicker(false);
      setRequireSessionSelection(false);
    }
  };
  
  return {
    user,
    authLoading,
    currentSession,
    sessionLoading,
    saving,
    chatKey,
    sessionReloading,
    setSessionReloading,
    showOverlayLoader,
    showSessionPicker: showSessionPicker || (!currentSession && !sessionLoading && user !== null),
    handleSessionSelected,
    handleClose,
    setChatKey
  };
}