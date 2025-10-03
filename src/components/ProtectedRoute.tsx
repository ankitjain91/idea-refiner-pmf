import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { user, session, loading, initialized } = useAuth();
  const location = useLocation();

  // Check session validity on every route change
  useEffect(() => {
    if (!requireAuth) return;
    
    const checkSession = async () => {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      // If there's an error or no session, redirect to login
      if (error || !currentSession) {
        console.log("Session check failed in ProtectedRoute:", error);
        // The auth context will handle the redirect
        return;
      }
      
      // Check if session is expired
      if (currentSession.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const expiryTime = typeof currentSession.expires_at === 'string' 
          ? parseInt(currentSession.expires_at) 
          : currentSession.expires_at;
        
        if (now >= expiryTime) {
          console.log("Session expired in ProtectedRoute");
          // The auth context will handle the redirect
          return;
        }
      }
    };
    
    // Check session on mount and when location changes
    checkSession();
  }, [location.pathname, requireAuth]);

  // Don't show loading state if we have cached auth data
  if (!initialized && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading session...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !user && initialized) {
    console.log("ProtectedRoute redirecting to / with auth modal:", { initialized, loading, hasUser: !!user, path: location.pathname });
    // Redirect to landing page and open auth modal, preserving original location
    return <Navigate to="/" state={{ from: location, openAuthModal: true }} replace />;
  }

  // Redirect authenticated users from root to /home
  if (user && location.pathname === '/') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};