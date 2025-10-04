import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LS_KEYS } from '@/lib/storage-keys';

type LoadState = 'idle' | 'loading' | 'loaded';

export const AsyncDashboardButton = () => {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [isDisabled, setIsDisabled] = useState(true);

  // Check if analysis is completed
  useEffect(() => {
    const checkAnalysis = () => {
      try {
        const completed = localStorage.getItem(LS_KEYS.analysisCompleted) === 'true';
        setIsDisabled(!completed);
      } catch {
        setIsDisabled(true);
      }
    };
    
    checkAnalysis();
    
    // Listen for analysis completion
    const handleAnalysisComplete = () => checkAnalysis();
    window.addEventListener('storage', handleAnalysisComplete);
    window.addEventListener('chat:activity', handleAnalysisComplete);
    
    return () => {
      window.removeEventListener('storage', handleAnalysisComplete);
      window.removeEventListener('chat:activity', handleAnalysisComplete);
    };
  }, []);

  const handleClick = async () => {
    if (isDisabled) return;

    if (loadState === 'loaded') {
      // Navigate to dashboard
      navigate('/dashboard');
      return;
    }

    if (loadState === 'loading') return;

    // Start loading
    setLoadState('loading');

    try {
      // Preload dashboard route and components asynchronously
      await Promise.all([
        // Simulate component preloading
        new Promise(resolve => setTimeout(resolve, 800)),
        // Preload Enterprise Hub page
        import('@/pages/EnterpriseHub').catch(() => {}),
      ]);

      // Mark as loaded
      setLoadState('loaded');
    } catch (error) {
      console.error('Failed to preload dashboard:', error);
      setLoadState('idle');
    }
  };

  const getButtonContent = () => {
    switch (loadState) {
      case 'loading':
        return (
          <>
            <div className="relative">
              <Loader2 className="h-4 w-4 animate-spin" />
              <Sparkles className="h-3 w-3 absolute -top-1 -right-1 animate-pulse text-primary" />
            </div>
            <span className="animate-pulse">Preparing Dashboard</span>
          </>
        );
      case 'loaded':
        return (
          <>
            <LayoutDashboard className="h-4 w-4" />
            <span>Go to Dashboard</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        );
      default:
        return (
          <>
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </>
        );
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      variant={loadState === 'loaded' ? 'default' : 'outline'}
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        loadState === 'loading' && 'bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 animate-pulse',
        loadState === 'loaded' && 'bg-gradient-to-r from-primary via-primary/90 to-primary shadow-lg shadow-primary/20',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Animated background shimmer for loading state */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      )}
      
      {/* Success glow for loaded state */}
      {loadState === 'loaded' && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/0 via-primary-glow/20 to-primary-glow/0 animate-pulse" />
      )}
      
      <div className="relative flex items-center gap-2">
        {getButtonContent()}
      </div>
    </Button>
  );
};
