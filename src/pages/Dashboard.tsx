import { UsageWarnings } from "@/components/dashboard/UsageWarnings";
import { RecentIdeas } from "@/components/dashboard/RecentIdeas";
import { CollaborationPanel } from "@/components/dashboard/CollaborationPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, HelpCircle, MessageSquare, Badge as BadgeIcon, BarChart3, TrendingUp, DollarSign, Users } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { saveIdeaToLeaderboard } from "@/utils/saveIdeaToLeaderboard";
import { useIdeaContext } from "@/hooks/useIdeaContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { subscription, usage } = useSubscription();
  const { user } = useAuth();
  const { getIdea } = useIdeaContext();
  const isPro = subscription.tier === 'pro' || subscription.tier === 'enterprise';
  const limits = SUBSCRIPTION_TIERS[subscription.tier].features;

  // Update leaderboard when dashboard loads
  useEffect(() => {
    const updateLeaderboard = async () => {
      const currentIdea = getIdea();
      const sessionData = localStorage.getItem('sessionData');
      const sessionName = localStorage.getItem('currentSessionName') || 'Untitled Session';
      
      if (!currentIdea) return;
      
      let pmfScore = 0;
      let category = 'Uncategorized';
      
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          pmfScore = parsed.pmfScore || parsed.dashboardData?.smoothBrainsScore || 0;
          category = parsed.category || 'Uncategorized';
        } catch (e) {
          console.error('[Dashboard] Failed to parse session data:', e);
        }
      }
      
      if (pmfScore > 0) {
        // Get AI-generated summary from useIdeaContext
        const aiSummary = localStorage.getItem('appIdea');
        let ideaSummary = currentIdea;
        if (aiSummary) {
          try {
            const parsed = JSON.parse(aiSummary);
            ideaSummary = parsed.summary || currentIdea;
          } catch (e) {
            console.error('Failed to parse AI summary:', e);
          }
        }
        
        await saveIdeaToLeaderboard({
          idea: currentIdea,
          refinedIdea: ideaSummary, // Use AI-generated summary here
          pmfScore,
          sessionName,
          category,
          isPublic: true
        });
      }
    };
    
    updateLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Welcome Header */}
      <div className="border-b bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p className="text-muted-foreground text-sm">Here's an overview of your SmoothBrains journey</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Usage Warnings */}
        <UsageWarnings />

        {/* User Stats - Prominent Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-xl hover:scale-105 transition-all duration-300 border border-primary/20 bg-gradient-to-br from-card to-card/80 backdrop-blur overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ideas Validated</CardTitle>
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-1">
                {usage.ideas_used}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                of {limits.ideasPerMonth === -1 ? 'unlimited' : limits.ideasPerMonth} this month
              </p>
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden backdrop-blur">
                <div 
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-500 rounded-full" 
                  style={{ width: limits.ideasPerMonth === -1 ? '100%' : `${Math.min(100, (usage.ideas_used / limits.ideasPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl hover:scale-105 transition-all duration-300 border border-secondary/20 bg-gradient-to-br from-card to-card/80 backdrop-blur overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI Credits Used</CardTitle>
              <div className="p-3 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent mb-1">
                {usage.ai_credits_used.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                of {limits.aiCreditsPerMonth.toLocaleString()} this month
              </p>
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden backdrop-blur">
                <div 
                  className="h-full bg-gradient-to-r from-secondary via-accent to-warning transition-all duration-500 rounded-full" 
                  style={{ width: `${Math.min(100, (usage.ai_credits_used / limits.aiCreditsPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl hover:scale-105 transition-all duration-300 border border-warning/20 bg-gradient-to-br from-card to-card/80 backdrop-blur overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">Exports</CardTitle>
              <div className="p-3 rounded-xl bg-gradient-to-br from-warning/20 to-warning/10 group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-warning via-accent to-warning bg-clip-text text-transparent mb-1">
                {usage.exports_used}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                of {limits.exportsPerMonth === -1 ? 'unlimited' : limits.exportsPerMonth} this month
              </p>
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden backdrop-blur">
                <div 
                  className="h-full bg-gradient-to-r from-warning via-accent to-warning transition-all duration-500 rounded-full" 
                  style={{ width: limits.exportsPerMonth === -1 ? '100%' : `${Math.min(100, (usage.exports_used / limits.exportsPerMonth) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl hover:scale-105 transition-all duration-300 border border-accent/20 bg-gradient-to-br from-card to-card/80 backdrop-blur overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
              <div className="p-3 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold capitalize bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent mb-1">
                {SUBSCRIPTION_TIERS[subscription.tier].name}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{SUBSCRIPTION_TIERS[subscription.tier].price}</p>
              {!isPro && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary hover:to-accent hover:text-primary-foreground border-primary/30 transition-all"
                  onClick={() => navigate('/pricing')}
                >
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
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Support & Learning
            </CardTitle>
            <CardDescription>Get help and learn more about SmoothBrains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="justify-start gap-2 hover:border-primary/50"
                onClick={() => navigate('/documentation')}
              >
                <BookOpen className="h-4 w-4" />
                Documentation
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 hover:border-primary/50"
                onClick={() => navigate('/documentation#faq')}
              >
                <MessageSquare className="h-4 w-4" />
                FAQs
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 relative hover:border-primary/50"
                onClick={() => window.open('mailto:support@smoothbrains.ai', '_blank')}
              >
                <HelpCircle className="h-4 w-4" />
                Contact Support
                {isPro && (
                  <span className="absolute -top-1 -right-1">
                    <BadgeIcon className="h-4 w-4 text-primary fill-primary" />
                  </span>
                )}
              </Button>
            </div>
            {isPro && (
              <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <p className="text-xs text-foreground flex items-center gap-2">
                  <BadgeIcon className="h-3 w-3 text-primary" />
                  <span className="font-medium">Priority support</span> - Get faster responses with your {SUBSCRIPTION_TIERS[subscription.tier].name} plan
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}