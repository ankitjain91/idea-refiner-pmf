import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/EnhancedAuthContext';

export interface PMFScore {
  score: number;
  idea: string;
  created_at: string;
}

export interface PMFDistribution {
  range: string;
  count: number;
}

export function usePMFScores() {
  const { user } = useAuth();
  const [scores, setScores] = useState<PMFScore[]>([]);
  const [distribution, setDistribution] = useState<PMFDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPMFScores() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's ideas with PMF scores
        const { data: ideas, error } = await supabase
          .from('ideas')
          .select('id, original_idea, pmf_score, created_at')
          .eq('user_id', user.id)
          .not('pmf_score', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Extract PMF scores
        const pmfScores: PMFScore[] = [];
        const scoreRanges = {
          '0-20': 0,
          '21-40': 0,
          '41-60': 0,
          '61-80': 0,
          '81-100': 0
        };

        ideas?.forEach(idea => {
          const score = idea.pmf_score;
          
          if (typeof score === 'number' && score >= 0 && score <= 100) {
            pmfScores.push({
              score,
              idea: idea.original_idea || 'Untitled',
              created_at: idea.created_at
            });

            // Update distribution
            if (score <= 20) scoreRanges['0-20']++;
            else if (score <= 40) scoreRanges['21-40']++;
            else if (score <= 60) scoreRanges['41-60']++;
            else if (score <= 80) scoreRanges['61-80']++;
            else scoreRanges['81-100']++;
          }
        });

        setScores(pmfScores);
        setDistribution(
          Object.entries(scoreRanges).map(([range, count]) => ({
            range,
            count
          }))
        );
      } catch (error) {
        console.error('Error fetching PMF scores:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPMFScores();
  }, [user?.id]);

  return { scores, distribution, loading };
}
