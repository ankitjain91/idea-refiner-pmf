import { supabase } from '@/integrations/supabase/client';

interface DashboardDataParams {
  userId: string;
  ideaText: string; // Changed from sessionId to ideaText as primary identifier
  tileType: string;
  sessionId?: string; // Optional, for backward compatibility
}

class DashboardDataService {
  private static instance: DashboardDataService;

  private constructor() {}

  static getInstance(): DashboardDataService {
    if (!DashboardDataService.instance) {
      DashboardDataService.instance = new DashboardDataService();
    }
    return DashboardDataService.instance;
  }

  /**
   * Get dashboard data from the database
   * Now uses idea as the primary key instead of session
   */
  async getData(params: DashboardDataParams): Promise<any | null> {
    const { userId, ideaText, tileType, sessionId } = params;

    try {
      // Build query with proper typing to avoid TypeScript issues
      const baseQuery = supabase
        .from('dashboard_data')
        .select('*')
        .eq('user_id', userId)
        .eq('tile_type', tileType);

      // Use JSON containment operator for idea matching
      const queryWithIdea = baseQuery.filter('data', 'cs', JSON.stringify({ idea: ideaText }));

      // Apply session filter if provided
      const finalQuery = sessionId 
        ? queryWithIdea.eq('session_id', sessionId)
        : queryWithIdea;

      const { data, error } = await finalQuery
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching dashboard data:', error);
        return null;
      }

      if (!data) {
        // Fallback: try to get data without session ID if not found
        if (sessionId) {
          const fallbackQuery = supabase
            .from('dashboard_data')
            .select('*')
            .eq('user_id', userId)
            .eq('tile_type', tileType);
          
          const fallbackWithIdea = fallbackQuery.filter('data', 'cs', JSON.stringify({ idea: ideaText }));
          
          const fallbackResult = await fallbackWithIdea
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!fallbackResult.error && fallbackResult.data) {
            return fallbackResult.data.data || null;
          }
        }
        return null;
      }

      // Check if data has expired
      if (data?.expires_at && new Date(data.expires_at) < new Date()) {
        // Data has expired, return null
        return null;
      }

      return data?.data || null;
    } catch (error) {
      console.error('Error in getData:', error);
      return null;
    }
  }

  /**
   * Save dashboard data to the database
   * Stores idea as part of the data object for querying
   */
  async saveData(
    params: DashboardDataParams,
    data: any,
    expirationMinutes?: number
  ): Promise<boolean> {
    const { userId, ideaText, tileType, sessionId } = params;

    try {
      // Ensure the idea is stored within the data object
      const dataWithIdea = {
        ...data,
        idea: ideaText,
        timestamp: new Date().toISOString()
      };

      const expiresAt = expirationMinutes
        ? new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString()
        : null;

      // Check if record exists
      const existingBaseQuery = supabase
        .from('dashboard_data')
        .select('id')
        .eq('user_id', userId)
        .eq('tile_type', tileType);
      
      const existingWithIdea = existingBaseQuery.filter('data', 'cs', JSON.stringify({ idea: ideaText }));

      const existingQuery = sessionId 
        ? existingWithIdea.eq('session_id', sessionId)
        : existingWithIdea;

      const { data: existing } = await existingQuery.limit(1).maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('dashboard_data')
          .update({
            data: dataWithIdea,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
            metadata: {
              idea: ideaText,
              lastRefresh: new Date().toISOString()
            }
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating dashboard data:', error);
          return false;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('dashboard_data')
          .insert({
            user_id: userId,
            session_id: sessionId || null,
            tile_type: tileType,
            data: dataWithIdea,
            expires_at: expiresAt,
            metadata: {
              idea: ideaText,
              lastRefresh: new Date().toISOString()
            }
          });

        if (error) {
          console.error('Error inserting dashboard data:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in saveData:', error);
      return false;
    }
  }

  /**
   * Delete dashboard data
   */
  async deleteData(params: DashboardDataParams): Promise<boolean> {
    const { userId, ideaText, tileType, sessionId } = params;

    try {
      const baseQuery = supabase
        .from('dashboard_data')
        .delete()
        .eq('user_id', userId)
        .eq('tile_type', tileType);
      
      const queryWithIdea = baseQuery.filter('data', 'cs', JSON.stringify({ idea: ideaText }));

      const finalQuery = sessionId 
        ? queryWithIdea.eq('session_id', sessionId)
        : queryWithIdea;

      const { error } = await finalQuery;

      if (error) {
        console.error('Error deleting dashboard data:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteData:', error);
      return false;
    }
  }

  /**
   * Clear all data for a user and idea
   */
  async clearAllData(userId: string, ideaText?: string, sessionId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('dashboard_data')
        .delete()
        .eq('user_id', userId);

      if (ideaText) {
        query = query.filter('data', 'cs', JSON.stringify({ idea: ideaText }));
      }

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { error } = await query;

      if (error) {
        console.error('Error clearing dashboard data:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearAllData:', error);
      return false;
    }
  }

  /**
   * Get all data for a specific idea across all tile types
   */
  async getIdeaData(userId: string, ideaText: string): Promise<Record<string, any>> {
    try {
      const baseQuery = supabase
        .from('dashboard_data')
        .select('*')
        .eq('user_id', userId);
      
      const queryWithIdea = baseQuery.filter('data', 'cs', JSON.stringify({ idea: ideaText }));
      
      const { data, error } = await queryWithIdea
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching idea data:', error);
        return {};
      }

      // Group by tile type and return the most recent for each
      const result: Record<string, any> = {};
      const tileMap = new Map<string, any>();

      data?.forEach(item => {
        if (!tileMap.has(item.tile_type) || 
            new Date(item.created_at) > new Date(tileMap.get(item.tile_type).created_at)) {
          tileMap.set(item.tile_type, item);
        }
      });

      tileMap.forEach((value, key) => {
        // Check expiration
        if (!value.expires_at || new Date(value.expires_at) > new Date()) {
          result[key] = value.data;
        }
      });

      return result;
    } catch (error) {
      console.error('Error in getIdeaData:', error);
      return {};
    }
  }

  /**
   * Get batch data for multiple tile types
   */
  async getBatchData(
    userId: string,
    ideaText: string,
    tileTypes: string[]
  ): Promise<Record<string, any>> {
    try {
      const baseQuery = supabase
        .from('dashboard_data')
        .select('*')
        .eq('user_id', userId)
        .in('tile_type', tileTypes);
      
      const queryWithIdea = baseQuery.filter('data', 'cs', JSON.stringify({ idea: ideaText }));
      
      const { data, error } = await queryWithIdea
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching batch data:', error);
        return {};
      }

      // Group by tile type and return the most recent non-expired for each
      const result: Record<string, any> = {};
      const tileMap = new Map<string, any>();

      data?.forEach(item => {
        // Skip expired items
        if (item.expires_at && new Date(item.expires_at) < new Date()) {
          return;
        }

        if (!tileMap.has(item.tile_type) || 
            new Date(item.created_at) > new Date(tileMap.get(item.tile_type).created_at)) {
          tileMap.set(item.tile_type, item);
        }
      });

      tileMap.forEach((value, key) => {
        result[key] = value.data;
      });

      return result;
    } catch (error) {
      console.error('Error in getBatchData:', error);
      return {};
    }
  }

  /**
   * Cleanup expired data
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_expired_dashboard_data');
      
      if (error) {
        console.error('Error cleaning up expired data:', error);
      }
    } catch (error) {
      console.error('Error in cleanupExpiredData:', error);
    }
  }
}

export const dashboardDataService = DashboardDataService.getInstance();
export { DashboardDataService };