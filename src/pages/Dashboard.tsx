import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EnhancedPMFDashboard from "@/components/EnhancedPMFDashboard";
import { UserMenu } from "@/components/UserMenu";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/EnhancedAuthContext";
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
  
  // Reactive saved data from localStorage
  const [idea, setIdea] = useState<string>(localStorage.getItem('userIdea') || '');
  const [refinements, setRefinements] = useState<Record<string, any>>(
    JSON.parse(localStorage.getItem('userRefinements') || '{}')
  );
  const [metadata, setMetadata] = useState<Record<string, any>>(
    JSON.parse(localStorage.getItem('ideaMetadata') || '{}')
  );
  const [answers, setAnswers] = useState<Record<string, any>>(
    JSON.parse(localStorage.getItem('userAnswers') || '{}')
  );
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Sync with localStorage changes
  useEffect(() => {
    const handleStorage = () => {
      setIdea(localStorage.getItem('userIdea') || '');
      setRefinements(JSON.parse(localStorage.getItem('userRefinements') || '{}'));
      setMetadata(JSON.parse(localStorage.getItem('ideaMetadata') || '{}'));
      setAnswers(JSON.parse(localStorage.getItem('userAnswers') || '{}'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Auto-save session when score updates and idea exists
  useEffect(() => {
    if (user && idea && pmfScore > 0) {
      saveSession();
    }
  }, [pmfScore, user, idea]);

  const saveSession = async () => {
    if (!user || !idea || savingSession) return;
    
    setSavingSession(true);
    try {
      const sessionId = localStorage.getItem('currentSessionId');
      const sessionData = {
        user_id: user.id,
        session_name: idea.substring(0, 50) + (idea.length > 50 ? '...' : ''),
        idea: idea,
        user_answers: answers,
        refinements: refinements,
        metadata: metadata,
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

  const clearAll = () => {
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('userIdea');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('userRefinements');
    localStorage.removeItem('ideaMetadata');
    setIdea('');
    setAnswers({});
    setRefinements({});
    setMetadata({});
    setPmfScore(0);
    toast({ title: 'Reset complete', description: 'Start a fresh analysis.' });
    navigate('/');
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
              <h1 className="text-2xl font-bold">Start Your PMF Journey</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>Back to Chat</Button>
              <Button variant="destructive" onClick={clearAll}>Start Fresh</Button>
              <UserMenu />
            </div>
          </div>
          
          {/* Dashboard Content */}
          <EnhancedPMFDashboard
            idea={idea}
            refinements={refinements}
            metadata={metadata}
            userAnswers={answers}
            onScoreUpdate={setPmfScore}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;