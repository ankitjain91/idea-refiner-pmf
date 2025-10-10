import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface LiveContextCardProps {
  ideaId: string;
}

export function LiveContextCard({ ideaId }: LiveContextCardProps) {
  const [context, setContext] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Parse the JSON data from summary field
  useEffect(() => {
    if (context?.data?.summary) {
      try {
        // Remove markdown code block markers and parse JSON
        const jsonString = context.data.summary
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const parsed = JSON.parse(jsonString);
        setParsedData(parsed);
      } catch (error) {
        console.error('Error parsing context data:', error);
        setParsedData(null);
      }
    } else {
      setParsedData(null);
    }
  }, [context]);

  useEffect(() => {
    loadContext();
  }, [ideaId]);

  const loadContext = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('live_context')
        .select('*')
        .eq('idea_id', ideaId)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setContext(data);
      }
    } catch (error) {
      console.error('Error loading live context:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshContext = async () => {
    setRefreshing(true);
    try {
      const { data: ideaData } = await supabase
        .from('ideas')
        .select('original_idea, user_id')
        .eq('id', ideaId)
        .single();

      if (!ideaData) throw new Error('Idea not found');

      const { data, error } = await supabase.functions.invoke('refresh-live-context', {
        body: {
          idea_id: ideaId,
          idea_text: ideaData.original_idea,
          user_id: ideaData.user_id,
        },
      });

      if (error) throw error;

      toast({
        title: '🔄 Context Refreshed',
        description: 'Live market data updated successfully',
      });

      await loadContext();
    } catch (error: any) {
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Could not refresh live context',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Loading live context...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Live Market Context
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshContext}
            disabled={refreshing}
            className="hover:bg-primary/10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!context ? (
          <div className="text-center py-8">
            <div className="mb-4 mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">No live market data available yet</p>
            <Button 
              onClick={refreshContext} 
              disabled={refreshing}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Live Market Data'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Market Insights */}
            {parsedData?.key_market_insights && parsedData.key_market_insights.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  Key Market Insights
                </h4>
                <ul className="space-y-2">
                  {parsedData.key_market_insights.map((insight: string, i: number) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-3 pl-2">
                      <span className="text-primary mt-1.5">•</span>
                      <span className="flex-1">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Trends */}
            {parsedData?.recent_trends && parsedData.recent_trends.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-accent rounded-full" />
                  Recent Trends
                </h4>
                <ul className="space-y-2">
                  {parsedData.recent_trends.map((trend: string, i: number) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-3 pl-2">
                      <span className="text-accent mt-1.5">•</span>
                      <span className="flex-1">{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Competitive Landscape */}
            {parsedData?.competitive_landscape_summary && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-secondary rounded-full" />
                  Competitive Landscape
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{parsedData.competitive_landscape_summary}</p>
              </div>
            )}

            {/* Market Opportunity Score */}
            {parsedData?.overall_market_opportunity_score !== undefined && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-semibold">Market Opportunity Score</span>
                </div>
                <Badge variant="default" className="text-base px-3 py-1">
                  {parsedData.overall_market_opportunity_score}/100
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
              <span>Last updated: {new Date(context.last_refreshed).toLocaleString()}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={refreshContext}
                disabled={refreshing}
                className="h-7 text-xs hover:text-primary"
              >
                Refresh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
