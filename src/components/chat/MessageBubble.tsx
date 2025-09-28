import React, { Suspense, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SuggestionList } from './SuggestionList';
import type { ChatMessage as Message } from '@/types/chat';

interface MessageBubbleProps {
  msg: Message;
  typingStatus: string;
  classifySuggestionCategory: (s: string) => string | undefined;
  onSelectSuggestion: (suggestion: string, msg: Message) => void;
  LiveDataCards: React.LazyExoticComponent<React.ComponentType<any>>;
  currentIdea: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  typingStatus,
  classifySuggestionCategory,
  onSelectSuggestion,
  LiveDataCards,
  currentIdea
}) => {
  return (
    <div
      className={cn(
        'flex gap-3',
        msg.type === 'user' && 'justify-end',
        msg.type === 'system' && 'justify-center'
      )}
    >
      {msg.type === 'system' ? (
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm max-w-md text-center">
          <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
            {msg.content}
          </ReactMarkdown>
        </div>
      ) : (
        <>
          {msg.type === 'bot' && (
            <div className="relative animate-fade-in">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            </div>
          )}
          <div className={cn(
            'max-w-[75%] space-y-2',
            msg.type === 'user' ? 'items-end' : 'items-start'
          )}>
            <div
              className={cn(
                'rounded-2xl px-5 py-3.5 shadow-md transition-all duration-200',
                msg.type === 'user'
                  ? 'bg-black/80 backdrop-blur-xl border border-primary/20 text-white ml-auto'
                  : 'bg-card border border-border/50 hover:shadow-lg'
              )}
            >
              {msg.isTyping ? (
                <div className="flex items-center gap-2 py-1 animate-fade-in">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  {typingStatus && (
                    <span className="text-xs text-muted-foreground ml-2">{typingStatus}</span>
                  )}
                </div>
              ) : (
                <div className="text-sm leading-relaxed">
                  {msg.metadata?.liveData ? (
                    <div className="space-y-3">
                      <Suspense fallback={<div className='flex items-center gap-2 text-xs text-muted-foreground'><Loader2 className='h-3 w-3 animate-spin' /> Loading live signals…</div>}>
                        {currentIdea && <LiveDataCards idea={currentIdea} />}
                      </Suspense>
                    </div>
                  ) : (
                    <ExpandableMarkdown msg={msg} />
                  )}
                </div>
              )}
            </div>
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-indigo-50/80 via-purple-50/60 to-pink-50/40 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/10 border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 tracking-wide uppercase">
                    ✨ AI-Powered Suggestions
                  </p>
                </div>
                <SuggestionList
                  suggestions={msg.suggestions.map((s, idx) => ({
                    id: `${msg.id}-sugg-${idx}`,
                    text: s,
                    category: classifySuggestionCategory(s)
                  }))}
                  onSelect={(s) => onSelectSuggestion(s, msg)}
                  maxHeight={280}
                  ideaMode={false}
                />
              </div>
            )}
          </div>
          {msg.type === 'user' && (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Inline helper component to support expand/collapse of truncated concise messages
const ExpandableMarkdown: React.FC<{ msg: Message }> = ({ msg }) => {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = !!msg.metadata?.truncated && !!msg.metadata?.full;
  const display = expanded && isTruncated ? msg.metadata?.full : msg.content;
  return (
    <div className="space-y-2">
      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
        {display}
      </ReactMarkdown>
      {isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-xs underline text-primary hover:text-primary/80"
        >
          {expanded ? 'Collapse' : 'Expand full'}
        </button>
      )}
    </div>
  );
};
