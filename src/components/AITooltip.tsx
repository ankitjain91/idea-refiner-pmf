import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, Sparkles } from 'lucide-react';

interface AITooltipProps {
  children: React.ReactNode;
  content: string;
  context?: string;
}

export default function AITooltip({ children, content, context }: AITooltipProps) {
  const getContextualInsight = () => {
    if (!context) return content;
    
    const insights: { [key: string]: { [key: string]: string } } = {
      'marketSize': {
        'high': 'Large market indicates strong demand and validation.',
        'low': 'Niche market may offer focused opportunities.',
        'default': 'Market size determines potential scale.'
      },
      'growthRate': {
        'high': 'Rapid growth suggests emerging opportunities.',
        'low': 'Mature market requires differentiation.',
        'default': 'Growth rate indicates market momentum.'
      },
      'painDensity': {
        'high': 'Strong pain points signal urgent need for solutions.',
        'low': 'Low pain may indicate satisfied market.',
        'default': 'Pain intensity drives adoption speed.'
      },
      'sentiment': {
        'positive': 'Positive sentiment suggests market receptiveness.',
        'negative': 'Negative sentiment reveals improvement opportunities.',
        'default': 'Sentiment reflects user satisfaction levels.'
      },
      'competition': {
        'high': 'Crowded market requires unique positioning.',
        'low': 'Low competition may indicate untapped potential.',
        'default': 'Competition level affects entry strategy.'
      }
    };
    
    return insights[context]?.[content] || insights[context]?.default || content;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 cursor-help">
            {children}
            <Info className="w-3 h-3 text-muted-foreground opacity-50 hover:opacity-100 transition-opacity" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-relaxed">{getContextualInsight()}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}