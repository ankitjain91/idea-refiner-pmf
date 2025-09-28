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
import { GlobalFilters } from "@/components/hub/GlobalFilters";
import { DataTile } from "@/components/hub/DataTile";
import { MarketTrendsCard } from "@/components/hub/MarketTrendsCard";
import { GoogleTrendsCard } from "@/components/hub/GoogleTrendsCard";

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

  const handleRefreshAll = async () => {
    setLoading(true);
    // Trigger refresh logic here
    setTimeout(() => setLoading(false), 2000);
  };

  const tiles = [
    { id: 'marketTrends', title: 'Market Trends', icon: TrendingUp, tileType: 'market_trends', span: 'col-span-2' },
    { id: 'googleTrends', title: 'Google Trends', icon: Activity, tileType: 'google_trends', span: 'col-span-1' },
    { id: 'webSearch', title: 'Web Search', icon: Globe2, tileType: 'web_search', span: 'col-span-1' },
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
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1">
            {subscriptionTier === 'enterprise' ? '🏢 Enterprise' : '🚀 Pro'}
          </Badge>
          <Button 
            onClick={handleRefreshAll}
            disabled={loading}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Global Filters */}
      <Card className="p-4">
        <GlobalFilters 
          currentFilters={filters} 
          onFiltersChange={setFilters}
          onExport={() => console.log('Export data')}
          onRefresh={handleRefreshAll}
        />
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">PMF Score</p>
                <p className="text-2xl font-bold">72%</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Size</p>
                <p className="text-2xl font-bold">$4.2B</p>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Competition</p>
                <p className="text-2xl font-bold">Medium</p>
              </div>
              <Building2 className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sentiment</p>
                <p className="text-2xl font-bold">85%</p>
              </div>
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
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

      {/* Main Grid of Data Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tiles.filter(t => t.id !== 'marketTrends' && t.id !== 'googleTrends').map((tile) => (
          <div key={tile.id} className={tile.span}>
            <DataTile
              title={tile.title}
              icon={tile.icon}
              tileType={tile.tileType}
              filters={filters}
              description={`Real-time ${tile.title.toLowerCase()} analysis`}
            />
          </div>
        ))}
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