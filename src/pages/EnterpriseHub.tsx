import { useState, useEffect, useCallback, useRef } from "react";
import { useDataHubWrapper } from "@/hooks/useDataHubWrapper";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSession } from "@/contexts/SimpleSessionContext";
import { useDataMode } from "@/contexts/DataModeContext";
import { useRealTimeDataMode } from "@/hooks/useRealTimeDataMode";
import { cleanIdeaText, cleanAllStoredIdeas } from '@/utils/ideaCleaner';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, LayoutGrid, Eye, Database, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroSection } from "@/components/hub/HeroSection";
import { LazyWorldMap } from "@/components/hub/LazyWorldMap";
import { MainAnalysisGrid } from "@/components/hub/MainAnalysisGrid";
import { ExtendedInsightsGrid } from "@/components/hub/ExtendedInsightsGrid";
import { QuickStatsStrip } from "@/components/hub/QuickStatsStrip";
import { EvidenceExplorer } from "@/components/hub/EvidenceExplorer";
import { CacheClearButton } from "@/components/hub/CacheClearButton";
import { createConversationSummary } from "@/utils/conversationUtils";
import { ExecutiveMarketSizeTile } from "@/components/market/ExecutiveMarketSizeTile";
import { DashboardLoader } from "@/components/engagement/DashboardLoader";
import { DashboardLoadingState } from "@/components/hub/DashboardLoadingState";
import { LoadingStatusIndicator } from "@/components/hub/LoadingStatusIndicator";


export default function EnterpriseHub() {
  const { user } = useAuth();
  const { currentSession, saveCurrentSession } = useSession();
  const { useMockData, setUseMockData } = useDataMode();
  const { isRealTime, setIsRealTime, refreshInterval } = useRealTimeDataMode();
  const [currentIdea, setCurrentIdea] = useState("");
  const [conversationSummary, setConversationSummary] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [viewMode, setViewMode] = useState<"executive" | "deep">("executive");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  // Update idea from current session
  const updateIdeaFromSession = useCallback(() => {
    // Always check localStorage first for immediate availability
    const rawStoredIdea = 
      localStorage.getItem("pmfCurrentIdea") ||
      localStorage.getItem("dashboardIdea") || 
      localStorage.getItem("currentIdea") || 
      localStorage.getItem("userIdea") || 
      "";
    
    // Clean the stored idea
    const storedIdea = cleanIdeaText(rawStoredIdea);
    
    console.log("[EnterpriseHub] Checking all localStorage keys:", {
      pmfCurrentIdea: localStorage.getItem("pmfCurrentIdea")?.substring(0, 50),
      dashboardIdea: localStorage.getItem("dashboardIdea")?.substring(0, 50),
      currentIdea: localStorage.getItem("currentIdea")?.substring(0, 50),
      userIdea: localStorage.getItem("userIdea")?.substring(0, 50)
    });
    
    // If we have a stored idea, use it immediately
    if (storedIdea) {
      setCurrentIdea(storedIdea);
      localStorage.setItem("dashboardIdea", storedIdea);
      console.log("[EnterpriseHub] Using stored idea:", storedIdea.substring(0, 100));
      
      // Now check if we have a session to enhance with chat history
      if (currentSession) {
        const { chatHistory, currentIdea: sessionIdea } = currentSession.data || {};
        
        // Create conversation summary if we have chat history
        if (chatHistory && chatHistory.length > 0) {
          const summary = createConversationSummary(chatHistory, sessionIdea || storedIdea);
          const cleanedSummary = cleanIdeaText(summary);
          setConversationSummary(cleanedSummary);
          // Update localStorage with cleaned summary
          if (cleanedSummary !== storedIdea) {
            localStorage.setItem("dashboardIdea", cleanedSummary);
            setCurrentIdea(cleanedSummary);
          }
        } else {
          setConversationSummary(storedIdea);
        }
        
        // Update session with the stored idea if it doesn't have one
        if (!sessionIdea && currentSession.data) {
          currentSession.data.currentIdea = storedIdea;
          saveCurrentSession();
        }
        
        setSessionName(currentSession.name || "Untitled Session");
      } else {
        // No session, just use the stored idea as summary
        setConversationSummary(storedIdea);
      }
    } else if (currentSession?.data) {
      // No stored idea, try to get from session
      const { chatHistory, currentIdea: sessionIdea } = currentSession.data;
      
      if (sessionIdea || (chatHistory && chatHistory.length > 0)) {
        const summary = chatHistory && chatHistory.length > 0 
          ? createConversationSummary(chatHistory, sessionIdea)
          : sessionIdea || "";
        
        const cleanedSummary = cleanIdeaText(summary);
        if (cleanedSummary) {
          setCurrentIdea(cleanedSummary);
          setConversationSummary(cleanedSummary);
          localStorage.setItem("dashboardIdea", cleanedSummary);
          console.log("[EnterpriseHub] Got idea from session:", cleanedSummary.substring(0, 100));
        }
      }
      
      setSessionName(currentSession.name || "Untitled Session");
    }
  }, [currentSession, saveCurrentSession]);
  
  // Watch for session changes
  useEffect(() => {
    updateIdeaFromSession();
  }, [updateIdeaFromSession]);

  // Use the data hub hook with current idea
  console.log('[EnterpriseHub] Using idea for data hub:', currentIdea?.substring(0, 100));
  const dataHub = useDataHubWrapper({
    idea: currentIdea,
    targetMarkets: ["US", "EU", "APAC"],
    audienceProfiles: ["early_adopters", "enterprise"],
    geos: ["global"],
    timeHorizon: "12_months",
    competitorHints: []
  });

  const { indices, tiles, loading, error, refresh, refreshTile, lastFetchTime, loadingTasks } = dataHub;

  // Set up real-time refresh
  useEffect(() => {
    if (isRealTime && refreshInterval > 0 && currentIdea && !useMockData) {
      intervalRef.current = setInterval(() => {
        refresh();
        console.log('Real-time data refresh triggered');
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRealTime, refreshInterval, currentIdea, refresh, useMockData]);
  
  // Check if we have existing analysis data
  useEffect(() => {
    const checkExistingData = () => {
      // Check if we have any tile data already
      const hasTileData = tiles && (
        tiles.pmf_score || 
        tiles.market_size || 
        tiles.competition || 
        tiles.sentiment
      );
      
      // Check localStorage for previous analysis
      const previousAnalysis = localStorage.getItem('dashboardAnalyzed');
      const wrinklePoints = parseInt(localStorage.getItem('wrinklePoints') || '0');
      
      // If we have tile data or previous analysis with the same idea, skip the intro
      if (hasTileData || (previousAnalysis === currentIdea && wrinklePoints > 0)) {
        setHasLoadedData(true);
        setHasExistingAnalysis(true);
      }
    };
    
    checkExistingData();
  }, [tiles, currentIdea]);
  
  // Custom refresh that also updates the idea from session
  const handleRefresh = useCallback(async () => {
    updateIdeaFromSession();
    setHasLoadedData(true);
    // Store that this idea has been analyzed
    if (currentIdea) {
      localStorage.setItem('dashboardAnalyzed', currentIdea);
    }
    await refresh();
  }, [updateIdeaFromSession, refresh, currentIdea]);

  // Handle Get Score button click
  const handleGetScore = useCallback(() => {
    setHasLoadedData(true);
    // Store that this idea has been analyzed
    if (currentIdea) {
      localStorage.setItem('dashboardAnalyzed', currentIdea);
    }
    refresh();
  }, [refresh, currentIdea]);
  
  // Show full-page loading state when loading and no data loaded yet
  if (loading && !hasLoadedData) {
    return <DashboardLoadingState tasks={loadingTasks || []} currentTask={loadingTasks?.find(t => t.status === "loading")?.label} />;
  }

  // No idea state
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

  return (
    <div className="min-h-screen bg-background">
      {/* Conversation Summary Section */}
      {conversationSummary && (
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground mb-2">Idea Summary</h2>
                <p className="text-base text-foreground/80 leading-relaxed">
                  {conversationSummary}
                </p>
                {sessionName && (
                  <Badge variant="secondary" className="mt-2">
                    Session: {sessionName}
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/ideachat'}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Refine Idea
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Fallback if no summary yet */}
      {!conversationSummary && currentIdea && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-semibold text-foreground">Current Analysis</h2>
                  {sessionName && (
                    <Badge variant="secondary" className="text-xs">
                      {sessionName}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {currentIdea}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/ideachat'}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Go to Chat
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Controls Bar */}
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setViewMode(viewMode === "executive" ? "deep" : "executive")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {viewMode === "executive" ? (
                  <>
                    <LayoutGrid className="h-4 w-4" />
                    Deep Dive
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Executive View
                  </>
                )}
              </Button>
              <Button
                onClick={() => setEvidenceOpen(!evidenceOpen)}
                variant="outline"
                size="sm"
              >
                Evidence Explorer
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Mock Data Toggle */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg border",
                useMockData 
                  ? "bg-amber-500/10 border-amber-500/30" 
                  : "bg-emerald-500/10 border-emerald-500/30"
              )}>
                <Label htmlFor="mock-mode" className="text-xs font-medium cursor-pointer">
                  {useMockData ? "Mock Data" : "Real Data"}
                </Label>
                <Switch
                  id="mock-mode"
                  checked={!useMockData}
                  onCheckedChange={(checked) => {
                    setUseMockData(!checked);
                    if (checked) {
                      toast.success("Switched to real data with API keys");
                    } else {
                      toast.warning("Switched to mock data mode");
                    }
                  }}
                  className="scale-90"
                />
              </div>
              
              {/* Real-time Toggle */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg border",
                isRealTime 
                  ? "bg-primary/10 border-primary/30" 
                  : "bg-muted/50 border-border/50"
              )}>
                {isRealTime && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
                <Label htmlFor="realtime-mode" className="text-xs font-medium cursor-pointer">
                  Realtime
                </Label>
                <Switch
                  id="realtime-mode"
                  checked={isRealTime}
                  onCheckedChange={setIsRealTime}
                  className="scale-90"
                />
              </div>
              
              {/* Cache Clear Button */}
              <CacheClearButton 
                variant="outline"
                size="sm"
                onCacheCleared={() => {
                  console.log("Cache cleared, refreshing data...");
                }}
              />
              
              {lastFetchTime && (
                <span className="text-xs text-muted-foreground">
                  Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
                </span>
              )}
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-8">

        {/* Dashboard loading is now handled by AsyncDashboardButton */}

        {/* 1. HERO SECTION - Show immediately, with score loader if loading */}
        <HeroSection 
          pmfScore={tiles.pmf_score}
          loading={loading}
          onGetScore={handleGetScore}
          hasData={hasLoadedData || hasExistingAnalysis || !!tiles.pmf_score}
          loadingTasks={loadingTasks}
          currentTask={loadingTasks?.find(t => t.status === "loading")?.label}
        />

        {/* 2. ENHANCED MARKET SIZE ANALYSIS */}
        {hasLoadedData && viewMode === "deep" && (
          <div className="space-y-6">
            <LazyWorldMap 
              marketData={tiles.market_size}
              loading={loading}
            />
          </div>
        )}

        {/* 3. MAIN ANALYSIS GRID - Load progressively, show tiles as they arrive */}
        {hasLoadedData && (
          <MainAnalysisGrid
            tiles={{
              market_size: tiles.market_size,
              competition: tiles.competition,
              sentiment: tiles.sentiment,
              market_trends: tiles.market_trends,
              google_trends: tiles.google_trends,
              news_analysis: tiles.news_analysis
            }}
            loading={loading}
            viewMode={viewMode}
            onRefreshTile={refreshTile}
          />
        )}

        {/* 4. EXTENDED INSIGHTS GRID - Only in Deep Dive */}
        {hasLoadedData && viewMode === "deep" && (
          <ExtendedInsightsGrid
            tiles={{
              web_search: tiles.web_search,
              reddit_sentiment: tiles.reddit_sentiment,
              twitter_buzz: tiles.twitter_buzz,
              amazon_reviews: tiles.amazon_reviews,
              youtube_analytics: tiles.youtube_analytics,
              risk_assessment: tiles.risk_assessment
            }}
            loading={loading}
          />
        )}

      </div>

      {/* 6. EVIDENCE EXPLORER - Slide-out drawer */}
      <EvidenceExplorer
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        evidenceStore={indices?.EVIDENCE_STORE || []}
        providerLog={indices?.PROVIDER_LOG || []}
      />
    </div>
  );
}