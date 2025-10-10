import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Lock } from 'lucide-react';
import { useLockedIdea } from '@/lib/lockedIdeaManager';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
export const AsyncDashboardButton = () => {
  const navigate = useNavigate();
  const { hasLockedIdea } = useLockedIdea();
  const [sessionLocked, setSessionLocked] = useState(false);

  useEffect(() => {
    const initial = typeof window !== 'undefined' && sessionStorage.getItem('idea_locked_this_session') === 'true';
    setSessionLocked(!!initial);
    const onLocked = () => setSessionLocked(true);
    const onUnlocked = () => setSessionLocked(false);
    window.addEventListener('idea:locked', onLocked as EventListener);
    window.addEventListener('idea:unlocked', onUnlocked as EventListener);
    return () => {
      window.removeEventListener('idea:locked', onLocked as EventListener);
      window.removeEventListener('idea:unlocked', onUnlocked as EventListener);
    };
  }, []);

  const enabled = hasLockedIdea && sessionLocked;

  const handleClick = () => {
    if (enabled) navigate('/dashboard');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            variant="outline"
            size="sm"
            disabled={!enabled}
            className="hover:border-primary/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enabled ? (
              <LayoutDashboard className="h-4 w-4 mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2 opacity-50" />
            )}
            <span>View Analysis Dashboard</span>
          </Button>
        </TooltipTrigger>
        {!enabled && (
          <TooltipContent>
            <p className="text-sm">Lock in your idea first to unlock the dashboard</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
