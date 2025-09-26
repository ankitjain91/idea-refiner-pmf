import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PMFAnalyzer from "@/components/PMFAnalyzer";
import ChatGPTStyleChat from "@/components/ChatGPTStyleChat";
import { UserMenu } from "@/components/UserMenu";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { Loader2, BarChart, Sparkles, CheckCircle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [chatKey, setChatKey] = useState(0);
  const [showAnalysisDashboard, setShowAnalysisDashboard] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [dashboardHeight, setDashboardHeight] = useState("50%");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Watch for session changes in localStorage
  useEffect(() => {
    const checkSessionData = () => {
      const sessionId = localStorage.getItem('currentSessionId');
      const idea = localStorage.getItem('userIdea');
      const answers = localStorage.getItem('userAnswers');
      const metadata = localStorage.getItem('ideaMetadata');
      const analysisCompleted = localStorage.getItem('analysisCompleted');
      
      if (sessionId && sessionId !== currentSessionId) {
        setCurrentSessionId(sessionId);
        
        // If we have analysis data, show the dashboard
        if (idea && analysisCompleted === 'true') {
          const parsedAnswers = answers ? JSON.parse(answers) : {};
          const parsedMetadata = metadata ? JSON.parse(metadata) : {};
          
          setAnalysisData({ 
            idea, 
            metadata: { 
              ...parsedMetadata, 
              answers: parsedAnswers 
            } 
          });
          setShowAnalysisDashboard(true);
        } else {
          setShowAnalysisDashboard(false);
        }
        
        // Force reload chat with new session data
        setChatKey(prev => prev + 1);
      }
    };
    
    // Check immediately
    checkSessionData();
    
    // Listen for storage changes (session loads)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentSessionId' || e.key === 'userIdea') {
        checkSessionData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check periodically for same-window updates
    const interval = setInterval(checkSessionData, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentSessionId]);
  
  useEffect(() => {
    // Redirect to auth if not logged in and not loading
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleAnalysisReady = (idea: string, metadata: any) => {
    setAnalysisData({ idea, metadata });
    setShowAnalysisDashboard(true);
    
    // Store analysis data in localStorage for PMFAnalyzer
    localStorage.setItem('pmfCurrentIdea', idea);
    localStorage.setItem('userAnswers', JSON.stringify(metadata.answers || {}));
    localStorage.setItem('ideaMetadata', JSON.stringify(metadata));
    localStorage.setItem('analysisCompleted', 'true');
  };

  const handleNewChat = () => {
    // Clear all storage and reset state
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('userIdea');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('userRefinements');
    localStorage.removeItem('ideaMetadata');
    localStorage.removeItem('pmfCurrentIdea');
    localStorage.removeItem('pmfTabHistory');
    localStorage.removeItem('pmfFeatures');
    localStorage.removeItem('pmfAuthMethod');
    localStorage.removeItem('pmfTheme');
    localStorage.removeItem('pmfScreens');
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('analysisCompleted');
    
    setChatKey((k) => k + 1);
    setShowAnalysisDashboard(false);
    setAnalysisData(null);
    setDashboardHeight("50%");
    setCurrentSessionId(null);
  };
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }
  
  // Don't render content if not authenticated
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar onNewChat={handleNewChat} />
      
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div>
              <h1 className="text-lg font-semibold">PM-Fit Analyzer</h1>
              <p className="text-xs text-muted-foreground">
                {showAnalysisDashboard ? 'Analysis Dashboard' : 'Chat Assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setShowAnalysisDashboard(!showAnalysisDashboard);
                setDashboardHeight("50%");
              }}
              variant={showAnalysisDashboard ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              <BarChart className="h-4 w-4" />
              {showAnalysisDashboard ? 'Hide' : 'Show'} Dashboard
            </Button>
            <UserMenu />
          </div>
        </div>

        {/* Main Content - Vertical Stack */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Chat Section - Shrinks/hides when dashboard expands */}
          <motion.div 
            className="flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: dashboardHeight === "100%" ? 0 : 1,
              height: dashboardHeight === "100%" ? "0%" : showAnalysisDashboard ? `calc(100% - ${dashboardHeight})` : "100%",
              display: dashboardHeight === "100%" ? "none" : "flex"
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChatGPTStyleChat 
              key={chatKey} 
              onAnalysisReady={handleAnalysisReady}
              showDashboard={showAnalysisDashboard}
            />
          </motion.div>

          {/* Analysis Dashboard - Bottom Panel */}
          <AnimatePresence>
            {showAnalysisDashboard && (
              <motion.div
                ref={dashboardRef}
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: dashboardHeight, 
                  opacity: 1,
                  position: dashboardHeight === "100%" ? "absolute" : "relative",
                  top: dashboardHeight === "100%" ? 0 : "auto",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: dashboardHeight === "100%" ? 10 : 1
                }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="border-t bg-background overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Analysis Dashboard</h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analysisData 
                          ? `Real-time insights for: ${analysisData.idea}`
                          : 'Complete the analysis to see insights'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={analysisData ? "default" : "secondary"} className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {analysisData ? 'Live Analysis' : 'Awaiting Data'}
                      </Badge>
                      {dashboardHeight === "100%" && (
                        <Button
                          onClick={() => setDashboardHeight("50%")}
                          size="sm"
                          variant="default"
                        >
                          Show Chat
                        </Button>
                      )}
                      {dashboardHeight === "50%" && (
                        <Button
                          onClick={() => setDashboardHeight("100%")}
                          size="sm"
                          variant="outline"
                        >
                          Full Screen
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setShowAnalysisDashboard(false);
                          setDashboardHeight("50%");
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Hide Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                  {analysisData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Key Metrics from Chat Context */}
                      <Card className="p-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <BarChart className="h-4 w-4 text-primary" />
                          Market Analysis
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Idea:</span>
                            <p className="font-medium">{analysisData.idea}</p>
                          </div>
                          {analysisData.metadata?.answers && (
                            <>
                              <div>
                                <span className="text-muted-foreground">Problem Solved:</span>
                                <p className="text-xs">{analysisData.metadata.answers["What problem does your product solve?"] || "Analyzing..."}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Target Audience:</span>
                                <p className="text-xs">{analysisData.metadata.answers["Who is your target audience?"] || "Analyzing..."}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </Card>

                      {/* Value Proposition from Chat */}
                      <Card className="p-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Unique Value
                        </h3>
                        <div className="space-y-2 text-sm">
                          {analysisData.metadata?.answers?.["What's your unique value proposition?"] ? (
                            <p className="text-xs">{analysisData.metadata.answers["What's your unique value proposition?"]}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Complete analysis to see value proposition</p>
                          )}
                        </div>
                      </Card>

                      {/* Competition & Monetization */}
                      <Card className="p-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          Strategy Insights
                        </h3>
                        <div className="space-y-2 text-sm">
                          {analysisData.metadata?.answers?.["What's your monetization strategy?"] && (
                            <div>
                              <span className="text-muted-foreground text-xs">Revenue Model:</span>
                              <p className="text-xs">{analysisData.metadata.answers["What's your monetization strategy?"]}</p>
                            </div>
                          )}
                          {analysisData.metadata?.answers?.["Who are your main competitors?"] && (
                            <div>
                              <span className="text-muted-foreground text-xs">Competition:</span>
                              <p className="text-xs">{analysisData.metadata.answers["Who are your main competitors?"]}</p>
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Full Analysis View */}
                      <div className="col-span-full">
                        <PMFAnalyzer key={`analysis-${chatKey}`} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4 max-w-md">
                        <BarChart className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                        <h3 className="text-lg font-medium">Complete Analysis to See Dashboard</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter your product idea and complete the 5-question analysis to generate comprehensive insights with real market data and sources.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;