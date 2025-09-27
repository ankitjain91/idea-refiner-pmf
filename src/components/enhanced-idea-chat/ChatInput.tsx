import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeyboardEvent } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isTyping: boolean;
  conversationStarted: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onSendMessage: (message?: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  isTyping,
  conversationStarted,
  inputRef,
  onSendMessage
}) => {
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isTyping) {
        onSendMessage();
      }
    }
  }, [input, isTyping, onSendMessage]);

  const handleSendClick = useCallback(() => {
    if (input.trim() && !isTyping) {
      onSendMessage();
    }
  }, [input, isTyping, onSendMessage]);

  return (
    <motion.div 
      className="p-4 sm:p-6 border-t border-border bg-background/80 backdrop-blur-sm"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
    >
      <div className="flex gap-2 sm:gap-3 items-end">
        <motion.div
          className="flex-1"
          whileFocus={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={conversationStarted 
              ? "Continue the conversation..." 
              : "Describe your startup idea in as much detail as you can..."
            }
            className={cn(
              "min-h-[60px] max-h-[120px] resize-none text-sm sm:text-base transition-all duration-300",
              "focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
              "placeholder:text-muted-foreground/70"
            )}
            disabled={isTyping}
          />
        </motion.div>
        
        <motion.div
          whileHover={input.trim() && !isTyping ? { scale: 1.05 } : {}}
          whileTap={input.trim() && !isTyping ? { scale: 0.95 } : {}}
        >
          <Button
            onClick={handleSendClick}
            disabled={!input.trim() || isTyping}
            size="lg"
            className={cn(
              "h-[60px] px-4 sm:px-6 transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              "shadow-lg hover:shadow-xl active:shadow-md"
            )}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span className={cn(
          "transition-opacity duration-300",
          input.length > 0 ? "opacity-100" : "opacity-0"
        )}>
          {input.length} characters
        </span>
      </div>
    </motion.div>
  );
};

export default ChatInput;