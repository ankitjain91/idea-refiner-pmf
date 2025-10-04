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
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Loading Dashboard...</span>
          </>
        );
      case 'loaded':
        return (
          <>
            <Sparkles className="h-4 w-4" />
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
        loadState === 'loading' && 'border-primary/50 animate-pulse',
        loadState === 'loaded' && 'bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/30',
        loadState === 'idle' && 'hover:border-primary/50 hover:shadow-md'
      )}
    >
      {/* Gentle glow for loading state */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 bg-primary/10 animate-pulse" />
      )}
      
      {/* Success glow for loaded state */}
      {loadState === 'loaded' && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-50 blur-lg animate-pulse" />
      )}
      
      <div className="relative flex items-center gap-2 z-10">
        {getButtonContent()}
      </div>
    </Button>
  );
};
