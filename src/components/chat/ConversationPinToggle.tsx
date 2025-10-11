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

  const buttonText = isPinned ? "Pinned" : "Pin Conversation";
  const tooltipText = disabled
    ? "Keep chatting to generate a summary you can pin"
    : isPinned 
    ? "This conversation is pinned and won't be reset. Click to unpin."
    : "Pin this conversation to prevent it from being reset when creating a new session.";

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
