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
      className="group relative w-full text-left rounded-md border bg-muted/40 hover:bg-muted/70 transition-colors px-3 py-2 text-sm leading-snug focus:outline-none focus-visible:ring-2 ring-offset-1 ring-primary/40 whitespace-normal break-words"
    >
      <div className="flex flex-col gap-1 pr-7">{/* space for copy icon */}
        <HighlightedText text={text} />
        {category && (
          <span className="self-start inline-flex items-center rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
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
