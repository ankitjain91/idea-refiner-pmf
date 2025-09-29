import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, TrendingUp, Globe2, Newspaper, MessageSquare, Youtube,
  Twitter, ShoppingBag, Users, Target, DollarSign, Rocket,
  BarChart3, AlertCircle, RefreshCw, Sparkles, Building2,
  Calendar, Clock, Activity, ArrowUpRight, ArrowDownRight
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
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Enterprise Analytics Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time data for: <span className="font-medium text-foreground">{currentIdea}</span>
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {subscriptionTier === 'enterprise' ? '🏢 Enterprise' : '🚀 Pro'}
        </Badge>
      </div>


      {/* Quick Stats - Updated with real-time data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Market Trends Card - Featured */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MarketTrendsCard filters={filters} />
        </div>
        <div className="space-y-4">
          <GoogleTrendsCard filters={filters} />
        </div>
      </div>

      {/* Main Grid with WebSearchCard, Reddit, and Data Tiles */}
      <div className="space-y-6">
        {/* Web Search and Reddit Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <WebSearchDataTile 
              idea={currentIdea}
              industry={filters.industry}
              geography={filters.geography}
              timeWindow={filters.time_window}
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <RedditSentimentTile 
              idea={currentIdea}
              industry={filters.industry}
              geography={filters.geography}
              timeWindow={filters.time_window}
            />
          </div>
        </div>
        
        {/* Other Data Tiles - Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tiles.filter(t => t.id !== 'marketTrends' && t.id !== 'googleTrends' && t.id !== 'webSearch').map((tile, idx) => {
            // Use EnhancedDataTile for the specified tiles
            const enhancedTiles = ['twitter', 'amazon', 'competitors', 'targetAudience', 'pricing', 'marketSize', 'growth', 'engagement', 'timeline'];
            const isEnhancedTile = enhancedTiles.includes(tile.id);
            
            const getAdapter = () => {
              switch(tile.id) {
                case 'twitter': return twitterBuzzAdapter;
                case 'amazon': return amazonReviewsAdapter;
                case 'competitors': return competitorAnalysisAdapter;
                case 'targetAudience': return targetAudienceAdapter;
                case 'pricing': return pricingStrategyAdapter;
                case 'marketSize': return marketSizeAdapter;
                case 'growth': return growthProjectionsAdapter;
                case 'engagement': return userEngagementAdapter;
                case 'timeline': return launchTimelineAdapter;
                default: return null;
              }
            };
            
            return (
              <div 
                key={tile.id} 
                className={cn(tile.span, "animate-fade-in")}
                style={{ animationDelay: `${150 + idx * 50}ms` }}
              >
                {isEnhancedTile && getAdapter() ? (
                  <EnhancedDataTile
                    title={tile.title}
                    icon={tile.icon}
                    tileType={tile.tileType}
                    filters={filters}
                    description={`Real-time ${tile.title.toLowerCase()} analysis`}
                    fetchAdapter={getAdapter()}
                  />
                ) : (
                  <DataTile
                    title={tile.title}
                    icon={tile.icon}
                    tileType={tile.tileType}
                    filters={filters}
                    description={`Real-time ${tile.title.toLowerCase()} analysis`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pro/Enterprise Features Notice */}
      {subscriptionTier !== 'enterprise' && (
        <Alert className="border-amber-500/20 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            Some data sources are limited on the {subscriptionTier} plan. Upgrade to Enterprise for unlimited access to all data sources.
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
  );
}