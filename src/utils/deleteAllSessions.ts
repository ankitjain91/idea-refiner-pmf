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

    // Clear localStorage
    const keysToRemove = [
      'currentSessionId',
      'userIdea', 
      'userAnswers',
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
      'pmf.user.idea',
      'pmf.user.answers'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log("All sessions deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error };
  }
}