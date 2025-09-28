import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OpenAIUsageData {
  usage?: any;
  subscription?: any;
  currentMonth?: {
    start: string;
    end: string;
  };
}

export function OpenAIBilling() {
  const [totalSpend, setTotalSpend] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAIData, setOpenAIData] = useState<OpenAIUsageData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOpenAIBalance();
  }, []);

  const fetchOpenAIBalance = async () => {
    if (refreshing) return;
    setRefreshing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Call the edge function to get OpenAI balance
      const response = await supabase.functions.invoke('openai-balance', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        console.error('Error fetching OpenAI balance:', response.error);
        toast.error('Unable to fetch OpenAI balance. The billing API may require special permissions.');
        setError('Unable to fetch balance');
      } else {
        setOpenAIData(response.data);
        
        // Calculate total spend from the response
        if (response.data?.usage) {
          const totalCents = response.data.usage.total_usage || 0;
          setTotalSpend(totalCents / 100); // Convert cents to dollars
        } else if (response.data?.subscription?.hard_limit_usd) {
          // Show credit limit if available
          setTotalSpend(response.data.subscription.hard_limit_usd);
        } else {
          setTotalSpend(0);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load OpenAI billing data');
      setError('Failed to load billing');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-3 flex items-center gap-2 bg-card/50 backdrop-blur-sm border-border/50">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
      </Card>
    );
  }

  if (error || totalSpend === null) {
    return (
      <Card className="p-3 flex items-center gap-2 bg-card/50 backdrop-blur-sm border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchOpenAIBalance}
          disabled={refreshing}
          className="h-auto p-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
        <span className="text-xs text-muted-foreground">OpenAI Balance</span>
      </Card>
    );
  }

  return (
    <Card className="p-3 flex items-center gap-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-colors cursor-pointer"
          title={`OpenAI Usage: $${totalSpend.toFixed(2)}\n${openAIData?.currentMonth ? `Current month: ${openAIData.currentMonth.start} to ${openAIData.currentMonth.end}` : ''}`}
          onClick={fetchOpenAIBalance}>
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">OpenAI:</span>
          <span className="text-sm font-semibold text-foreground">
            ${totalSpend.toFixed(2)}
          </span>
          {openAIData?.subscription?.hard_limit_usd && (
            <span className="text-xs text-muted-foreground">
              / ${openAIData.subscription.hard_limit_usd}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            fetchOpenAIBalance();
          }}
          disabled={refreshing}
          className="h-auto p-0 ml-1"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
        {totalSpend > 0 && (
          <TrendingUp className="h-3 w-3 text-primary animate-pulse" />
        )}
      </div>
    </Card>
  );
}