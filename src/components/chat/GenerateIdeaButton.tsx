import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIdeaContext } from '@/hooks/useIdeaContext';
import { useToast } from '@/hooks/use-toast';

interface GenerateIdeaButtonProps {
  conversationHistory: any[];
  disabled?: boolean;
}

export const GenerateIdeaButton = ({ conversationHistory, disabled }: GenerateIdeaButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState('');
  const { generateIdea, hasIdea } = useIdeaContext();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (conversationHistory.length === 0) {
      toast({
        title: "No conversation yet",
        description: "Start chatting about your idea first!",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const summary = await generateIdea(conversationHistory);
      setGeneratedSummary(summary);
      setShowConfirmDialog(true);
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Could not generate idea summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    toast({
      title: "Idea saved!",
      description: "Your idea summary is ready. Dashboard unlocked!",
    });
  };

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={disabled || isGenerating || conversationHistory.length === 0}
        variant={hasIdea ? "outline" : "default"}
        size="sm"
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {hasIdea ? 'Update My Idea' : 'Lock In My Idea'}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Idea Summary
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-4">
              <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-foreground leading-relaxed">{generatedSummary}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Edit Conversation</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Save & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
