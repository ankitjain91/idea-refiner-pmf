import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Bot, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message, ResponseMode } from '../chat/types';
import MessageRenderer from '../chat/MessageRenderer';

interface ChatMessageItemProps {
  message: Message;
  responseMode: ResponseMode;
  onSendMessage: (message: string) => void;
  onSuggestionClick: (suggestion: string) => void;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ 
  message, 
  responseMode, 
  onSendMessage, 
  onSuggestionClick 
}) => {
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "flex gap-4",
        message.type === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.type === 'bot' && (
        <motion.div 
          className="flex-shrink-0"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: 1, 
            rotate: 0,
            transition: {
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1
            }
          }}
        >
          <motion.div 
            className="relative"
            animate={message.isTyping ? {
              rotate: [0, 5, -5, 5, 0],
              transition: {
                duration: 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }
            } : {}}
          >
            <motion.div 
              className="absolute inset-0 bg-primary/20 blur-lg rounded-full"
              animate={message.isTyping ? {
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              } : {}}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 backdrop-blur-sm">
              {message.isTyping ? (
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Brain className="h-5 w-5 text-primary" />
                </motion.div>
              ) : (
                <Bot className="h-5 w-5 text-primary" />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className={cn(
        "w-full sm:max-w-[85%] lg:max-w-[75%] space-y-2 sm:space-y-3 min-w-0",
        message.type === 'user' ? 'items-end' : 'items-start'
      )}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Card className={cn(
            "p-3 sm:p-5 relative transition-all duration-300 w-full border-2",
            message.type === 'user' 
              ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/30 shadow-lg shadow-primary/10' 
              : 'bg-card border-border hover:shadow-lg overflow-visible'
          )}>
            {message.type === 'user' && (
              <div className="absolute inset-0 bg-white/5 opacity-50" />
            )}
            <div className="relative">
              {message.type === 'user' ? (
                <div className="text-sm opacity-90 break-words overflow-wrap-anywhere whitespace-pre-wrap max-w-full">
                  {message.content}
                </div>
              ) : (
                <MessageRenderer 
                  message={message} 
                  responseMode={responseMode}
                  onSendMessage={onSendMessage}
                  onSuggestionClick={onSuggestionClick}
                />
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default memo(ChatMessageItem);