import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PMFAnalyzer from "@/components/PMFAnalyzer";
import { UserMenu } from "@/components/UserMenu";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { Loader2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [chatKey, setChatKey] = useState(0);
  
  useEffect(() => {
    // Redirect to auth if not logged in and not loading
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Don't render content if not authenticated
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar onNewChat={() => {
        localStorage.removeItem('currentSessionId');
        localStorage.removeItem('userIdea');
        localStorage.removeItem('userAnswers');
        localStorage.removeItem('userRefinements');
        localStorage.removeItem('ideaMetadata');
        setChatKey((k) => k + 1);
      }} />
      <div className="flex-1 relative">
        <div className="absolute top-4 right-4 z-50">
          <UserMenu />
        </div>
        <div className="absolute top-4 left-4 z-50">
          <SidebarTrigger />
        </div>
        <PMFAnalyzer key={chatKey} />
      </div>
    </div>
  );
};

export default Index;