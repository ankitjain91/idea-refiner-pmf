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

  const getColorClass = () => {
    switch (tileType) {
      case 'pmf_score':
        return 'from-blue-500/10 to-cyan-500/10 border-blue-500/20';
      case 'market_size':
        return 'from-emerald-500/10 to-green-500/10 border-emerald-500/20';
      case 'competition':
        return 'from-amber-500/10 to-orange-500/10 border-amber-500/20';
      case 'sentiment':
        return 'from-purple-500/10 to-pink-500/10 border-purple-500/20';
      default:
        return 'from-gray-500/10 to-gray-600/10 border-gray-500/20';
    }
  };

  const getIconColorClass = () => {
    switch (tileType) {
      case 'pmf_score':
        return 'text-blue-500';
      case 'market_size':
        return 'text-emerald-500';
      case 'competition':
        return 'text-amber-500';
      case 'sentiment':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const renderDetailedContent = () => {
    if (!data) return null;
    
    switch (tileType) {
      case 'pmf_score':
        return (
          <div className="mt-4 space-y-3 animate-fade-in">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Market Opportunity</span>
                <span className="font-medium">{data.breakdown?.market || 0}%</span>
              </div>
              <Progress value={data.breakdown?.market || 0} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Competition Gap</span>
                <span className="font-medium">{data.breakdown?.competition || 0}%</span>
              </div>
              <Progress value={data.breakdown?.competition || 0} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">User Sentiment</span>
                <span className="font-medium">{data.breakdown?.sentiment || 0}%</span>
              </div>
              <Progress value={data.breakdown?.sentiment || 0} className="h-1.5" />
            </div>
          </div>
        );
        
      case 'market_size':
        return (
          <div className="mt-4 space-y-3 animate-fade-in">
            {data.metrics?.map((metric: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                <span className="text-xs font-medium">{metric.name}</span>
                <Badge variant="secondary">
                  ${metric.value}{metric.unit}
                </Badge>
              </div>
            ))}
            {data.sources && (
              <div className="text-xs text-muted-foreground">
                Sources: {data.sources.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        );
        
      case 'competition':
        return (
          <div className="mt-4 space-y-3 animate-fade-in">
            {data.competitors?.slice(0, 3).map((comp: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    comp.strength === 'High' ? 'bg-red-500' : 
                    comp.strength === 'Medium' ? 'bg-yellow-500' : 
                    'bg-green-500'
                  )} />
                  <span className="text-xs font-medium">{comp.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {comp.funding || 'N/A'}
                </Badge>
              </div>
            ))}
            {data.analysis && (
              <p className="text-xs text-muted-foreground">{data.analysis}</p>
            )}
          </div>
        );
        
      case 'sentiment':
        return (
          <div className="mt-4 space-y-3 animate-fade-in">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-green-500/10 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {data.distribution?.positive || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Positive</div>
              </div>
              <div className="text-center p-2 bg-yellow-500/10 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">
                  {data.distribution?.neutral || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Neutral</div>
              </div>
              <div className="text-center p-2 bg-red-500/10 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {data.distribution?.negative || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Negative</div>
              </div>
            </div>
            {data.highlights && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Key Insights:</p>
                {data.highlights.slice(0, 2).map((highlight: string, idx: number) => (
                  <p key={idx} className="text-xs text-muted-foreground">• {highlight}</p>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      );
    }
    
    if (!data) {
      return (
        <Button 
          size="sm" 
          variant="outline"
          onClick={fetchData}
          className="w-full bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border-primary/20"
        >
          <Zap className="mr-2 h-3.5 w-3.5" />
          Load Data
        </Button>
      );
    }
    
    switch (tileType) {
      case 'pmf_score':
        return (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {data.score}%
              </p>
              {data.trend && (
                data.trend === 'positive' ? 
                  <ArrowUpRight className="h-6 w-6 text-green-500 animate-pulse" /> :
                data.trend === 'negative' ?
                  <ArrowDownRight className="h-6 w-6 text-red-500 animate-pulse" /> :
                  <Activity className="h-6 w-6 text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{data.rationale}</p>
            <div className="flex items-center gap-2">
              <Badge 
                variant={data.score > 70 ? 'default' : data.score > 40 ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {data.score > 70 ? 'Strong' : data.score > 40 ? 'Moderate' : 'Weak'} Fit
              </Badge>
              <Badge variant="outline" className="text-xs">
                {data.confidence || 85}% Confidence
              </Badge>
            </div>
          </div>
        );
        
      case 'market_size':
        const tam = data.metrics?.find((m: any) => m.name === 'TAM');
        const sam = data.metrics?.find((m: any) => m.name === 'SAM');
        return (
          <div className="space-y-2">
            <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              ${tam?.value || 0}{tam?.unit || 'M'}
            </p>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">
                {data.metrics?.find((m: any) => m.name === 'CAGR')?.value || 15}% CAGR
              </span>
            </div>
            {sam && (
              <Badge variant="secondary" className="text-xs">
                SAM: ${sam.value}{sam.unit}
              </Badge>
            )}
          </div>
        );
        
      case 'competition':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge 
                variant={
                  data.level === 'Low' ? 'default' :
                  data.level === 'High' ? 'destructive' :
                  'secondary'
                }
                className={cn(
                  "text-lg py-1.5 px-3",
                  data.level === 'Low' && "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
                  data.level === 'Medium' && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
                  data.level === 'High' && "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                )}
              >
                {data.level} Competition
              </Badge>
            </div>
            {data.competitors && data.competitors.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.competitors.slice(0, 3).map((c: any) => (
                  <Badge key={c.name} variant="outline" className="text-xs">
                    {c.name}
                  </Badge>
                ))}
                {data.competitors.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{data.competitors.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        );
        
      case 'sentiment':
        return (
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {data.sentiment}%
              </p>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  data.sentiment > 70 && "bg-green-500/10 text-green-700 dark:text-green-400",
                  data.sentiment > 40 && data.sentiment <= 70 && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
                  data.sentiment <= 40 && "bg-red-500/10 text-red-700 dark:text-red-400"
                )}
              >
                {data.sentiment > 70 ? 'Positive' : 
                 data.sentiment > 40 ? 'Mixed' : 
                 'Negative'}
              </Badge>
            </div>
            <div className="flex gap-1 h-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="bg-green-500 rounded-l-full transition-all hover:opacity-80 cursor-pointer" 
                      style={{ width: `${(data.distribution?.positive / (data.distribution?.positive + data.distribution?.neutral + data.distribution?.negative)) * 100}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Positive: {data.distribution?.positive}%</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="bg-yellow-500 transition-all hover:opacity-80 cursor-pointer" 
                      style={{ width: `${(data.distribution?.neutral / (data.distribution?.positive + data.distribution?.neutral + data.distribution?.negative)) * 100}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Neutral: {data.distribution?.neutral}%</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="bg-red-500 rounded-r-full transition-all hover:opacity-80 cursor-pointer" 
                      style={{ width: `${(data.distribution?.negative / (data.distribution?.positive + data.distribution?.neutral + data.distribution?.negative)) * 100}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Negative: {data.distribution?.negative}%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-xl",
        "bg-gradient-to-br",
        getColorClass(),
        "border",
        expanded && "md:col-span-2"
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-background/50 backdrop-blur", getIconColorClass())}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
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
                className="h-8 w-8"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          
          {renderContent()}
          
          {expanded && data && renderDetailedContent()}
          
          {data && (
            <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs bg-background/50 hover:bg-background/80"
                onClick={onAnalyze}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Analyze
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs bg-background/50 hover:bg-background/80"
                onClick={() => setShowInsights(true)}
              >
                <Info className="mr-1 h-3 w-3" />
                How it Works
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