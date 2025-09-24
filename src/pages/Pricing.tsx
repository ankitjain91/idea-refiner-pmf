import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Loader2 } from "lucide-react";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PricingPage() {
  const { subscription, checkSubscription } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (priceId: string, tierName: string) => {
    setLoadingPlan(tierName);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to subscribe",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to manage subscription",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive",
      });
    }
  };

  const plans = [
    {
      tier: 'basic',
      icon: <Zap className="w-8 h-8" />,
      popular: false,
      features: [
        { name: '5 ideas per month', included: true },
        { name: 'Basic analytics', included: true },
        { name: 'Market analysis', included: true },
        { name: 'Export capabilities', included: true },
        { name: 'Advanced PMF analytics', included: false },
        { name: 'AI insights', included: false },
        { name: 'Collaboration tools', included: false },
        { name: 'Priority support', included: false },
      ]
    },
    {
      tier: 'pro',
      icon: <Crown className="w-8 h-8" />,
      popular: true,
      features: [
        { name: 'Unlimited ideas', included: true },
        { name: 'Basic analytics', included: true },
        { name: 'Market analysis', included: true },
        { name: 'Export capabilities', included: true },
        { name: 'Advanced PMF analytics', included: true },
        { name: 'AI insights', included: true },
        { name: 'Collaboration tools', included: true },
        { name: 'Priority support', included: true },
      ]
    },
    {
      tier: 'enterprise',
      icon: <Building2 className="w-8 h-8" />,
      popular: false,
      features: [
        { name: 'Unlimited ideas', included: true },
        { name: 'Basic analytics', included: true },
        { name: 'Market analysis', included: true },
        { name: 'Export capabilities', included: true },
        { name: 'Advanced PMF analytics', included: true },
        { name: 'AI insights', included: true },
        { name: 'Collaboration tools', included: true },
        { name: 'Priority support', included: true },
        { name: 'API access', included: true },
        { name: 'Custom integrations', included: true },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold gradient-text mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Unlock powerful PMF validation tools and accelerate your startup journey
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => {
            const tierConfig = SUBSCRIPTION_TIERS[plan.tier as keyof typeof SUBSCRIPTION_TIERS];
            const isCurrentPlan = subscription.tier === plan.tier;
            
            return (
              <Card 
                key={plan.tier}
                className={`relative border-border/50 bg-card/95 backdrop-blur-xl ${
                  plan.popular ? 'ring-2 ring-primary' : ''
                } ${isCurrentPlan ? 'border-primary' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge variant="secondary" className="absolute -top-3 right-4">
                    Current Plan
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 text-primary">{plan.icon}</div>
                  <CardTitle className="text-2xl">{tierConfig.name}</CardTitle>
                  <CardDescription className="text-3xl font-bold mt-2">
                    {tierConfig.price || 'Free'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                        )}
                        <span className={feature.included ? '' : 'text-muted-foreground/50'}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button 
                      className="w-full" 
                      variant="secondary"
                      onClick={handleManageSubscription}
                    >
                      Manage Subscription
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-gradient-primary hover:opacity-90"
                      onClick={() => handleSubscribe(tierConfig.price_id!, plan.tier)}
                      disabled={loadingPlan === plan.tier || !tierConfig.price_id}
                    >
                      {loadingPlan === plan.tier ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Subscribe to ${tierConfig.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={checkSubscription}
          >
            Refresh Subscription Status
          </Button>
        </div>
      </div>
    </div>
  );
}