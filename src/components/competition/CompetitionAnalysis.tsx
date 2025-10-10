import React, { useState, useEffect, useCallback } from 'react';
import { Building2, ExternalLink, RefreshCw, TrendingUp, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLockedIdea } from '@/hooks/useLockedIdea';

interface CompetitorData {
  name: string;
  url?: string;
  marketShare: number;
  valuation?: string;
  fundingStage?: string;
  strength: 'strong' | 'moderate' | 'weak';
  founded?: string;
  strengths?: string[];
  weaknesses?: string[];
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
  className?: string;
}

export function CompetitionAnalysis({ className }: CompetitionAnalysisProps) {
  const { lockedIdea, hasLockedIdea } = useLockedIdea();
  const [data, setData] = useState<CompetitionAPIResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCompetitors = useCallback(async () => {
    if (!hasLockedIdea || !lockedIdea) {
      // This state should ideally be handled by the parent component
      // not showing a toast to avoid spamming, but logging it.
      console.warn('[CompetitionAnalysis] Fetch attempt without a locked idea.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: response, error: functionError } = await supabase.functions.invoke('competitive-landscape', {
        body: { idea: lockedIdea }
      });

      if (functionError) {
        throw new Error(`Supabase function error: ${functionError.message}`);
      }
      
      const apiResponse = response as CompetitionAPIResponse;

      if (apiResponse.success) {
        setData(apiResponse.data);
      } else {
        throw new Error('Failed to fetch competition data from the API.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({
        title: 'Error Fetching Competition',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [lockedIdea, hasLockedIdea, toast]);

  useEffect(() => {
    if (hasLockedIdea && lockedIdea && !data) {
      fetchCompetitors();
    }
  }, [lockedIdea, hasLockedIdea, data, fetchCompetitors]);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'moderate': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'weak': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!hasLockedIdea) {
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
            <p className="text-sm text-muted-foreground">Please lock an idea to see competition analysis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <Button onClick={fetchCompetitors} size="sm" variant="outline">
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
          <Button onClick={fetchCompetitors} size="sm" variant="outline" disabled={loading}>
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
          <h3 className="text-sm font-medium mb-3">
            Top Competitors (Ranked by Market Share) - {data.topCompetitors.length} Total
          </h3>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {[...data.topCompetitors]
                .sort((a, b) => b.marketShare - a.marketShare)
                .map((competitor, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors space-y-4"
                >
                  {/* Header with Name and Market Share */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-2xl font-bold text-muted-foreground">#{idx + 1}</span>
                        <h4 className="font-bold text-lg">{competitor.name}</h4>
                        <Badge variant="outline" className={getStrengthColor(competitor.strength)}>
                          {competitor.strength.toUpperCase()}
                        </Badge>
                      </div>
                      {competitor.url && (
                        <a
                          href={competitor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {competitor.url} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-3xl font-bold text-primary">{competitor.marketShare}%</p>
                      <p className="text-xs text-muted-foreground">Market Share</p>
                    </div>
                  </div>

                  {/* Company Info Grid */}
                  <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-md">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Founded</p>
                      <p className="font-semibold">{competitor.founded || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Funding Stage</p>
                      <p className="font-semibold">{competitor.fundingStage || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Valuation</p>
                      <p className="font-semibold">{competitor.valuation || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Strengths and Weaknesses */}
                  {(competitor.strengths?.length || competitor.weaknesses?.length) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {competitor.strengths && competitor.strengths.length > 0 && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                          <p className="font-semibold text-green-600 dark:text-green-400 text-sm mb-3 flex items-center gap-2">
                            <span className="text-lg">✓</span> Strengths
                          </p>
                          <ul className="space-y-2">
                            {competitor.strengths.map((s, i) => (
                              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                          <p className="font-semibold text-red-600 dark:text-red-400 text-sm mb-3 flex items-center gap-2">
                            <span className="text-lg">⚠</span> Weaknesses
                          </p>
                          <ul className="space-y-2">
                            {competitor.weaknesses.map((w, i) => (
                              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
