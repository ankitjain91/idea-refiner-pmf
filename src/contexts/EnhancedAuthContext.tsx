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
      }
    } catch (error) {
      console.error('Failed to sync user role:', error);
    }
  };

  // Check if user has a specific role
  const hasRole = (role: UserRole): boolean => {
    if (!userProfile) return false;
    return userProfile.role === role;
  };

  // Check if user can access a feature based on role hierarchy
  const canAccessFeature = (requiredRole: UserRole): boolean => {
    if (!userProfile) return false;
    return roleHierarchy[userProfile.role] >= roleHierarchy[requiredRole];
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email);
        
        // Clear any existing refresh intervals
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
        if (roleRefreshIntervalRef.current) {
          clearInterval(roleRefreshIntervalRef.current);
          roleRefreshIntervalRef.current = null;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Fetch user profile
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUserProfile(profile);
          }
          
          // Sync with Stripe
          setTimeout(() => {
            syncUserRole();
          }, 1000);
          
          // Set up token refresh interval (every 4 minutes)
          refreshIntervalRef.current = setInterval(() => {
            checkTokenExpiry(session);
          }, 4 * 60 * 1000);
          
          // Set up role refresh interval (every 1 minute)
          roleRefreshIntervalRef.current = setInterval(() => {
            syncUserRole();
          }, 60 * 1000);
          
          // Redirect to dashboard or saved location
          const from = location.state?.from?.pathname || '/dashboard';
          navigate(from);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserProfile(null);
          navigate('/auth');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'USER_UPDATED' && session?.user) {
          // Refresh profile on user update
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUserProfile(profile);
          }
        }
        
        setLoading(false);
      }
    );

    // Check for existing session and verify token
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
          return;
        }
        
        if (session) {
          const isExpired = checkTokenExpiry(session);
          
          if (isExpired) {
            await refreshSession();
          } else {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
              console.error("Token verification failed:", userError);
              await refreshSession();
            } else {
              setSession(session);
              setUser(user);
              
              // Fetch user profile
              const profile = await fetchUserProfile(user.id);
              if (profile) {
                setUserProfile(profile);
              }
              
              // Sync with Stripe
              setTimeout(() => {
                syncUserRole();
              }, 1000);
              
              // Set up refresh intervals
              refreshIntervalRef.current = setInterval(() => {
                checkTokenExpiry(session);
              }, 4 * 60 * 1000);
              
              roleRefreshIntervalRef.current = setInterval(() => {
                syncUserRole();
              }, 60 * 1000);
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
      if (roleRefreshIntervalRef.current) {
        clearInterval(roleRefreshIntervalRef.current);
      }
    };
  }, [navigate, location, toast]);

  const signOut = async () => {
    try {
      // Clear refresh intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (roleRefreshIntervalRef.current) {
        clearInterval(roleRefreshIntervalRef.current);
        roleRefreshIntervalRef.current = null;
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserProfile(null);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    signOut,
    refreshSession,
    syncUserRole,
    hasRole,
    canAccessFeature,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};