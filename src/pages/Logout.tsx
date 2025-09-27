import { LS_KEYS } from '@/lib/storage-keys';
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Mirror selective clearing list from auth context (duplication kept minimal to avoid circular import)
const APP_LOCALSTORAGE_KEYS = [
  'currentSessionId',
  'sessionDesiredPath',
  'chatHistory',
  'userIdea',
  'userAnswers',
  'ideaMetadata',
  LS_KEYS.analysisCompleted,
  'analysisResults',
  'pmfScore',
  'userRefinements',
  'pmfFeatures',
  'pmfTabHistory',
  'showAnalysisDashboard',
  'currentTab',
  'currentSessionTitle',
  'pmfCurrentIdea',
  'authSnapshot',
];

const Logout = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleLogout = async () => {
  // Selectively clear app-managed keys (preserve theme / other user prefs)
  try { APP_LOCALSTORAGE_KEYS.forEach(k => localStorage.removeItem(k)); } catch {}
  try { window.dispatchEvent(new CustomEvent('auth:state-changed', { detail: 'SIGNED_OUT' })); } catch {}
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Redirect to auth page after logout
      navigate('/auth', { replace: true });
    };
    
    handleLogout();
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Signing out...</p>
      </div>
    </div>
  );
};

export default Logout;