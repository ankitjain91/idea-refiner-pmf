import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PMFAnalyzer from "@/components/PMFAnalyzer";
import { UserMenu } from "@/components/UserMenu";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { Loader2, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [chatKey, setChatKey] = useState(0);
  
  useEffect(() => {
    // Redirect to auth if not logged in and not loading
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);
  
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
      <AppSidebar onNewChat={() => {
        localStorage.removeItem('currentSessionId');
        localStorage.removeItem('userIdea');
        localStorage.removeItem('userAnswers');
        localStorage.removeItem('userRefinements');
        localStorage.removeItem('ideaMetadata');
        setChatKey((k) => k + 1);
      }} />
      <div className="flex-1 relative">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 z-50"
        >
          <UserMenu />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-4 z-50"
        >
          <SidebarTrigger />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full h-full"
        >
          <PMFAnalyzer key={chatKey} />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;