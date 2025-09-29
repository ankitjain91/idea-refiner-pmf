import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, Building2, Sparkles,
  RefreshCw, HelpCircle, Activity, AlertCircle, ChevronRight,
  Zap, Info, BarChart2, PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { TileInsightsDialog } from './TileInsightsDialog';

interface QuickStatsTileProps {
  title: string;
  icon: React.ElementType;
  tileType: 'pmf_score' | 'market_size' | 'competition' | 'sentiment';
  currentIdea: string;
  onAnalyze?: () => void;
}

export function QuickStatsTile({ 
  title, 
  icon: Icon, 
  tileType, 
  currentIdea,
  onAnalyze
}: QuickStatsTileProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasCheckedCache, setHasCheckedCache] = useState(false);

  const fetchData = async (forceRefresh = false) => {
    if (!currentIdea) return;
    
    // Check cache first (1 hour = 3600000ms)
    const cacheKey = `tile_cache_${tileType}_${currentIdea}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!forceRefresh && cached) {
      const parsedCache = JSON.parse(cached);
      const cacheAge = Date.now() - parsedCache.timestamp;
      const ONE_HOUR = 3600000;
      
      if (cacheAge < ONE_HOUR) {
        setData(parsedCache.data);
        setLastRefresh(new Date(parsedCache.timestamp));
        return;
      }
    }
    
    setLoading(true);
    try {
      let response;
      
      switch (tileType) {
        case 'pmf_score':
          // PMF Score needs data from other tiles - delay slightly to let them load first
          await new Promise(resolve => setTimeout(resolve, 500));
          const marketSize = localStorage.getItem('market_size_value') || '$5B';
          const competition = localStorage.getItem('competition_value') || 'Medium';
          const sentiment = localStorage.getItem('sentiment_value') || '50%';
          
          response = await supabase.functions.invoke('pmf-score', {
            body: { idea: currentIdea, marketSize, competition, sentiment }
          });
          break;
          
        case 'market_size':
          response = await supabase.functions.invoke('market-size', {
            body: { idea: currentIdea, industry: '', geography: 'global' }
          });
          if (response.data) {
            // Store for PMF calculation
            const value = `$${response.data.metrics?.[0]?.value || 5}${response.data.metrics?.[0]?.unit || 'B'}`;
            localStorage.setItem('market_size_value', value);
          }
          break;
          
        case 'competition':
          response = await supabase.functions.invoke('competition', {
            body: { idea: currentIdea, industry: '' }
          });
          if (response.data) {
            localStorage.setItem('competition_value', response.data.level);
          }
          break;
          
        case 'sentiment':
          response = await supabase.functions.invoke('sentiment', {
            body: { idea: currentIdea }
          });
          if (response.data) {
            localStorage.setItem('sentiment_value', `${response.data.sentiment}%`);
          }
          break;
      }
      
      if (response?.data) {
        setData(response.data);
        setLastRefresh(new Date());
        
        // Cache the data
        localStorage.setItem(cacheKey, JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error(`Error fetching ${tileType} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Don't auto-load - user must click Load Data button
  useEffect(() => {
    // Check cache only when idea changes
    if (currentIdea && !hasCheckedCache) {
      setHasCheckedCache(true);
      
      // Check cache first
      const cacheKey = `tile_cache_${tileType}_${currentIdea}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const cacheAge = Date.now() - parsedCache.timestamp;
        const ONE_HOUR = 3600000;
        
        if (cacheAge < ONE_HOUR) {
          setData(parsedCache.data);
          setLastRefresh(new Date(parsedCache.timestamp));
        }
      }
    }
  }, [currentIdea, hasCheckedCache]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      );
    }
    
    if (!data) {
      return (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => fetchData()}
          className="text-xs"
        >
          Load Data
        </Button>
      );
    }
    
    switch (tileType) {
      case 'pmf_score':
        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">
                {data.score}%
              </p>
              {data.trend && (
                data.trend === 'positive' ? 
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" /> :
                data.trend === 'negative' ?
                  <ArrowDownRight className="h-4 w-4 text-red-500" /> :
                  <Activity className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{data.rationale}</p>
          </div>
        );
        
      case 'market_size':
        const tam = data.metrics?.find((m: any) => m.name === 'TAM');
        return (
          <div className="space-y-2">
            <p className="text-2xl font-semibold">
              ${tam?.value || 0}{tam?.unit || 'M'}
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {data.metrics?.find((m: any) => m.name === 'CAGR')?.value || 15}% CAGR
              </span>
            </div>
          </div>
        );
        
      case 'competition':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary"
                className={cn(
                  "font-medium",
                  data.level === 'Low' && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                  data.level === 'Medium' && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
                  data.level === 'High' && "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                )}
              >
                {data.level}
              </Badge>
            </div>
            {data.competitors && data.competitors.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {data.competitors.slice(0, 3).map((c: any) => c.name).join(', ')}
              </p>
            )}
          </div>
        );
        
      case 'sentiment':
        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">
                {data.sentiment}%
              </p>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs font-normal",
                  data.sentiment > 70 && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                  data.sentiment > 40 && data.sentiment <= 70 && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                  data.sentiment <= 40 && "bg-red-500/10 text-red-700 dark:text-red-400"
                )}
              >
                {data.sentiment > 70 ? 'Positive' : 
                 data.sentiment > 40 ? 'Mixed' : 
                 'Negative'}
              </Badge>
            </div>
            <div className="flex gap-1 h-2">
              <div 
                className="bg-emerald-500/20 rounded-l" 
                style={{ width: `${data.distribution?.positive || 0}%` }}
              >
                <div className="h-full bg-emerald-500 rounded-l" style={{ width: '100%' }} />
              </div>
              <div 
                className="bg-yellow-500/20" 
                style={{ width: `${data.distribution?.neutral || 0}%` }}
              >
                <div className="h-full bg-yellow-500" style={{ width: '100%' }} />
              </div>
              <div 
                className="bg-red-500/20 rounded-r" 
                style={{ width: `${data.distribution?.negative || 0}%` }}
              >
                <div className="h-full bg-red-500 rounded-r" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden border-border/50 hover:border-border transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                {lastRefresh && (
                  <p className="text-xs text-muted-foreground">
                    {new Date().getTime() - lastRefresh.getTime() < 60000 
                      ? 'Just now'
                      : `${Math.floor((new Date().getTime() - lastRefresh.getTime()) / 60000)}m ago`}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => fetchData(true)}
              disabled={loading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
          
          {renderContent()}
        </CardContent>
      </Card>
    </>
  );
}