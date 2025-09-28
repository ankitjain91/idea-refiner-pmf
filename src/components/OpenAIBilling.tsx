import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function OpenAIBilling() {
  const [totalSpend, setTotalSpend] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTotalSpend();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('openai-usage-changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'openai_usage' 
        },
        () => {
          fetchTotalSpend();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTotalSpend = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_openai_total_spend', { _user_id: user.id });

      if (error) {
        console.error('Error fetching OpenAI spend:', error);
        setError('Failed to load billing');
      } else {
        setTotalSpend(Number(data) || 0);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-3 flex items-center gap-2 bg-card/50 backdrop-blur-sm border-border/50">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-16" />
      </Card>
    );
  }

  if (error || totalSpend === null) {
    return null;
  }

  return (
    <Card className="p-3 flex items-center gap-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-colors">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">AI Usage:</span>
          <span className="text-sm font-semibold text-foreground">
            ${totalSpend.toFixed(4)}
          </span>
        </div>
        {totalSpend > 0 && (
          <TrendingUp className="h-3 w-3 text-primary animate-pulse" />
        )}
      </div>
    </Card>
  );
}