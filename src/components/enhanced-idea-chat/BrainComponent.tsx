import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AnimatedBrain from '../AnimatedBrain';
import { WrinkleData } from './types';

interface BrainComponentProps {
  wrinkleData: WrinkleData;
  wrinklePoints: number;
  hoveringBrain: boolean;
  setHoveringBrain: (hovering: boolean) => void;
  displaySessionName: string;
  isDefaultSessionName: boolean;
}

const BrainComponent: React.FC<BrainComponentProps> = ({
  wrinkleData,
  wrinklePoints,
  hoveringBrain,
  setHoveringBrain,
  displaySessionName,
  isDefaultSessionName
}) => {
  // Convert tier to refinement level for AnimatedBrain component
  const refinementLevel = Math.min(wrinkleData.tier * 20, 100);

  return (
    <motion.div 
      className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Session Name Header */}
      <div className="flex-1">
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">
          {displaySessionName}
          {isDefaultSessionName && (
            <span className="text-xs text-muted-foreground ml-2">(Temporary)</span>
          )}
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-muted-foreground">Wrinkle Level</div>
          <div className="font-semibold text-primary">{wrinkleData.label}</div>
          <div className="text-xs text-muted-foreground">{Math.round(wrinklePoints)} points</div>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              onMouseEnter={() => setHoveringBrain(true)}
              onMouseLeave={() => setHoveringBrain(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
            >
              <motion.div
                animate={hoveringBrain ? {
                  rotate: [0, -5, 5, -5, 0],
                  transition: {
                    duration: 0.5,
                    ease: "easeInOut"
                  }
                } : {}}
              >
                <AnimatedBrain 
                  refinementLevel={refinementLevel}
                  isAnimating={hoveringBrain}
                  size="lg"
                />
              </motion.div>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent 
            side="left" 
            className="max-w-xs text-sm bg-popover border border-border shadow-lg"
          >
            <div className="space-y-2">
              <div className="font-semibold text-primary">
                {wrinkleData.label} Brain ({wrinkleData.tier}/5)
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {wrinkleData.tooltip}
              </p>
              <div className="text-xs font-medium text-primary">
                {Math.round(wrinklePoints)} wrinkle points
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        
        {/* Mobile stats */}
        <div className="text-center sm:hidden">
          <div className="text-xs text-muted-foreground">Wrinkles</div>
          <div className="font-semibold text-primary text-sm">{wrinkleData.label}</div>
          <div className="text-xs text-muted-foreground">{Math.round(wrinklePoints)}pts</div>
        </div>
      </div>
    </motion.div>
  );
};

export default BrainComponent;