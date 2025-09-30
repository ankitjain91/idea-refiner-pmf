import { useState, useEffect } from 'react';
import { generateAIInsights, GeneratedInsight, InsightContext } from '@/lib/ai-insights-generator';
import { useToast } from '@/hooks/use-toast';

export function useAIInsights(context: InsightContext | null) {
  const [insight, setInsight] = useState<GeneratedInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInsight = async () => {
    if (!context) {
      setInsight(null);
      return;
    }
    
    setLoading(true);
    try {
      const generatedInsight = await generateAIInsights(context);
      setInsight(generatedInsight);
    } catch (error) {
      console.error('Error fetching AI insight:', error);
      toast({
        title: 'AI Insights',
        description: 'Using cached insights. AI service temporarily unavailable.',
        variant: 'default'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [context?.type, context?.data, context?.idea]);

  return { insight, loading, refetch: fetchInsight };
}

export function useAIRecommendations(
  idea: string,
  data: any,
  focusArea: 'growth' | 'validation' | 'monetization' | 'marketing'
) {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!idea || !data) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const { generateAIRecommendations } = await import('@/lib/ai-insights-generator');
        const recs = await generateAIRecommendations(idea, data, focusArea);
        setRecommendations(recs);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [idea, focusArea]);

  return { recommendations, loading };
}