import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/EnhancedAuthContext';

export interface UsageDataPoint {
  date: string;
  ideas: number;
  ai_credits: number;
  exports: number;
}

export function useUsageHistory(days: number = 30) {
  const { user } = useAuth();
  const [data, setData] = useState<UsageDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsageHistory() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch ideas created in the last N days
        const { data: ideas, error: ideasError } = await supabase
          .from('ideas')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (ideasError) throw ideasError;

        // Fetch AI credits usage
        const { data: aiCredits, error: creditsError } = await supabase
          .from('ai_credits_usage')
          .select('created_at, credits_used')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (creditsError) throw creditsError;

        // Group by date
        const usageByDate = new Map<string, UsageDataPoint>();
        
        // Process ideas
        ideas?.forEach(idea => {
          const date = new Date(idea.created_at).toLocaleDateString();
          const existing = usageByDate.get(date) || { date, ideas: 0, ai_credits: 0, exports: 0 };
          existing.ideas += 1;
          usageByDate.set(date, existing);
        });

        // Process AI credits
        aiCredits?.forEach(credit => {
          const date = new Date(credit.created_at).toLocaleDateString();
          const existing = usageByDate.get(date) || { date, ideas: 0, ai_credits: 0, exports: 0 };
          existing.ai_credits += credit.credits_used || 0;
          usageByDate.set(date, existing);
        });

        setData(Array.from(usageByDate.values()));
      } catch (error) {
        console.error('Error fetching usage history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsageHistory();
  }, [user?.id, days]);

  return { data, loading };
}
