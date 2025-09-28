import React, { ForwardedRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputBarProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  inputRef: ForwardedRef<HTMLInputElement>;
  onReset?: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({ input, setInput, onSend, disabled, placeholder, inputRef, onReset }) => {
  return (
    <div className="flex gap-2">
      {onReset && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onReset}
                disabled={disabled}
                size="icon"
                variant="outline"
                className="hover:bg-destructive/10 hover:border-destructive/50"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Clear all data and start fresh</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <Input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
        placeholder={placeholder}
        className="flex-1"
        disabled={disabled}
      />
      <Button
        onClick={onSend}
        disabled={!input.trim() || disabled}
        size="icon"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
