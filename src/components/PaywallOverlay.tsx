import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, TrendingUp, Users, Zap, ArrowRight, Crown, Shield, Rocket } from "lucide-react";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PaywallOverlayProps {
  feature: keyof typeof SUBSCRIPTION_TIERS.free.features;
  children: React.ReactNode;
  blurContent?: boolean;
}

interface PersonalizedBenefit {
  feature: string;
  howItHelps: string;
  tier: string;
  impact: "high" | "medium" | "low";
}

export default function PaywallOverlay({ feature, children, blurContent = true }: PaywallOverlayProps) {
  const { canAccess, subscription } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [personalizedBenefits, setPersonalizedBenefits] = useState<PersonalizedBenefit[]>([]);
  const [recommendedTier, setRecommendedTier] = useState<string>("pro");
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const hasAccess = canAccess(feature);

  useEffect(() => {
    // Fetch personalized benefits when paywall is shown
    if (showPaywall && personalizedBenefits.length === 0) {
      fetchPersonalizedBenefits();
    }
  }, [showPaywall]);

  const fetchPersonalizedBenefits = async () => {
    setLoadingBenefits(true);
    try {
      const idea = localStorage.getItem('userIdea') || '';
      const userAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
      
      const { data, error } = await supabase.functions.invoke('subscription-benefits', {
        body: { 
          idea, 
          userAnswers,
          currentTier: subscription.tier
        }
      });

      if (error) throw error;

      if (data?.personalizedBenefits) {
        setPersonalizedBenefits(data.personalizedBenefits);
        setRecommendedTier(data.recommendedTier || 'pro');
      }
    } catch (error) {
      console.error('Failed to fetch personalized benefits:', error);
    } finally {
      setLoadingBenefits(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const getFeatureName = (featureKey: string) => {
    const names: Record<string, string> = {
      advancedAnalytics: "Detailed Insights",
      aiInsights: "AI-Powered Suggestions",
      collaboration: "Team Collaboration",
      marketAnalysis: "Market Research Data",
      exportData: "Export & Reports",
      prioritySupport: "Priority Support",
      apiAccess: "API Access"
    };
    return names[featureKey] || featureKey;
  };

  const getRequiredTier = (featureKey: string) => {
    for (const [tierName, tierConfig] of Object.entries(SUBSCRIPTION_TIERS)) {
      if (tierConfig.features[featureKey as keyof typeof tierConfig.features]) {
        return tierName;
      }
    }
    return 'pro';
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred/Locked Content */}
      <div 
        className={cn(
          "relative",
          blurContent && "blur-sm pointer-events-none select-none"
        )}
        onClick={() => !hasAccess && setShowPaywall(true)}
      >
        {children}
      </div>

      {/* Lock Overlay */}
      <div 
        className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center cursor-pointer"
        onClick={() => setShowPaywall(true)}
      >
        <div className="text-center space-y-4 p-6 bg-background/90 rounded-lg border">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {getFeatureName(feature)} is a Premium Feature
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upgrade to unlock this and many more features
            </p>
          </div>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              setShowPaywall(true);
            }}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            See What You'll Get
          </Button>
        </div>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Crown className="w-6 h-6 text-primary" />
                    Unlock Premium Features
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Based on your idea, here's how premium features will help you succeed
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPaywall(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Personalized Benefits */}
              {loadingBenefits ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Analyzing your needs...
                  </p>
                </div>
              ) : personalizedBenefits.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Features That Will Help Your Idea Succeed
                  </h4>
                  <div className="grid gap-3">
                    {personalizedBenefits.slice(0, 3).map((benefit, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium">{benefit.feature}</h5>
                          <div className="flex gap-2">
                            <Badge variant={benefit.impact === 'high' ? 'default' : 'secondary'}>
                              {benefit.impact} impact
                            </Badge>
                            <Badge variant="outline">
                              {benefit.tier}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {benefit.howItHelps}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Standard Benefits */}
              <div className="space-y-4">
                <h4 className="font-semibold">All Premium Features</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Real Market Data</p>
                      <p className="text-xs text-muted-foreground">
                        Live trends from social media & search
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Customer Insights</p>
                      <p className="text-xs text-muted-foreground">
                        Find & understand your audience
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI Improvements</p>
                      <p className="text-xs text-muted-foreground">
                        Step-by-step guidance to success
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Validation Tools</p>
                      <p className="text-xs text-muted-foreground">
                        Test your idea before building
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Plan */}
              <div className="p-4 rounded-lg bg-primary/5 border-primary/20 border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Recommended for You</span>
                  </div>
                  <Badge variant="default">Best Value</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">
                    {SUBSCRIPTION_TIERS[recommendedTier as keyof typeof SUBSCRIPTION_TIERS].name} Plan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Perfect for your current stage and goals
                  </p>
                  <p className="text-xl font-semibold text-primary">
                    {SUBSCRIPTION_TIERS[recommendedTier as keyof typeof SUBSCRIPTION_TIERS].price}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPaywall(false)}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={handleUpgrade}
                  className="flex-1 gap-2"
                >
                  Upgrade Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}