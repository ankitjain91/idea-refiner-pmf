import { supabase } from "@/integrations/supabase/client";

export async function deleteAllUserSessions() {
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return { error: authError || new Error("No user found") };
    }

    // Delete all sessions for the current user
    const { error: deleteError } = await supabase
      .from('brainstorming_sessions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error("Error deleting sessions:", deleteError);
      return { error: deleteError };
    }

    // WARN user before clearing - this is destructive
    console.warn('[DeleteSessions] Deleting all sessions and clearing localStorage');
    
    // Clear localStorage (comprehensive) - but ONLY session-specific keys
    const keysToRemove = [
      // Core session identifiers
      'currentSessionId',
      'currentAnonymousSession',
      'sessionDesiredPath',
      'sessionBackup',
      'lastSessionActivity',

      // Analysis / PMF - keep these as they're not message-critical
      'ideaMetadata',
      'pmfAnalysisData',
      'pmf.analysis.completed',
      'pmf.analysis.brief',
      'pmf.analysis.briefSuggestionsCache',
      'pmf.analysis.score',
      'pmf.analysis.metadata',
      'pmf.session.title',
      'pmf.session.id',
      'pmf.ui.returnToChat',
      'pmf.session.decisionMade',
      'pmfScore',
      'wrinklePoints',

      // Dashboard / UI
      'analysisResults',
      'showAnalysisDashboard',
      'currentTab',
      'userRefinements',
      'pmfFeatures',
      'pmfTabHistory',
      'dashboardValidation',
      'dashboardAccessGrant',
      'ideaChatSidebarWidth',

      // Auth snapshot / prefs related to sessions
      'authSnapshot',
      'autoSaveEnabled',
    ];
    
    keysToRemove.forEach(key => {
      console.log('[DeleteSessions] Removing key:', key);
      localStorage.removeItem(key);
    });

    // Remove session-specific message storage
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        // Only remove session-prefixed keys (session_xxx_messages, etc.)
        if (key.startsWith('session_')) {
          console.log('[DeleteSessions] Removing session key:', key);
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Error during session-specific localStorage cleanup:', e);
    }

    // Broadcast reset events so active views clear in-memory state immediately
    try {
      window.dispatchEvent(new CustomEvent('session:reset'));
      window.dispatchEvent(new CustomEvent('dashboard:reset'));
      window.dispatchEvent(new CustomEvent('chat:reset'));
      window.dispatchEvent(new CustomEvent('analysis:reset'));
    } catch {}

    console.log("All sessions deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error };
  }
}