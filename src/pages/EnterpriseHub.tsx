import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, Globe2, Newspaper, MessageSquare, Youtube,
  Twitter, ShoppingBag, Users, Target, DollarSign, Rocket,
  BarChart3, AlertCircle, RefreshCw, Sparkles, Building2,
  Calendar, Clock, Activity, ArrowUpRight, Loader2, Zap,
  Shield, Eye, ChartBar, Layers
} from "lucide-react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSession } from "@/contexts/SimpleSessionContext";
import { supabase } from "@/integrations/supabase/client";
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
  const [loading, setLoading] = useState(false);
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="max-w-md w-full p-8 shadow-xl border-primary/10">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full animate-pulse">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              No Active Idea
            </h2>
            <p className="text-muted-foreground">
              Start by entering your startup idea in the Idea Chat to unlock comprehensive analytics and insights.
            </p>
            <Button 
              onClick={() => window.location.href = '/ideachat'}
              className="mt-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Go to Idea Chat
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const tiles = [
    { id: 'marketTrends', title: 'Market Trends', icon: TrendingUp, tileType: 'market_trends', span: 'col-span-2' },
    { id: 'googleTrends', title: 'Google Trends', icon: Activity, tileType: 'google_trends', span: 'col-span-1' },
    { id: 'newsAnalysis', title: 'News Analysis', icon: Newspaper, tileType: 'news_analysis', span: 'col-span-2' },
    { id: 'reddit', title: 'Reddit Sentiment', icon: MessageSquare, tileType: 'reddit_sentiment', span: 'col-span-1' },
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/10">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ChartBar className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Enterprise Analytics Hub
                  </h1>
                </div>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Real-time intelligence for: 
                  <Badge variant="outline" className="ml-1 font-medium">
                    {currentIdea}
                  </Badge>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "px-3 py-1.5 font-medium",
                    subscriptionTier === 'enterprise' 
                      ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-500/30" 
                      : "bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-700 dark:text-blue-400 border-blue-500/30"
                  )}
                >
                  {subscriptionTier === 'enterprise' ? (
                    <>
                      <Shield className="mr-1 h-3.5 w-3.5" />
                      Enterprise
                    </>
                  ) : (
                    <>
                      <Zap className="mr-1 h-3.5 w-3.5" />
                      Pro
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators - Enterprise Style */}
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

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px] bg-muted/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Layers className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="market" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="mr-2 h-4 w-4" />
              Market
            </TabsTrigger>
            <TabsTrigger value="competitive" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="mr-2 h-4 w-4" />
              Competitive
            </TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="mr-2 h-4 w-4" />
              Audience
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 animate-fade-in">
            {/* Primary Market Intelligence Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MarketTrendsCard filters={filters} className="h-full shadow-lg hover:shadow-xl transition-shadow" />
              </div>
              <div className="space-y-4">
                <GoogleTrendsCard filters={filters} />
              </div>
            </div>

            {/* Social & Web Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <TabsContent value="market" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <EnhancedDataTile
                title="Market Size Analysis"
                icon={BarChart3}
                tileType="market_size"
                filters={filters}
                description="TAM, SAM, SOM breakdown with growth projections"
                fetchAdapter={marketSizeAdapter}
              />
              <EnhancedDataTile
                title="Growth Projections"
                icon={Rocket}
                tileType="growth_projections"
                filters={filters}
                description="5-year revenue and user growth forecasts"
                fetchAdapter={growthProjectionsAdapter}
              />
              <EnhancedDataTile
                title="Launch Timeline"
                icon={Calendar}
                tileType="launch_timeline"
                filters={filters}
                description="Strategic milestones and go-to-market plan"
                fetchAdapter={launchTimelineAdapter}
              />
            </div>
          </TabsContent>

          <TabsContent value="competitive" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnhancedDataTile
                title="Competitor Analysis"
                icon={Building2}
                tileType="competitor_analysis"
                filters={filters}
                description="Comprehensive competitive landscape mapping"
                fetchAdapter={competitorAnalysisAdapter}
              />
              <EnhancedDataTile
                title="Pricing Strategy"
                icon={DollarSign}
                tileType="pricing_strategy"
                filters={filters}
                description="Optimal pricing models and tiers"
                fetchAdapter={pricingStrategyAdapter}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnhancedDataTile
                title="Twitter/X Buzz"
                icon={Twitter}
                tileType="twitter_buzz"
                filters={filters}
                description="Real-time social media sentiment"
                fetchAdapter={twitterBuzzAdapter}
              />
              <EnhancedDataTile
                title="Amazon Reviews"
                icon={ShoppingBag}
                tileType="amazon_reviews"
                filters={filters}
                description="Competitor product review analysis"
                fetchAdapter={amazonReviewsAdapter}
              />
            </div>
          </TabsContent>

          <TabsContent value="audience" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnhancedDataTile
                title="Target Audience"
                icon={Target}
                tileType="target_audience"
                filters={filters}
                description="Demographics, psychographics, and personas"
                fetchAdapter={targetAudienceAdapter}
              />
              <EnhancedDataTile
                title="User Engagement"
                icon={Users}
                tileType="user_engagement"
                filters={filters}
                description="Engagement metrics and retention analysis"
                fetchAdapter={userEngagementAdapter}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataTile
                title="YouTube Analytics"
                icon={Youtube}
                tileType="youtube_analytics"
                filters={filters}
                description="Video content trends and creator insights"
              />
              <DataTile
                title="News Analysis"
                icon={Newspaper}
                tileType="news_analysis"
                filters={filters}
                description="Media coverage and press sentiment"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Pro/Enterprise Features Notice */}
        {subscriptionTier !== 'enterprise' && (
          <Alert className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-amber-600/5 backdrop-blur">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-sm">
              Unlock unlimited data sources and advanced analytics with Enterprise.
              <Button 
                variant="link" 
                className="h-auto p-0 ml-2 text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400"
                onClick={() => window.location.href = '/pricing'}
              >
                Upgrade Now →
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}