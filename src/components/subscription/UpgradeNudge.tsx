import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Sparkles, TrendingUp, Zap } from "lucide-react";

interface UpgradeNudgeProps {
  reason: string;
  currentTier: string;
  suggestedTier?: 'basic' | 'pro' | 'enterprise';
  feature?: string;
}

const tierIcons = {
  basic: Zap,
  pro: TrendingUp,
  enterprise: Sparkles,
};

const tierPrices = {
  basic: '$12/month',
  pro: '$29/month',
  enterprise: '$99/month',
};

export function UpgradeNudge({ reason, currentTier, suggestedTier = 'basic', feature }: UpgradeNudgeProps) {
  const navigate = useNavigate();
  const Icon = tierIcons[suggestedTier];

  return (
    <Alert className="border-primary/50 bg-primary/5 my-4">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        Upgrade to unlock more
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">{reason}</p>
        {feature && (
          <p className="text-xs text-muted-foreground">
            Feature: <span className="font-semibold">{feature}</span>
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => navigate('/pricing')}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            Upgrade to {suggestedTier.charAt(0).toUpperCase() + suggestedTier.slice(1)} {tierPrices[suggestedTier]}
          </Button>
          {suggestedTier === 'basic' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/pricing')}
            >
              View all plans
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
