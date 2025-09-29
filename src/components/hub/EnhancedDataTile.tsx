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

  const fetchTileData = useCallback(async () => {
    try {
      const result = await fetchAdapter(filters);
      return result;
    } catch (error) {
      console.error(`Error fetching ${tileType} data:`, error);
      throw error;
    }
  }, [tileType, filters, fetchAdapter]);

  const { data, isLoading, error, loadData } = useTileData(fetchTileData, [filters]);

  const renderBeautifulContent = () => {
    if (!data) return null;

    // Custom render function provided
    if (renderContent) {
      return renderContent(data);
    }

    return (
      <div className="space-y-4">
        {/* Metrics Grid */}
        {data.metrics && data.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {data.metrics.slice(0, 4).map((metric: any, idx: number) => (
              <MetricCard
                key={idx}
                label={metric.label}
                value={metric.value}
                change={metric.change}
                icon={metric.icon}
                trend={metric.trend}
              />
            ))}
          </div>
        )}

        {/* Chart Section */}
        {data.chart && data.chart.data && data.chart.data.length > 0 && (
          <div className="p-4 bg-muted/20 rounded-xl">
            <h4 className="text-sm font-medium mb-3">{data.chart.title || 'Trend Analysis'}</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.chart.data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Segments or Categories */}
        {data.segments && data.segments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Segments</h4>
            {data.segments.map((segment: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                <span className="text-sm">{segment.name}</span>
                <div className="flex items-center gap-2">
                  <Progress value={segment.percentage} className="w-20 h-2" />
                  <span className="text-xs font-medium">{segment.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Key Drivers */}
        {data.drivers && data.drivers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Growth Drivers</h4>
            <div className="space-y-2">
              {data.drivers.map((driver: any, idx: number) => (
                <ListItem
                  key={idx}
                  title={driver.name}
                  subtitle={driver.description}
                  value={driver.impact}
                  icon={TrendingUp}
                  badge={driver.priority ? { 
                    text: driver.priority, 
                    variant: driver.priority === 'High' ? 'default' : 'secondary' 
                  } : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Milestones Timeline */}
        {data.milestones && data.milestones.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Timeline</h4>
            <div className="space-y-1">
              {data.milestones.map((milestone: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 p-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{milestone.date}</span>
                  <span className="text-sm flex-1">{milestone.title}</span>
                  {milestone.status && (
                    <Badge variant={milestone.status === 'Completed' ? 'default' : 'outline'} className="text-xs">
                      {milestone.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items List */}
        {data.items && data.items.length > 0 && (
          <div className="space-y-2">
            {data.items.slice(0, 5).map((item: any, idx: number) => (
              <ListItem
                key={idx}
                title={item.name || item.title}
                subtitle={item.description}
                value={item.value}
                badge={item.category ? { text: item.category } : undefined}
              />
            ))}
          </div>
        )}

        {/* Profit Insights */}
        {data.profit_insights && (
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <h4 className="text-sm font-medium">Profitability Analysis</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Margin</p>
                <p className="text-lg font-bold text-green-600">{data.profit_insights.margin}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Break-even</p>
                <p className="text-lg font-bold">{data.profit_insights.breakeven}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {data && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInsights(true)}
              className="w-full"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Analyze Insights
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <BaseTile
        title={title}
        icon={icon}
        description={description}
        isLoading={isLoading}
        error={error}
        data={data}
        onLoad={loadData}
        autoLoad={true}
        className={className}
      >
        {renderBeautifulContent()}
      </BaseTile>

      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}