import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Crown, Sparkles } from "lucide-react";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";

interface PaywallOverlayProps {
  feature: string;
  requiredTier?: 'basic' | 'pro' | 'enterprise';
  children: React.ReactNode;
  className?: string;
}

export default function PaywallOverlay({ 
  feature, 
  requiredTier = 'pro',
  children,
  className = ""
}: PaywallOverlayProps) {
  const { subscription, canAccess, loading } = useSubscription();
  const navigate = useNavigate();
  
  // Map features to access keys - using type assertion for feature keys
  type FeatureKey = keyof typeof SUBSCRIPTION_TIERS.free.features;
  
  const featureMap: Record<string, FeatureKey> = {
    'Advanced PMF Analytics': 'advancedAnalytics',
    'AI Insights': 'aiInsights',
    'Collaboration': 'collaboration',
    'Market Analysis': 'marketAnalysis',
    'Export Data': 'exportData',
  };
  
  const accessKey = featureMap[feature];
  
  // If still loading subscription status, show the content without overlay
  if (loading) {
    return <>{children}</>;
  }
  
  const hasAccess = accessKey ? canAccess(accessKey) : false;

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-30 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/80 to-background/60 backdrop-blur-sm flex items-center justify-center">
        <Card className="max-w-sm border-primary/50 bg-card/95 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3">
              <div className="relative">
                <Lock className="w-12 h-12 text-primary" />
                <Crown className="w-6 h-6 text-yellow-500 absolute -top-2 -right-2" />
              </div>
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Premium Feature
            </CardTitle>
            <CardDescription>
              {feature} is available with {requiredTier === 'basic' ? 'Basic' : requiredTier === 'pro' ? 'Pro' : 'Enterprise'} plan and above
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Unlock powerful analytics, AI insights, and collaboration tools to accelerate your startup journey
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => navigate('/pricing')}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
              <Badge variant="outline" className="mx-auto">
                Current plan: {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}