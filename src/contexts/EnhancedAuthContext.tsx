import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export type UserRole = 'free' | 'pro' | 'enterprise';

interface UserProfile {
  role: UserRole;
  stripeCustomerId?: string;
  subscriptionEnd?: Date;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  syncUserRole: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  canAccessFeature: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  loading: true,
  initialized: false,
  signOut: async () => {},
  refreshSession: async () => {},
  syncUserRole: async () => {},
  hasRole: () => false,
  canAccessFeature: () => false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const roleHierarchy: Record<UserRole, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roleRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user role and profile data
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role:', roleError);
      }

      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('stripe_customer_id, subscription_end_date')
        .eq('user_id', userId)
        .single();

      return {
        role: roleData?.role || 'free',
        stripeCustomerId: profileData?.stripe_customer_id,
        subscriptionEnd: profileData?.subscription_end_date ? new Date(profileData.subscription_end_date) : undefined,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Sync user role with Stripe
  const syncUserRole = async () => {
    if (!session?.access_token) return;
    
    try {
      console.log("Syncing user role with Stripe...");
      const { data, error } = await supabase.functions.invoke('sync-subscription-role');
      
      if (!error && data) {
        const newProfile: UserProfile = {
          role: data.role || 'free',
          stripeCustomerId: data.stripeCustomerId,
          subscriptionEnd: data.subscriptionEnd ? new Date(data.subscriptionEnd) : undefined,
        };
        
        setUserProfile(newProfile);
        console.log("User role synced:", newProfile);
        
        // Refresh from database to ensure consistency
        if (user) {
          const profileData = await fetchUserProfile(user.id);
          if (profileData) {
            setUserProfile(profileData);
          }
        }
      } else if (error) {
        console.error("Failed to sync user role:", error);
      }
    } catch (error) {
      console.error("Error syncing user role:", error);
    }
  };

  // Check if user has a specific role
  const hasRole = (role: UserRole): boolean => {
    // All users have enterprise access
    return true;
  };

  // Check if user can access a feature based on role hierarchy
  const canAccessFeature = (requiredRole: UserRole): boolean => {
    // All users have enterprise access
    return true;
  };

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
        
        // Refresh user profile
        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
          setUserProfile(profile);
        }
      } else {
        throw new Error("No valid session after refresh");
      }
    } catch (error) {
      console.error("Session refresh failed:", error);
      setSession(null);
      setUser(null);
      setUserProfile(null);
      
      toast({
        title: "Session expired",
        description: "Please sign in again to continue",
        variant: "destructive",
      });
      
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
    
    if (now >= expiryTime) {
      console.log("Token has expired");
      return true;
    }
    
    const fiveMinutes = 5 * 60;
    if (now >= (expiryTime - fiveMinutes)) {
      console.log("Token expiring soon, refreshing...");
      refreshSession();
    }
    
    return false;
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch profile
          const profile = await fetchUserProfile(initialSession.user.id);
          if (mounted && profile) {
            setUserProfile(profile);
          }
          
          // Sync role after a delay
          setTimeout(() => {
            if (mounted) syncUserRole();
          }, 1000);
          
          // Set up intervals
          refreshIntervalRef.current = setInterval(() => {
            checkTokenExpiry(initialSession);
          }, 4 * 60 * 1000);
          
          roleRefreshIntervalRef.current = setInterval(() => {
            syncUserRole();
          }, 60 * 1000);
        }
        // Defer setting loading=false to the auth state change listener to avoid race conditions
        // This prevents premature redirects on hard refresh before session is restored
        // if (mounted) { setLoading(false); }
      } catch (error) {
        console.error("Error initializing auth:", error);
        // Keep loading=true; onAuthStateChange will finalize loading state
        // to prevent redirect race conditions on refresh
      }
    };

    // Set up auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email);
        
        if (!mounted) return;
        
        // Clear intervals
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
        if (roleRefreshIntervalRef.current) {
          clearInterval(roleRefreshIntervalRef.current);
          roleRefreshIntervalRef.current = null;
        }
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Fetch profile
          const profile = await fetchUserProfile(newSession.user.id);
          if (mounted && profile) {
            setUserProfile(profile);
          }
          
          // Set up intervals for active session
          if (newSession) {
            refreshIntervalRef.current = setInterval(() => {
              checkTokenExpiry(newSession);
            }, 4 * 60 * 1000);
            
            roleRefreshIntervalRef.current = setInterval(() => {
              syncUserRole();
            }, 60 * 1000);
          }
          
          // Handle sign in redirect
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              if (mounted) syncUserRole();
            }, 1000);
            
            const from = location.state?.from?.pathname;
            if (from) navigate(from);
          }
        } else {
          setUserProfile(null);
          
          if (event === 'SIGNED_OUT') {
            localStorage.clear();
            navigate('/auth');
          }
        }
        
        // Always set loading to false after auth state changes
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    // Initialize auth after setting up listener
    initialize();

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (roleRefreshIntervalRef.current) {
        clearInterval(roleRefreshIntervalRef.current);
      }
    };
  }, []); // Remove dependencies to prevent re-initialization

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (roleRefreshIntervalRef.current) {
        clearInterval(roleRefreshIntervalRef.current);
        roleRefreshIntervalRef.current = null;
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setSession(null);
      setUserProfile(null);
      localStorage.clear();
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Sign out failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        loading,
        initialized,
        signOut,
        refreshSession,
        syncUserRole,
        hasRole,
        canAccessFeature,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};