import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Unlock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLockedIdea } from '@/lib/lockedIdeaManager';

interface IdeaLockToggleProps {
  currentIdea: string;
  hasValidIdea: boolean;
}

export const IdeaLockToggle: React.FC<IdeaLockToggleProps> = ({ currentIdea, hasValidIdea }) => {
  const { lockedIdea, setLockedIdea, clearLockedIdea } = useLockedIdea();
  const isLocked = !!lockedIdea && lockedIdea === currentIdea;

  const handleToggle = () => {
    if (isLocked) {
      clearLockedIdea();
    } else if (hasValidIdea && currentIdea) {
      setLockedIdea(currentIdea);
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
