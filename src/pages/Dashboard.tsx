import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [chatKey, setChatKey] = useState(0);
  const [showAnalysisDashboard, setShowAnalysisDashboard] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  
  useEffect(() => {
    // Clear all chat-related storage on mount (new login session)
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
    setChatKey(prev => prev + 1);
  }, []); // Only run once on component mount
  
  useEffect(() => {
    // Redirect to auth if not logged in and not loading
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleAnalysisReady = (idea: string, metadata: any) => {
    setAnalysisData({ idea, metadata });
    setShowAnalysisDashboard(true);
    
    // Store analysis data in localStorage for PMFAnalyzer
    localStorage.setItem('pmfCurrentIdea', idea);
    localStorage.setItem('userAnswers', JSON.stringify(metadata.answers || {}));
    localStorage.setItem('ideaMetadata', JSON.stringify(metadata));
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
    
    setChatKey((k) => k + 1);
    setShowAnalysisDashboard(false);
    setAnalysisData(null);
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
              onClick={() => setShowAnalysisDashboard(!showAnalysisDashboard)}
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

        {/* Main Content - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Section */}
          <motion.div 
            className={cn(
              "flex-1 flex flex-col overflow-hidden transition-all duration-300",
              showAnalysisDashboard && "lg:max-w-[50%]"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ChatGPTStyleChat 
              key={chatKey} 
              onAnalysisReady={handleAnalysisReady}
              showDashboard={showAnalysisDashboard}
            />
          </motion.div>

          {/* Analysis Dashboard - Side Panel */}
          <AnimatePresence>
            {showAnalysisDashboard && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "50%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-l bg-muted/5 overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b bg-background/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Analysis Dashboard</h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analysisData 
                          ? `Detailed insights for: ${analysisData.idea}`
                          : 'Start a chat and analysis to see insights'}
                      </p>
                    </div>
                    <Badge variant={analysisData ? "default" : "secondary"} className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      {analysisData ? 'Live Analysis' : 'Awaiting Data'}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {analysisData ? (
                    <PMFAnalyzer key={`analysis-${chatKey}`} />
                  ) : (
                    <div className="flex items-center justify-center h-full p-8">
                      <div className="text-center space-y-4 max-w-md">
                        <BarChart className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                        <h3 className="text-lg font-medium">No Analysis Yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Start by entering your product idea in the chat, then click "Start PM-Fit Analysis" 
                          to generate comprehensive market insights and recommendations.
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="p-2 bg-muted/50 rounded">
                            <CheckCircle className="h-4 w-4 mx-auto mb-1" />
                            Market Analysis
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <CheckCircle className="h-4 w-4 mx-auto mb-1" />
                            Competitor Research
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <CheckCircle className="h-4 w-4 mx-auto mb-1" />
                            User Demographics
                          </div>
                          <div className="p-2 bg-muted/50 rounded">
                            <CheckCircle className="h-4 w-4 mx-auto mb-1" />
                            PM-Fit Score
                          </div>
                        </div>
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