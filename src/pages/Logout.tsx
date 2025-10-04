import { LS_KEYS } from '@/lib/storage-keys';
import { useEffect } from "react";
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
    const handleLogout = async () => {
      console.log('[Logout] Starting logout process, clearing all session data...');
      
      // Clear ALL app-managed keys (preserve only theme / other user prefs)
      try { 
        APP_LOCALSTORAGE_KEYS.forEach(k => {
          console.log(`[Logout] Removing localStorage key: ${k}`);
          localStorage.removeItem(k);
        });
        
        // Also clear any keys that start with session-related prefixes
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('session') || key.startsWith('chat') || key.startsWith('idea') || key.startsWith('pmf'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          console.log(`[Logout] Removing additional key: ${key}`);
          localStorage.removeItem(key);
        });
      } catch (e) {
        console.error('[Logout] Error clearing localStorage:', e);
      }
      
      try { 
        window.dispatchEvent(new CustomEvent('auth:state-changed', { detail: 'SIGNED_OUT' })); 
      } catch {}
      
      // Delete persisted sessions (don't block on this, add timeout)
      const sessionDeletionPromise = deleteAllUserSessions().catch(e => {
        console.error('[Logout] Error deleting persisted sessions:', e);
      });
      
      // Sign out from Supabase immediately (don't wait for session deletion)
      const signOutPromise = supabase.auth.signOut();
      
      // Wait for both with a timeout
      await Promise.race([
        Promise.all([sessionDeletionPromise, signOutPromise]),
        new Promise(resolve => setTimeout(resolve, 3000)) // Max 3 seconds
      ]);
      
      console.log('[Logout] Supabase signout complete');
      
      // Redirect to landing page with state to open auth modal
      navigate('/', { replace: true, state: { openAuthModal: true } });
    };
    
    handleLogout();
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