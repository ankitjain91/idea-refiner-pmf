import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Loader2, RefreshCw, ArrowRight, Sparkles, Star, Target, Rocket } from "lucide-react";
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
    <div className="min-h-screen bg-background py-24">
      <div className="container-width px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Simple Pricing
          </h1>
          <p className="text-muted-foreground">
            Choose the plan that fits your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const tierConfig = SUBSCRIPTION_TIERS[plan.tier as keyof typeof SUBSCRIPTION_TIERS];
            const isCurrentPlan = subscription.tier === plan.tier;
            
            return (
              <Card 
                key={plan.tier}
                className={`relative ${
                  plan.popular ? 'border-foreground' : 'border-border'
                } ${isCurrentPlan ? 'border-success' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Popular
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge variant="outline" className="absolute -top-3 right-4 bg-background">
                    Current
                  </Badge>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-foreground">{plan.icon}</div>
                    <CardTitle className="text-xl">{tierConfig.name}</CardTitle>
                  </div>
                  <div className="text-3xl font-bold">
                    {tierConfig.price || 'Free'}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 mt-0.5 flex-shrink-0" />
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
                      Manage Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(tierConfig.price_id!, plan.tier)}
                      disabled={loadingPlan === plan.tier || !tierConfig.price_id}
                    >
                      {loadingPlan === plan.tier ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Subscribe'
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={checkSubscription}
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>
    </div>
  );
}