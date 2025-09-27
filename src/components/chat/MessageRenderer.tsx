import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ChevronRight, Lightbulb, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, ResponseMode } from './types';
import { generateSuggestionExplanation, generateBrainExplanation } from './utils';
import PMFAnalysisCard from './PMFAnalysisCard';

interface MessageRendererProps {
  message: Message;
  responseMode: ResponseMode;
  onSendMessage: (message: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ 
  message, 
  responseMode, 
  onSendMessage,
  onSuggestionClick 
}) => {
  // Handle typing indicator
  if (message.isTyping) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 bg-primary rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            className="w-2 h-2 bg-primary rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            className="w-2 h-2 bg-primary rounded-full"
          />
        </div>
        <span className="text-sm text-muted-foreground">Analyzing your idea...</span>
      </div>
    );
  }

  // Handle PMF analysis
  if (message.pmfAnalysis) {
    return <PMFAnalysisCard analysis={message.pmfAnalysis} />;
  }

  return (
    <>
      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
        <ReactMarkdown
          components={{
            // Custom styling for different elements
            h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-semibold text-foreground mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-medium text-foreground mb-1">{children}</h3>,
            p: ({ children }) => <p className="text-sm leading-relaxed text-foreground mb-2 break-words">{children}</p>,
            ul: ({ children }) => <ul className="space-y-1 mb-2">{children}</ul>,
            li: ({ children }) => (
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <ChevronRight className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                <span className="break-words overflow-wrap-anywhere flex-1">{children}</span>
              </motion.li>
            ),
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            em: ({ children }) => <em className="italic text-foreground">{children}</em>,
            code: ({ children }) => <code className="text-xs bg-muted px-1 py-0.5 rounded text-primary font-mono">{children}</code>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground text-sm">
                {children}
              </blockquote>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {/* Points Display for Bot Messages */}
      {message.type === 'bot' && (message.pointsEarned !== undefined || message.pointsExplanation) && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
            message.pointsEarned && message.pointsEarned > 0 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : message.pointsEarned && message.pointsEarned < 0
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          }`}
        >
          <span className="text-lg">
            {message.pointsEarned && message.pointsEarned > 0 ? '🧠✨' : 
             message.pointsEarned && message.pointsEarned < 0 ? '😤' : '🤔'}
          </span>
          <div>
            {message.pointsEarned !== undefined && (
              <span className={`font-medium ${
                message.pointsEarned > 0 ? 'text-green-600 dark:text-green-400' : 
                message.pointsEarned < 0 ? 'text-red-600 dark:text-red-400' : 
                'text-blue-600 dark:text-blue-400'
              }`}>
                {message.pointsEarned > 0 ? '+' : ''}{message.pointsEarned} wrinkles
              </span>
            )}
            {message.pointsExplanation && (
              <div className="text-muted-foreground">
                {message.pointsExplanation}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Suggestions */}
      {message.suggestions && message.suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2"
          >
            {message.suggestions.map((suggestion, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    let suggestionText = '';
                    if (typeof suggestion === 'string') {
                      suggestionText = suggestion;
                    } else if (suggestion && typeof suggestion === 'object' && suggestion.text) {
                      suggestionText = suggestion.text;
                    } else {
                      suggestionText = String(suggestion || '');
                    }
                    if (onSuggestionClick) {
                      onSuggestionClick(suggestionText);
                    } else {
                      onSendMessage(suggestionText);
                    }
                  }}
                  className="text-xs hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group touch-manipulation h-auto min-h-[32px] px-3 py-2 text-left justify-start whitespace-normal max-w-[280px]"
                >
                  <div className="flex items-start gap-1.5">
                    <Lightbulb className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                    <span className="break-words leading-relaxed">
                      {typeof suggestion === 'string' 
                        ? suggestion 
                        : (suggestion && typeof suggestion === 'object' && suggestion.text)
                          ? suggestion.text
                          : String(suggestion || 'Explore this idea...')
                      }
                    </span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform flex-shrink-0 mt-0.5" />
                  </div>
                </Button>
              </motion.div>
            ))}
          </motion.div>
          
          {/* Static brain-themed explanation */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-muted-foreground/60 italic px-1 opacity-75 hover:opacity-100 transition-opacity"
          >
            <span className="text-primary/50 text-xs mr-1">🧠</span>
            <span className="break-words text-left">
              {message.suggestionExplanation || generateBrainExplanation(
                message.suggestions.map(s => typeof s === 'string' ? s : s?.text || String(s)),
                message.content
              )}
            </span>
          </motion.div>
        </div>
      )}
    </>
  );
};

// Memoize to prevent unnecessary re-renders causing flicker while typing
export default React.memo(MessageRenderer, (prev, next) => {
  // If the message reference or core display fields changed, re-render
  if (prev.responseMode !== next.responseMode) return false;
  const pm = prev.message;
  const nm = next.message;
  if (pm === nm) return true;
  // Shallow compare key fields
  return (
    pm.id === nm.id &&
    pm.content === nm.content &&
    pm.pointsEarned === nm.pointsEarned &&
    pm.pointsExplanation === nm.pointsExplanation &&
    pm.isTyping === nm.isTyping &&
    pm.pmfAnalysis === nm.pmfAnalysis &&
    JSON.stringify(pm.suggestions) === JSON.stringify(nm.suggestions)
  );
});