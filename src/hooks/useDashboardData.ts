import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface DashboardData {
  metrics: any;
  market: any;
  competition: any;
  channels: any;
  realtime: any;
  loading: boolean;
  error: string | null;
  progress: number;
  status: string;
  initialLoadComplete: boolean;
}

export const useDashboardData = (idea: string | null) => {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData>({
    metrics: null,
    market: null,
    competition: null,
    channels: null,
    realtime: null,
    loading: true,
    error: null,
    progress: 0,
    status: '',
    initialLoadComplete: false
  });

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Get conversation history from localStorage
  const getConversationHistory = useCallback(() => {
    try {
      const conversationData = localStorage.getItem('conversationHistory');
      return conversationData ? JSON.parse(conversationData) : [];
    } catch {
      return [];
    }
  }, []);

  // Get idea metadata
  const getIdeaMetadata = useCallback(() => {
    try {
      const metadataStr = localStorage.getItem('ideaMetadata');
      return metadataStr ? JSON.parse(metadataStr) : {};
    } catch {
      return {};
    }
  }, []);

  const fetchInsights = useCallback(async (type: string) => {
    if (!idea) return null;

    const conversation = getConversationHistory();
    const metadata = getIdeaMetadata();

    try {
      const { data: response, error } = await supabase.functions.invoke('dashboard-insights', {
        body: { 
          idea,
          analysisType: type,
          conversation,
          context: {
            userId: (await supabase.auth.getUser()).data.user?.id,
            analysisId: localStorage.getItem('analysisId'),
            ...metadata
          }
        }
      });

      if (error) throw error;
      return response.insights;
    } catch (error) {
      console.error(`Error fetching ${type} insights:`, error);
      return null;
    }
  }, [idea]);

  const loadAllData = useCallback(async () => {
    if (!idea) {
      setData(prev => ({ ...prev, loading: false, error: 'No idea found', progress: 0, status: '', initialLoadComplete: false }));
      return;
    }

    // Reset loading state with progress
    setData(prev => ({ ...prev, loading: true, error: null, progress: 0, status: 'Starting analysis…', initialLoadComplete: false }));

    try {
      const stages: Array<{ key: keyof Omit<DashboardData, 'loading' | 'error' | 'progress' | 'status' | 'initialLoadComplete' | 'refresh'>; label: string; type: string; }> = [
        { key: 'metrics', label: 'Fetching key metrics', type: 'metrics' },
        { key: 'market', label: 'Analyzing market', type: 'market' },
        { key: 'competition', label: 'Evaluating competition', type: 'competition' },
        { key: 'channels', label: 'Identifying growth channels', type: 'channels' },
        { key: 'realtime', label: 'Preparing realtime signals', type: 'realtime' },
      ];

      const results: any = {};
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const percent = Math.round((i / stages.length) * 100);
        setData(prev => ({ ...prev, status: stage.label, progress: percent }));
        // Fetch each stage sequentially to reflect accurate progress
        const value = await fetchInsights(stage.type);
        results[stage.key] = value;
      }

      setData(prev => ({
        ...prev,
        metrics: results.metrics ?? null,
        market: results.market ?? null,
        competition: results.competition ?? null,
        channels: results.channels ?? null,
        realtime: results.realtime ?? null,
        loading: false,
        error: null,
        progress: 100,
        status: 'Complete',
        initialLoadComplete: true,
      }));

      // Optional: keep success toast minimal or omit to avoid noise
      // toast({ title: 'Data updated', description: 'Dashboard insights refreshed.' });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data',
        status: 'Error',
      }));

      toast({
        title: 'Error',
        description: 'Failed to load dashboard insights',
        variant: 'destructive'
      });
    }
  }, [idea, fetchInsights, toast]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [idea]);

  // Set up real-time updates for the realtime metrics
  useEffect(() => {
    if (!idea) return;

    const interval = setInterval(async () => {
      const realtimeData = await fetchInsights('realtime');
      if (realtimeData) {
        setData(prev => ({ ...prev, realtime: realtimeData }));
      }
    }, 10000); // Update every 10 seconds

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [idea, fetchInsights]);

  // Subscribe to database changes
  useEffect(() => {
    if (!idea) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_metrics'
        },
        (payload) => {
          console.log('New metric received:', payload);
          const metricType = payload.new.metric_type as keyof DashboardData;
          const metricValue = payload.new.metric_value;
          if (metricType) {
            setData(prev => ({
              ...prev,
              // Only update known keys
              [metricType]: metricValue
            } as DashboardData));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idea]);

  const refresh = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  const updateMetric = useCallback((type: string, value: any) => {
    setData(prev => ({
      ...prev,
      [type]: value
    }));
  }, []);

  return {
    ...data,
    refresh,
    updateMetric
  };
};