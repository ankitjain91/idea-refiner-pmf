import React, { useState, useEffect } from 'react';
import { Building2, ExternalLink, RefreshCw, TrendingUp, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CompetitorData {
  name: string;
  url?: string;
  marketShare: number;
  valuation?: string;
  fundingStage?: string;
  strength: 'strong' | 'moderate' | 'weak';
}

interface CompetitionAPIResponse {
  success: boolean;
  data: {
    topCompetitors: CompetitorData[];
    marketConcentration: string;
    barrierToEntry: string;
  };
}

interface CompetitionAnalysisProps {
  idea?: string;
  className?: string;
}

export function CompetitionAnalysis({ idea, className }: CompetitionAnalysisProps) {
  const [data, setData] = useState<CompetitionAPIResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get idea from multiple sources
  const getIdea = (): string => {
    const parseAppIdea = (): string | null => {
      try {
        const appIdea = localStorage.getItem('appIdea');
        if (appIdea) {
          const parsed = JSON.parse(appIdea);
          return parsed.summary || parsed.idea || null;
        }
      } catch (e) {
        const raw = localStorage.getItem('appIdea');
        if (raw && raw.length > 30) return raw;
      }
      return null;
    };

    const sources = [
      idea,
      parseAppIdea(),
      localStorage.getItem('dashboardIdea'),
      localStorage.getItem('currentIdea'),
    ];

    for (const source of sources) {
      if (source && source.trim().length > 30) {
        return source.trim();
      }
    }

    return '';
  };

  const currentIdea = getIdea();

  const fetchCompetitionData = async () => {
    if (!currentIdea) {
      setError('No idea available to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: response, error: apiError } = await supabase.functions.invoke('competitive-landscape', {
        body: { idea: currentIdea, depth: 'comprehensive' }
      });

      if (apiError) throw apiError;

      if (response?.success && response?.data?.topCompetitors) {
        setData(response.data);
        toast({
          title: 'Competition data loaded',
          description: `Found ${response.data.topCompetitors.length} competitors`,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Competition fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load competition data');
      toast({
        title: 'Error loading competition data',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentIdea) {
      fetchCompetitionData();
    }
  }, []);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'moderate': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'weak': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading && !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Competition Analysis
            <div className="flex items-center gap-1 ml-2">
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Competition Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchCompetitionData} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Competition Analysis
              {loading && (
                <div className="flex items-center gap-1 ml-2">
                  <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Updating...</span>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {data.topCompetitors.length} competitors identified
            </CardDescription>
          </div>
          <Button onClick={fetchCompetitionData} size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Market Concentration</p>
            </div>
            <p className="text-lg font-semibold">{data.marketConcentration}</p>
          </div>
          
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Barriers to Entry</p>
            </div>
            <p className="text-lg font-semibold">{data.barrierToEntry}</p>
          </div>
        </div>

        {/* Competitors List */}
        <div>
          <h3 className="text-sm font-medium mb-3">Identified Competitors</h3>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {data.topCompetitors.map((competitor, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base mb-1 flex items-center gap-2 flex-wrap">
                        <span className="truncate">{competitor.name}</span>
                        <Badge variant="outline" className={getStrengthColor(competitor.strength)}>
                          {competitor.strength}
                        </Badge>
                      </h4>
                      {competitor.url && (
                        <a
                          href={competitor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 mb-2"
                        >
                          View source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-2xl font-bold text-primary">{competitor.marketShare}%</p>
                      <p className="text-xs text-muted-foreground">market share</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {competitor.valuation && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Valuation</p>
                        <p className="font-medium">{competitor.valuation}</p>
                      </div>
                    )}
                    {competitor.fundingStage && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Funding Stage</p>
                        <p className="font-medium">{competitor.fundingStage}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
