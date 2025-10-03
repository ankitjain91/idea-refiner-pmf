import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const SUBSCRIPTION_TIERS = {
  free: {
    name: '🧠 Baby Brain',
    product_id: null,
    price_id: null,
    price: null,
    features: {
      ideasPerMonth: 3,
      basicAnalytics: true,
      advancedAnalytics: false,
      aiInsights: false,
      collaboration: false,
      marketAnalysis: false,
      exportData: false,
      prioritySupport: false,
      apiAccess: false
    }
  },
  basic: {
    name: '🧩 Smooth Starter',
    product_id: 'prod_T7Cs2e5UUZ0eov',
    price_id: 'price_1SAySTJtb0GRtBUmTWxAeuKJ',
    price: '$9/month',
    features: {
      ideasPerMonth: 5,
      basicAnalytics: true,
      advancedAnalytics: false,
      aiInsights: false,
      collaboration: false,
      marketAnalysis: true,
      exportData: true,
      prioritySupport: false,
      apiAccess: false
    }
  },
  pro: {
    name: '🚀 Wrinkle Eraser',
    product_id: 'prod_T7CsnetIz8NE1N',
    price_id: 'price_1SAySeJtb0GRtBUmYQ36t8rG',
    price: '$29/month',
    features: {
      ideasPerMonth: -1, // unlimited
      basicAnalytics: true,
      advancedAnalytics: true,
      aiInsights: true,
      collaboration: true,
      marketAnalysis: true,
      exportData: true,
      prioritySupport: true,
      apiAccess: false
    }
  },
  enterprise: {
    name: '🏆 Galaxy Brain',
    product_id: 'prod_T7CsCuGP8R6RrO',
    price_id: 'price_1SAySoJtb0GRtBUm7TgSNxQt',
    price: '$99/month',
    features: {
      ideasPerMonth: -1, // unlimited
      basicAnalytics: true,
      advancedAnalytics: true,
      aiInsights: true,
      collaboration: true,
      marketAnalysis: true,
      exportData: true,
      prioritySupport: true,
      apiAccess: true
    }
  }
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

interface SubscriptionContextType {
  user: User | null;
  subscription: {
    subscribed: boolean;
    tier: SubscriptionTier;
    product_id: string | null;
    subscription_end: string | null;
  };
  loading: boolean;
  checkSubscription: () => Promise<void>;
  canAccess: (feature: keyof typeof SUBSCRIPTION_TIERS.free.features) => boolean;
  getRemainingIdeas: () => number;
  ideaCount: number;
  incrementIdeaCount: () => void;
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
  const [loading, setLoading] = useState(true);
  const [ideaCount, setIdeaCount] = useState(0);
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

  const getRemainingIdeas = (): number => {
    const limit = SUBSCRIPTION_TIERS[subscription.tier].features.ideasPerMonth;
    if (limit === -1) return -1; // Unlimited
    return Math.max(0, limit - ideaCount);
  };

  const incrementIdeaCount = () => {
    setIdeaCount(prev => prev + 1);
  };

  useEffect(() => {
    // Check current auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription();
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription();
      } else {
        setSubscription({
          subscribed: false,
          tier: 'free',
          product_id: null,
          subscription_end: null,
        });
      }
    });

    // Check subscription every minute
    const interval = setInterval(checkSubscription, 60000);

    // Load idea count from localStorage (reset monthly in production)
    const storedCount = localStorage.getItem('ideaCount');
    const storedMonth = localStorage.getItem('ideaCountMonth');
    const currentMonth = new Date().getMonth();
    
    if (storedMonth !== currentMonth.toString()) {
      localStorage.setItem('ideaCount', '0');
      localStorage.setItem('ideaCountMonth', currentMonth.toString());
      setIdeaCount(0);
    } else {
      setIdeaCount(parseInt(storedCount || '0'));
    }

    return () => {
      authSub.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Save idea count to localStorage
    localStorage.setItem('ideaCount', ideaCount.toString());
  }, [ideaCount]);

  return (
    <SubscriptionContext.Provider value={{
      user,
      subscription,
      loading,
      checkSubscription,
      canAccess,
      getRemainingIdeas,
      ideaCount,
      incrementIdeaCount,
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