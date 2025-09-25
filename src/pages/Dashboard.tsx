import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EnhancedPMFDashboard from "@/components/EnhancedPMFDashboard";
import { UserMenu } from "@/components/UserMenu";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pmfScore, setPmfScore] = useState(0);
  const [savingSession, setSavingSession] = useState(false);
  
  // Get saved data from localStorage or URL params
  const savedIdea = localStorage.getItem('userIdea') || '';
  const savedRefinements = JSON.parse(localStorage.getItem('userRefinements') || '{}');
  const savedMetadata = JSON.parse(localStorage.getItem('ideaMetadata') || '{}');
  const savedAnswers = JSON.parse(localStorage.getItem('userAnswers') || '{}');
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Auto-save session every time score updates
  useEffect(() => {
    if (user && savedIdea && pmfScore > 0) {
      saveSession();
    }
  }, [pmfScore, user]);

  const saveSession = async () => {
    if (!user || !savedIdea || savingSession) return;
    
    setSavingSession(true);
    try {
      const sessionId = localStorage.getItem('currentSessionId');
      const sessionData = {
        user_id: user.id,
        session_name: savedIdea.substring(0, 50) + (savedIdea.length > 50 ? '...' : ''),
        idea: savedIdea,
        user_answers: savedAnswers,
        refinements: savedRefinements,
        metadata: savedMetadata,
        insights: {},
        pmf_score: pmfScore,
        last_accessed: new Date().toISOString()
      };

      if (sessionId) {
        // Update existing session
        const { error } = await supabase
          .from('analysis_sessions')
          .update(sessionData)
          .eq('id', sessionId);
        
        if (error) throw error;
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('analysis_sessions')
          .insert([sessionData])
          .select()
          .single();
        
        if (error) throw error;
        
        if (data) {
          localStorage.setItem('currentSessionId', data.id);
        }
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      setSavingSession(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex w-full">
      <AppSidebar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>
            <UserMenu />
          </div>
          
          {/* Dashboard Content */}
          <EnhancedPMFDashboard
            idea={savedIdea}
            refinements={savedRefinements}
            metadata={savedMetadata}
            userAnswers={savedAnswers}
            onScoreUpdate={setPmfScore}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;