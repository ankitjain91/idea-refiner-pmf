import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { LS_KEYS } from '@/lib/storage-keys';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ResetSessionButton() {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      // Clear current session data from localStorage
      const keysToRemove = [
        LS_KEYS.analysisBrief,
        LS_KEYS.analysisBriefSuggestionsCache,
        LS_KEYS.analysisCompleted,
        LS_KEYS.pmfScore,
        LS_KEYS.ideaMetadata,
        LS_KEYS.currentSessionTitle,
        LS_KEYS.returnToChat,
        LS_KEYS.userIdea,
        LS_KEYS.userAnswers,
        'pmfAnalysisData',
        'chatHistory',
        'chatMessages'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));

      toast({
        title: "Session Reset",
        description: "Your current session has been reset successfully.",
      });
      
      // Navigate to ideachat for fresh start
      navigate('/ideachat', { replace: true });
      
      // Reload to ensure clean state
      setTimeout(() => window.location.reload(), 100);
      
    } catch (error) {
      console.error("Error resetting session:", error);
      toast({
        title: "Error",
        description: "Failed to reset session. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsResetting(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 gap-1 text-xs h-7 px-2"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Session
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Current Session?</AlertDialogTitle>
          <AlertDialogDescription>
            This will clear your current idea, analysis data, and chat history. 
            You'll start fresh with a new session. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={isResetting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Session"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}