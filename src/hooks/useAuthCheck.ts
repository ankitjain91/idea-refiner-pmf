import { useEffect } from "react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useNavigate } from "react-router-dom";

// Hook to check authentication status and refresh token when needed
export const useAuthCheck = () => {
  const { user, session, loading, refreshSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      if (!loading && session) {
        // Check if token will expire soon (within 5 minutes)
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const expiryTime = typeof expiresAt === 'string' ? parseInt(expiresAt) : expiresAt;
          const fiveMinutes = 5 * 60;
          
          if (now >= (expiryTime - fiveMinutes)) {
            // Token expiring soon, refresh it
            await refreshSession();
          }
        }
      }
    };

    // Check auth status immediately
    checkAuth();

    // Set up interval to check every minute
    const interval = setInterval(checkAuth, 60 * 1000);

    return () => clearInterval(interval);
  }, [session, loading, refreshSession]);

  return { user, session, loading };
};