import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { DollarSign, RefreshCw } from 'lucide-react';
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
  keyInfo?: {
    valid: boolean;
    hasUsageKey?: boolean;
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
        toast.error('Unable to fetch OpenAI usage data');
        setError('Unable to fetch usage');
      } else {
        setOpenAIData(response.data);
        
        // Calculate total spend from the response
        if (response.data?.usage) {
          const totalCents = response.data.usage.total_usage || 0;
          setTotalSpend(totalCents / 100); // Convert cents to dollars
        } else {
          setTotalSpend(0);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load OpenAI usage data');
      setError('Failed to load usage');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card/40 border border-border/30">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  // Format the spend amount
  const formatSpend = (amount: number | null) => {
    if (amount === null || amount === 0) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-md bg-card/40 border border-border/30 hover:bg-card/50 transition-all duration-200">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary/70" />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium">
              {openAIData?.usage?.period ? 'Last 30 days' : 'OpenAI Usage'}
            </span>
            <span className="text-base font-semibold text-foreground tabular-nums">
              {error ? 'N/A' : formatSpend(totalSpend)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchOpenAIBalance}
          disabled={refreshing}
          className="h-7 w-7 p-0 ml-1"
          title="Refresh usage data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''} text-muted-foreground`} />
        </Button>
      </div>
      
      {openAIData?.keyInfo?.hasUsageKey === false && (
        <span className="text-xs text-muted-foreground/60">
          (Add usage key for actual data)
        </span>
      )}
    </div>
  );
}