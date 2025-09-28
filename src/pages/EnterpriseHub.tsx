import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, BarChart3, Users, Target, Globe, Calendar, AlertCircle, Lock } from "lucide-react";
import { MarketValidation } from "@/components/hub/MarketValidation";
import { ExecutionInsights } from "@/components/hub/ExecutionInsights";
import { EngagementSignals } from "@/components/hub/EngagementSignals";
import { ActionCenter } from "@/components/hub/ActionCenter";
import { useIdeaManagement } from "@/hooks/useIdeaManagement";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSession } from "@/contexts/SimpleSessionContext";

export default function EnterpriseHub() {
  const { currentSession } = useSession();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [activeTab, setActiveTab] = useState("market");
  
  const currentIdea = currentSession?.data?.currentIdea || localStorage.getItem('currentIdea') || '';
  const subscriptionTier = subscription.tier;

  if (!currentIdea) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">No Active Idea</h2>
            <p className="text-muted-foreground">
              Start by entering your startup idea in the Idea Chat to unlock comprehensive analytics and insights.
            </p>
            <Button 
              onClick={() => window.location.href = '/ideachat'}
              className="mt-4"
            >
              Go to Idea Chat
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isEnterpriseFeature = (feature: string) => {
    const enterpriseFeatures = ['execution', 'engagement'];
    return enterpriseFeatures.includes(feature) && subscriptionTier !== 'enterprise';
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Enterprise Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights and analytics for: <span className="font-medium text-foreground">{currentIdea}</span>
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {subscriptionTier === 'enterprise' ? '🏢 Enterprise' : '🚀 Pro'}
        </Badge>
      </div>

      {subscriptionTier !== 'enterprise' && (
        <Alert className="border-amber-500/20 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            Upgrade to Enterprise to unlock Execution Insights and Community Engagement features.
            <Button 
              variant="link" 
              className="h-auto p-0 ml-2"
              onClick={() => window.location.href = '/pricing'}
            >
              View Plans →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 h-auto p-1">
          <TabsTrigger value="market" className="flex items-center gap-2 py-3">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Market</span>
          </TabsTrigger>
          <TabsTrigger 
            value="execution" 
            className="flex items-center gap-2 py-3 relative"
            disabled={isEnterpriseFeature('execution')}
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Execution</span>
            {isEnterpriseFeature('execution') && (
              <Lock className="h-3 w-3 absolute top-1 right-1 text-muted-foreground" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="engagement" 
            className="flex items-center gap-2 py-3 relative"
            disabled={isEnterpriseFeature('engagement')}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Engagement</span>
            {isEnterpriseFeature('engagement') && (
              <Lock className="h-3 w-3 absolute top-1 right-1 text-muted-foreground" />
            )}
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2 py-3">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Actions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-6 mt-6">
          <MarketValidation idea={currentIdea} />
        </TabsContent>

        <TabsContent value="execution" className="space-y-6 mt-6">
          {isEnterpriseFeature('execution') ? (
            <Card className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Enterprise Feature</h3>
                <p className="text-muted-foreground max-w-md">
                  Execution Insights help you track milestones, team readiness, and resource requirements.
                </p>
                <Button onClick={() => window.location.href = '/pricing'}>
                  Upgrade to Enterprise
                </Button>
              </div>
            </Card>
          ) : (
            <ExecutionInsights idea={currentIdea} />
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6 mt-6">
          {isEnterpriseFeature('engagement') ? (
            <Card className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Enterprise Feature</h3>
                <p className="text-muted-foreground max-w-md">
                  Community Engagement tracks social sentiment, validation polls, and early adopter feedback.
                </p>
                <Button onClick={() => window.location.href = '/pricing'}>
                  Upgrade to Enterprise
                </Button>
              </div>
            </Card>
          ) : (
            <EngagementSignals idea={currentIdea} />
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-6 mt-6">
          <ActionCenter idea={currentIdea} />
        </TabsContent>
      </Tabs>
    </div>
  );
}