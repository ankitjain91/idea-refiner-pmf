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
  
  // Remove artificial bootstrap delay; rely solely on auth loading state
  // This prevents premature redirects on hard refresh
  

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
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !user) {
    console.log("ProtectedRoute redirecting to /auth:", { initialized, loading, hasUser: !!user, path: location.pathname });
    // Redirect to auth page but save the location they were trying to go to
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};