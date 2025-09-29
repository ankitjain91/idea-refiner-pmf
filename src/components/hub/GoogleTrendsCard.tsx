import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search,
  AlertCircle,
  Activity,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardDataService } from '@/lib/dashboard-data-service';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { cn } from '@/lib/utils';
import { ExpandableTile } from '@/components/dashboard/ExpandableTile';
import { metricExplanations } from '@/lib/metric-explanations';

interface GoogleTrendsCardProps {
  filters: {
    idea_keywords?: string[];
    geo?: string;
    time_window?: string;
  };
  className?: string;
}

interface TrendData {
  series?: Array<{ name: string; points: Array<[string, number]> }>;
  metrics?: Array<{ name: string; value: string; confidence: number; explanation: string }>;
  top_queries?: Array<string | { query: string; value?: number; change?: string; type?: 'rising' | 'top' }>;
  updatedAt?: string;
  warnings?: string[];
  continentData?: Record<string, any>;
  type?: 'single' | 'continental';
  fromDatabase?: boolean;
  fromCache?: boolean;
}

export function GoogleTrendsCard({ filters, className }: GoogleTrendsCardProps) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();

  // Get the idea from filters or fallback to localStorage
  const ideaKeywords = filters.idea_keywords || [];
  const ideaText = ideaKeywords.length > 0 
    ? ideaKeywords.join(' ')
    : (typeof window !== 'undefined' ? (localStorage.getItem('currentIdea') || localStorage.getItem('pmfCurrentIdea') || '') : '');
  
  // Extract key concepts for better Google Trends results
  let keywords: string[] = [];
  if (ideaText.toLowerCase().includes('mental wellness') || ideaText.toLowerCase().includes('mental health')) {
    keywords = ['mental health', 'remote work', 'burnout'];
  } else if (ideaText.toLowerCase().includes('wellness')) {
    keywords = ['employee wellness', 'remote teams'];
  } else {
    // Fallback to simplified keywords
    keywords = ideaText.split(' ')
      .filter(w => w.length > 3 && !['with', 'that', 'this', 'from', 'have'].includes(w.toLowerCase()))
      .slice(0, 2);
  }
  
  console.log('[GoogleTrendsCard] Simplified keywords for trends:', keywords);
  const geo = filters.geo || 'US';
  const timeWindow = filters.time_window || 'last_12_months';

  const fetchTrendsData = async (forceRefresh = false) => {
    if (keywords.length === 0) return;
    
    // Use simplified keywords for better Google Trends results
    const trendsKeywords = keywords.slice(0, 1); // Use the strongest single keyword for accuracy
    console.log('[GoogleTrendsCard] Using keywords:', trendsKeywords);
    
    // First, try to load from database if user is authenticated and not forcing refresh
    if (user?.id && !forceRefresh) {
      try {
        const dbData = await DashboardDataService.getData({
          userId: user.id,
          sessionId: currentSession?.id,
          tileType: 'google_trends'
        });
        
        if (dbData) {
          console.log('[GoogleTrendsCard] Loaded from database:', dbData);
          setData(dbData);
          return;
        }
      } catch (dbError) {
        console.warn('[GoogleTrendsCard] Database load failed:', dbError);
      }
    }
    
    // Fallback to localStorage cache
    const cacheKey = `google-trends:${trendsKeywords.join(',')}:${geo}:${timeWindow}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData && !forceRefresh) {
      const parsed = JSON.parse(cachedData);
      const cacheAge = Date.now() - parsed.timestamp;
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      
      if (cacheAge < SEVEN_DAYS) {
        setData(parsed.data);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: trendsData, error: trendsError } = await supabase.functions.invoke('google-trends', {
        body: { 
          idea_keywords: trendsKeywords,
          geo,
          time_window: timeWindow
        }
      });

      if (trendsError) {
        throw trendsError;
      }
      
      setData(trendsData);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify({
        data: trendsData,
        timestamp: Date.now()
      }));
      
      // Save to database if user is authenticated
      if (user?.id && trendsData) {
        try {
          await DashboardDataService.saveData(
            {
              userId: user.id,
              sessionId: currentSession?.id,
              tileType: 'google_trends'
            },
            trendsData,
            10080 // 7 days in minutes
          );
          console.log('[GoogleTrendsCard] Saved to database');
        } catch (saveError) {
          console.warn('[GoogleTrendsCard] Database save failed:', saveError);
        }
      }
      
      setHasLoadedOnce(true);
    } catch (err: any) {
      console.error('[GoogleTrendsCard] Error:', err);
      setError(err.message || 'Failed to fetch trends data');
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load data when keywords are available - only once
  useEffect(() => {
    if (!hasLoadedOnce && keywords.length > 0 && !loading && !data) {
      setHasLoadedOnce(true);
      fetchTrendsData();
    }
  }, [keywords.length]);

  // Process data for expandable tile
  const processDataForExpandable = () => {
    if (!data) return { metrics: {}, chartData: [], sources: [], insights: [] };

    const metrics: Record<string, any> = {};
    const chartData: any[] = [];
    const sources: any[] = [];
    const insights: string[] = [];

    try {
      // Extract metrics
      if (data.metrics) {
        data.metrics.forEach((metric: any) => {
          metrics[metric.name.toLowerCase().replace(/ /g, '_')] = metric.value;
        });
      }

      // Process chart data from series
      if (data.series?.[0]?.points) {
        chartData.push(...data.series[0].points.map(([date, value]: [string, number]) => ({
          name: typeof date === 'string' ? (date.split('–')[0]?.trim() || date) : String(date),
          value
        })));
      }

      // Add default sources
      sources.push({
        name: 'Google Trends',
        description: 'Search interest and related queries data',
        url: 'https://trends.google.com',
        reliability: 'high' as const
      });

      // Add insights
      const trendMetric = data.metrics?.find(m => m.name === 'trend_direction');
      if (trendMetric) {
        insights.push(
          `Search trend is currently ${trendMetric.value}`,
          'Based on Google Trends analysis',
          `Confidence level: ${Math.round((trendMetric.confidence || 0) * 100)}%`
        );
      } else {
        insights.push(
          'Google Trends analysis for your idea',
          'Search interest patterns over time',
          'Related queries and market interest indicators'
        );
      }
    } catch (error) {
      console.error('Error processing Google Trends data:', error);
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

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
      case 'down': return <ArrowDownRight className="h-4 w-4 text-rose-500" />;
      default: return <Minus className="h-4 w-4 text-amber-500" />;
    }
  };

  const handleRefresh = () => {
    fetchTrendsData(true);
  };

  if (!ideaText) {
    return (
      <ExpandableTile
        title="Google Trends"  
        description="Search interest patterns and trends"
        icon={<Search className="h-5 w-5" />}
        loading={false}
        error="No idea configured. Please enter an idea first."
        expandable={false}
        className={className}
      />
    );
  }

  return (
    <ExpandableTile
      title="Google Trends"
      description="Search interest patterns and trends"
      icon={<Search className="h-5 w-5" />}
      loading={loading}
      error={error}
      data={data}
      chartData={chartData}
      sources={sources}
      metrics={metrics}
      metricExplanations={availableExplanations}
      insights={insights}
      rawData={data}
      chartType="area"
      className={className}
      quickInfo="Analyze search interest and trends for your idea using Google Trends data"
      badge={getBadgeInfo()}
      onExpand={() => {
        console.log('Expanding Google Trends with data:', data);
        if (!hasLoadedOnce) {
          fetchTrendsData();
        }
      }}
    >
      {data && (
        <div className="space-y-3">
          {data.metrics?.find(m => m.name === 'trend_direction') && (
            <div className="flex items-center justify-center gap-2 p-3 bg-muted/30 rounded-lg">
              {getTrendIcon(data.metrics.find(m => m.name === 'trend_direction')?.value || 'flat')}
              <span className="text-sm font-semibold capitalize">
                {data.metrics.find(m => m.name === 'trend_direction')?.value || 'No trend'}
              </span>
            </div>
          )}
          
          {data.top_queries && data.top_queries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Related Searches</h4>
              <div className="flex flex-wrap gap-1">
                {data.top_queries.slice(0, 3).map((query: any, idx: number) => {
                  const queryText = typeof query === 'string' ? query : (query.query || query.text || '');
                  return queryText && !(/^\d+$/.test(queryText)) ? (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {queryText}
                    </Badge>
                  ) : null;
                }).filter(Boolean)}
              </div>
            </div>
          )}
        </div>
      )}
    </ExpandableTile>
  );
}