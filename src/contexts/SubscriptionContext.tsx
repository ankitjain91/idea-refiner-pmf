import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const SUBSCRIPTION_TIERS = {
  free: {
    name: '🧠 Free',
    product_id: null,
    price_id: null,
    price: 'Free',
    features: {
      ideasPerMonth: 2,
      aiCreditsPerMonth: 50,
      refreshInterval: 'manual',
      exportsPerMonth: 0,
      seats: 1,
      projects: 1,
      basicAnalytics: true,
      advancedAnalytics: false,
      aiInsights: false,
      collaboration: false,
      marketAnalysis: false,
      exportData: false,
      prioritySupport: false,
      apiAccess: false,
      batchAnalysis: false,
      trendForecasting: false,
      autoRefresh: false
    }
  },
  basic: {
    name: '🧩 Basic',
    product_id: 'prod_T7Cs2e5UUZ0eov',
    price_id: 'price_1SAySTJtb0GRtBUmTWxAeuKJ',
    price: '$12/month',
    features: {
      ideasPerMonth: 10,
      aiCreditsPerMonth: 500,
      refreshInterval: '24h',
      exportsPerMonth: 3,
      seats: 1,
      projects: 3,
      basicAnalytics: true,
      advancedAnalytics: false,
      aiInsights: false,
      collaboration: false,
      marketAnalysis: true,
      exportData: true,
      prioritySupport: false,
      apiAccess: false,
      batchAnalysis: false,
      trendForecasting: false,
      autoRefresh: true
    }
  },
  pro: {
    name: '🚀 Pro',
    product_id: 'prod_T7CsnetIz8NE1N',
    price_id: 'price_1SAySeJtb0GRtBUmYQ36t8rG',
    price: '$29/month',
    features: {
      ideasPerMonth: -1, // unlimited
      aiCreditsPerMonth: 3000,
      refreshInterval: '6h',
      exportsPerMonth: 20,
      seats: 3,
      projects: -1, // unlimited
      basicAnalytics: true,
      advancedAnalytics: true,
      aiInsights: true,
      collaboration: true,
      marketAnalysis: true,
      exportData: true,
      prioritySupport: true,
      apiAccess: false,
      batchAnalysis: true,
      trendForecasting: true,
      autoRefresh: true
    }
  },
  enterprise: {
    name: '🏆 Enterprise',
    product_id: 'prod_T7CsCuGP8R6RrO',
    price_id: 'price_1SAySoJtb0GRtBUm7TgSNxQt',
    price: '$99/month',
    features: {
      ideasPerMonth: -1, // unlimited
      aiCreditsPerMonth: 10000,
      refreshInterval: '1h',
      exportsPerMonth: -1, // unlimited
      seats: 10,
      projects: -1, // unlimited
      basicAnalytics: true,
      advancedAnalytics: true,
      aiInsights: true,
      collaboration: true,
      marketAnalysis: true,
      exportData: true,
      prioritySupport: true,
      apiAccess: true,
      batchAnalysis: true,
      trendForecasting: true,
      autoRefresh: true
    }
  }
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

interface UsageLimits {
  ideas_used: number;
  ai_credits_used: number;
  exports_used: number;
  seats_used: number;
  projects_used: number;
}

interface SubscriptionContextType {
  user: User | null;
  subscription: {
    subscribed: boolean;
    tier: SubscriptionTier;
    product_id: string | null;
    subscription_end: string | null;
  };
  usage: UsageLimits;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  canAccess: (feature: keyof typeof SUBSCRIPTION_TIERS.free.features) => boolean;
  getRemainingIdeas: () => number;
  getRemainingAICredits: () => number;
  getRemainingExports: () => number;
  canUseFeature: (feature: string) => { allowed: boolean; reason?: string };
  incrementUsage: (type: 'ideas' | 'ai_credits' | 'exports' | 'projects', amount?: number) => Promise<boolean>;
  refreshUsage: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState({
    subscribed: false,
    tier: 'free' as SubscriptionTier,
    product_id: null as string | null,
    subscription_end: null as string | null,
  });
  const [usage, setUsage] = useState<UsageLimits>({
    ideas_used: 0,
    ai_credits_used: 0,
    exports_used: 0,
    seats_used: 1,
    projects_used: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setSubscription({
          subscribed: false,
          tier: 'free',
          product_id: null,
          subscription_end: null,
        });
        return;
      }

      setUser(session.user);

      // Call the check-subscription edge function to validate with Stripe
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Subscription check error:', error);
        // Default to free tier on error
        setSubscription({
          subscribed: false,
          tier: 'free',
          product_id: null,
          subscription_end: null,
        });
        return;
      }

      // Map product_id to tier
      let tier: SubscriptionTier = 'free';
      if (data?.subscribed && data?.product_id) {
        const productId = data.product_id;
        if (productId === SUBSCRIPTION_TIERS.enterprise.product_id) {
          tier = 'enterprise';
        } else if (productId === SUBSCRIPTION_TIERS.pro.product_id) {
          tier = 'pro';
        } else if (productId === SUBSCRIPTION_TIERS.basic.product_id) {
          tier = 'basic';
        }
      }

      setSubscription({
        subscribed: data?.subscribed || false,
        tier,
        product_id: data?.product_id || null,
        subscription_end: data?.subscription_end || null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription({
        subscribed: false,
        tier: 'free',
        product_id: null,
        subscription_end: null,
      });
    }
  };

  const canAccess = (feature: keyof typeof SUBSCRIPTION_TIERS.free.features): boolean => {
    const tierFeatures = SUBSCRIPTION_TIERS[subscription.tier].features;
    return tierFeatures[feature] === true || tierFeatures[feature] === -1;
  };

  const refreshUsage = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setUsage({
          ideas_used: data.ideas_used,
          ai_credits_used: data.ai_credits_used,
          exports_used: data.exports_used,
          seats_used: data.seats_used,
          projects_used: data.projects_used,
        });
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const getRemainingIdeas = (): number => {
    const limit = SUBSCRIPTION_TIERS[subscription.tier].features.ideasPerMonth;
    if (limit === -1) return -1; // Unlimited
    return Math.max(0, limit - usage.ideas_used);
  };

  const getRemainingAICredits = (): number => {
    const limit = SUBSCRIPTION_TIERS[subscription.tier].features.aiCreditsPerMonth;
    return Math.max(0, limit - usage.ai_credits_used);
  };

  const getRemainingExports = (): number => {
    const limit = SUBSCRIPTION_TIERS[subscription.tier].features.exportsPerMonth;
    if (limit === -1) return -1; // Unlimited
    return Math.max(0, limit - usage.exports_used);
  };

  const canUseFeature = (feature: string): { allowed: boolean; reason?: string } => {
    const tierFeatures = SUBSCRIPTION_TIERS[subscription.tier].features;
    
    // Check feature-specific limits
    if (feature === 'create_idea') {
      const remaining = getRemainingIdeas();
      if (remaining === 0) {
        return { 
          allowed: false, 
          reason: `You've used all ${tierFeatures.ideasPerMonth} ideas for this month. Upgrade to ${subscription.tier === 'free' ? 'Basic' : 'Pro'} for more.` 
        };
      }
    }
    
    if (feature === 'use_ai_credits') {
      const remaining = getRemainingAICredits();
      if (remaining === 0) {
        return { 
          allowed: false, 
          reason: `You've used all ${tierFeatures.aiCreditsPerMonth} AI credits for this month. Upgrade or purchase add-on credits.` 
        };
      }
    }
    
    if (feature === 'export') {
      const remaining = getRemainingExports();
      if (remaining === 0) {
        return { 
          allowed: false, 
          reason: `You've used all ${tierFeatures.exportsPerMonth} exports for this month. Upgrade to get more exports.` 
        };
      }
    }
    
    // Check boolean features
    const featureKey = feature as keyof typeof tierFeatures;
    if (featureKey in tierFeatures) {
      const featureValue = tierFeatures[featureKey];
      if (typeof featureValue === 'boolean' && !featureValue) {
        return { 
          allowed: false, 
          reason: `This feature is available in ${subscription.tier === 'free' ? 'Basic' : subscription.tier === 'basic' ? 'Pro' : 'Enterprise'} plan.` 
        };
      }
    }
    
    return { allowed: true };
  };

  const incrementUsage = async (type: 'ideas' | 'ai_credits' | 'exports' | 'projects', amount: number = 1): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase.rpc('increment_usage', {
        _user_id: user.id,
        _type: type,
        _amount: amount
      });
      
      if (error) throw error;
      
      // Refresh usage after increment
      await refreshUsage();
      
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      toast({
        title: 'Error',
        description: 'Failed to update usage. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    // Check current auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription();
        refreshUsage();
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription();
        refreshUsage();
      } else {
        setSubscription({
          subscribed: false,
          tier: 'free',
          product_id: null,
          subscription_end: null,
        });
        setUsage({
          ideas_used: 0,
          ai_credits_used: 0,
          exports_used: 0,
          seats_used: 1,
          projects_used: 0,
        });
      }
    });

    // Check subscription every minute
    const interval = setInterval(() => {
      checkSubscription();
      refreshUsage();
    }, 60000);

    return () => {
      authSub.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      user,
      subscription,
      usage,
      loading,
      checkSubscription,
      canAccess,
      getRemainingIdeas,
      getRemainingAICredits,
      getRemainingExports,
      canUseFeature,
      incrementUsage,
      refreshUsage,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}