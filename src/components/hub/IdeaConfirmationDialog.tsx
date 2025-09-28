import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain } from 'lucide-react';
import type { IdeaConfirmation } from '@/hooks/useIdeaManagement';

interface IdeaConfirmationDialogProps {
  pendingIdea: IdeaConfirmation;
  onConfirm: () => void;
  onCancel: () => void;
}

export function IdeaConfirmationDialog({
  pendingIdea,
  onConfirm,
  onCancel
}: IdeaConfirmationDialogProps) {
  const { idea, metadata, isOpen } = pendingIdea;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Perfect! Let me confirm your startup idea</DialogTitle>
          </div>
          <DialogDescription className="text-base mt-3">
            I'd love to help analyze this idea for you! Just to make sure I understand correctly, here's what you're building:
          </DialogDescription>
        </DialogHeader>
        
        <Card className="p-4 bg-muted/50 border-2 border-primary/20">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-foreground font-medium leading-relaxed">
                {idea}
              </p>
            </div>
            
            {metadata && (
              <div className="pt-2 border-t border-border/50 space-y-2">
                {metadata.problem && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Problem solving:</span>
                    <span className="ml-2 text-foreground">{metadata.problem}</span>
                  </div>
                )}
                {metadata.targetUsers && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Target audience:</span>
                    <span className="ml-2 text-foreground">{metadata.targetUsers}</span>
                  </div>
                )}
                {metadata.uniqueness && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">What makes it unique:</span>
                    <span className="ml-2 text-foreground">{metadata.uniqueness}</span>
                  </div>
                )}
                {metadata.tags && metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {metadata.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
        
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p className="font-medium mb-1">✨ What happens next:</p>
          <ul className="space-y-1 ml-4">
            <li>• I'll save your idea securely across all systems</li>
            <li>• The dashboard will start analyzing real market data</li>
            <li>• You'll see competitive insights, trends, and opportunities</li>
            <li>• All your future sessions will remember this idea</li>
          </ul>
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 sm:flex-initial"
          >
            Let me edit this
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 sm:flex-initial gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Yes, this is perfect! Let's analyze it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}