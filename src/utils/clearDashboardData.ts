import { supabase } from '@/integrations/supabase/client';

/**
 * Clear all dashboard data from the database
 * This is a one-time cleanup to remove any mock data
 */
export async function clearAllDashboardData() {
  try {
    console.log('Starting dashboard data cleanup...');
    
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
    
    // Clear localStorage cache as well
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k => 
      k.startsWith('tile_cache_') || 
      k.startsWith('cache:') || 
      k.startsWith('market-trends-cache:')
    );
    
    cacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`✅ Cleared ${cacheKeys.length} localStorage cache entries`);
    
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