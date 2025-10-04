import { UsageWarnings } from "@/components/dashboard/UsageWarnings";
import { RecentIdeas } from "@/components/dashboard/RecentIdeas";
import { CollaborationPanel } from "@/components/dashboard/CollaborationPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, HelpCircle, MessageSquare, Badge as BadgeIcon, BarChart3, TrendingUp, DollarSign, Users } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/EnhancedAuthContext";

export default function Dashboard() {
  const { subscription, usage } = useSubscription();
  const { user } = useAuth();
  const isPro = subscription.tier === 'pro' || subscription.tier === 'enterprise';
  const limits = SUBSCRIPTION_TIERS[subscription.tier].features;

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Header */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground">Track your performance and insights</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Usage Warnings */}
        <UsageWarnings />

        {/* User Stats - Prominent Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ideas Validated</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.ideas_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.ideasPerMonth === -1 ? '∞' : limits.ideasPerMonth} available
              </p>
              <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: limits.ideasPerMonth === -1 ? '100%' : `${Math.min(100, (usage.ideas_used / limits.ideasPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Credits Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.ai_credits_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.aiCreditsPerMonth.toLocaleString()} available
              </p>
              <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${Math.min(100, (usage.ai_credits_used / limits.aiCreditsPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exports</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.exports_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.exportsPerMonth === -1 ? '∞' : limits.exportsPerMonth} available
              </p>
              <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: limits.exportsPerMonth === -1 ? '100%' : `${Math.min(100, (usage.exports_used / limits.exportsPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{SUBSCRIPTION_TIERS[subscription.tier].name}</div>
              <p className="text-xs text-muted-foreground">{SUBSCRIPTION_TIERS[subscription.tier].price}</p>
              {!isPro && (
                <Button variant="outline" size="sm" className="mt-2 w-full">
                  Upgrade Plan
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Ideas */}
        <RecentIdeas />

        {/* Collaboration (Pro+) */}
        <CollaborationPanel />

        {/* Support & Learning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Support & Learning
            </CardTitle>
            <CardDescription>Get help and learn more about SmoothBrains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start gap-2">
                <BookOpen className="h-4 w-4" />
                How It Works
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                <MessageSquare className="h-4 w-4" />
                FAQs
              </Button>
              <Button variant="outline" className="justify-start gap-2 relative">
                <HelpCircle className="h-4 w-4" />
                Support
                {isPro && (
                  <span className="absolute -top-1 -right-1">
                    <BadgeIcon className="h-4 w-4 text-primary fill-primary" />
                  </span>
                )}
              </Button>
            </div>
            {isPro && (
              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
                <BadgeIcon className="h-3 w-3 text-primary" />
                Priority support included with your plan
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}