import { useState, useEffect, useCallback } from 'react';
import { BaseTile, MetricCard, ListItem, useTileData } from './BaseTile';
import { TileInsightsDialog } from './TileInsightsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, TrendingUp, TrendingDown, Target, DollarSign, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { ExpandableTile } from '@/components/dashboard/ExpandableTile';
import { metricExplanations } from '@/lib/metric-explanations';

interface EnhancedDataTileProps {
  title: string;
  icon: any;
  tileType: string;
  filters: any;
  description?: string;
  fetchAdapter: (filters: any) => Promise<any>;
  renderContent?: (data: any) => React.ReactNode;
  className?: string;
}

export function EnhancedDataTile({
  title,
  icon,
  tileType,
  filters,
  description,
  fetchAdapter,
  renderContent,
  className
}: EnhancedDataTileProps) {
  const [showInsights, setShowInsights] = useState(false);
  const { user } = useAuth();
  const { currentSession } = useSession();

  const fetchTileData = useCallback(async () => {
    try {
      const result = await fetchAdapter(filters);
      return result;
    } catch (error) {
      console.error(`Error fetching ${tileType} data:`, error);
      throw error;
    }
  }, [tileType, filters, fetchAdapter]);

  const { data, isLoading, error, loadData } = useTileData(fetchTileData, [filters], {
    tileType: tileType,
    useDatabase: true,
    cacheMinutes: 30
  });

  // Process data for the expandable tile
  const processDataForExpandable = () => {
    if (!data) return { metrics: {}, chartData: [], sources: [], insights: [] };

    const metrics: Record<string, any> = {};
    const chartData: any[] = [];
    const sources: any[] = [];
    const insights: string[] = [];

    try {
      // Extract metrics based on tile type
      switch (tileType) {
        case 'market_size':
          if (data.metrics) {
            data.metrics.forEach((m: any) => {
              metrics[m.name.toLowerCase()] = m.value;
            });
          }
          if (data.segments) {
            chartData.push(...data.segments.map((s: any) => ({
              name: s.name,
              value: s.share,
              growth: s.growth
            })));
          }
          if (data.sources) {
            sources.push(...data.sources.map((s: any) => ({
              name: s.title || 'Market Research',
              description: s.snippet || 'Market size data source',
              url: s.link,
              reliability: 'medium' as const
            })));
          }
          insights.push(
            `TAM of $${metrics.tam || 0}M represents a significant opportunity`,
            `Focus on capturing ${metrics.som || 0}M in the next 3 years`,
            `Market growing at ${metrics.cagr || 15}% annually`
          );
          break;

        case 'competition':
          metrics.competition_level = data.level;
          metrics.total_competitors = data.metrics?.total || 0;
          metrics.direct_competitors = data.metrics?.direct || 0;
          
          if (data.competitors) {
            chartData.push(...data.competitors.map((c: any, i: number) => ({
              name: c.name,
              value: 100 - (i * 15), // Mock market share
              type: c.type
            })));
          }
          
          insights.push(...(data.insights || []));
          break;

        case 'growth_projections':
          if (data.metrics) {
            data.metrics.forEach((m: any) => {
              const key = m.name.toLowerCase().replace(/ /g, '_');
              metrics[key] = m.value;
            });
          }
          
          if (data.series) {
            const series = data.series.find((s: any) => s.name === 'Base Case');
            if (series) {
              series.data.forEach((value: number, index: number) => {
                chartData.push({
                  name: series.labels?.[index] || `Month ${index + 1}`,
                  value,
                  conservative: data.series.find((s: any) => s.name === 'Conservative')?.data[index],
                  aggressive: data.series.find((s: any) => s.name === 'Aggressive')?.data[index]
                });
              });
            }
          }
          
          insights.push(
            'Growth trajectory shows strong momentum',
            'Multiple expansion scenarios indicate scalability',
            'Market conditions favor rapid growth'
          );
          break;

        case 'reddit_sentiment':
          metrics.sentiment_score = data.sentiment?.score || 0;
          metrics.total_mentions = data.mentions || 0;
          metrics.trending_score = data.trending || 0;
          
          if (data.posts) {
            chartData.push(...data.posts.slice(0, 10).map((post: any) => ({
              name: post.subreddit || 'reddit',
              value: post.score || 0
            })));
          }
          
          insights.push(
            `Community sentiment is ${data.sentiment?.label || 'neutral'}`,
            `${data.mentions || 0} recent discussions found`,
            'Reddit can be an early indicator of market interest'
          );
          
          sources.push({
            name: 'Reddit API',
            description: 'Real-time community discussions and sentiment',
            url: 'https://reddit.com',
            reliability: 'medium' as const
          });
          break;

        case 'google_trends':
          metrics.search_interest = data.interest_over_time?.average || 0;
          metrics.trend_direction = data.trend?.direction || 'stable';
          
          if (data.interest_over_time?.data) {
            chartData.push(...data.interest_over_time.data.map((point: any) => ({
              name: point.date,
              value: point.value
            })));
          }
          
          insights.push(
            `Search interest is ${data.trend?.direction || 'stable'}`,
            'Google Trends shows market awareness levels',
            'Higher search volume indicates growing demand'
          );
          
          sources.push({
            name: 'Google Trends',
            description: 'Search interest and related queries',
            url: 'https://trends.google.com',
            reliability: 'high' as const
          });
          break;

        default:
          // Generic data processing
          if (data.value) metrics.value = data.value;
          if (data.trend) metrics.trend = data.trend;
          if (data.items) {
            chartData.push(...data.items.slice(0, 10).map((item: any) => ({
              name: item.title || item.name,
              value: item.value || Math.random() * 100
            })));
          }
      }
    } catch (error) {
      console.error('Error processing data for expandable tile:', error);
      insights.push('Data processing encountered an issue. Please try refreshing.');
    }

    return { metrics, chartData, sources, insights };
  };

  const { metrics, chartData, sources, insights } = processDataForExpandable();

  // Determine explanations based on available metrics
  const availableExplanations: Record<string, any> = {};
  if (metrics && typeof metrics === 'object') {
    Object.keys(metrics).forEach(key => {
      if (metricExplanations[key]) {
        availableExplanations[key] = metricExplanations[key];
      }
    });
  }

  // Default content rendering
  const defaultRenderContent = () => {
    if (!data) return null;

    // Market Size specific rendering
    if (tileType === 'market_size' && data.metrics) {
      const tam = data.metrics.find((m: any) => m.name === 'TAM');
      const sam = data.metrics.find((m: any) => m.name === 'SAM');
      const som = data.metrics.find((m: any) => m.name === 'SOM');

      return (
        <div className="space-y-4">
          {tam && (
            <div>
              <div className="text-2xl font-bold">${tam.value}M</div>
              <div className="text-xs text-muted-foreground">Total Addressable Market</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {sam && (
              <div>
                <div className="font-semibold">${sam.value}M</div>
                <div className="text-xs text-muted-foreground">SAM</div>
              </div>
            )}
            {som && (
              <div>
                <div className="font-semibold">${som.value}M</div>
                <div className="text-xs text-muted-foreground">SOM</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Competition specific rendering
    if (tileType === 'competition' && data.level) {
      return (
        <div className="space-y-3">
          <div>
            <Badge 
              variant={
                data.level === 'Low' ? 'default' : 
                data.level === 'Medium' ? 'secondary' : 
                'destructive'
              }
            >
              {data.level} Competition
            </Badge>
          </div>
          {data.competitors && data.competitors.length > 0 && (
            <div className="space-y-2">
              {data.competitors.slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <Badge variant="outline" className="text-xs">{c.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Growth projections specific rendering
    if (tileType === 'growth_projections' && data.series) {
      const baseCase = data.series.find((s: any) => s.name === 'Base Case');
      if (baseCase && baseCase.data.length > 0) {
        const growth = ((baseCase.data[baseCase.data.length - 1] - baseCase.data[0]) / baseCase.data[0]) * 100;
        return (
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">+{growth.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Projected Growth</div>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.slice(0, 6)}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }
    }

    // Reddit sentiment specific rendering
    if (tileType === 'reddit_sentiment' && data.sentiment) {
      return (
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold">{data.sentiment.score?.toFixed(1) || '0'}</div>
            <div className="text-xs text-muted-foreground">Sentiment Score</div>
          </div>
          {data.posts && data.posts.length > 0 && (
            <div className="space-y-1">
              {data.posts.slice(0, 2).map((post: any, i: number) => (
                <div key={i} className="text-xs text-muted-foreground truncate">
                  r/{post.subreddit}: {post.title}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Generic fallback with proper data display
    return (
      <div className="space-y-3">
        {/* Primary metric display */}
        {(data.value !== undefined || data.metrics?.length > 0) && (
          <div>
            <div className="text-2xl font-bold">
              {data.value || data.metrics?.[0]?.value || '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.label || data.metrics?.[0]?.name || 'Primary Metric'}
            </div>
          </div>
        )}

        {/* Secondary metrics */}
        {data.metrics && data.metrics.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {data.metrics.slice(1, 3).map((metric: any, i: number) => (
              <div key={i}>
                <div className="text-sm font-medium">{metric.value}</div>
                <div className="text-xs text-muted-foreground">{metric.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* Simple list items */}
        {data.items && data.items.length > 0 && (
          <div className="space-y-1">
            {data.items.slice(0, 2).map((item: any, i: number) => (
              <div key={i} className="text-sm truncate">
                {item.title || item.name}
              </div>
            ))}
          </div>
        )}

        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
      </div>
    );
  };

  const Icon = icon;
  
  // Determine chart type based on tile type
  const getChartType = () => {
    switch (tileType) {
      case 'market_size': return 'pie';
      case 'competition': return 'bar';
      case 'growth_projections': return 'area';
      case 'reddit_sentiment': return 'bar';
      case 'google_trends': return 'line';
      default: return 'line';
    }
  };

  // Get data source indicator
  const getDataSource = () => {
    if (data?.fromDatabase) return 'Database';
    if (data?.fromCache) return 'Cached';
    return 'Live';
  };

  return (
    <>
      <ExpandableTile
        title={title}
        description={description}
        icon={<Icon className="h-5 w-5" />}
        data={data}
        chartData={chartData}
        sources={sources}
        metrics={metrics}
        metricExplanations={availableExplanations}
        insights={insights}
        rawData={data}
        chartType={getChartType()}
        className={className}
        loading={isLoading}
        error={error ? String(error) : undefined}
        quickInfo={`This tile shows ${title.toLowerCase()} data. Click to explore detailed metrics, calculations, and insights.`}
        badge={
          data ? {
            label: getDataSource(),
            variant: data.fromDatabase ? 'default' : data.fromCache ? 'secondary' : 'outline'
          } : undefined
        }
        trend={
          data?.trend ? {
            value: data.trend,
            label: 'vs last period',
            positive: data.trend > 0
          } : undefined
        }
        onExpand={() => {
          console.log(`Expanding ${tileType} tile with data:`, data);
        }}
      >
        {renderContent ? renderContent(data) : defaultRenderContent()}
      </ExpandableTile>

      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}