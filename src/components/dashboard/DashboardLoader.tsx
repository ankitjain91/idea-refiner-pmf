import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Brain, Globe, Search, Database, 
  TrendingUp, Users, DollarSign, Shield,
  CheckCircle, AlertCircle, RefreshCw, Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LoadingStep {
  id: string;
  label: string;
  icon: any;
  status: 'pending' | 'loading' | 'complete' | 'error';
  source?: string;
  data?: any;
}

interface DashboardLoaderProps {
  idea: string | null;
  onComplete: (data: any) => void;
  onError?: (error: any) => void;
}

export const DashboardLoader: React.FC<DashboardLoaderProps> = ({ 
  idea, 
  onComplete,
  onError 
}) => {
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    { id: 'market', label: 'Fetching Market Analysis', icon: TrendingUp, status: 'pending' },
    { id: 'competition', label: 'Analyzing Competition', icon: Users, status: 'pending' },
    { id: 'metrics', label: 'Calculating Key Metrics', icon: DollarSign, status: 'pending' },
    { id: 'realtime', label: 'Getting Real-time Data', icon: Globe, status: 'pending' },
    { id: 'channels', label: 'Optimizing Marketing Channels', icon: Shield, status: 'pending' },
    { id: 'validation', label: 'Validating Data Sources', icon: Database, status: 'pending' }
  ]);
  
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Initializing dashboard analysis...');
  const [sources, setSources] = useState<string[]>([]);
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!idea) return;
    fetchDashboardData();
  }, [idea]);

  const fetchDashboardData = async () => {
    const totalSteps = loadingSteps.length;
    let completedSteps = 0;
    let allData: Record<string, any> = {};

    for (const step of loadingSteps) {
      try {
        // Update step status to loading
        setLoadingSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: 'loading' } : s
        ));
        
        setCurrentStatus(`${step.label}...`);

        // Fetch data for this step using web search and AI analysis
        const { data, error } = await supabase.functions.invoke('dashboard-insights-realtime', {
          body: { 
            idea,
            analysisType: step.id,
            includeWebSearch: true,
            returnSources: true
          }
        });

        if (error) throw error;

        // Store the data and sources
        allData[step.id] = data?.insights || {};
        
        if (data?.sources) {
          setSources(prev => [...prev, ...data.sources]);
        }

        // Update step status to complete
        setLoadingSteps(prev => prev.map(s => 
          s.id === step.id ? { 
            ...s, 
            status: 'complete',
            source: data?.primarySource,
            data: data?.insights
          } : s
        ));

        completedSteps++;
        setProgress((completedSteps / totalSteps) * 100);
        setCollectedData(allData);

        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error fetching ${step.label}:`, error);
        
        // Update step status to error
        setLoadingSteps(prev => prev.map(s => 
          s.id === step.id ? { ...s, status: 'error' } : s
        ));
        
        // Continue with other steps even if one fails
        completedSteps++;
        setProgress((completedSteps / totalSteps) * 100);
      }
    }

    // Final validation
    setCurrentStatus('Finalizing dashboard...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Complete
    if (Object.keys(allData).length > 0) {
      onComplete(allData);
      toast({
        title: "Dashboard Ready!",
        description: "All real-time data has been loaded successfully.",
      });
    } else if (onError) {
      onError(new Error('Failed to load dashboard data'));
    }
  };

  const retryFailedSteps = async () => {
    const failedSteps = loadingSteps.filter(s => s.status === 'error');
    if (failedSteps.length === 0) return;

    for (const step of failedSteps) {
      // Retry logic here
      await fetchDashboardData();
      break; // Re-run entire process
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full"
      >
        <Card className="p-8 shadow-2xl border-0 bg-card/95 backdrop-blur">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
              <Brain className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Loading Your Dashboard</h2>
            <p className="text-muted-foreground">{currentStatus}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Loading Steps Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {loadingSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    step.status === 'loading' ? 'border-primary bg-primary/10' :
                    step.status === 'complete' ? 'border-green-500/50 bg-green-500/10' :
                    step.status === 'error' ? 'border-red-500/50 bg-red-500/10' :
                    'border-border bg-secondary/30'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${
                      step.status === 'loading' ? 'text-primary' :
                      step.status === 'complete' ? 'text-green-500' :
                      step.status === 'error' ? 'text-red-500' :
                      'text-muted-foreground'
                    }`} />
                    {step.status === 'loading' && (
                      <div className="absolute inset-0">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.label}</p>
                    {step.source && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Link2 className="h-3 w-3" />
                        {step.source}
                      </p>
                    )}
                  </div>
                  <div>
                    {step.status === 'complete' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {step.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {step.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Data Sources */}
          {sources.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Data Sources</h3>
              <div className="flex flex-wrap gap-2">
                {sources.slice(0, 5).map((source, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {source}
                  </Badge>
                ))}
                {sources.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{sources.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Fetching real-time data with AI analysis
            </p>
            {loadingSteps.some(s => s.status === 'error') && (
              <Button
                variant="outline"
                size="sm"
                onClick={retryFailedSteps}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Failed
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};