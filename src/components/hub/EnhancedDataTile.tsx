import { useState, useCallback } from 'react';
import { BaseTile, MetricCard, ListItem, useTileData } from './BaseTile';
import { TileInsightsDialog } from './TileInsightsDialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Sparkles, TrendingUp, TrendingDown, Target, DollarSign, Calendar, Users, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Activity, Zap, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { motion } from 'framer-motion';

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

const chartColors = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))'
};

const getTrendIcon = (trend?: string) => {
  if (!trend) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (trend === 'up') return <ArrowUpRight className="h-3 w-3 text-success" />;
  if (trend === 'down') return <ArrowDownRight className="h-3 w-3 text-destructive" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

const formatMetricValue = (value: any, unit?: string) => {
  if (typeof value === 'number') {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return unit ? `${value}${unit}` : value.toLocaleString();
  }
  return value;
};

export function EnhancedDataTile({
  title,
  icon: Icon,
  tileType,
  filters,
  description,
  fetchAdapter,
  renderContent,
  className
}: EnhancedDataTileProps) {
  const [showInsights, setShowInsights] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<number | null>(null);
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

  const renderBeautifulContent = () => {
    if (!data) return null;

    // Custom render function provided
    if (renderContent) {
      return renderContent(data);
    }

    return (
      <div className="space-y-4">
        {/* Enhanced Metrics Grid with Animations */}
        {data.metrics && data.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {data.metrics.map((metric: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedMetric(selectedMetric === idx ? null : idx)}
                className={cn(
                  "relative p-4 rounded-xl cursor-pointer transition-all duration-300",
                  "bg-gradient-to-br from-card to-card/50 border border-border/50",
                  "hover:border-primary/30 hover:shadow-glow-primary",
                  selectedMetric === idx && "ring-2 ring-primary/50 border-primary/50"
                )}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 rounded-xl opacity-5">
                  <div className="absolute inset-0 bg-gradient-mesh" />
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {metric.label || metric.name}
                    </span>
                    {getTrendIcon(metric.trend)}
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {formatMetricValue(metric.value, metric.unit)}
                    </span>
                    {metric.change && (
                      <Badge 
                        variant={metric.trend === 'up' ? 'default' : 'secondary'}
                        className={cn(
                          "text-xs h-5",
                          metric.trend === 'up' ? "bg-success/10 text-success border-success/20" : 
                          metric.trend === 'down' ? "bg-destructive/10 text-destructive border-destructive/20" :
                          "bg-muted/50 text-muted-foreground border-border"
                        )}
                      >
                        {metric.change}
                      </Badge>
                    )}
                  </div>
                  
                  {metric.explanation && selectedMetric === idx && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-muted-foreground mt-2 leading-relaxed"
                    >
                      {metric.explanation}
                    </motion.p>
                  )}
                </div>

                {/* Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Enhanced Chart Section with Multiple Chart Types */}
        {data.chart && data.chart.data && data.chart.data.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative p-4 rounded-xl bg-gradient-to-br from-muted/20 to-muted/10 border border-border/50 backdrop-blur-sm overflow-hidden"
          >
            {/* Background Animation */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-gradient-mesh animate-pulse" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {data.chart.title || 'Trend Analysis'}
                </h4>
                <Badge variant="outline" className="text-xs">
                  Live Data
                </Badge>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                {tileType === 'growth_projections' ? (
                  <AreaChart data={data.chart.data}>
                    <defs>
                      <linearGradient id={`gradient-${tileType}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={chartColors.primary}
                      strokeWidth={2}
                      fill={`url(#gradient-${tileType})`}
                    />
                    {data.chart.data[0]?.secondary && (
                      <Area 
                        type="monotone" 
                        dataKey="secondary" 
                        stroke={chartColors.accent}
                        strokeWidth={2}
                        fill={`url(#gradient-${tileType}-secondary)`}
                      />
                    )}
                  </AreaChart>
                ) : tileType === 'market_size' ? (
                  <BarChart data={data.chart.data}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill={chartColors.primary}
                      radius={[8, 8, 0, 0]}
                      className="hover:opacity-80 transition-opacity"
                    />
                  </BarChart>
                ) : (
                  <LineChart data={data.chart.data}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="label" className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={chartColors.primary}
                      strokeWidth={3}
                      dot={{ fill: chartColors.primary, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* List Items with Enhanced Design */}
        {data.items && data.items.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            {data.items.slice(0, 3).map((item: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + idx * 0.05 }}
                className="group p-3 rounded-lg bg-muted/5 border border-border/30 hover:border-primary/20 hover:bg-muted/10 transition-all duration-300"
              >
                <ListItem
                  title={item.title}
                  subtitle={item.description || item.snippet}
                  value={item.source || item.published}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Enhanced Insights Section */}
        {data.insights && data.insights.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-warning animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key Insights
              </span>
            </div>
            <div className="grid gap-2">
              {data.insights.slice(0, 3).map((insight: string, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + idx * 0.1 }}
                  className="group flex items-start gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-border/30 hover:border-primary/30 hover:from-primary/10 transition-all duration-300"
                >
                  <ChevronRight className="h-3 w-3 text-primary mt-0.5 group-hover:translate-x-1 transition-transform" />
                  <span className="text-xs text-foreground/80 leading-relaxed">
                    {insight}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Progress Indicator for Loading States */}
        {data.loading && (
          <Progress value={60} className="h-1" />
        )}
      </div>
    );
  };

  return (
    <>
      <BaseTile
        title={title}
        icon={Icon}
        description={description}
        className={cn(
          "group relative overflow-hidden transition-all duration-500",
          "hover:shadow-glow hover:-translate-y-1",
          "bg-gradient-to-br from-card via-card to-card/90",
          "border-border/50 hover:border-primary/30",
          className
        )}
        isLoading={isLoading}
        error={error ? String(error) : undefined}
        onLoad={loadData}
        headerActions={
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Enhanced
          </Badge>
        }
        badge={data?.fromDatabase ? {
          text: 'Cached',
          variant: 'secondary' as const
        } : undefined}
      >
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        
        {/* Content */}
        <div className="relative">
          {renderBeautifulContent()}
        </div>
      </BaseTile>

      <TileInsightsDialog
        open={showInsights}
        onOpenChange={() => setShowInsights(false)}
        tileType={tileType}
      />
    </>
  );
}