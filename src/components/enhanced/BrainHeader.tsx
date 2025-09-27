import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import AnimatedBrain from '../AnimatedBrain';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface BrainHeaderProps {
  wrinklePoints: number;
  isRefining: boolean;
  hoveringBrain: boolean;
  setHoveringBrain: (v: boolean) => void;
  hasValidIdea: boolean;
  wrinkleTierLabel: string;
  dynamicBrainTooltip: string;
}

export const BrainHeader: React.FC<BrainHeaderProps> = ({
  wrinklePoints,
  isRefining,
  hoveringBrain,
  setHoveringBrain,
  hasValidIdea,
  wrinkleTierLabel,
  dynamicBrainTooltip
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          onMouseEnter={() => setHoveringBrain(true)}
          onMouseLeave={() => setHoveringBrain(false)}
          className="relative cursor-pointer"
        >
          <AnimatedBrain
            refinementLevel={Math.min(99, wrinklePoints * 2)}
            size="md"
            isAnimating={isRefining || hoveringBrain}
            previewMode={hoveringBrain}
          />
          {hoveringBrain && (
            <div className="pointer-events-none absolute inset-0 -m-1 z-50">
              {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i / 6) * 360;
                const lineLength = 26;
                return (
                  <React.Fragment key={i}>
                    <motion.div
                      className="absolute left-1/2 top-1/2 origin-left h-px bg-yellow-300/60"
                      style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)`, width: lineLength }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: i * 0.12 }}
                    />
                    <motion.span
                      className="absolute left-1/2 top-1/2 h-2 w-2 -ml-1 -mt-1 rounded-sm bg-yellow-400 shadow-[0_0_6px_1px_rgba(250,204,21,0.8)]"
                      style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${lineLength}px)` }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1, 0.2, 0], opacity: [0, 1, 0.8, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: i * 0.12 }}
                    />
                  </React.Fragment>
                );
              })}
              <motion.div
                initial={{ opacity: 0.25, scale: 0.6 }}
                animate={{ opacity: [0.25, 0.1, 0.25], scale: [0.6, 0.9, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-radial from-yellow-400/15 via-transparent to-transparent" />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs shadow-lg border ring-1 ring-primary/20">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-xs leading-relaxed font-medium text-primary">{wrinkleTierLabel} Cortex · {wrinklePoints.toFixed(1)} wrinkles</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{dynamicBrainTooltip}</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
