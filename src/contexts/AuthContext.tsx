import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to refresh the session
  const refreshSession = async () => {
    try {
      console.log("Refreshing session...");
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Failed to refresh session:", error);
        throw error;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
        console.log("Session refreshed successfully");
      } else {
        // No valid session after refresh
        throw new Error("No valid session after refresh");
      }
    } catch (error) {
      console.error("Session refresh failed:", error);
      // Clear invalid session
      setSession(null);
      setUser(null);
      
      // Show toast and redirect to auth
      toast({
        title: "Session expired",
        description: "Please sign in again to continue",
        variant: "destructive",
      });
      
      // Save current location and redirect to auth
      navigate('/auth', { state: { from: location } });
    }
  };

  // Check if token is expired or about to expire
  const checkTokenExpiry = (session: Session | null) => {
    if (!session) return true;
    
    const expiresAt = session.expires_at;
    if (!expiresAt) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = typeof expiresAt === 'string' ? parseInt(expiresAt) : expiresAt;
    
    // Check if expired
    if (now >= expiryTime) {
      console.log("Token has expired");
      return true;
    }
    
    // Check if expiring within 5 minutes
    const fiveMinutes = 5 * 60;
    if (now >= (expiryTime - fiveMinutes)) {
      console.log("Token expiring soon, refreshing...");
      refreshSession();
    }
    
    return false;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        
        // Clear any existing refresh interval
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
        
        // Update state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle different auth events
        if (event === 'SIGNED_IN') {
          // Set up token refresh interval (every 4 minutes)
          refreshIntervalRef.current = setInterval(() => {
            checkTokenExpiry(session);
          }, 4 * 60 * 1000);
          
          // Redirect to dashboard or saved location after successful sign in
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from);
        } else if (event === 'SIGNED_OUT') {
          // Clear state and redirect to auth
          setSession(null);
          setUser(null);
          navigate('/auth');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'USER_UPDATED') {
          console.log('User data updated');
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session and verify token
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
          return;
        }
        
        if (session) {
          // Check if token is expired
          const isExpired = checkTokenExpiry(session);
          
          if (isExpired) {
            // Try to refresh the session
            await refreshSession();
          } else {
            // Verify the token is still valid by getting user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
              console.error("Token verification failed:", userError);
              // Token is invalid, try refresh
              await refreshSession();
            } else {
              // Token is valid, set up refresh interval
              setSession(session);
              setUser(user);
              
              // Set up token refresh interval (every 4 minutes)
              refreshIntervalRef.current = setInterval(() => {
                checkTokenExpiry(session);
              }, 4 * 60 * 1000);
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [navigate, location, toast]);

  const signOut = async () => {
    try {
      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};