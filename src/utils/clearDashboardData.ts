import { supabase } from '@/integrations/supabase/client';

/**
 * Clear all dashboard data from the database
 * WARNING: Only call this when user explicitly requests it
 */
export async function clearAllDashboardData() {
  try {
    console.warn('⚠️ MANUAL dashboard data cleanup requested (user action)...');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }
    
    // Delete all dashboard data for the current user
    const { error, count } = await supabase
      .from('dashboard_data')
      .delete()
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Failed to clear dashboard data:', error);
      return false;
    }
    
    console.log(`✅ Successfully cleared ${count || 0} dashboard data records`);
    
    // REMOVED: No longer auto-clear localStorage
    // Cache should only be cleared via explicit user action through CacheClearButton
    console.log('ℹ️ Skipping localStorage clear - use CacheClearButton for manual cache clearing');
    
    return true;
  } catch (error) {
    console.error('Error clearing dashboard data:', error);
    return false;
  }
}

/**
 * Clear dashboard data for a specific idea
 */
export async function clearIdeaDashboardData(ideaText: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }
    
    // Use JSON containment to find matching records
    const { error, count } = await supabase
      .from('dashboard_data')
      .delete()
      .eq('user_id', user.id)
      .filter('data', 'cs', JSON.stringify({ idea: ideaText }));
    
    if (error) {
      console.error('Failed to clear idea dashboard data:', error);
      return false;
    }
    
    console.log(`✅ Cleared ${count || 0} dashboard records for idea: "${ideaText}"`);
    
    // Clear localStorage cache for this idea
    const keys = Object.keys(localStorage);
    const ideaCacheKeys = keys.filter(k => k.includes(ideaText));
    
    ideaCacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing idea dashboard data:', error);
    return false;
  }
}