import { useState, useEffect } from "react";
import { useDataHub } from "@/hooks/useDataHub";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSession } from "@/contexts/SimpleSessionContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, RefreshCw, LayoutGrid, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroSection } from "@/components/hub/HeroSection";
import { GlobalMarketMap } from "@/components/hub/GlobalMarketMap";
import { MainAnalysisGrid } from "@/components/hub/MainAnalysisGrid";
import { ExtendedInsightsGrid } from "@/components/hub/ExtendedInsightsGrid";
import { QuickStatsStrip } from "@/components/hub/QuickStatsStrip";
import { EvidenceExplorer } from "@/components/hub/EvidenceExplorer";
import { EnhancedMarketSizeTile } from "@/components/market/EnhancedMarketSizeTile";

export default function EnterpriseHub() {
  const { user } = useAuth();
  const { currentSession } = useSession();
  const [currentIdea, setCurrentIdea] = useState("");
  const [viewMode, setViewMode] = useState<"executive" | "deep">("executive");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  
  // Extract idea from session or localStorage
  useEffect(() => {
    const storedIdea = 
      localStorage.getItem("dashboardIdea") || 
      localStorage.getItem("currentIdea") || 
      currentSession?.data?.currentIdea || 
      "";
    setCurrentIdea(storedIdea);
  }, [currentSession]);

  // Use the data hub hook
  const dataHub = useDataHub({
    idea: currentIdea,
    targetMarkets: ["US", "EU", "APAC"],
    audienceProfiles: ["early_adopters", "enterprise"],
    geos: ["global"],
    timeHorizon: "12_months",
    competitorHints: []
  });

  const { indices, tiles, loading, error, refresh, lastFetchTime } = dataHub;

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
            
            <div className="flex items-center gap-2">
              {lastFetchTime && (
                <span className="text-xs text-muted-foreground">
                  Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
                </span>
              )}
              <Button
                onClick={refresh}
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
        {/* 1. HERO SECTION */}
        <HeroSection 
          pmfScore={tiles.pmf_score}
          loading={loading}
        />

        {/* 2. ENHANCED MARKET SIZE ANALYSIS */}
        {viewMode === "deep" && (
          <div className="space-y-6">
            <GlobalMarketMap 
              marketData={tiles.market_size}
              loading={loading}
            />
          </div>
        )}

        {/* 3. MAIN ANALYSIS GRID */}
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
        />

        {/* 4. EXTENDED INSIGHTS GRID - Only in Deep Dive */}
        {viewMode === "deep" && (
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

        {/* 5. QUICK STATS STRIP - Always visible */}
        <QuickStatsStrip
          tiles={{
            growth_potential: tiles.growth_potential,
            market_readiness: tiles.market_readiness,
            competitive_advantage: tiles.competitive_advantage,
            risk_assessment: tiles.risk_assessment
          }}
          loading={loading}
        />
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