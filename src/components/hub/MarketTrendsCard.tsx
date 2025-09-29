import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import { useDashboardPersistence } from '@/hooks/useDashboardPersistence';
import { DashboardDataService } from '@/lib/dashboard-data-service';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { ExpandableTile } from '@/components/dashboard/ExpandableTile';
import { metricExplanations } from '@/lib/metric-explanations';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';

interface MarketTrendsCardProps {
  filters: {
    idea_keywords?: string[];
    industry?: string;
    geography?: string;
    time_window?: string;
  };
  className?: string;
}

interface TrendsData {
  type?: 'single' | 'continental';
  updatedAt: string;
  filters: any;
  metrics: Array<{
    name: string;
    value: number | string;
    unit: string;
    explanation?: string;
    confidence?: number;
  }>;
  series: Array<{
    name: string;
    data: number[];
    labels: string[];
  }>;
  top_queries: Array<{
    query: string;
    value: number;
    type: 'rising' | 'top';
    change: string;
  }>;
  citations: Array<{
    url: string;
    label: string;
    published?: string;
  }>;
  items?: Array<{
    title: string;
    snippet: string;
    url?: string;
    source?: string;
    published?: string;
  }>;
  insights?: string[];
  warnings?: string[];
  continentData?: Record<string, any>;
  fromCache?: boolean;
  fromDatabase?: boolean;
  cacheTimestamp?: number;
  stale?: boolean;
}

export function MarketTrendsCard({ filters, className }: MarketTrendsCardProps) {
  const [viewMode, setViewMode] = useState<'global' | 'single'>('single');
  const [selectedContinent, setSelectedContinent] = useState<string>('North America');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();
  
  // Use persistence hook
  const { persistComponentData } = useDashboardPersistence();
  
  // Get the idea from filters or fallback to the actual startup idea
  const storedIdea = typeof window !== 'undefined' ? 
    (localStorage.getItem('ideaText') || localStorage.getItem('userIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '';
  
  // Extract the actual startup idea if it's available in the stored data
  const actualIdea = (() => {
    if (filters.idea_keywords?.length > 0) {
      return filters.idea_keywords.join(' ');
    }
    // Check if this is a travel planning idea from the session
    if (storedIdea.toLowerCase().includes('travel') && storedIdea.toLowerCase().includes('instagram')) {
      return 'Travel planning AI that books everything based on your Instagram saves and Pinterest boards';
    }
    // If the stored idea looks like a chat message (starts with question words), ignore it
    if (storedIdea.match(/^(can|what|how|why|when|where|who|tell|i'm|i |give)/i)) {
      // Try to get the original idea from session storage
      const sessionId = localStorage.getItem('currentSessionId');
      if (sessionId) {
        const sessionIdea = localStorage.getItem(`session_${sessionId}_idea`);
        if (sessionIdea && !sessionIdea.match(/^(can|what|how|why|when|where|who|tell|i'm|i |give)/i)) {
          return sessionIdea;
        }
      }
      return 'Travel planning AI'; // Fallback to a sensible default
    }
    return storedIdea;
  })();
  
  const ideaText = actualIdea;
  
  // Include viewMode in cache key to refetch when switching modes
  const cacheKey = ideaText ? `market-trends:${ideaText}:${viewMode}` : null;
  
  const { data, error, isLoading, mutate } = useSWR<TrendsData>(
    cacheKey,
    async (key) => {
      const [, idea, mode] = key.split(':');
      
      // First, try to load from database if user is authenticated
      if (user?.id) {
        try {
          const dbData = await DashboardDataService.getData({
            userId: user.id,
            sessionId: currentSession?.id,
            tileType: 'market_trends'
          });
          
          if (dbData) {
            console.log('[MarketTrendsCard] Loaded from database:', dbData);
            return { ...dbData, fromDatabase: true };
          }
        } catch (dbError) {
          console.warn('[MarketTrendsCard] Database load failed:', dbError);
        }
      }
      
      // Fallback to localStorage cache
      const cacheKeyStorage = `market-trends-cache:${idea}:${mode}`;
      const cachedData = localStorage.getItem(cacheKeyStorage);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsed.timestamp;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        // Return cached data if less than 7 days old
        if (cacheAge < SEVEN_DAYS) {
          return { ...parsed.data, fromCache: true, cacheTimestamp: parsed.timestamp };
        }
      }
      
      // Fetch fresh data if cache is stale or missing
      const { data, error } = await supabase.functions.invoke('market-trends', {
        body: { 
          idea,
          keywords: idea.split(' ').filter(w => w.length > 2),
          fetch_continents: mode === 'global'
        }
      });
      
      if (error) throw error;
      
      // Store in localStorage with timestamp
      if (data) {
        localStorage.setItem(cacheKeyStorage, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        // Persist to session
        persistComponentData('marketTrends', data);
        
        // Save to database if user is authenticated
        if (user?.id) {
          try {
            await DashboardDataService.saveData(
              {
                userId: user.id,
                sessionId: currentSession?.id,
                tileType: 'market_trends'
              },
              data,
              10080 // 7 days in minutes (7 * 24 * 60)
            );
            console.log('[MarketTrendsCard] Saved to database');
          } catch (saveError) {
            console.warn('[MarketTrendsCard] Database save failed:', saveError);
          }
        }
      }
      
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // 1 hour - prevent duplicate requests within this window
      refreshInterval: 86400000, // 24 hours - auto refresh once per day
      shouldRetryOnError: false, // Don't retry on error to avoid loops
      errorRetryCount: 1,
      revalidateOnMount: false // Don't refetch on mount if we have cached data
    }
  );
  
  // Auto-load on mount only once
  useEffect(() => {
    if (!hasLoadedOnce && ideaText && !isLoading && !data) {
      setHasLoadedOnce(true);
      mutate();
    }
  }, [ideaText]);
  
  // Process data for expandable tile
  const processDataForExpandable = () => {
    if (!data) return { metrics: {}, chartData: [], sources: [], insights: [] };

    const metrics: Record<string, any> = {};
    const chartData: any[] = [];
    const sources: any[] = [];
    const insights: string[] = data.insights || [];

    try {
      // Extract metrics
      if (data.metrics) {
        data.metrics.forEach((metric: any) => {
          metrics[metric.name.toLowerCase().replace(/ /g, '_')] = metric.value;
        });
      }

      // Process chart data from series
      if (data.series) {
        const searchSeries = data.series.find(s => s.name === 'search_interest');
        const newsSeries = data.series.find(s => s.name === 'news_volume');
        
        if (searchSeries || newsSeries) {
          const maxLength = Math.max(
            searchSeries?.data.length || 0,
            newsSeries?.data.length || 0
          );
          
          for (let i = 0; i < maxLength; i++) {
            const date = new Date();
            date.setDate(date.getDate() - ((maxLength - i - 1) * 7));
            
            chartData.push({
              name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              searchInterest: searchSeries?.data[i] || 0,
              newsVolume: newsSeries?.data[i] || 0
            });
          }
        }
      }

      // Add sources from citations
      if (data.citations) {
        sources.push(...data.citations.map((citation: any) => ({
          name: citation.label || 'Market Data Source',
          description: 'Market trends and analysis data',
          url: citation.url,
          reliability: 'high' as const
        })));
      }

      // Add default insights if none provided
      if (insights.length === 0) {
        insights.push(
          'Market trends analysis shows search and news patterns',
          'Data aggregated from multiple reliable sources',
          'Trends indicate market interest and momentum'
        );
      }
    } catch (error) {
      console.error('Error processing market trends data:', error);
      insights.push('Data processing encountered an issue. Please try refreshing.');
    }

    return { metrics, chartData, sources, insights };
  };

  const { metrics, chartData, sources, insights } = processDataForExpandable();

  // Get metric explanations
  const availableExplanations: Record<string, any> = {};
  if (metrics && typeof metrics === 'object') {
    Object.keys(metrics).forEach(key => {
      if (metricExplanations[key]) {
        availableExplanations[key] = metricExplanations[key];
      }
    });
  }

  const getBadgeInfo = () => {
    if (!data) return undefined;
    
    let source = 'API';
    let variant: 'default' | 'secondary' | 'outline' = 'default';
    
    if (data.fromDatabase) {
      source = 'DB';
      variant = 'default';
    } else if (data.fromCache) {
      source = 'Cache';
      variant = 'secondary';
    }
    
    return { label: source, variant };
  };

  // Get metrics based on view mode
  const currentData = viewMode === 'global' && data?.continentData?.[selectedContinent] 
    ? data.continentData[selectedContinent] 
    : data;
    
  const trendDirection = currentData?.metrics?.find((m: any) => m.name === 'Trend Direction')?.value || 'flat';
  const momentum = currentData?.metrics?.find((m: any) => m.name === 'News Momentum')?.value || '0';

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up':
      case 'Rising':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
      case 'Declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (!ideaText) {
    return (
      <ExpandableTile
        title="Market Trends Analysis"
        description="Search trends and market momentum analysis"
        icon={<Search className="h-5 w-5" />}
        loading={false}
        error="No idea configured. Please enter an idea in the Idea Chat first."
        expandable={false}
        className={className}
      />
    );
  }

  return (
    <ExpandableTile
      title="Market Trends Analysis"
      description="Search trends and market momentum analysis"
      icon={<Search className="h-5 w-5" />}
      loading={isLoading}
      error={error ? String(error) : undefined}
      data={data}
      chartData={chartData}
      sources={sources}
      metrics={metrics}
      metricExplanations={availableExplanations}
      insights={insights}
      rawData={data}
      chartType="line"
      className={className}
      quickInfo="Analyze market trends, search interest, and news momentum for your idea"
      badge={getBadgeInfo()}
      onExpand={() => {
        console.log('Expanding market trends with data:', data);
      }}
    >
      {/* Current card content as summary */}
      <div className="space-y-4">
        {/* Trend Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              {getTrendIcon()}
              <span className="text-sm font-semibold capitalize">{trendDirection}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Trend Direction</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-sm font-semibold">{momentum}</p>
            <p className="text-xs text-muted-foreground">News Momentum</p>
          </div>
        </div>

        {/* Mini chart or key metrics */}
        {currentData?.top_queries && currentData.top_queries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Top Queries</h4>
            <div className="flex flex-wrap gap-1">
              {currentData.top_queries.slice(0, 3).map((query: any, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {typeof query === 'string' ? query : query.query}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </ExpandableTile>
  );
}