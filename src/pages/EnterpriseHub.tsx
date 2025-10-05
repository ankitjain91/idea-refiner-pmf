import { useState, useEffect, useCallback, useRef } from "react";
import { useDataHubWrapper } from "@/hooks/useDataHubWrapper";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSession } from "@/contexts/SimpleSessionContext";
import { useDataMode } from "@/contexts/DataModeContext";
import { useRealTimeDataMode } from "@/hooks/useRealTimeDataMode";
import { useIdeaContext } from '@/hooks/useIdeaContext';
import { cleanIdeaText, cleanAllStoredIdeas } from '@/utils/ideaCleaner';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, LayoutGrid, Eye, Database, Sparkles, MessageSquare, ChevronDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroSection } from "@/components/hub/HeroSection";
import { LazyWorldMap } from "@/components/hub/LazyWorldMap";
import { MainAnalysisGrid } from "@/components/hub/MainAnalysisGrid";
import { EvidenceExplorer } from "@/components/hub/EvidenceExplorer";
import { CacheClearButton } from "@/components/hub/CacheClearButton";
import { SentimentTile } from "@/components/hub/SentimentTile";
import { EnhancedRedditTile } from "@/components/hub/EnhancedRedditTile";
import { TwitterBuzzTile } from "@/components/hub/TwitterBuzzTile";
import { YouTubeAnalyticsTile } from "@/components/hub/YouTubeAnalyticsTile";
import { createConversationSummary } from "@/utils/conversationUtils";
import { DashboardLoadingState } from "@/components/hub/DashboardLoadingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


// Enterprise Hub - Dashboard for comprehensive market analysis
export default function EnterpriseHub() {
  const { user } = useAuth();
  const { currentSession, saveCurrentSession } = useSession();
  const { useMockData, setUseMockData } = useDataMode();
  const { isRealTime, setIsRealTime, refreshInterval } = useRealTimeDataMode();
  const [currentIdea, setCurrentIdea] = useState("");
  const [conversationSummary, setConversationSummary] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(() => {
    return localStorage.getItem('enterpriseHub_summaryExpanded') !== 'false';
  });
  const [advancedControlsOpen, setAdvancedControlsOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  // Save summary expanded state
  useEffect(() => {
    localStorage.setItem('enterpriseHub_summaryExpanded', summaryExpanded.toString());
  }, [summaryExpanded]);
  
  // Update idea from current session
  const updateIdeaFromSession = useCallback(() => {
    // First, check for the generated idea from GenerateIdeaButton (appIdea)
    let storedIdea = "";
    let hasGeneratedIdea = false;
    try {
      const appIdeaData = localStorage.getItem("appIdea");
      if (appIdeaData) {
        const parsed = JSON.parse(appIdeaData);
        storedIdea = cleanIdeaText(parsed.summary || "");
        hasGeneratedIdea = !!storedIdea;
        console.log("[EnterpriseHub] Using generated idea from appIdea:", storedIdea.substring(0, 100));
      }
    } catch (e) {
      console.error("[EnterpriseHub] Error parsing appIdea:", e);
    }
    
    // If no generated idea, fall back to other stored ideas (with validation)
    if (!storedIdea) {
      const ideaSources = [
        localStorage.getItem("pmfCurrentIdea"),
        localStorage.getItem("dashboardIdea"),
        localStorage.getItem("currentIdea"),
        localStorage.getItem("userIdea")
      ];
      
      // Find the first valid idea that's not a chat suggestion
      for (const rawIdea of ideaSources) {
        if (!rawIdea) continue;
        
        const cleaned = cleanIdeaText(rawIdea);
        
        // Skip if it's a chat suggestion/question
        const isChatSuggestion = 
          cleaned.length < 30 ||
          cleaned.startsWith('What') ||
          cleaned.startsWith('How') ||
          cleaned.startsWith('Why') ||
          cleaned.includes('would you') ||
          cleaned.includes('could you') ||
          cleaned.includes('?');
        
        if (!isChatSuggestion && cleaned.length > 0) {
          storedIdea = cleaned;
          console.log("[EnterpriseHub] Using validated idea:", storedIdea.substring(0, 100));
          break;
        }
      }
    }
    
    console.log("[EnterpriseHub] Checking all localStorage keys:", {
      appIdea: localStorage.getItem("appIdea")?.substring(0, 50),
      pmfCurrentIdea: localStorage.getItem("pmfCurrentIdea")?.substring(0, 50),
      dashboardIdea: localStorage.getItem("dashboardIdea")?.substring(0, 50),
      currentIdea: localStorage.getItem("currentIdea")?.substring(0, 50),
      userIdea: localStorage.getItem("userIdea")?.substring(0, 50)
    });
    
    // If we have a stored idea, use it immediately
    if (storedIdea) {
      setCurrentIdea(storedIdea);
      console.log("[EnterpriseHub] Using stored idea:", storedIdea.substring(0, 100));
      
      // If the idea was generated via the button, prefer it for the summary and skip chat-derived summary
      if (hasGeneratedIdea) {
        setConversationSummary(storedIdea);
        if (currentSession?.data && !currentSession.data.currentIdea) {
          currentSession.data.currentIdea = storedIdea;
          saveCurrentSession();
        }
        setSessionName(currentSession?.name || "Untitled Session");
        return; // Do not override with chat summary
      }
      
      // Otherwise, enhance with chat history when available
      if (currentSession) {
        const { chatHistory, currentIdea: sessionIdea } = currentSession.data || {};
        
        if (chatHistory && chatHistory.length > 0) {
          const summary = createConversationSummary(chatHistory, sessionIdea || storedIdea);
          const cleanedSummary = cleanIdeaText(summary);
          setConversationSummary(cleanedSummary);
          if (cleanedSummary !== storedIdea) {
            setCurrentIdea(cleanedSummary);
          }
        } else {
          setConversationSummary(storedIdea);
        }
        
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
          // Using useIdeaContext for idea management
          console.log("[EnterpriseHub] Got idea from session:", cleanedSummary.substring(0, 100));
        }
      }
      
      setSessionName(currentSession.name || "Untitled Session");
    }
  }, [currentSession, saveCurrentSession]);
  
  // Watch for session changes and idea updates
  useEffect(() => {
    updateIdeaFromSession();
    
    // Listen for idea:changed event from GenerateIdeaButton
    const handleIdeaChanged = () => {
      console.log("[EnterpriseHub] Idea changed event received");
      updateIdeaFromSession();
    };
    
    window.addEventListener('idea:changed', handleIdeaChanged);
    
    return () => {
      window.removeEventListener('idea:changed', handleIdeaChanged);
    };
  }, [updateIdeaFromSession]);

  // Prevent dashboard from loading if no idea exists
  if (!currentIdea) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md p-8 text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">No Idea Generated</h2>
          <p className="text-muted-foreground mb-4">
            Please generate an idea using the IdeaChat before accessing the dashboard.
          </p>
          <Button onClick={() => window.location.href = '/chat'}>
            Go to IdeaChat
          </Button>
        </Card>
      </div>
    );
  }

  // Use the data hub hook with current idea and session_id
  console.log('[EnterpriseHub] Using idea for data hub:', currentIdea?.substring(0, 100));
  const dataHub = useDataHubWrapper({
    idea: currentIdea,
    session_id: currentSession?.id || null,
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
      {/* Collapsible Conversation Summary Section */}
      {conversationSummary && (
        <Collapsible
          open={summaryExpanded}
          onOpenChange={setSummaryExpanded}
          className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border"
        >
          <div className="container mx-auto px-4 py-3">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between hover:bg-primary/5 p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-semibold text-foreground">Idea Summary</h2>
                    {!summaryExpanded && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {conversationSummary.substring(0, 80)}...
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sessionName && (
                    <Badge variant="secondary" className="text-xs">
                      {sessionName}
                    </Badge>
                  )}
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    summaryExpanded && "rotate-180"
                  )} />
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="flex items-start gap-4 pl-11">
                <div className="flex-1">
                  <p className="text-base text-foreground/80 leading-relaxed">
                    {conversationSummary}
                  </p>
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
            </CollapsibleContent>
          </div>
        </Collapsible>
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
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-background/95 border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setEvidenceOpen(!evidenceOpen)}
                variant="outline"
                size="sm"
              >
                Evidence Explorer
              </Button>
              
              <Collapsible
                open={advancedControlsOpen}
                onOpenChange={setAdvancedControlsOpen}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Advanced
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform",
                      advancedControlsOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
            
            <div className="flex items-center gap-3">
              {lastFetchTime && (
                <span className="text-xs text-muted-foreground">
                  Updated: {new Date(lastFetchTime).toLocaleTimeString()}
                </span>
              )}
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="default"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Advanced Controls (Collapsible) */}
          <Collapsible
            open={advancedControlsOpen}
            onOpenChange={setAdvancedControlsOpen}
          >
            <CollapsibleContent>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
                {/* Mock Data Toggle */}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
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
                        toast.success("Switched to real data");
                      } else {
                        toast.warning("Switched to mock data");
                      }
                    }}
                    className="scale-90"
                  />
                </div>
                
                {/* Real-time Toggle */}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-[57px] z-30 bg-background/95 backdrop-blur-lg pb-4 -mx-4 px-4 mb-6 border-b border-border/50">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="market">Market Analysis</TabsTrigger>
              <TabsTrigger value="customer">Customer Research</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
            </TabsList>
          </div>

          {/* OVERVIEW TAB - PMF Score + Global Market Map */}
          <TabsContent value="overview" className="space-y-6">
            <HeroSection 
              pmfScore={tiles.pmf_score}
              loading={loading}
              onGetScore={handleGetScore}
              hasData={hasLoadedData || hasExistingAnalysis || !!tiles.pmf_score}
              loadingTasks={loadingTasks}
              currentTask={loadingTasks?.find(t => t.status === "loading")?.label}
            />
            
            {hasLoadedData && (
              <LazyWorldMap 
                marketData={tiles.market_size}
                loading={loading}
              />
            )}
          </TabsContent>

          {/* MARKET ANALYSIS TAB - Market Size, Trends, Google Trends, Competition */}
          <TabsContent value="market" className="space-y-6">
            {hasLoadedData && (
              <div className="space-y-4">
                <MainAnalysisGrid
                  tiles={{
                    market_size: tiles.market_size,
                    market_trends: tiles.market_trends,
                    google_trends: tiles.google_trends,
                    competition: tiles.competition,
                  }}
                  loading={loading}
                  viewMode="deep"
                  onRefreshTile={refreshTile}
                />
              </div>
            )}
          </TabsContent>

          {/* CUSTOMER RESEARCH TAB - Sentiment, News, Reddit, Twitter, YouTube */}
          <TabsContent value="customer" className="space-y-6">
            {hasLoadedData && (
              <div className="space-y-4">
                <SentimentTile className="mb-6" />
                <MainAnalysisGrid
                  tiles={{
                    news_analysis: tiles.news_analysis,
                  }}
                  loading={loading}
                  viewMode="deep"
                  onRefreshTile={refreshTile}
                />
                <EnhancedRedditTile 
                  data={tiles.reddit_sentiment?.json || null} 
                  loading={loading}
                  onRefresh={() => refreshTile('reddit_sentiment')}
                />
                <TwitterBuzzTile 
                  data={tiles.twitter_buzz?.json || null}
                  loading={loading}
                  onRefresh={() => refreshTile('twitter_buzz')}
                />
                <YouTubeAnalyticsTile 
                  data={tiles.youtube_analytics?.json || null}
                  loading={loading}
                  onRefresh={() => refreshTile('youtube_analytics')}
                />
              </div>
            )}
          </TabsContent>

          {/* EVIDENCE TAB */}
          <TabsContent value="evidence" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Evidence & Citations</h3>
              <p className="text-sm text-muted-foreground mb-4">
                View all data sources, citations, and evidence supporting the analysis.
              </p>
              <Button onClick={() => setEvidenceOpen(true)}>
                Open Evidence Explorer
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
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