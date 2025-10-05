import { supabase } from '@/integrations/supabase/client';

/**
 * Save or update an idea to the ideas table for leaderboard display
 */
export async function saveIdeaToLeaderboard(params: {
  idea: string;
  refinedIdea?: string;
  pmfScore: number;
  sessionName?: string;
  category?: string;
  isPublic?: boolean;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[SaveIdea] No authenticated user');
      return { success: false, error: 'Not authenticated' };
    }

    // Check if idea already exists for this user
    const { data: existingIdeas } = await supabase
      .from('ideas')
      .select('id')
      .eq('user_id', user.id)
      .eq('original_idea', params.idea)
      .limit(1);

    const ideaData = {
      user_id: user.id,
      original_idea: params.idea,
      refined_idea: params.refinedIdea || params.idea,
      pmf_score: params.pmfScore,
      category: params.category || 'Uncategorized',
      is_public: params.isPublic !== undefined ? params.isPublic : true,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingIdeas && existingIdeas.length > 0) {
      // Update existing idea
      result = await supabase
        .from('ideas')
        .update(ideaData)
        .eq('id', existingIdeas[0].id)
        .select();
      
      console.log('[SaveIdea] Updated existing idea:', result);
    } else {
      // Insert new idea
      result = await supabase
        .from('ideas')
        .insert(ideaData)
        .select();
      
      console.log('[SaveIdea] Inserted new idea:', result);
    }

    if (result.error) {
      console.error('[SaveIdea] Error saving idea:', result.error);
      return { success: false, error: result.error };
    }

    console.log('[SaveIdea] Successfully saved idea to leaderboard');
    return { success: true, data: result.data };
  } catch (error) {
    console.error('[SaveIdea] Exception saving idea:', error);
    return { success: false, error };
  }
}

/**
 * Remove an idea from the leaderboard (when session is reset)
 */
export async function removeIdeaFromLeaderboard(idea: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[RemoveIdea] No authenticated user');
      return { success: false, error: 'Not authenticated' };
    }

    const result = await supabase
      .from('ideas')
      .delete()
      .eq('user_id', user.id)
      .eq('original_idea', idea);

    if (result.error) {
      console.error('[RemoveIdea] Error removing idea:', result.error);
      return { success: false, error: result.error };
    }

    console.log('[RemoveIdea] Successfully removed idea from leaderboard');
    return { success: true };
  } catch (error) {
    console.error('[RemoveIdea] Exception removing idea:', error);
    return { success: false, error };
  }
}
