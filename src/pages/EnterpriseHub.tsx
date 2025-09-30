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
  Calendar, Clock, Activity, Layers, Shield, Zap, RotateCw, Globe, ChevronDown, ChevronUp
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSession } from "@/contexts/SimpleSessionContext";

import { StandardizedMarketTile } from "@/components/market/StandardizedMarketTile";
import { MarketTrendsCard } from "@/components/hub/MarketTrendsCard";
import { GoogleTrendsCard } from "@/components/hub/GoogleTrendsCard";
import { WebSearchDataTile } from "@/components/hub/WebSearchDataTile";
import { RedditSentimentTile } from "@/components/hub/RedditSentimentTile";
import { OptimizedQuickStatsTile } from "@/components/hub/OptimizedQuickStatsTile";
import { QuickStatsTile } from "@/components/hub/QuickStatsTile";
import { DashboardInitializer } from "@/components/dashboard/DashboardInitializer";
import { AIHubDashboard } from "@/components/hub/AIHubDashboard";
import { cn } from "@/lib/utils";

import { dashboardDataService } from '@/lib/dashboard-data-service';
import { createConversationSummary } from '@/utils/conversationUtils';
import { useBatchedDashboardData } from '@/hooks/useBatchedDashboardData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function EnterpriseHub() {
  const { currentSession, saveCurrentSession } = useSession();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({
    idea_keywords: [],
    industry: '',
    geography: 'global',
    time_window: 'last_12_months'
  });
  const [tilesKey, setTilesKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState('global');
  const [showFullIdea, setShowFullIdea] = useState(false);
  const [expandedIdea, setExpandedIdea] = useState(false);
  
  // Regenerate idea summary from conversation history if available
  const [currentIdea, setCurrentIdea] = useState('');
  const [oneLineSummary, setOneLineSummary] = useState('');
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  
  // Function to generate one-line summary from all conversations
  const generateOneLineSummary = (messages: any[]) => {
    if (!messages || messages.length === 0) return 'No conversation yet';
    
    // Extract key topics from all user messages
    const userMessages = messages
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content)
      .join(' ');
    
    // Extract key topics from assistant responses
    const assistantMessages = messages
      .filter((m: any) => m.role === 'assistant')
      .slice(-2) // Get last 2 assistant messages for context
      .map((m: any) => m.content)
      .join(' ');
    
    // Get the original idea if available
    const originalIdea = localStorage.getItem('currentIdea') || localStorage.getItem('dashboardIdea') || '';
    
    // Simple extraction: Take the main topic from user messages and latest refinement
    const words = [...userMessages.split(' '), ...assistantMessages.split(' ')];
    const keyPhrases = [];
    
    // Look for key business terms
    if (originalIdea) {
      keyPhrases.push(originalIdea.substring(0, 50));
    }
    
    // Create a concise summary
    const summary = originalIdea 
      ? `Exploring ${originalIdea.substring(0, 100).replace(/[.!?]$/, '')} through iterative refinement and validation`
      : 'Developing and refining a startup idea through collaborative discussion';
    
    return summary;
  };
  
  // Function to regenerate summary from conversation
  const regenerateSummary = () => {
    setIsRefreshingSummary(true);
    
    // Try to get conversation history and regenerate summary
    const conversationHistory = localStorage.getItem('dashboardConversationHistory');
    console.log('[Dashboard] Regenerating summary from conversation history');
    
    if (conversationHistory) {
      try {
        const messages = JSON.parse(conversationHistory);
        const rawIdea = localStorage.getItem('currentIdea') || '';
        console.log('[Dashboard] Processing', messages.length, 'messages');
        
        // Generate fresh summary
        const freshSummary = createConversationSummary(messages, rawIdea);
        console.log('[Dashboard] New summary generated:', freshSummary.substring(0, 200));
        
        setCurrentIdea(freshSummary);
        
        // Generate one-line summary
        const oneLine = generateOneLineSummary(messages);
        setOneLineSummary(oneLine);
        
        // Update localStorage with fresh summary
        localStorage.setItem('dashboardIdea', freshSummary);
        localStorage.setItem('oneLineSummary', oneLine);
      } catch (err) {
        console.error('[Dashboard] Failed to parse conversation history:', err);
        // Fallback to stored idea
        const fallbackIdea = localStorage.getItem('dashboardIdea') || localStorage.getItem('currentIdea') || '';
        setCurrentIdea(fallbackIdea || currentSession?.data?.currentIdea || '');
        setOneLineSummary(localStorage.getItem('oneLineSummary') || 'No conversation summary available');
      }
    } else {
      // No conversation history, use stored idea
      const storedIdea = localStorage.getItem('dashboardIdea') || localStorage.getItem('currentIdea') || '';
      console.log('[Dashboard] No conversation history, using stored idea');
      setCurrentIdea(storedIdea || currentSession?.data?.currentIdea || '');
      setOneLineSummary(localStorage.getItem('oneLineSummary') || 'No conversation summary available');
    }
    
    setTimeout(() => setIsRefreshingSummary(false), 500);
  };
  
  // Helper function to create 5-word summary
  const createFiveWordSummary = (text: string): string => {
    if (!text) return 'No idea yet';
    const words = text.split(' ').filter(word => word.length > 0);
    if (words.length <= 5) return text;
    return words.slice(0, 5).join(' ') + '...';
  };
  
  // Load summary on mount
  useEffect(() => {
    regenerateSummary();
  }, [currentSession]);
  const subscriptionTier = subscription.tier;
  
  // Load dashboard data from session on mount
  useEffect(() => {
    if (currentSession?.data?.dashboardData) {
      const { dashboardData } = currentSession.data;
      
      // Restore dashboard state from session
      if (dashboardData.currentTab) {
        setActiveTab(dashboardData.currentTab);
      }
    }
  }, [currentSession]);
  
  // Save dashboard state changes to session
  useEffect(() => {
    // Only save if we have a current session and it's been at least 2 seconds since last change
    if (!currentSession || !currentIdea) return;
    
    const timeoutId = setTimeout(() => {
      // Update localStorage with current dashboard state  
      localStorage.setItem('currentTab', activeTab);
      
      // Trigger session save to persist dashboard data
      saveCurrentSession();
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [activeTab, currentSession, currentIdea, saveCurrentSession]);

  // Update filters when idea changes
  useEffect(() => {
    if (currentIdea) {
      const keywords = currentIdea.split(' ')
        .filter(word => word.length > 3)
        .slice(0, 5);
      setFilters(prev => ({ ...prev, idea_keywords: keywords }));
    }
  }, [currentIdea]);

  // Listen for session reset events to clear dashboard data
  useEffect(() => {
    const handleSessionReset = () => {
      // Clear all dashboard-related cached data
      const keysToRemove = [
        'dashboardValidation',
        'dashboardAccessGrant',
        'showAnalysisDashboard',
        'currentTab',
        'analysisResults',
        'pmfScore',
        'userRefinements',
        'pmfFeatures',
        'pmfTabHistory',
        'market_size_value',
        'competition_value',
        'sentiment_value',
        'smoothBrainsScore'
      ];
      
      // Clear tile caches
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.includes('tile_cache_') || 
            key.includes('tile_last_refresh_') ||
            key.includes('trends_cache_') ||
            key.includes('market_data_') ||
            key.includes('reddit_sentiment_') ||
            key.includes('web_search_') ||
            keysToRemove.includes(key)) {
          try {
            localStorage.removeItem(key);
          } catch (err) {
            console.warn(`Failed to clear ${key}:`, err);
          }
        }
      });
      
      // Force reload the page to ensure clean state
      window.location.reload();
    };

    const handleFullReset = () => {
      // Same handling for full reset
      handleSessionReset();
    };

    // Listen for both session reset events
    window.addEventListener('session:reset', handleSessionReset);
    window.addEventListener('session:fullReset', handleFullReset);
    
    return () => {
      window.removeEventListener('session:reset', handleSessionReset);
      window.removeEventListener('session:fullReset', handleFullReset);
    };
  }, []);

  // Define all tile types we want to fetch
  const allTileTypes = [
    'quick_stats_pmf_score',
    'quick_stats_market_size', 
    'quick_stats_competition',
    'quick_stats_sentiment',
    'market_trends',
    'google_trends',
    'web_search',
    'reddit_sentiment',
    'competitor_analysis',
    'target_audience',
    'pricing_strategy',
    'market_size',
    'growth_projections',
    'user_engagement',
    'launch_timeline'
  ];

  // Use the batched data fetching hook
  const { 
    data: batchedData, 
    loading: batchLoading, 
    refresh: refreshBatchedData 
  } = useBatchedDashboardData(currentIdea, currentIdea ? allTileTypes : []);

  // Handle continent change
  const handleContinentChange = (continent: string) => {
    setSelectedContinent(continent);
    setFilters(prev => ({ ...prev, geography: continent }));
    
    // Clear cached data for new region
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.includes('tile_cache_') || 
          key.includes('trends_cache_') ||
          key.includes('web_search_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Store the selected continent
    localStorage.setItem('selectedContinent', continent);
    
    // Force refresh tiles
    setTilesKey(prev => prev + 1);
  };

  // Global refresh function - clear ALL data and fetch fresh
  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // 1. Clear ALL database cache
      if (user?.id && currentIdea) {
        console.log('Clearing all database cache...');
        
        // Delete all dashboard data for this user and idea using match
        const { error: deleteError } = await supabase
          .from('dashboard_data')
          .delete()
          .match({
            user_id: user.id,
            idea_text: currentIdea
          });
        
        if (deleteError) {
          console.error('Error clearing database cache:', deleteError);
        }
        
        // Also clear using the service
        await dashboardDataService.clearAllData(user.id, currentIdea, currentSession?.id);
      }
      
      // 2. Clear ALL localStorage cache
      console.log('Clearing all localStorage cache...');
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.includes('tile_cache_') || 
            key.includes('tile_last_refresh_') ||
            key.includes('trends_cache_') ||
            key.includes('market_data_') ||
            key.includes('reddit_sentiment_') ||
            key.includes('web_search_') ||
            key.includes('quick_stats_') ||
            key.includes('dashboard_') ||
            key.includes('smoothBrainsScore') ||
            key.includes('pmfScore') ||
            key.includes('competition_value') ||
            key.includes('sentiment_value') ||
            key.includes('market_size_value')) {
          localStorage.removeItem(key);
        }
      });
      
      // 3. Force refresh all tiles using the batched API
      console.log('Fetching fresh data from APIs...');
      await refreshBatchedData();
      
      // 4. Force component re-render
      setTilesKey(prev => prev + 1);
      
      toast({
        title: "Data refreshed",
        description: "All dashboard data has been refreshed from the latest sources",
        duration: 3000
      });
    } catch (error) {
      console.error('Error during global refresh:', error);
      toast({
        title: "Refresh error",
        description: "Some data couldn't be refreshed. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      // Reset refreshing state after a delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1500);
    }
  };

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
        {/* Clean Header with One-Line Summary */}
        <div className="flex items-center justify-between py-2">
          <div className="flex-1 max-w-4xl">
            <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
            {oneLineSummary && (
              <p className="text-sm text-muted-foreground mt-1 italic">
                {oneLineSummary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGlobalRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh All
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Globe className="h-4 w-4" />
                  {selectedContinent === 'global' ? 'Global' :
                   selectedContinent === 'north_america' ? 'North America' :
                   selectedContinent === 'europe' ? 'Europe' :
                   selectedContinent === 'asia' ? 'Asia' :
                   selectedContinent === 'south_america' ? 'South America' :
                   selectedContinent === 'africa' ? 'Africa' :
                   selectedContinent === 'oceania' ? 'Oceania' : 'Global'}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background border-border">
                <DropdownMenuLabel>Select Region</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleContinentChange('global')}
                  className="cursor-pointer hover:bg-muted"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Global
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleContinentChange('north_america')}
                  className="cursor-pointer hover:bg-muted"
                >
                  North America
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleContinentChange('europe')}
                  className="cursor-pointer hover:bg-muted"
                >
                  Europe
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleContinentChange('asia')}
                  className="cursor-pointer hover:bg-muted"
                >
                  Asia
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleContinentChange('south_america')}
                  className="cursor-pointer hover:bg-muted"
                >
                  South America
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleContinentChange('africa')}
                  className="cursor-pointer hover:bg-muted"
                >
                  Africa
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleContinentChange('oceania')}
                  className="cursor-pointer hover:bg-muted"
                >
                  Oceania
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        </div>

        {/* Key Metrics - Using Batched Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" key={tilesKey}>
          <OptimizedQuickStatsTile
            title="SmoothBrains Score"
            icon={Activity}
            tileType="pmf_score"
            data={batchedData['quick_stats_pmf_score']?.data}
            isLoading={batchLoading && !batchedData['quick_stats_pmf_score']}
            error={batchedData['quick_stats_pmf_score']?.error}
            onRefresh={refreshBatchedData}
          />
          <OptimizedQuickStatsTile
            title="Market Size"
            icon={TrendingUp}
            tileType="market_size"
            data={batchedData['quick_stats_market_size']?.data}
            isLoading={batchLoading && !batchedData['quick_stats_market_size']}
            error={batchedData['quick_stats_market_size']?.error}
            onRefresh={refreshBatchedData}
          />
          <OptimizedQuickStatsTile
            title="Competition"
            icon={Building2}
            tileType="competition"
            data={batchedData['quick_stats_competition']?.data}
            isLoading={batchLoading && !batchedData['quick_stats_competition']}
            error={batchedData['quick_stats_competition']?.error}
            onRefresh={refreshBatchedData}
          />
          <OptimizedQuickStatsTile
            title="Sentiment"
            icon={Sparkles}
            tileType="sentiment"
            data={batchedData['quick_stats_sentiment']?.data}
            isLoading={batchLoading && !batchedData['quick_stats_sentiment']}
            error={batchedData['quick_stats_sentiment']?.error}
            onRefresh={refreshBatchedData}
          />
        </div>

        {/* Main Content - All tabs render immediately for instant loading */}
        <div className="space-y-4">
          <div className="bg-muted/30 border rounded-lg p-1 inline-flex">
            {['overview', 'market', 'competitive', 'audience', 'ai-insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded transition-colors",
                  activeTab === tab 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'market' && 'Market Analysis'}
                {tab === 'competitive' && 'Competitive Intel'}
                {tab === 'audience' && 'Audience Insights'}
                {tab === 'ai-insights' && (
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Intelligence
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          <div className={activeTab === 'overview' ? 'space-y-4' : 'hidden'}>
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
          </div>

          {/* Market Tab */}
          <div className={activeTab === 'market' ? 'space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StandardizedMarketTile
                title="Market Size Analysis"
                icon={BarChart3}
                tileType="market_size"
                filters={filters}
                description="TAM, SAM, SOM breakdown"
                currentIdea={currentIdea}
              />
              <StandardizedMarketTile
                title="Growth Projections"
                icon={Rocket}
                tileType="growth_projections"
                filters={filters}
                description="5-year forecasts"
                currentIdea={currentIdea}
              />
              <StandardizedMarketTile
                title="Launch Timeline"
                icon={Calendar}
                tileType="launch_timeline"
                filters={filters}
                description="Strategic milestones"
                currentIdea={currentIdea}
              />
            </div>
          </div>

          {/* Competitive Tab */}
          <div className={activeTab === 'competitive' ? 'space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StandardizedMarketTile
                title="Competitor Analysis"
                icon={Building2}
                tileType="competitor_analysis"
                filters={filters}
                description="Competitive landscape"
                currentIdea={currentIdea}
              />
              <StandardizedMarketTile
                title="Pricing Strategy"
                icon={DollarSign}
                tileType="pricing_strategy"
                filters={filters}
                description="Optimal pricing models"
                currentIdea={currentIdea}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StandardizedMarketTile
                title="Twitter/X Buzz"
                icon={Twitter}
                tileType="twitter_buzz"
                filters={filters}
                description="Social media sentiment"
                currentIdea={currentIdea}
              />
              <StandardizedMarketTile
                title="Amazon Reviews"
                icon={ShoppingBag}
                tileType="amazon_reviews"
                filters={filters}
                description="Product review analysis"
                currentIdea={currentIdea}
              />
            </div>
          </div>

          {/* Audience Tab */}
          <div className={activeTab === 'audience' ? 'space-y-4' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StandardizedMarketTile
                title="Target Audience"
                icon={Target}
                tileType="target_audience"
                filters={filters}
                description="Demographics & personas"
                currentIdea={currentIdea}
              />
              <StandardizedMarketTile
                title="User Engagement"
                icon={Users}
                tileType="user_engagement"
                filters={filters}
                description="Engagement metrics"
                currentIdea={currentIdea}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StandardizedMarketTile
                title="YouTube Analytics"
                icon={Youtube}
                tileType="youtube_analytics"
                filters={filters}
                description="Video content trends"
                currentIdea={currentIdea}
              />
              <StandardizedMarketTile
                title="News Analysis"
                icon={Newspaper}
                tileType="news_analysis"
                filters={filters}
                description="Media coverage"
                currentIdea={currentIdea}
              />
            </div>
          </div>

          {/* AI Intelligence Tab */}
          <div className={activeTab === 'ai-insights' ? 'block' : 'hidden'}>
            <AIHubDashboard 
              idea={currentIdea}
              marketData={batchedData['quick_stats_market_size']?.data}
              competitorData={batchedData['quick_stats_competition']?.data}
              sessionData={[]}
            />
          </div>
        </div>

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
      
      {/* Dashboard Data Initializer */}
      <DashboardInitializer />
    </div>
  );
}