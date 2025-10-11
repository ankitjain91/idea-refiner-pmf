import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Zap, TrendingUp, MessageSquare, Sparkles, Play, Loader2 } from 'lucide-react';
import { OnDemandTile } from '@/components/ui/OnDemandTile';

interface UsageBreakdown {
  operation_type: string;
  credits_used: number;
}

export function OnDemandAICreditsUsageCard() {
  const { subscription, usage, getRemainingAICredits } = useSubscription();
  const [breakdown, setBreakdown] = useState<UsageBreakdown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchUsageBreakdown = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('ai_credits_usage')
        .select('operation_type, credits_used')
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().setDate(1)).toISOString()) // Current month
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate by operation type
      const aggregated = (data || []).reduce((acc, item) => {
        const existing = acc.find(x => x.operation_type === item.operation_type);
        if (existing) {
          existing.credits_used += item.credits_used;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, [] as UsageBreakdown[]);

      setBreakdown(aggregated.sort((a, b) => b.credits_used - a.credits_used));
      setHasLoaded(true);
    } catch (error) {
      console.error('Error fetching usage breakdown:', error);
      setError(error instanceof Error ? error.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const tiers = SUBSCRIPTION_TIERS[subscription.tier].features;
  const remainingCredits = getRemainingAICredits();
  const totalCredits = tiers.aiCreditsPerMonth || 'unlimited';
  const isUnlimited = remainingCredits === -1 || tiers.aiCreditsPerMonth > 10000;
  const usagePercentage = isUnlimited
    ? Math.min(100, (usage.ai_credits_used / 100) * 100)
    : Math.min(100, (usage.ai_credits_used / tiers.aiCreditsPerMonth) * 100);

  const getOperationIcon = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'chat': return MessageSquare;
      case 'analysis': return TrendingUp;
      case 'generation': return Sparkles;
      default: return Zap;
    }
  };

  const renderContent = () => {
    if (!hasLoaded) return null;

    return (
      <div className="space-y-6">
        {/* Main Usage Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {usage.ai_credits_used}
              </div>
              <p className="text-sm text-muted-foreground">
                of {totalCredits} credits used this month
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-muted-foreground">
                {isUnlimited ? '∞' : remainingCredits}
              </div>
              <p className="text-xs text-muted-foreground">remaining</p>
            </div>
          </div>

          <div className="space-y-2">
            <Progress 
              value={usagePercentage} 
              className="h-3 bg-muted/30"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{usagePercentage.toFixed(1)}% used</span>
              <span>{totalCredits}</span>
            </div>
          </div>
        </div>

        {/* Usage Breakdown */}
        {breakdown.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-sm">Usage Breakdown</h3>
            </div>
            <div className="space-y-2">
              {breakdown.slice(0, 5).map((item, index) => {
                const Icon = getOperationIcon(item.operation_type);
                const percentage = isUnlimited 
                  ? 0 
                  : (item.credits_used / tiers.aiCreditsPerMonth) * 100;
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium capitalize">
                        {item.operation_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.credits_used} credits
                      </Badge>
                      {!isUnlimited && (
                        <span className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Credit Status */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Credit Status</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isUnlimited
              ? 'You have unlimited AI credits with your current plan.'
              : `You have ${remainingCredits} credits remaining this month.`
            }
          </p>
        </div>
      </div>
    );
  };

  return (
    <OnDemandTile
      title="AI Credits Usage"
      icon={Zap}
      description="View detailed breakdown of your AI credits consumption across different operations like chat, analysis, and content generation."
      features={[
        "Monthly usage overview with progress tracking",
        "Breakdown by operation type (chat, analysis, generation)",
        "Remaining credits and usage percentage",
        "Historical usage patterns",
        "Credit optimization insights"
      ]}
      estimatedLoadTime="~5 seconds"
      isLoading={loading}
      error={error}
      data={hasLoaded ? breakdown : null}
      onLoad={fetchUsageBreakdown}
      onRefresh={fetchUsageBreakdown}
      className="border-primary/20"
      badge={{
        text: subscription.tier === 'enterprise' ? 'Unlimited' : 'Limited',
        variant: subscription.tier === 'enterprise' ? 'default' : 'secondary'
      }}
    >
      {renderContent()}
    </OnDemandTile>
  );
}