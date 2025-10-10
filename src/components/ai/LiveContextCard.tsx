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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

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
    <Card>
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
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!context ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No live data available</p>
            <Button onClick={refreshContext} disabled={refreshing}>
              Fetch Live Data
            </Button>
          </div>
        ) : (
          <>
            {context.data?.summary && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                <p className="text-xs text-muted-foreground">{context.data.summary}</p>
              </div>
            )}

            {context.data?.insights && context.data.insights.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Key Insights</h4>
                <ul className="space-y-1">
                  {context.data.insights.map((insight: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {context.data?.opportunity_score && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
                <span className="text-sm font-medium">Market Opportunity</span>
                <Badge variant="default">{context.data.opportunity_score}/100</Badge>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t">
              Last updated: {new Date(context.last_refreshed).toLocaleString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
