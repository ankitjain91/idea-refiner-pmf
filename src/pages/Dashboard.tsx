import { UsageWarnings } from "@/components/dashboard/UsageWarnings";
import { RecentIdeas } from "@/components/dashboard/RecentIdeas";
import { CollaborationPanel } from "@/components/dashboard/CollaborationPanel";
import { AICreditsUsageCard } from "@/components/dashboard/AICreditsUsageCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, HelpCircle, MessageSquare, Badge as BadgeIcon, BarChart3, TrendingUp, DollarSign, Users, Sparkles, Brain } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { saveIdeaToLeaderboard } from "@/utils/saveIdeaToLeaderboard";
import { useLockedIdea } from "@/hooks/useLockedIdea";
import { LiveContextCard } from "@/components/ai/LiveContextCard";
import { usePMF } from "@/hooks/usePMF";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { subscription, usage } = useSubscription();
  const { user } = useAuth();
  const { idea: currentIdea } = useLockedIdea(); // SINGLE SOURCE OF TRUTH
  const isPro = subscription.tier === 'pro' || subscription.tier === 'enterprise';
  const limits = SUBSCRIPTION_TIERS[subscription.tier].features;
  const { toast } = useToast();
  
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const { currentScore, actions, loading, computePMF } = usePMF(ideaId || '');
  
  // Get or create idea ID for current locked idea
  useEffect(() => {
    const fetchOrCreateIdea = async () => {
      if (!currentIdea || !user?.id) return;
      
      const { data: existingIdea } = await supabase
        .from('ideas')
        .select('id')
        .eq('user_id', user.id)
        .eq('original_idea', currentIdea)
        .maybeSingle();
      
      if (existingIdea) {
        setIdeaId(existingIdea.id);
      } else {
        const { data: newIdea } = await supabase
          .from('ideas')
          .insert({ user_id: user.id, original_idea: currentIdea })
          .select('id')
          .single();
        
        if (newIdea) setIdeaId(newIdea.id);
      }
    };
    
    fetchOrCreateIdea();
  }, [currentIdea, user?.id]);

  // Update leaderboard when dashboard loads
  useEffect(() => {
    const updateLeaderboard = async () => {
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
      
      if (pmfScore > 0 && currentIdea) {
        await saveIdeaToLeaderboard({
          idea: currentIdea,
          refinedIdea: currentIdea, // Use locked idea as-is
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
      <div className="border-b bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-xl shadow-sm h-[89px] flex items-center">
        <div className="container mx-auto px-4">
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
                {usage.ideas_used || 0}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                of {limits.ideasPerMonth === -1 ? '∞ unlimited' : limits.ideasPerMonth} this month
              </p>
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden backdrop-blur">
                <div 
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-500 rounded-full" 
                  style={{ 
                    width: limits.ideasPerMonth === -1 
                      ? `${Math.min(100, (usage.ideas_used / 10) * 100)}%` 
                      : `${Math.min(100, (usage.ideas_used / limits.ideasPerMonth) * 100)}%` 
                  }}
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
                {(usage.ai_credits_used || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                of {(limits.aiCreditsPerMonth as number).toLocaleString()} this month
              </p>
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden backdrop-blur">
                <div 
                  className="h-full bg-gradient-to-r from-secondary via-accent to-warning transition-all duration-500 rounded-full" 
                  style={{ width: `${Math.min(100, ((usage.ai_credits_used || 0) / (limits.aiCreditsPerMonth as number)) * 100)}%` }}
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
                {usage.exports_used || 0}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                of {limits.exportsPerMonth === -1 ? '∞ unlimited' : limits.exportsPerMonth} this month
              </p>
              <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden backdrop-blur">
                <div 
                  className="h-full bg-gradient-to-r from-warning via-accent to-warning transition-all duration-500 rounded-full" 
                  style={{ 
                    width: limits.exportsPerMonth === -1 
                      ? `${Math.min(100, ((usage.exports_used || 0) / 10) * 100)}%` 
                      : `${Math.min(100, ((usage.exports_used || 0) / limits.exportsPerMonth) * 100)}%` 
                  }}
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

        {/* AI Credits Usage Card */}
        <AICreditsUsageCard />

        {/* AI Insights Section */}
        {currentIdea && ideaId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    AI Insights
                  </h2>
                  <p className="text-sm text-muted-foreground">Real-time analysis for your locked idea</p>
                </div>
              </div>
              {!currentScore && ideaId && (
                <Button 
                  onClick={async () => {
                    try {
                      await computePMF(ideaId);
                      toast({
                        title: "PMF Computed",
                        description: "Your Product-Market Fit score has been calculated",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Computation Failed",
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {loading ? "Computing..." : "Calculate PMF Score"}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PMF Score Card */}
              {currentScore && (
                <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        PMF Score
                      </span>
                      <Badge variant="default" className="text-lg px-4 py-1">
                        {currentScore.pmf_score}/100
                      </Badge>
                    </CardTitle>
                    <CardDescription>Product-Market Fit Analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentScore.score_breakdown && (
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(currentScore.score_breakdown).map(([key, value]) => (
                          <div key={key} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                            <p className="text-xs text-muted-foreground capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                            <p className="text-lg font-semibold">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      AI Confidence: {(currentScore.ai_confidence * 100).toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Top Actions Card */}
              {actions && actions.length > 0 && (
                <Card className="border-accent/20 bg-gradient-to-br from-card to-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      Next Steps
                    </CardTitle>
                    <CardDescription>Recommended actions to improve PMF</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {actions.slice(0, 3).map((action) => (
                        <div 
                          key={action.id} 
                          className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium">{action.title}</p>
                            <Badge variant={action.priority >= 8 ? 'default' : 'secondary'} className="text-xs">
                              {action.priority >= 8 ? 'high' : action.priority >= 5 ? 'medium' : 'low'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Live Context Card */}
              <div className="lg:col-span-2">
                <LiveContextCard ideaId={ideaId} />
              </div>
            </div>
          </div>
        )}

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