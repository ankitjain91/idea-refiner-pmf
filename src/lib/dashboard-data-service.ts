import { supabase } from '@/integrations/supabase/client';

interface DashboardDataParams {
  userId: string;
  sessionId?: string;
  tileType: string;
  idea?: string;
  filters?: any;
}

interface DashboardDataEntry {
  tile_type: string;
  data: any;
  metadata?: any;
  expires_at?: string;
}

export class DashboardDataService {
  // Cache duration in milliseconds (30 minutes default)
  private static DEFAULT_CACHE_DURATION = 30 * 60 * 1000;
  
  // Get dashboard data from database
  static async getData(params: DashboardDataParams): Promise<any | null> {
    const { userId, sessionId, tileType } = params;
    
    try {
      const query = supabase
        .from('dashboard_data')
        .select('data, updated_at, expires_at')
        .eq('user_id', userId)
        .eq('tile_type', tileType);
      
      if (sessionId) {
        query.eq('session_id', sessionId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) {
        console.error('Error fetching dashboard data:', error);
        return null;
      }
      
      if (!data) return null;
      
      // Check if data has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Data expired, delete it
        await this.deleteData({ userId, sessionId, tileType });
        return null;
      }
      
      return data.data;
    } catch (error) {
      console.error('Error in getData:', error);
      return null;
    }
  }
  
  // Save dashboard data to database
  static async saveData(
    params: DashboardDataParams,
    data: any,
    expirationMinutes: number = 30
  ): Promise<boolean> {
    const { userId, sessionId, tileType, idea, filters } = params;
    
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
      
      const entry: DashboardDataEntry = {
        tile_type: tileType,
        data,
        metadata: { idea, filters },
        expires_at: expiresAt.toISOString()
      };
      
      const { error } = await supabase
        .from('dashboard_data')
        .upsert({
          user_id: userId,
          session_id: sessionId,
          tile_type: tileType,
          data: entry.data,
          metadata: entry.metadata,
          expires_at: entry.expires_at,
          updated_at: new Date().toISOString()
        }, {
          onConflict: sessionId ? 'user_id,session_id,tile_type' : 'user_id,tile_type'
        });
      
      if (error) {
        console.error('Error saving dashboard data:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in saveData:', error);
      return false;
    }
  }
  
  // Delete specific dashboard data
  static async deleteData(params: DashboardDataParams): Promise<boolean> {
    const { userId, sessionId, tileType } = params;
    
    try {
      const query = supabase
        .from('dashboard_data')
        .delete()
        .eq('user_id', userId)
        .eq('tile_type', tileType);
      
      if (sessionId) {
        query.eq('session_id', sessionId);
      }
      
      const { error } = await query;
      
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
  
  // Clear all dashboard data for a user
  static async clearAllData(userId: string, sessionId?: string): Promise<boolean> {
    try {
      const query = supabase
        .from('dashboard_data')
        .delete()
        .eq('user_id', userId);
      
      if (sessionId) {
        query.eq('session_id', sessionId);
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
  
  // Batch get multiple tile data
  static async getBatchData(
    userId: string,
    sessionId: string | undefined,
    tileTypes: string[]
  ): Promise<Record<string, any>> {
    try {
      const query = supabase
        .from('dashboard_data')
        .select('tile_type, data, expires_at')
        .eq('user_id', userId)
        .in('tile_type', tileTypes);
      
      if (sessionId) {
        query.eq('session_id', sessionId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching batch dashboard data:', error);
        return {};
      }
      
      if (!data) return {};
      
      // Convert to object and filter out expired data
      const result: Record<string, any> = {};
      const now = new Date();
      
      for (const item of data) {
        if (!item.expires_at || new Date(item.expires_at) > now) {
          result[item.tile_type] = item.data;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error in getBatchData:', error);
      return {};
    }
  }
  
  // Clean up expired data
  static async cleanupExpiredData(): Promise<void> {
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