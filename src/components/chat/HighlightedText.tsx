import React from 'react';

// Highlights quantitative tokens: numbers, %, $, x multipliers
const QUANT_PATTERN = /(\b\d+(?:\.\d+)?(?:x)?%?|\$\d+(?:\.\d+)?)/gi;

export const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  const parts: Array<{ v: string; highlight: boolean }> = [];
  let lastIndex = 0;
  const str = text;
  let match: RegExpExecArray | null;
  while ((match = QUANT_PATTERN.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ v: str.slice(lastIndex, match.index), highlight: false });
    }
    parts.push({ v: match[0], highlight: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < str.length) parts.push({ v: str.slice(lastIndex), highlight: false });
  return (
    <span className="inline break-words whitespace-pre-wrap leading-snug">
      {parts.map((p, i) => p.highlight ? (
        <span key={i} className="inline-block px-1 rounded bg-primary/15 text-primary font-semibold tracking-tight align-baseline">
          {p.v}
        </span>
      ) : (
        <React.Fragment key={i}>{p.v}</React.Fragment>
      ))}
    </span>
  );
};
