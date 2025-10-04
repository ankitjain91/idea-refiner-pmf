import { useState, useEffect } from 'react';
import { UsageWarnings } from "@/components/dashboard/UsageWarnings";
import { RecentIdeas } from "@/components/dashboard/RecentIdeas";
import { CollaborationPanel } from "@/components/dashboard/CollaborationPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, HelpCircle, MessageSquare, Badge as BadgeIcon, BarChart3, TrendingUp, DollarSign, Users } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { DashboardLoader } from "@/components/engagement/DashboardLoader";

export default function Dashboard() {
  const { subscription, usage } = useSubscription();
  const { user } = useAuth();
  const isPro = subscription.tier === 'pro' || subscription.tier === 'enterprise';
  const limits = SUBSCRIPTION_TIERS[subscription.tier].features;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 py-20">
          <DashboardLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Welcome Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
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
          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ideas Validated</CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{usage.ideas_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.ideasPerMonth === -1 ? '∞' : limits.ideasPerMonth} available
              </p>
              <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all" 
                  style={{ width: limits.ideasPerMonth === -1 ? '100%' : `${Math.min(100, (usage.ideas_used / limits.ideasPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-secondary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Credits Used</CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10">
                <TrendingUp className="h-4 w-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-secondary to-warning bg-clip-text text-transparent">{usage.ai_credits_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.aiCreditsPerMonth.toLocaleString()} available
              </p>
              <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-secondary to-warning transition-all" 
                  style={{ width: `${Math.min(100, (usage.ai_credits_used / limits.aiCreditsPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exports</CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-warning/20 to-warning/10">
                <DollarSign className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-warning to-accent bg-clip-text text-transparent">{usage.exports_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.exportsPerMonth === -1 ? '∞' : limits.exportsPerMonth} available
              </p>
              <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-warning to-accent transition-all" 
                  style={{ width: limits.exportsPerMonth === -1 ? '100%' : `${Math.min(100, (usage.exports_used / limits.exportsPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10">
                <Users className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {SUBSCRIPTION_TIERS[subscription.tier].name}
              </div>
              <p className="text-xs text-muted-foreground">{SUBSCRIPTION_TIERS[subscription.tier].price}</p>
              {!isPro && (
                <Button variant="outline" size="sm" className="mt-2 w-full hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white transition-all">
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