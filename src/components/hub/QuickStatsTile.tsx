import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, Building2, Sparkles,
  RefreshCw, HelpCircle, Activity
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

  const fetchData = async () => {
    if (!currentIdea) return;
    
    setLoading(true);
    try {
      let response;
      
      switch (tileType) {
        case 'pmf_score':
          // PMF Score needs data from other tiles
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
      }
    } catch (error) {
      console.error(`Error fetching ${tileType} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch on mount if idea exists
    if (currentIdea) {
      fetchData();
    }
  }, [currentIdea]);

  const renderContent = () => {
    if (loading) {
      return <Skeleton className="h-8 w-20" />;
    }
    
    if (!data) {
      return (
        <Button 
          size="sm" 
          variant="outline"
          onClick={fetchData}
          className="text-xs"
        >
          Load Data
        </Button>
      );
    }
    
    switch (tileType) {
      case 'pmf_score':
        return (
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-primary">{data.score}%</p>
              {data.trend && (
                data.trend === 'positive' ? 
                  <ArrowUpRight className="h-5 w-5 text-green-500" /> :
                data.trend === 'negative' ?
                  <ArrowDownRight className="h-5 w-5 text-red-500" /> :
                  <Activity className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{data.rationale}</p>
          </div>
        );
        
      case 'market_size':
        const tam = data.metrics?.find((m: any) => m.name === 'TAM');
        return (
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">
              ${tam?.value || 0}{tam?.unit || 'M'}
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-muted-foreground">
                {data.metrics?.find((m: any) => m.name === 'CAGR')?.value || 15}% CAGR
              </span>
            </div>
          </div>
        );
        
      case 'competition':
        return (
          <div className="space-y-2">
            <Badge 
              variant={
                data.level === 'Low' ? 'default' :
                data.level === 'High' ? 'destructive' :
                'secondary'
              }
              className="text-lg py-1"
            >
              {data.level}
            </Badge>
            {data.competitors && data.competitors.length > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {data.competitors.slice(0, 3).map((c: any) => c.name).join(', ')}
              </p>
            )}
          </div>
        );
        
      case 'sentiment':
        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-primary">{data.sentiment}%</p>
              <Badge variant="secondary" className="text-xs">
                {data.sentiment > 70 ? 'Positive' : 
                 data.sentiment > 40 ? 'Mixed' : 
                 'Negative'}
              </Badge>
            </div>
            <div className="flex gap-1">
              <div className="flex-1 h-2 bg-green-500/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500" 
                  style={{ width: `${(data.distribution?.positive / (data.distribution?.positive + data.distribution?.neutral + data.distribution?.negative)) * 100}%` }}
                />
              </div>
              <div className="flex-1 h-2 bg-yellow-500/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500" 
                  style={{ width: `${(data.distribution?.neutral / (data.distribution?.positive + data.distribution?.neutral + data.distribution?.negative)) * 100}%` }}
                />
              </div>
              <div className="flex-1 h-2 bg-red-500/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500" 
                  style={{ width: `${(data.distribution?.negative / (data.distribution?.positive + data.distribution?.neutral + data.distribution?.negative)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10" />
          
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                {lastRefresh && (
                  <p className="text-xs text-muted-foreground">
                    Updated {lastRefresh.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowInsights(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          
          {renderContent()}
          
          {data && (
            <div className="mt-3 pt-3 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={onAnalyze}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setShowInsights(true)}
              >
                <HelpCircle className="mr-1 h-3 w-3" />
                How this works
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <TileInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        tileType={tileType}
      />
    </>
  );
}