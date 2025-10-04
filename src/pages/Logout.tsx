import { LS_KEYS } from '@/lib/storage-keys';
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { deleteAllUserSessions } from "@/utils/deleteAllSessions";
import { Loader2 } from "lucide-react";

// Clear ALL session-related data from localStorage on logout
const APP_LOCALSTORAGE_KEYS = [
  'currentSessionId',
  'sessionDesiredPath',
  'chatHistory',
  'userIdea',
  'userAnswers',
  'ideaMetadata',
  LS_KEYS.analysisCompleted,
  'analysisResults',
  'pmfScore',
  'userRefinements',
  'pmfFeatures',
  'pmfTabHistory',
  'showAnalysisDashboard',
  'currentTab',
  'currentSessionTitle',
  'pmfCurrentIdea',
  'authSnapshot',
  'currentAnonymousSession', // Clear anonymous session data
  'pmf.session.decisionMade', // Clear session decision state
  'brainstormingSessionData', // Clear any cached session data
  'lastSessionActivity', // Clear activity tracking
  'sessionBackup', // Clear any session backups
  'ideaChatSidebarWidth', // Clear UI preferences related to sessions
];

const Logout = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    let mounted = true;
    const redirectedRef = { current: false };

    const safeRedirect = () => {
      if (redirectedRef.current || !mounted) return;
      redirectedRef.current = true;
      try {
        // Small microtask delay to let React auth state propagate
        setTimeout(() => {
          if (!mounted) return;
          console.log('[Logout] Redirecting to /logged-out');
            navigate('/logged-out', { replace: true });
        }, 0);
      } catch (e) {
        console.warn('[Logout] navigate() failed, forcing location.replace', e);
        window.location.replace('/logged-out');
      }
    };

    const clearLocalState = () => {
      try {
        APP_LOCALSTORAGE_KEYS.forEach(k => {
          localStorage.removeItem(k);
        });
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
            if (key && (key.startsWith('session') || key.startsWith('chat') || key.startsWith('idea') || key.startsWith('pmf'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.error('[Logout] Error clearing localStorage:', e);
      }
    };

    const perform = async () => {
      console.log('[Logout] Initiating logout sequence');
      clearLocalState();
      try { window.dispatchEvent(new CustomEvent('auth:state-changed', { detail: 'SIGNED_OUT' })); } catch {}

      const sessionDeletionPromise = deleteAllUserSessions().catch(e => console.error('[Logout] session deletion error', e));
      const signOutPromise = supabase.auth.signOut().catch(e => console.error('[Logout] signOut error', e));

      // Race both with a hard timeout to avoid hanging
      await Promise.race([
        Promise.all([sessionDeletionPromise, signOutPromise]),
        new Promise(resolve => setTimeout(resolve, 3500))
      ]);
      console.log('[Logout] Background tasks complete (or timed out)');
      safeRedirect();
    };

    perform();
    // Safety net redirect if something stalls
    const hardFallback = setTimeout(() => safeRedirect(), 5000);
    return () => { mounted = false; clearTimeout(hardFallback); };
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Signing out...</p>
      </div>
    </div>
  );
};

export default Logout;