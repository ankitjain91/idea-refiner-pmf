import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { UsageWarnings } from "@/components/dashboard/UsageWarnings";
import { RecentIdeas } from "@/components/dashboard/RecentIdeas";
import { InsightsTiles } from "@/components/dashboard/InsightsTiles";
import { CollaborationPanel } from "@/components/dashboard/CollaborationPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, HelpCircle, MessageSquare, Badge as BadgeIcon } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

export default function Dashboard() {
  const { subscription } = useSubscription();
  const isPro = subscription.tier === 'pro' || subscription.tier === 'enterprise';

  return (
    <div className="min-h-screen bg-background">
      <WelcomeHeader />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Usage Warnings */}
        <UsageWarnings />

        {/* Recent Ideas */}
        <RecentIdeas />

        {/* Insights Dashboard */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Insights Dashboard</h2>
          <InsightsTiles />
        </div>

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
