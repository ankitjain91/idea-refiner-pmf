import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PMFAnalyzer from "@/components/PMFAnalyzer";
import ChatGPTStyleChat from "@/components/ChatGPTStyleChat";
import { UserMenu } from "@/components/UserMenu";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

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
  };

  const handleNewChat = () => {
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('userIdea');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('userRefinements');
    localStorage.removeItem('ideaMetadata');
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
    <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <AppSidebar onNewChat={handleNewChat} />
      
      <div className="flex-1 flex flex-col">
        {/* Header with User Menu */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">PM-Fit Analyzer</h1>
          </div>
          <UserMenu />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ChatGPT-style Chat - Primary Feature */}
          <ChatGPTStyleChat 
            key={chatKey} 
            onAnalysisReady={handleAnalysisReady}
          />

          {/* Analysis Dashboard - Shows when ready */}
          <AnimatePresence>
            {showAnalysisDashboard && analysisData && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '400px', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t bg-background overflow-hidden"
              >
                <div className="h-full overflow-auto p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Market Analysis Dashboard</h2>
                    <Button
                      onClick={() => setShowAnalysisDashboard(false)}
                      size="sm"
                      variant="ghost"
                    >
                      Hide Dashboard
                    </Button>
                  </div>
                  <PMFAnalyzer key={`analysis-${chatKey}`} />
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