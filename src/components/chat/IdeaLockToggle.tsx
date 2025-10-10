import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Unlock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLockedIdea } from '@/lib/lockedIdeaManager';
import { useLedger } from '@/hooks/useLedger';
import { useAuth } from '@/contexts/EnhancedAuthContext';

interface IdeaLockToggleProps {
  currentIdea: string;
  hasValidIdea: boolean;
}

export const IdeaLockToggle: React.FC<IdeaLockToggleProps> = ({ currentIdea, hasValidIdea }) => {
  const { lockedIdea, setLockedIdea, clearLockedIdea } = useLockedIdea();
  const { createOwnership } = useLedger();
  const { user } = useAuth();
  const isLocked = !!lockedIdea && lockedIdea === currentIdea;

  const handleToggle = async () => {
    if (isLocked) {
      clearLockedIdea();
      try {
        sessionStorage.removeItem('idea_locked_this_session');
      } catch {}
      window.dispatchEvent(new Event('idea:unlocked'));
    } else if (hasValidIdea && currentIdea && user) {
      setLockedIdea(currentIdea);

      // Mark locked in current session and notify listeners
      try {
        sessionStorage.setItem('idea_locked_this_session', 'true');
      } catch {}
      window.dispatchEvent(new Event('idea:locked'));
      
      // Create ledger ownership when locking
      const ideaId = crypto.randomUUID();
      await createOwnership(ideaId, { 
        idea: currentIdea,
        userId: user.id,
        timestamp: Date.now()
      });
    }
  };

  if (!hasValidIdea || !currentIdea) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isLocked ? "default" : "outline"}
            size="sm"
            onClick={handleToggle}
            className="gap-2"
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                Lock Idea
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isLocked
              ? 'Idea is locked and won\'t be cleared on reset'
              : 'Lock this idea to prevent it from being cleared'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
