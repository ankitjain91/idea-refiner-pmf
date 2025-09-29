import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, Globe2, Newspaper, MessageSquare, Youtube,
  Twitter, ShoppingBag, Users, Target, DollarSign, Rocket,
  BarChart3, AlertCircle, RefreshCw, Sparkles, Building2,
  Calendar, Clock, Activity, Layers, Shield, Zap
} from "lucide-react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSession } from "@/contexts/SimpleSessionContext";
import { DataTile } from "@/components/hub/DataTile";
import { EnhancedDataTile } from "@/components/hub/EnhancedDataTile";
import { MarketTrendsCard } from "@/components/hub/MarketTrendsCard";
import { GoogleTrendsCard } from "@/components/hub/GoogleTrendsCard";
import { WebSearchDataTile } from "@/components/hub/WebSearchDataTile";
import { RedditSentimentTile } from "@/components/hub/RedditSentimentTile";
import { QuickStatsTile } from "@/components/hub/QuickStatsTile";
import { cn } from "@/lib/utils";
import {
  twitterBuzzAdapter,
  amazonReviewsAdapter,
  competitorAnalysisAdapter,
  targetAudienceAdapter,
  pricingStrategyAdapter,
  marketSizeAdapter,
  growthProjectionsAdapter,
  userEngagementAdapter,
  launchTimelineAdapter
} from "@/lib/data-adapter";

export default function EnterpriseHub() {
  const { currentSession } = useSession();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({
    idea_keywords: [],
    industry: '',
    geography: 'global',
    time_window: 'last_12_months'
  });
  
  const currentIdea = currentSession?.data?.currentIdea || localStorage.getItem('currentIdea') || '';
  const subscriptionTier = subscription.tier;

  // Update filters when idea changes
  useEffect(() => {
    if (currentIdea) {
      const keywords = currentIdea.split(' ')
        .filter(word => word.length > 3)
        .slice(0, 5);
      setFilters(prev => ({ ...prev, idea_keywords: keywords }));
    }
  }, [currentIdea]);

  if (!currentIdea) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 border-border/50">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <Brain className="h-6 w-6 text-foreground" />
            </div>
            <h2 className="text-2xl font-semibold">No Active Idea</h2>
            <p className="text-sm text-muted-foreground">
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

  const tiles = [
    { id: 'newsAnalysis', title: 'News Analysis', icon: Newspaper, tileType: 'news_analysis', span: 'col-span-2' },
    { id: 'youtube', title: 'YouTube Analytics', icon: Youtube, tileType: 'youtube_analytics', span: 'col-span-1' },
    { id: 'twitter', title: 'Twitter/X Buzz', icon: Twitter, tileType: 'twitter_buzz', span: 'col-span-1' },
    { id: 'amazon', title: 'Amazon Reviews', icon: ShoppingBag, tileType: 'amazon_reviews', span: 'col-span-1' },
    { id: 'competitors', title: 'Competitor Analysis', icon: Building2, tileType: 'competitor_analysis', span: 'col-span-2' },
    { id: 'targetAudience', title: 'Target Audience', icon: Target, tileType: 'target_audience', span: 'col-span-1' },
    { id: 'pricing', title: 'Pricing Strategy', icon: DollarSign, tileType: 'pricing_strategy', span: 'col-span-1' },
    { id: 'marketSize', title: 'Market Size', icon: BarChart3, tileType: 'market_size', span: 'col-span-1' },
    { id: 'growth', title: 'Growth Projections', icon: Rocket, tileType: 'growth_projections', span: 'col-span-1' },
    { id: 'engagement', title: 'User Engagement', icon: Users, tileType: 'user_engagement', span: 'col-span-1' },
    { id: 'timeline', title: 'Launch Timeline', icon: Calendar, tileType: 'launch_timeline', span: 'col-span-1' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentIdea}
            </p>
          </div>
          <Badge 
            variant="secondary" 
            className={cn(
              "font-normal",
              subscriptionTier === 'enterprise' 
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" 
                : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
            )}
          >
            {subscriptionTier === 'enterprise' ? (
              <>
                <Shield className="mr-1 h-3 w-3" />
                Enterprise
              </>
            ) : (
              <>
                <Zap className="mr-1 h-3 w-3" />
                Pro
              </>
            )}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickStatsTile
            title="PMF Score"
            icon={Activity}
            tileType="pmf_score"
            currentIdea={currentIdea}
            onAnalyze={() => console.log('Analyze PMF Score')}
          />
          <QuickStatsTile
            title="Market Size"
            icon={TrendingUp}
            tileType="market_size"
            currentIdea={currentIdea}
            onAnalyze={() => console.log('Analyze Market Size')}
          />
          <QuickStatsTile
            title="Competition"
            icon={Building2}
            tileType="competition"
            currentIdea={currentIdea}
            onAnalyze={() => console.log('Analyze Competition')}
          />
          <QuickStatsTile
            title="Sentiment"
            icon={Sparkles}
            tileType="sentiment"
            currentIdea={currentIdea}
            onAnalyze={() => console.log('Analyze Sentiment')}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/30 border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="market">Market Analysis</TabsTrigger>
            <TabsTrigger value="competitive">Competitive Intel</TabsTrigger>
            <TabsTrigger value="audience">Audience Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <MarketTrendsCard filters={filters} />
              </div>
              <GoogleTrendsCard filters={filters} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WebSearchDataTile 
                idea={currentIdea}
                industry={filters.industry}
                geography={filters.geography}
                timeWindow={filters.time_window}
              />
              <RedditSentimentTile 
                idea={currentIdea}
                industry={filters.industry}
                geography={filters.geography}
                timeWindow={filters.time_window}
              />
            </div>
          </TabsContent>

          <TabsContent value="market" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <EnhancedDataTile
                title="Market Size Analysis"
                icon={BarChart3}
                tileType="market_size"
                filters={filters}
                description="TAM, SAM, SOM breakdown"
                fetchAdapter={marketSizeAdapter}
              />
              <EnhancedDataTile
                title="Growth Projections"
                icon={Rocket}
                tileType="growth_projections"
                filters={filters}
                description="5-year forecasts"
                fetchAdapter={growthProjectionsAdapter}
              />
              <EnhancedDataTile
                title="Launch Timeline"
                icon={Calendar}
                tileType="launch_timeline"
                filters={filters}
                description="Strategic milestones"
                fetchAdapter={launchTimelineAdapter}
              />
            </div>
          </TabsContent>

          <TabsContent value="competitive" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EnhancedDataTile
                title="Competitor Analysis"
                icon={Building2}
                tileType="competitor_analysis"
                filters={filters}
                description="Competitive landscape"
                fetchAdapter={competitorAnalysisAdapter}
              />
              <EnhancedDataTile
                title="Pricing Strategy"
                icon={DollarSign}
                tileType="pricing_strategy"
                filters={filters}
                description="Optimal pricing models"
                fetchAdapter={pricingStrategyAdapter}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EnhancedDataTile
                title="Twitter/X Buzz"
                icon={Twitter}
                tileType="twitter_buzz"
                filters={filters}
                description="Social media sentiment"
                fetchAdapter={twitterBuzzAdapter}
              />
              <EnhancedDataTile
                title="Amazon Reviews"
                icon={ShoppingBag}
                tileType="amazon_reviews"
                filters={filters}
                description="Product review analysis"
                fetchAdapter={amazonReviewsAdapter}
              />
            </div>
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EnhancedDataTile
                title="Target Audience"
                icon={Target}
                tileType="target_audience"
                filters={filters}
                description="Demographics & personas"
                fetchAdapter={targetAudienceAdapter}
              />
              <EnhancedDataTile
                title="User Engagement"
                icon={Users}
                tileType="user_engagement"
                filters={filters}
                description="Engagement metrics"
                fetchAdapter={userEngagementAdapter}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DataTile
                title="YouTube Analytics"
                icon={Youtube}
                tileType="youtube_analytics"
                filters={filters}
                description="Video content trends"
              />
              <DataTile
                title="News Analysis"
                icon={Newspaper}
                tileType="news_analysis"
                filters={filters}
                description="Media coverage"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Pro/Enterprise Notice */}
        {subscriptionTier !== 'enterprise' && (
          <Alert className="border-muted">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Upgrade to Enterprise for unlimited data sources and advanced analytics.
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
      </div>
    </div>
  );
}