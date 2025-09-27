import React, { ForwardedRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

interface ChatInputBarProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  inputRef: ForwardedRef<HTMLInputElement>;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({ input, setInput, onSend, disabled, placeholder, inputRef }) => {
  return (
    <div className="flex gap-2">
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
