import React from 'react';
import { SuggestionButton } from './SuggestionButton';

export interface SuggestionItem {
  id: string;
  text: string;
  category?: string;
}

interface SuggestionListProps {
  suggestions: SuggestionItem[];
  onSelect: (text: string) => void;
  maxHeight?: number; // px
}

// Adaptive max-height with internal scroll if overflow
export const SuggestionList: React.FC<SuggestionListProps> = ({ suggestions, onSelect, maxHeight = 320 }) => {
  if (!suggestions.length) return null;
  return (
    <div
      className="flex flex-col gap-2 overflow-y-auto pr-1"
      style={{ maxHeight }}
      role="list"
      aria-label="AI suggestions"
    >
      {suggestions.map(s => (
        <SuggestionButton key={s.id} text={s.text} category={s.category} onSelect={onSelect} />
      ))}
    </div>
  );
};
