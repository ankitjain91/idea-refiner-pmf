import React, { useState } from 'react';
import { HighlightedText } from './HighlightedText';

interface SuggestionButtonProps {
  text: string;
  category?: string;
  onSelect: (text: string) => void;
}

export const SuggestionButton: React.FC<SuggestionButtonProps> = ({ text, category, onSelect }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      /* noop */
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(text)}
      className="group relative w-full text-left rounded-lg border border-indigo-200/60 dark:border-indigo-700/40 bg-white/80 dark:bg-indigo-950/20 hover:bg-indigo-50/90 dark:hover:bg-indigo-900/30 hover:border-indigo-300/80 dark:hover:border-indigo-600/60 transition-all duration-200 px-3 py-2.5 text-sm leading-snug focus:outline-none focus-visible:ring-2 ring-offset-1 ring-indigo-400/60 whitespace-normal break-words shadow-sm hover:shadow-md"
    >
      <div className="flex flex-col gap-1 pr-7">{/* space for copy icon */}
        <HighlightedText text={text} />
        {category && (
          <span className="self-start inline-flex items-center rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-800/50 dark:to-purple-800/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase shadow-sm">
            {category}
          </span>
        )}
      </div>
      <div className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        <span
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer select-none"
          aria-label="Copy suggestion"
        >
          {copied ? 'Copied' : 'Copy'}
        </span>
      </div>
    </button>
  );
};
