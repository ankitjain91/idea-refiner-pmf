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

    // Clear localStorage (comprehensive)
    const keysToRemove = [
      // Core session identifiers
      'currentSessionId',
      'currentAnonymousSession',
      'sessionDesiredPath',
      'sessionBackup',
      'lastSessionActivity',

      // Chat & idea
      'chatHistory',
      'enhancedIdeaChatMessages',
      'currentIdea',
      'userIdea', 
      'pmf.user.idea',
      'userAnswers',
      'pmf.user.answers',
      'conversationHistory',

      // Analysis / PMF
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
    
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Remove any keys that start with common session-related prefixes or patterns
    try {
      const prefixes = ['session', 'chat', 'idea', 'pmf', 'dashboard', 'analysis', 'enhanced'];
      // Iterate backwards since we're mutating localStorage during iteration
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        const matchesPrefix = prefixes.some(p => key.startsWith(p));
        const matchesPattern = key.includes('session_') || key.includes('pmf.');
        if (matchesPrefix || matchesPattern) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('Error during broad localStorage cleanup:', e);
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