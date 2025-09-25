import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatStepIndicatorProps {
  currentStep: number;
  maxSteps: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

const ChatStepIndicator: React.FC<ChatStepIndicatorProps> = ({
  currentStep,
  maxSteps,
  completedSteps,
  onStepClick
}) => {
  const steps = [
    "Idea Overview",
    "Target Market",
    "Problem & Solution",
    "Business Model",
    "Competition",
    "Marketing Strategy",
    "Growth Potential",
    "Final Analysis"
  ];

  return (
    <div className="w-full px-4 py-3 bg-background/50 backdrop-blur border-b">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          {steps.slice(0, maxSteps).map((step, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => onStepClick?.(index)}
              disabled={!completedSteps.includes(index) && index !== currentStep}
              className={cn(
                "relative flex items-center gap-1 px-2 py-1 h-7 transition-all",
                currentStep === index && "bg-primary/10 text-primary font-medium",
                completedSteps.includes(index) && "text-foreground",
                !completedSteps.includes(index) && index !== currentStep && "text-muted-foreground/50"
              )}
            >
              {completedSteps.includes(index) ? (
                <Check className="h-3 w-3" />
              ) : (
                <Circle className={cn(
                  "h-3 w-3",
                  currentStep === index && "fill-primary"
                )} />
              )}
              <span className="hidden sm:inline text-xs">{step}</span>
              <span className="sm:hidden text-xs">{index + 1}</span>
            </Button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {maxSteps}
        </div>
      </div>
    </div>
  );
};

export default ChatStepIndicator;