import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Loader2, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoadState = 'idle' | 'loading' | 'loaded';

export const AsyncDashboardButton = () => {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>('idle');

  const handleClick = async () => {
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

      // Mark as loaded (don't navigate yet)
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
            <span className="animate-pulse bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_2s_linear_infinite]">
              Loading Dashboard...
            </span>
            <Zap className="h-3 w-3 animate-pulse" />
          </>
        );
      case 'loaded':
        return (
          <>
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="font-semibold">Go to Dashboard</span>
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
      disabled={loadState === 'loading'}
      variant={loadState === 'loaded' ? 'default' : 'outline'}
      size="sm"
      className={cn(
        'group relative overflow-hidden transition-all duration-500',
        loadState === 'loading' && 'bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30 border-primary/50 animate-[pulse_1.5s_ease-in-out_infinite]',
        loadState === 'loaded' && 'bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite] shadow-lg shadow-primary/30 scale-105 border-0',
        loadState === 'idle' && 'hover:border-primary/50 hover:shadow-md hover:shadow-primary/20'
      )}
    >
      {/* Animated background shimmer for loading state */}
      {loadState === 'loading' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_linear_infinite]" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 animate-pulse" />
        </>
      )}
      
      {/* Success glow for loaded state */}
      {loadState === 'loaded' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_linear_infinite]" />
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary opacity-30 blur-lg animate-pulse" />
        </>
      )}
      
      <div className="relative flex items-center gap-2 z-10">
        {getButtonContent()}
      </div>
    </Button>
  );
};
