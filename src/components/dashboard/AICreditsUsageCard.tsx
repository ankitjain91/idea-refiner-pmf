import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Zap, TrendingUp, MessageSquare, Sparkles } from 'lucide-react';

interface UsageBreakdown {
  operation_type: string;
  credits_used: number;
}

export function AICreditsUsageCard() {
  const { subscription, usage, getRemainingAICredits } = useSubscription();
  const [breakdown, setBreakdown] = useState<UsageBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageBreakdown();
  }, [usage.ai_credits_used]);

  const fetchUsageBreakdown = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    } catch (error) {
      console.error('Error fetching usage breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const tierFeatures = SUBSCRIPTION_TIERS[subscription.tier].features;
  const limit = tierFeatures.aiCreditsPerMonth as number;
  const remaining = getRemainingAICredits();
  const percentUsed = (limit > 0) ? (usage.ai_credits_used / limit) * 100 : 0;

  const getOperationIcon = (type: string) => {
    if (type.includes('chat')) return MessageSquare;
    if (type.includes('summary')) return Sparkles;
    if (type.includes('suggestion')) return TrendingUp;
    return Zap;
  };

  const getOperationLabel = (type: string) => {
    const labels: Record<string, string> = {
      'idea-chat': 'Chat Messages',
      'groq-conversation-summary': 'Summaries',
      'generate-suggestions': 'Suggestions',
      'tile-ai-chat': 'Tile Analysis',
      'competitive-landscape': 'Market Analysis',
      'market-size-analysis': 'Market Size',
      'market-trends': 'Trends',
      'financial-analysis': 'Financial'
    };
    return labels[type] || type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          AI Credits Usage
        </CardTitle>
        <CardDescription>
          {remaining >= 0 ? `${remaining} of ${limit} credits remaining` : `${usage.ai_credits_used} credits used`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used</span>
            <span className="font-medium">
              {usage.ai_credits_used} / {limit}
            </span>
          </div>
          <Progress value={percentUsed} className="h-2" />
          {percentUsed >= 80 && percentUsed < 100 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Running low on credits
            </p>
          )}
          {percentUsed >= 100 && (
            <p className="text-sm text-destructive">
              🚫 Credit limit reached
            </p>
          )}
        </div>

        {!loading && breakdown.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Usage Breakdown</p>
            {breakdown.slice(0, 5).map((item) => {
              const Icon = getOperationIcon(item.operation_type);
              return (
                <div key={item.operation_type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{getOperationLabel(item.operation_type)}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.credits_used} credits
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Credits reset monthly. Upgrade for more credits.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
