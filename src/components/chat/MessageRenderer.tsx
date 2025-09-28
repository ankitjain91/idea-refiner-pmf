import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ChevronRight, Lightbulb, ArrowRight, RefreshCw, AlertCircle, FileText, ListMinus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from './types';
import { generateSuggestionExplanation, generateBrainExplanation } from './utils';
import PMFAnalysisCard from './PMFAnalysisCard';

interface MessageRendererProps {
  message: Message;
  onSendMessage: (message: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
  onRetry?: (message: Message) => void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ 
  message, 
  onSendMessage,
  onSuggestionClick,
  onRetry
}) => {
  const [isShowingSummary, setIsShowingSummary] = useState(false);
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
  
  // Handle user messages that failed to get response
  if (message.type === 'user' && message.failedToGetResponse) {
    return (
      <div className="space-y-3">
        <div className="text-sm opacity-90 break-words overflow-wrap-anywhere whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-xs text-destructive">Failed to get response</span>
          {onRetry && (
            <Button
              onClick={() => onRetry(message)}
              variant="outline"
              size="sm"
              className="ml-2 h-7 px-2 text-xs flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // Handle error messages with retry button (legacy, keeping for backward compatibility)
  if (message.isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-destructive">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Connection Error</p>
            <p className="text-sm opacity-90 mt-1">{message.content}</p>
          </div>
        </div>
        {onRetry && (
          <Button
            onClick={() => onRetry(message)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // Determine which content to display
  const displayContent = (() => {
    if (message.type === 'bot') {
      // Show summary if toggled, otherwise always show detailed
      if (isShowingSummary && message.summaryContent) {
        return message.summaryContent;
      } else if (message.detailedContent) {
        return message.detailedContent;
      }
    }
    // Fallback to regular content
    return message.content;
  })();

  return (
    <>
      <div className="prose prose-sm max-w-none dark:prose-invert relative">
        {/* Add summarize button for bot messages with both detailed and summary content */}
        {message.type === 'bot' && message.detailedContent && message.summaryContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsShowingSummary(!isShowingSummary)}
            className="absolute top-0 right-0 p-1.5 h-auto hover:bg-accent/50 z-10"
            title={isShowingSummary ? 'Show detailed response' : 'Show summary'}
          >
            {isShowingSummary ? (
              <FileText className="h-4 w-4" />
            ) : (
              <ListMinus className="h-4 w-4" />
            )}
          </Button>
        )}
        <ReactMarkdown
          components={{
            // Custom styling for different elements
            h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mb-3 mt-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-semibold text-foreground mb-2.5 mt-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-medium text-foreground mb-2 mt-2.5">{children}</h3>,
            p: ({ children }) => <p className="text-sm leading-relaxed text-foreground mb-3 break-words">{children}</p>,
            ul: ({ children }) => <ul className="space-y-2 mb-3 ml-0 list-none">{children}</ul>,
            ol: ({ children }) => <ol className="space-y-2 mb-3 ml-4 list-decimal">{children}</ol>,
            li: ({ children }) => (
              <motion.li 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2.5 text-sm text-foreground"
              >
                <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="break-words leading-relaxed flex-1">{children}</span>
              </motion.li>
            ),
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
            code: ({ children }) => (
              <code className="text-xs bg-primary/10 px-1.5 py-0.5 rounded text-primary font-mono inline-block">
                {children}
              </code>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-3 border-primary/50 pl-4 py-1 my-3 italic text-foreground/80 text-sm bg-primary/5 rounded-r">
                {children}
              </blockquote>
            ),
            a: ({ children, href }) => (
              <a href={href} className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">
                {children}
              </a>
            ),
          }}
        >
          {displayContent}
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
  const pm = prev.message;
  const nm = next.message;
  if (pm === nm) return true;
  // Shallow compare key fields
  return (
    pm.id === nm.id &&
    pm.content === nm.content &&
    pm.detailedContent === nm.detailedContent &&
    pm.summaryContent === nm.summaryContent &&
    pm.pointsEarned === nm.pointsEarned &&
    pm.pointsExplanation === nm.pointsExplanation &&
    pm.isTyping === nm.isTyping &&
    pm.pmfAnalysis === nm.pmfAnalysis &&
    JSON.stringify(pm.suggestions) === JSON.stringify(nm.suggestions)
  );
});