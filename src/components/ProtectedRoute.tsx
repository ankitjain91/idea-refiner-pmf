import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";


interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { user, session, loading, initialized, refreshSession } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Check token validity on mount and route changes
    const checkToken = async () => {
      if (session && !loading) {
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const expiryTime = typeof expiresAt === 'string' ? parseInt(expiresAt) : expiresAt;
          
          // If token is expired or expiring soon (within 5 minutes)
          if (now >= expiryTime || now >= (expiryTime - 300)) {
            console.log("Token expired or expiring soon in ProtectedRoute, refreshing...");
            await refreshSession();
          }
        }
      }
    };
    
    checkToken();
  }, [session, loading, refreshSession, location.pathname]);

  // Show loading spinner while auth state is initializing
  // But keep it minimal and centered to avoid jarring transitions
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading session...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !user) {
    console.log("ProtectedRoute redirecting to / with auth modal:", { initialized, loading, hasUser: !!user, path: location.pathname });
    // Redirect to landing page and open auth modal, preserving original location
    return <Navigate to="/" state={{ from: location, openAuthModal: true }} replace />;
  }

  return <>{children}</>;
};