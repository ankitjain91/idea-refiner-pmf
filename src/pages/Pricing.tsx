import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Crown, Zap, Building2, Loader2, RefreshCw, ArrowLeft, Sparkles, Star } from "lucide-react";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { UserMenu } from "@/components/UserMenu";


import { motion } from "framer-motion";

export default function PricingPage() {
  const { subscription, checkSubscription } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubscribe = async (priceId: string, tierName: string) => {
    setLoadingPlan(tierName);
    
    try {
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to subscribe. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => {
          navigate('/', { state: { from: { pathname: '/pricing' }, openAuthModal: true } });
        }, 1500);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: priceId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
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
      icon: <Zap className="w-6 h-6" />,
      popular: false,
      color: "from-blue-500/20 to-cyan-500/20",
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
      icon: <Crown className="w-6 h-6" />,
      popular: true,
      color: "from-primary/20 to-accent/20",
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
      icon: <Building2 className="w-6 h-6" />,
      popular: false,
      color: "from-purple-500/20 to-pink-500/20",
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

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-lg font-semibold">Pricing</h1>
          <p className="text-xs text-muted-foreground">Choose your subscription plan</p>
        </div>
        <UserMenu />
      </div>
        
        <div className="flex-1 overflow-auto bg-gradient-to-br from-primary/5 via-accent/5 to-background relative">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

          <div className="container mx-auto px-6 py-24 relative z-10">
        <motion.div 
          initial="initial"
          animate="animate"
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.div variants={fadeIn} className="inline-block mb-4">
            <Badge className="px-4 py-1" variant="secondary">
              <Sparkles className="w-3 h-3 mr-1" />
              Flexible Pricing
            </Badge>
          </motion.div>
          <motion.h1 
            variants={fadeIn}
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
          >
            Choose Your Growth Plan
          </motion.h1>
          <motion.p 
            variants={fadeIn}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Start free and scale as you grow. Cancel anytime.
          </motion.p>
        </motion.div>

        <motion.div 
          initial="initial"
          animate="animate"
          variants={stagger}
          className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {plans.map((plan, index) => {
            const tierConfig = SUBSCRIPTION_TIERS[plan.tier as keyof typeof SUBSCRIPTION_TIERS];
            const isCurrentPlan = subscription.tier === plan.tier;
            
            return (
              <motion.div
                key={plan.tier}
                variants={fadeIn}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-0 right-0 flex justify-center">
                    <Badge className="px-3 py-1 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <Card 
                  className={`relative overflow-hidden h-full transition-all hover:shadow-2xl hover:-translate-y-1 ${
                    plan.popular ? 'border-primary shadow-lg' : 'border-border'
                  } ${isCurrentPlan ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                >
                  {/* Gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-50`} />
                  
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.color}`}>
                          {plan.icon}
                        </div>
                        <CardTitle className="text-2xl">{tierConfig.name}</CardTitle>
                      </div>
                      {isCurrentPlan && (
                        <Badge variant="secondary" className="bg-primary/10">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">{tierConfig.price || 'Free'}</span>
                      {tierConfig.price && <span className="text-muted-foreground">/month</span>}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <motion.li 
                          key={idx} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          className="flex items-start gap-3 text-sm"
                        >
                          {feature.included ? (
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-0.5 flex-shrink-0">
                              <X className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                          <span className={feature.included ? '' : 'text-muted-foreground'}>
                            {feature.name}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter className="relative">
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
                          <>
                            Get Started
                            {plan.popular && <Sparkles className="w-4 h-4 ml-2" />}
                          </>
                        )}
                      </Button>
                    )}
                    {loadingPlan === plan.tier && (
                      <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-dashed border-primary/30 animate-pulse" />
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <Button 
            variant="ghost" 
            size="sm"
            onClick={checkSubscription}
            className="gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh Status
          </Button>
        </motion.div>
          </div>
        </div>
    </div>
  );
}