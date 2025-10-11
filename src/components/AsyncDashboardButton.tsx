import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Lock } from 'lucide-react';
// Use the unified hook wrapper to ensure consistent idea logic across app
import { useLockedIdea } from '@/hooks/useLockedIdea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
export const AsyncDashboardButton = () => {
  const navigate = useNavigate();
  const { hasLockedIdea, hasIdea, isLocked } = useLockedIdea();
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

  // Enabled if a properly locked idea exists (preferred) OR a valid idea exists in-session that was locked earlier
  const enabled = (hasLockedIdea || (isLocked && hasIdea)) && sessionLocked;

  const handleClick = () => {
    if (enabled) navigate('/hub');
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
            data-state={enabled ? 'ready' : 'disabled'}
            data-locked={isLocked}
            className="hover:border-primary/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {enabled ? (
              <LayoutDashboard className="h-4 w-4 mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2 opacity-50" />
            )}
            <span>View Analysis Dashboard</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs leading-relaxed">
          <p>
            {enabled 
              ? 'View your idea analysis dashboard' 
              : !hasIdea 
                ? 'Chat to describe your idea (at least 20 characters)' 
                : !hasLockedIdea 
                  ? 'After 3 messages, view your idea and click "Lock My Idea" to enable analysis' 
                  : 'Refresh the page or click elsewhere to sync your locked idea'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
