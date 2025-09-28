import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { DollarSign, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

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

  const testOpenAIKey = async () => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('test-openai', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined
      });

      setDiagnosticResult(response.data);
      setShowDiagnostic(true);
      
      if (response.data?.status === 'success') {
        toast.success('OpenAI API key is working!');
      } else {
        toast.error(response.data?.error || 'OpenAI API test failed');
      }
    } catch (err) {
      console.error('Error testing OpenAI:', err);
      toast.error('Failed to test OpenAI API');
    } finally {
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

  return (
    <>
      <Card className="p-3 flex items-center gap-2 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-colors">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={testOpenAIKey}
            disabled={refreshing}
            className="h-auto p-1"
            title="Test OpenAI API Key"
          >
            <AlertCircle className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} text-yellow-500`} />
          </Button>
          <span className="text-sm text-muted-foreground">API Status</span>
        </div>
      </Card>

      <Dialog open={showDiagnostic} onOpenChange={setShowDiagnostic}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>OpenAI API Diagnostic</DialogTitle>
            <DialogDescription>
              Testing your OpenAI API key configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {diagnosticResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Status:</span>
                  <span className={diagnosticResult.status === 'success' ? 'text-green-500' : 'text-red-500'}>
                    {diagnosticResult.status || 'Unknown'}
                  </span>
                </div>
                {diagnosticResult.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <p className="font-semibold text-red-600 dark:text-red-400">Error:</p>
                    <p className="text-sm">{diagnosticResult.error}</p>
                    {diagnosticResult.solution && (
                      <p className="text-sm mt-2 text-red-600 dark:text-red-400">
                        <strong>Solution:</strong> {diagnosticResult.solution}
                      </p>
                    )}
                    {diagnosticResult.details && (
                      <p className="text-xs mt-2 text-muted-foreground">
                        Details: {diagnosticResult.details}
                      </p>
                    )}
                  </div>
                )}
                {diagnosticResult.status === 'success' && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <p className="font-semibold text-green-600 dark:text-green-400">✓ API Key Valid</p>
                    <p className="text-sm">{diagnosticResult.message}</p>
                    {diagnosticResult.chatResponse && (
                      <p className="text-sm mt-2">Test response: "{diagnosticResult.chatResponse}"</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}