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
    error: null
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
      setData(prev => ({ ...prev, loading: false, error: 'No idea found' }));
      return;
    }

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch all types of insights in parallel
      const [metrics, market, competition, channels, realtime] = await Promise.all([
        fetchInsights('metrics'),
        fetchInsights('market'),
        fetchInsights('competition'),
        fetchInsights('channels'),
        fetchInsights('realtime')
      ]);

      setData({
        metrics,
        market,
        competition,
        channels,
        realtime,
        loading: false,
        error: null
      });

      // Show success toast
      toast({
        title: "Data Updated",
        description: "Dashboard insights refreshed successfully",
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data'
      }));

      toast({
        title: "Error",
        description: "Failed to load dashboard insights",
        variant: "destructive"
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
          // Update specific data based on metric type
          const metricType = payload.new.metric_type;
          if (metricType && data[metricType]) {
            setData(prev => ({
              ...prev,
              [metricType]: payload.new.metric_value
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idea, data]);

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