import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Sparkles, ArrowRight, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoadState = 'idle' | 'loading' | 'loaded';

export const AsyncDashboardButton = () => {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Listen for dashboard data loading completion
  useEffect(() => {
    const handleDashboardReady = (event: CustomEvent) => {
      console.log('[AsyncDashboardButton] Dashboard tiles loaded:', event.detail);
      setTilesLoaded(true);
      if (loadState === 'loading') {
        setLoadState('loaded');
      }
    };

    window.addEventListener('dashboard-tiles-loaded' as any, handleDashboardReady);
    
    return () => {
      window.removeEventListener('dashboard-tiles-loaded' as any, handleDashboardReady);
    };
  }, [loadState]);

  const handleClick = async () => {
    if (loadState === 'loaded') {
      // Navigate to dashboard
      navigate('/dashboard');
      return;
    }

    if (loadState === 'loading') return;

    // Start loading
    setLoadState('loading');
    setTilesLoaded(false);

    try {
      // Start preloading the dashboard page in background
      const preloadPromise = import('@/pages/EnterpriseHub').catch(() => {});
      
      // Create a hidden iframe to trigger dashboard data loading
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = '/dashboard';
      document.body.appendChild(iframe);
      
      // Wait for preload to complete
      await preloadPromise;
      
      // Keep loading state until tiles are loaded
      // The 'dashboard-tiles-loaded' event will trigger the state change to 'loaded'
      console.log('[AsyncDashboardButton] Waiting for tiles to load...');
      
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
            <Brain className="h-4 w-4 animate-pulse" />
            <span className="font-medium">Analyzing Your Dashboard</span>
            <Zap className="h-3 w-3 animate-pulse" />
          </>
        );
      case 'loaded':
        return (
          <>
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="font-semibold">Go to My Dashboard</span>
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
        'group relative overflow-hidden transition-all duration-700',
        loadState === 'loading' && 'border-primary/70 bg-primary/5',
        loadState === 'loaded' && 'bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[gradient_3s_ease_infinite] shadow-lg shadow-primary/40',
        loadState === 'idle' && 'hover:border-primary/50 hover:shadow-md'
      )}
    >
      {/* AI-themed shimmer for loading state */}
      {loadState === 'loading' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" 
               style={{ backgroundSize: '200% 100%' }} />
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-primary/5 animate-pulse" />
          </div>
        </>
      )}
      
      {/* Success celebration glow for loaded state */}
      {loadState === 'loaded' && (
        <>
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary opacity-60 blur-xl animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10" />
        </>
      )}
      
      <div className="relative flex items-center gap-2 z-10">
        {getButtonContent()}
      </div>
    </Button>
  );
};
