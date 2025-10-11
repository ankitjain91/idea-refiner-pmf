import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConversationPinToggle } from './ConversationPinToggle';
import { Button } from '@/components/ui/button';
import { Lightbulb, Sparkles, Lock, Unlock, Loader2 } from 'lucide-react';
import { useLockedIdea } from '@/hooks/useLockedIdea';
import { useToast } from '@/hooks/use-toast';

interface IdeaSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
  isPinned: boolean;
  onPinToggle: () => void;
  onRefine?: (refinedSummary: string) => void;
  messages?: any[]; // Conversation history for refinement
}

export const IdeaSummaryDialog: React.FC<IdeaSummaryDialogProps> = ({
  open,
  onOpenChange,
  summary,
  isPinned,
  onPinToggle,
  onRefine,
  messages = []
}) => {
  const { lockedIdea, isLocked, lockIdea, unlockIdea } = useLockedIdea();
  const { toast } = useToast();
  const [isRefining, setIsRefining] = useState(false);
  const [refinedSummary, setRefinedSummary] = useState(summary);
  
  const isCurrentIdeaLocked = isLocked && lockedIdea === summary;

  const handleLockToggle = () => {
    if (isCurrentIdeaLocked) {
      unlockIdea();
      toast({
        title: "Idea Unlocked 🔓",
        description: "Your idea is now unlocked and can be modified."
      });
    } else if (refinedSummary) {
      lockIdea(refinedSummary);
      toast({
        title: "Idea Locked! 🔒",
        description: "Your idea is now locked and will be used across the dashboard."
      });
    }
  };

  const handleRefine = async () => {
    if (!refinedSummary || messages.length === 0) return;
    
    setIsRefining(true);
    try {
      // Call edge function to refine the idea
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refine-idea`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            currentIdea: refinedSummary,
            conversationHistory: messages.map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.content
            }))
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refine idea');
      }

      const data = await response.json();
      const newRefinedIdea = data.refinedIdea;
      
      setRefinedSummary(newRefinedIdea);
      onRefine?.(newRefinedIdea);
      
      toast({
        title: "Idea Refined! ✨",
        description: "Your idea has been refined based on the conversation."
      });
    } catch (error) {
      console.error('Failed to refine idea:', error);
      toast({
        title: "Refinement Failed",
        description: "Could not refine the idea. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefining(false);
    }
  };

  // Update refined summary when summary prop changes
  React.useEffect(() => {
    setRefinedSummary(summary);
  }, [summary]);

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
            <p className="text-sm leading-relaxed">{refinedSummary}</p>
          </div>
          
          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefine}
                disabled={isRefining || !refinedSummary}
                className="gap-2"
              >
                {isRefining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Refine Idea
                  </>
                )}
              </Button>
              
              <Button
                variant={isCurrentIdeaLocked ? "default" : "outline"}
                size="sm"
                onClick={handleLockToggle}
                disabled={!refinedSummary}
                className="gap-2"
              >
                {isCurrentIdeaLocked ? (
                  <>
                    <Unlock className="h-4 w-4" />
                    Unlock Idea
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Lock My Idea
                  </>
                )}
              </Button>
            </div>
            
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
