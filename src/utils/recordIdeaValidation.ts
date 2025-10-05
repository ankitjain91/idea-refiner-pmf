import { supabase } from "@/integrations/supabase/client";

export async function recordIdeaValidation(
  ideaText: string,
  pmfScore?: number,
  tam?: string,
  metadata?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('[recordIdeaValidation] No user logged in, skipping');
      return;
    }

    const { error } = await supabase
      .from('idea_validations')
      .insert({
        user_id: user.id,
        idea_text: ideaText,
        pmf_score: pmfScore ?? null,
        tam: tam ?? null,
        metadata: metadata ?? {}
      });

    if (error) {
      console.error('[recordIdeaValidation] Error:', error);
    } else {
      console.log('[recordIdeaValidation] Recorded validation for:', ideaText.slice(0, 50));
    }
  } catch (e) {
    console.error('[recordIdeaValidation] Exception:', e);
  }
}
