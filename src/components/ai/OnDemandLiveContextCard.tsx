import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { OnDemandTile } from '@/components/ui/OnDemandTile';
import { TrendingUp, BarChart3, MessageSquare, Clock, RefreshCw } from 'lucide-react';

interface OnDemandLiveContextCardProps {
  ideaId: string;
}

export function OnDemandLiveContextCard({ ideaId }: OnDemandLiveContextCardProps) {
  const [context, setContext] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { toast } = useToast();

  const loadContext = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('live_context')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setContext(data);
      setHasLoaded(true);

      // Parse the JSON data from summary field
      if (data?.data && typeof data.data === 'object' && data.data !== null && 'summary' in data.data) {
        try {
          const contextData = data.data as { summary?: string };
          if (contextData.summary) {
            const jsonString = contextData.summary
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
            const parsed = JSON.parse(jsonString);
            setParsedData(parsed);
          }
        } catch (parseError) {
          console.error('Error parsing context data:', parseError);
          setParsedData(null);
        }
      }

      if (!data) {
        throw new Error('No live context data found for this idea');
      }

    } catch (err) {
      console.error('Error loading context:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live context');
    } finally {
      setLoading(false);
    }
  };

  const refreshContext = async () => {
    await loadContext();
    toast({
      title: "Context Refreshed",
      description: "Live context data has been updated",
    });
  };

  const renderContextContent = () => {
    if (!hasLoaded || !context) return null;

    const updatedAt = new Date(context.updated_at);
    const isRecent = Date.now() - updatedAt.getTime() < 24 * 60 * 60 * 1000; // 24 hours

    return (
      <div className="space-y-4">
        {/* Context Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">Live Market Context</h3>
              <p className="text-xs text-muted-foreground">
                Last updated: {updatedAt.toLocaleDateString()} at {updatedAt.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Badge variant={isRecent ? "default" : "secondary"}>
            {isRecent ? "Fresh" : "Stale"}
          </Badge>
        </div>

        {/* Parsed Data Display */}
        {parsedData && (
          <div className="space-y-3">
            {parsedData.market_insights && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Market Insights</span>
                </div>
                <p className="text-sm text-muted-foreground">{parsedData.market_insights}</p>
              </div>
            )}

            {parsedData.competitive_landscape && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Competitive Landscape</span>
                </div>
                <p className="text-sm text-muted-foreground">{parsedData.competitive_landscape}</p>
              </div>
            )}

            {parsedData.trends && Array.isArray(parsedData.trends) && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Key Trends</span>
                </div>
                <ul className="space-y-1">
                  {parsedData.trends.slice(0, 3).map((trend: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full flex-shrink-0" />
                      {trend}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsedData.recommendations && Array.isArray(parsedData.recommendations) && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Recommendations</span>
                </div>
                <ul className="space-y-1">
                  {parsedData.recommendations.slice(0, 3).map((rec: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 bg-accent rounded-full flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Raw Context Data Fallback */}
        {!parsedData && context?.data && (
          <div className="p-4 bg-muted/20 rounded-lg border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Context Data</span>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-40">
              {JSON.stringify(context.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Context Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Context ID: {context.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <OnDemandTile
      title="Live Market Context"
      icon={TrendingUp}
      description="Access real-time market context and insights for your idea, including competitive landscape, trends, and strategic recommendations."
      features={[
        "Real-time market intelligence and insights",
        "Competitive landscape analysis",
        "Current market trends and opportunities",
        "Strategic recommendations based on market data",
        "Contextual insights specific to your idea"
      ]}
      estimatedLoadTime="~10 seconds"
      isLoading={loading}
      error={error}
      data={hasLoaded ? context : null}
      onLoad={loadContext}
      onRefresh={refreshContext}
      className="border-primary/20"
      badge={{
        text: context ? (new Date(context.updated_at) > new Date(Date.now() - 24*60*60*1000) ? "Fresh" : "Cached") : "Ready",
        variant: context ? (new Date(context.updated_at) > new Date(Date.now() - 24*60*60*1000) ? "default" : "secondary") : "outline"
      }}
    >
      {renderContextContent()}
    </OnDemandTile>
  );
}