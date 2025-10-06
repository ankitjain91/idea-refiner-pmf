import React from 'react';
import { Button } from '@/components/ui/button';
import { Pin, PinOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConversationPinToggleProps {
  isPinned: boolean;
  onToggle: () => void;
  hasMessages: boolean;
  disabled?: boolean;
}

export const ConversationPinToggle: React.FC<ConversationPinToggleProps> = ({ 
  isPinned, 
  onToggle,
  hasMessages,
  disabled = false
}) => {
  if (!hasMessages) {
    return null;
  }

  const buttonText = isPinned ? "Locked In" : "Lock In Idea";
  const tooltipText = disabled
    ? "Keep chatting to generate a summary you can lock in"
    : isPinned 
    ? "Your idea summary is locked and will be used across the dashboard. Click to unlock."
    : "Lock your conversation summary to use it as your finalized idea across the dashboard.";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isPinned ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            disabled={disabled}
            className="gap-2"
          >
            {isPinned ? (
              <>
                <Pin className="h-4 w-4" />
                {buttonText}
              </>
            ) : (
              <>
                <PinOff className="h-4 w-4" />
                {buttonText}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
