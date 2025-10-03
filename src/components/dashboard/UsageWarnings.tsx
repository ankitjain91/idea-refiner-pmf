import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UsageWarnings() {
  const { usage, getRemainingIdeas, getRemainingAICredits, getRemainingExports } = useSubscription();
  const navigate = useNavigate();

  const ideasRemaining = getRemainingIdeas();
  const creditsRemaining = getRemainingAICredits();
  const exportsRemaining = getRemainingExports();

  const warnings = [];

  // Ideas warning (≥90%)
  if (ideasRemaining !== Infinity && ideasRemaining <= 1) {
    warnings.push({
      type: 'ideas',
      message: `You're almost out of ideas for this month (${ideasRemaining} left).`,
      action: 'Upgrade Plan',
      onClick: () => navigate('/pricing')
    });
  }

  // Credits warning
  if (creditsRemaining <= 100) {
    warnings.push({
      type: 'credits',
      message: `You're low on AI credits (${creditsRemaining} remaining).`,
      action: 'Buy +3,000 Credits',
      onClick: () => {/* TODO: Buy credits */}
    });
  }

  // Exports warning
  if (exportsRemaining !== Infinity && exportsRemaining === 0) {
    warnings.push({
      type: 'exports',
      message: `You've used all your exports for this month.`,
      action: 'Upgrade to Basic',
      onClick: () => navigate('/pricing')
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {warnings.map((warning, idx) => (
        <Alert key={idx} variant="destructive" className="bg-destructive/10 border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Usage Limit Warning</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{warning.message}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={warning.onClick}
              className="ml-4 gap-2"
            >
              <Sparkles className="h-3 w-3" />
              {warning.action}
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
