import { useState, useEffect, useCallback, useRef } from "react";
import { useDataHubWrapper } from "@/hooks/useDataHubWrapper";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSession } from "@/contexts/SimpleSessionContext";
import { useDataMode } from "@/contexts/DataModeContext";
import { useRealTimeDataMode } from "@/hooks/useRealTimeDataMode";
import { cleanIdeaText, cleanAllStoredIdeas } from '@/utils/ideaCleaner';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, LayoutGrid, Eye, Database, Sparkles, MessageSquare, ChevronDown, Settings, Globe2, DollarSign, Building2, Search, TrendingUp, Newspaper, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroSection } from "@/components/hub/HeroSection";
import { LazyWorldMap } from "@/components/hub/LazyWorldMap";
import { MainAnalysisGrid } from "@/components/hub/MainAnalysisGrid";
import { DataHubTile } from "@/components/hub/DataHubTile";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


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
  const [selectedTileDialog, setSelectedTileDialog] = useState<{ type: string; data: any } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  // Save summary expanded state
  useEffect(() => {
    localStorage.setItem('enterpriseHub_summaryExpanded', summaryExpanded.toString());
  }, [summaryExpanded]);
  
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
  
  // Keep dialog tile data in sync and trigger fetch when opened
  useEffect(() => {
    if (!selectedTileDialog?.type) return;
    const t = (tiles as any)?.[selectedTileDialog.type];
    // Sync latest tile data into dialog
    if (t && t !== selectedTileDialog.data) {
      setSelectedTileDialog(prev => (prev && prev.type === selectedTileDialog.type) ? { ...prev, data: t } : prev);
    }
    // Trigger fetch if missing (non-YouTube types are loaded via data hub)
    if (!t && selectedTileDialog.type !== 'youtube_analytics') {
      try { refreshTile?.(selectedTileDialog.type); } catch (_) {}
    }
  }, [tiles, selectedTileDialog, refreshTile]);
  
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
              <Collapsible defaultOpen={false}>
                <Card className="border-border/50 bg-card/50">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Globe2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-base">Global Market Overview</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">Click to explore regional opportunities</p>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <LazyWorldMap 
                        marketData={tiles.market_size}
                        loading={loading}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </TabsContent>

          {/* MARKET ANALYSIS TAB - Compact tiles that expand */}
          <TabsContent value="market" className="space-y-6">
            {hasLoadedData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Market Size Tile */}
                <Card 
                  className="border-border/50 bg-card/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedTileDialog({ type: 'market_size', data: tiles.market_size })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">Market Size</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {tiles.market_size?.confidence ? `${Math.round(tiles.market_size.confidence * 100)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && !tiles.market_size ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold">
                          {tiles.market_size?.metrics?.tam ? `$${(tiles.market_size.metrics.tam / 1000000000).toFixed(1)}B` : 'Calculating...'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tiles.market_size?.explanation || 'Loading market analysis...'}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Competition Tile */}
                <Card 
                  className="border-border/50 bg-card/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedTileDialog({ type: 'competition', data: tiles.competition })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">Competition</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {tiles.competition?.confidence ? `${Math.round(tiles.competition.confidence * 100)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && !tiles.competition ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold">
                          {tiles.competition?.metrics?.total_competitors || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tiles.competition?.explanation || 'Loading competitive analysis...'}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Google Trends Tile */}
                <Card 
                  className="border-border/50 bg-card/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedTileDialog({ type: 'google_trends', data: tiles.google_trends })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">Search Interest</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {tiles.google_trends?.confidence ? `${Math.round(tiles.google_trends.confidence * 100)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && !tiles.google_trends ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold">
                          {tiles.google_trends?.metrics?.interest || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tiles.google_trends?.explanation || 'Loading search trends...'}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Market Trends Tile */}
                <Card 
                  className="border-border/50 bg-card/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedTileDialog({ type: 'market_trends', data: tiles.market_trends })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">Market Trends</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {tiles.market_trends?.confidence ? `${Math.round(tiles.market_trends.confidence * 100)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && !tiles.market_trends ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold">
                          {tiles.market_trends?.metrics?.growthRate ? `${tiles.market_trends.metrics.growthRate}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tiles.market_trends?.explanation || 'Loading trend analysis...'}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* CUSTOMER RESEARCH TAB - Compact overview cards */}
          <TabsContent value="customer" className="space-y-6">
            {hasLoadedData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sentiment Card */}
                <Card 
                  className="border-border/50 bg-card/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedTileDialog({ type: 'sentiment', data: tiles.sentiment })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">Sentiment Analysis</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {tiles.sentiment?.confidence ? `${Math.round(tiles.sentiment.confidence * 100)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && !tiles.sentiment ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-green-500">
                          {tiles.sentiment?.metrics?.positive ? `${tiles.sentiment.metrics.positive}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tiles.sentiment?.explanation || 'Loading sentiment data...'}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* News Analysis Card */}
                <Card 
                  className="border-border/50 bg-card/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedTileDialog({ type: 'news_analysis', data: tiles.news_analysis })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Newspaper className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">News Analysis</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {tiles.news_analysis?.confidence ? `${Math.round(tiles.news_analysis.confidence * 100)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && !tiles.news_analysis ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold">
                          {tiles.news_analysis?.metrics?.articles || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tiles.news_analysis?.explanation || 'Loading news coverage...'}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* YouTube Analysis Card */}
                <Card 
                  className="border-border/50 bg-card/50 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => setSelectedTileDialog({ type: 'youtube_analytics', data: tiles.youtube_analytics })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-medium">YouTube Analysis</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {tiles.youtube_analytics?.confidence ? `${Math.round(tiles.youtube_analytics.confidence * 100)}%` : 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && !tiles.youtube_analytics ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold">
                          {tiles.youtube_analytics?.metrics?.total_views || tiles.youtube_analytics?.metrics?.views || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tiles.youtube_analytics?.explanation || 'Loading YouTube data...'}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Reddit Research */}
                <Collapsible>
                  <Card className="border-border/50 bg-card/50">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm">Reddit Discussions</CardTitle>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <EnhancedRedditTile idea={currentIdea} />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Social Media Buzz */}
                <Collapsible>
                  <Card className="border-border/50 bg-card/50">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm">Social Media Buzz</CardTitle>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <TwitterBuzzTile idea={currentIdea} />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
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

      {/* Tile Details Dialog */}
      <Dialog open={!!selectedTileDialog} onOpenChange={() => setSelectedTileDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTileDialog?.type === 'market_size' && <DollarSign className="h-5 w-5 text-primary" />}
              {selectedTileDialog?.type === 'competition' && <Building2 className="h-5 w-5 text-primary" />}
              {selectedTileDialog?.type === 'google_trends' && <Search className="h-5 w-5 text-primary" />}
              {selectedTileDialog?.type === 'market_trends' && <TrendingUp className="h-5 w-5 text-primary" />}
              {selectedTileDialog?.type === 'sentiment' && <MessageSquare className="h-5 w-5 text-primary" />}
              {selectedTileDialog?.type === 'news_analysis' && <Newspaper className="h-5 w-5 text-primary" />}
              {selectedTileDialog?.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </DialogTitle>
          </DialogHeader>
          {selectedTileDialog?.type === 'youtube_analytics' ? (
            <YouTubeAnalyticsTile idea={currentIdea} />
          ) : selectedTileDialog?.data ? (
            <DataHubTile
              title={selectedTileDialog.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              Icon={selectedTileDialog.type === 'market_size' ? DollarSign : 
                    selectedTileDialog.type === 'competition' ? Building2 :
                    selectedTileDialog.type === 'google_trends' ? Search :
                    selectedTileDialog.type === 'market_trends' ? TrendingUp :
                    selectedTileDialog.type === 'sentiment' ? MessageSquare :
                    selectedTileDialog.type === 'youtube_analytics' ? Activity :
                    Newspaper}
              data={selectedTileDialog.data}
              loading={!selectedTileDialog.data}
              expanded={true}
              tileType={selectedTileDialog.type}
              className="border-0 shadow-none"
              onRefresh={() => refreshTile?.(selectedTileDialog.type)}
            />
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="font-medium">Loading tile data...</p>
              <p className="text-sm mt-2">Fetching analysis for this tile.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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