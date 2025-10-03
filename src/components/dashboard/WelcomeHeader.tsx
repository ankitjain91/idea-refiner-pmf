import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function WelcomeHeader() {
  const { user } = useAuth();
  const { subscription, usage, getRemainingIdeas, getRemainingAICredits, getRemainingExports } = useSubscription();
  const navigate = useNavigate();

  const displayName = user?.email?.split('@')[0] || 'User';
  const tierName = subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1);
  
  const ideasRemaining = getRemainingIdeas();
  const creditsRemaining = getRemainingAICredits();
  const exportsRemaining = getRemainingExports();

  return (
    <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Welcome + Badge */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-medium text-foreground">
                Welcome back, {displayName}
              </h1>
              <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'} className="mt-1">
                {tierName}
              </Badge>
            </div>
          </div>

          {/* Center: Usage Summary */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{ideasRemaining === Infinity ? '∞' : ideasRemaining}</span>
              {' '}ideas left
            </div>
            <div>
              <span className="font-medium text-foreground">{creditsRemaining.toLocaleString()}</span>
              {' '}AI credits
            </div>
            <div>
              <span className="font-medium text-foreground">{exportsRemaining === Infinity ? '∞' : exportsRemaining}</span>
              {' '}exports left
            </div>
          </div>

          {/* Right: CTAs */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Upgrade Plan
            </Button>
            <Button
              size="sm"
              onClick={() => {/* TODO: Buy credits flow */}}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Buy Credits
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
