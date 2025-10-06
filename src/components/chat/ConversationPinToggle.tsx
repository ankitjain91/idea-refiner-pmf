import React from 'react';
import { Button } from '@/components/ui/button';
import { Pin, PinOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConversationPinToggleProps {
  isPinned: boolean;
  onToggle: () => void;
  hasMessages: boolean;
}

export const ConversationPinToggle: React.FC<ConversationPinToggleProps> = ({ 
  isPinned, 
  onToggle,
  hasMessages 
}) => {
  if (!hasMessages) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isPinned ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className="gap-2"
          >
            {isPinned ? (
              <>
                <Pin className="h-4 w-4" />
                Pinned
              </>
            ) : (
              <>
                <PinOff className="h-4 w-4" />
                Pin Chat
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isPinned
              ? 'Conversation is pinned and won\'t be cleared on session change'
              : 'Pin this conversation to prevent it from being cleared'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
