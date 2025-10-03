import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Sparkles, FileText, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function UsageBar() {
  const { subscription, usage, getRemainingIdeas, getRemainingAICredits, getRemainingExports } = useSubscription();
  
  const tierFeatures = subscription.tier 
    ? {
        ideas: (SUBSCRIPTION_TIERS as any)[subscription.tier].features.ideasPerMonth,
        credits: (SUBSCRIPTION_TIERS as any)[subscription.tier].features.aiCreditsPerMonth,
        exports: (SUBSCRIPTION_TIERS as any)[subscription.tier].features.exportsPerMonth,
      }
    : { ideas: 0, credits: 0, exports: 0 };

  const ideasRemaining = getRemainingIdeas();
  const creditsRemaining = getRemainingAICredits();
  const exportsRemaining = getRemainingExports();

  const ideasPercent = tierFeatures.ideas === -1 ? 0 : (usage.ideas_used / tierFeatures.ideas) * 100;
  const creditsPercent = tierFeatures.credits === -1 ? 0 : (usage.ai_credits_used / tierFeatures.credits) * 100;
  const exportsPercent = tierFeatures.exports === -1 ? 0 : (usage.exports_used / tierFeatures.exports) * 100;

  const getStatusColor = (percent: number) => {
    if (percent >= 90) return "text-destructive";
    if (percent >= 70) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Usage This Month
          <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'}>
            {subscription.tier.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>Track your monthly usage limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ideas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span>Ideas</span>
            </div>
            <span className={getStatusColor(ideasPercent)}>
              {tierFeatures.ideas === -1 ? (
                <span>Unlimited</span>
              ) : (
                <span>{ideasRemaining} left</span>
              )}
            </span>
          </div>
          {tierFeatures.ideas !== -1 && (
            <Progress value={ideasPercent} className="h-2" />
          )}
          <p className="text-xs text-muted-foreground">
            {tierFeatures.ideas === -1 ? 'Unlimited ideas' : `${usage.ideas_used} / ${tierFeatures.ideas} used`}
          </p>
        </div>

        {/* AI Credits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI Credits</span>
            </div>
            <span className={getStatusColor(creditsPercent)}>
              {creditsRemaining.toLocaleString()} left
            </span>
          </div>
          <Progress value={creditsPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {usage.ai_credits_used.toLocaleString()} / {tierFeatures.credits.toLocaleString()} used
          </p>
        </div>

        {/* Exports */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Exports</span>
            </div>
            <span className={getStatusColor(exportsPercent)}>
              {tierFeatures.exports === -1 ? (
                <span>Unlimited</span>
              ) : (
                <span>{exportsRemaining} left</span>
              )}
            </span>
          </div>
          {tierFeatures.exports !== -1 && (
            <Progress value={exportsPercent} className="h-2" />
          )}
          <p className="text-xs text-muted-foreground">
            {tierFeatures.exports === -1 ? 'Unlimited exports' : `${usage.exports_used} / ${tierFeatures.exports} used`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Import subscription tiers constant
import { SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
