import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConversationPinToggle } from './ConversationPinToggle';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface IdeaSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
  isPinned: boolean;
  onPinToggle: () => void;
}

export const IdeaSummaryDialog: React.FC<IdeaSummaryDialogProps> = ({
  open,
  onOpenChange,
  summary,
  isPinned,
  onPinToggle
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Your Idea Summary
          </DialogTitle>
          <DialogDescription>
            This is your refined idea based on our conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm leading-relaxed">{summary}</p>
          </div>
          
          <div className="flex justify-end">
            <ConversationPinToggle 
              isPinned={isPinned}
              onToggle={onPinToggle}
              hasMessages={true}
              disabled={false}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
