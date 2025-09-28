import { LS_KEYS } from '@/lib/storage-keys';
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useAlerts } from "@/contexts/AlertContext";

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

// Keys we manage in localStorage (used for selective clearing on sign-out)
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

const AUTH_SNAPSHOT_KEY = 'authSnapshot';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { addAlert } = useAlerts();
  // Token refresh uses dynamic scheduling rather than fixed polling
  const tokenRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Role sync less frequent (5m) instead of 60s; can be forced manually
  const roleSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Guard against overlapping profile fetches
  const profileFetchInProgressRef = useRef(false);
  // Subscription expiry notification guard
  const expiryNotifiedRef = useRef(false);

  // Fetch user role and profile data
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (profileFetchInProgressRef.current) return userProfile; // Avoid overlap
    profileFetchInProgressRef.current = true;
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role:', roleError);
      }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('stripe_customer_id, subscription_end_date')
        .eq('user_id', userId)
        .single();
      const profile: UserProfile = {
        role: (roleData?.role as UserRole) || 'free',
        stripeCustomerId: profileData?.stripe_customer_id,
        subscriptionEnd: profileData?.subscription_end_date ? new Date(profileData.subscription_end_date) : undefined,
      };
      handleSubscriptionExpiry(profile);
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    } finally {
      profileFetchInProgressRef.current = false;
    }
  };

  // Handle subscription expiry (downgrade locally + notify once)
  const handleSubscriptionExpiry = (profile: UserProfile) => {
    if (!profile.subscriptionEnd) return;
    if (profile.subscriptionEnd.getTime() < Date.now()) {
      if (profile.role !== 'free') {
        // Downgrade locally; backend will reconcile on next sync
        profile.role = 'free';
      }
      if (!expiryNotifiedRef.current) {
        expiryNotifiedRef.current = true;
        addAlert({
          variant: 'warning',
          title: 'Subscription expired',
          message: 'Your subscription ended; features may be limited until renewal.',
          scope: 'auth',
          autoDismissMs: 10000,
        });
        try { window.dispatchEvent(new CustomEvent('auth:subscription-expired')); } catch {}
      }
    }
  };

  // Sync user role with Stripe
  const syncUserRole = async (opts: { forceDbRefresh?: boolean } = {}) => {
    if (!session?.access_token || !user) return;
    try {
      console.log('Syncing user role with Stripe...');
      const { data, error } = await supabase.functions.invoke('sync-subscription-role');
      if (error) {
        console.error('Failed to sync user role:', error);
        return;
      }
      if (data) {
        const newProfile: UserProfile = {
          role: (data.role as UserRole) || 'free',
          stripeCustomerId: data.stripeCustomerId,
          subscriptionEnd: data.subscriptionEnd ? new Date(data.subscriptionEnd) : undefined,
        };
        handleSubscriptionExpiry(newProfile);
        setUserProfile(prev => {
          // Only update if materially changed
            const changed = !prev || prev.role !== newProfile.role || prev.stripeCustomerId !== newProfile.stripeCustomerId || (prev.subscriptionEnd?.getTime() !== newProfile.subscriptionEnd?.getTime());
            return changed ? newProfile : prev;
        });
        try { window.dispatchEvent(new CustomEvent('auth:role-updated', { detail: newProfile })); } catch {}
        if (opts.forceDbRefresh) {
          const dbProfile = await fetchUserProfile(user.id);
          if (dbProfile) setUserProfile(dbProfile);
        }
      }
    } catch (e) {
      console.error('Error syncing user role:', e);
    }
  };

  // Check if user has a specific role
  const hasRole = (role: UserRole): boolean => {
    const current = userProfile?.role || 'free';
    return roleHierarchy[current] >= roleHierarchy[role];
  };

  // Check if user can access a feature based on role hierarchy
  const canAccessFeature = (requiredRole: UserRole): boolean => {
    return hasRole(requiredRole);
  };

  // Schedule token refresh 4 minutes before expiry (or immediately if past)
  const scheduleTokenRefresh = (s: Session) => {
    if (!s?.expires_at) return;
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
      tokenRefreshTimeoutRef.current = null;
    }
    const expiryEpoch = typeof s.expires_at === 'string' ? parseInt(s.expires_at) : s.expires_at;
    const refreshAt = (expiryEpoch - 4 * 60) * 1000; // ms
    const delay = Math.max(0, refreshAt - Date.now());
    tokenRefreshTimeoutRef.current = setTimeout(() => {
      refreshSession();
    }, delay);
  };

  // Function to refresh the session
  const refreshSession = async () => {
    try {
      console.log('Refreshing session...');
      const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (!refreshed) throw new Error('No valid session after refresh');
      setSession(refreshed);
      setUser(refreshed.user);
      scheduleTokenRefresh(refreshed);
      const profile = await fetchUserProfile(refreshed.user.id);
      if (profile) setUserProfile(profile);
      try { window.dispatchEvent(new CustomEvent('auth:session-refreshed')); } catch {}
      console.log('Session refreshed successfully');
    } catch (error) {
      console.error('Session refresh failed:', error);
      setSession(null);
      setUser(null);
      setUserProfile(null);
      try { window.dispatchEvent(new CustomEvent('auth:error', { detail: 'session-refresh-failed' })); } catch {}
      addAlert({
        variant: 'error',
        title: 'Session expired',
        message: 'Please sign in again to continue',
        scope: 'auth',
      });
      navigate('/', { state: { from: location, openAuthModal: true } });
    }
  };

  // Check if token is expired or about to expire
  // Legacy function no longer required for scheduling; retained (unused) logic removed
  const checkTokenExpiry = (_session: Session | null) => false;

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // Warm start: load cached auth snapshot to reduce initial flicker
    try {
      const snapshotRaw = localStorage.getItem(AUTH_SNAPSHOT_KEY);
      if (snapshotRaw) {
        const snapshot = JSON.parse(snapshotRaw);
        // Restore user immediately if snapshot is still valid
        if (snapshot?.user && snapshot?.expiresAt && Date.now() < snapshot.expiresAt) {
          setUser(snapshot.user);
        }
        if (snapshot?.role) {
          setUserProfile({
            role: snapshot.role,
            stripeCustomerId: snapshot.stripeCustomerId,
            subscriptionEnd: snapshot.subscriptionEnd ? new Date(snapshot.subscriptionEnd) : undefined,
          });
        }
      }
    } catch {}

    const initialize = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          scheduleTokenRefresh(initialSession);
          
          // Fetch profile
          const profile = await fetchUserProfile(initialSession.user.id);
          if (mounted && profile) {
            setUserProfile(profile);
          }
          
          // Sync role after a delay
          setTimeout(() => {
            if (mounted) syncUserRole();
          }, 1000);
          // Role sync interval (5 min)
          roleSyncIntervalRef.current = setInterval(() => {
            syncUserRole();
          }, 5 * 60 * 1000);
        }
        // Mark auth initialized after getSession completes to avoid race conditions
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        // Fail-safe: don't leave app in perpetual loading state
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Set up auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email);
        
        if (!mounted) return;
        
        // Clear timers
        if (tokenRefreshTimeoutRef.current) {
          clearTimeout(tokenRefreshTimeoutRef.current);
          tokenRefreshTimeoutRef.current = null;
        }
        if (roleSyncIntervalRef.current) {
          clearInterval(roleSyncIntervalRef.current);
          roleSyncIntervalRef.current = null;
        }
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer profile fetch and role sync to avoid async work inside callback
          setTimeout(async () => {
            const profile = await fetchUserProfile(newSession.user!.id);
            if (mounted && profile) setUserProfile(profile);
            syncUserRole();
          }, 0);
          
          scheduleTokenRefresh(newSession);
          roleSyncIntervalRef.current = setInterval(() => {
            syncUserRole();
          }, 5 * 60 * 1000);
          
          // Handle sign in redirect
          if (event === 'SIGNED_IN') {
            const from = location.state?.from?.pathname;
            if (from) navigate(from);
          }
          try { window.dispatchEvent(new CustomEvent('auth:state-changed', { detail: event })); } catch {}
        } else {
          setUserProfile(null);
          // No navigation or storage clearing on SIGNED_OUT; let ProtectedRoute handle it
          try { window.dispatchEvent(new CustomEvent('auth:state-changed', { detail: event })); } catch {}
        }
        
        // Supabase v2 emits INITIAL_SESSION once; finalize loading if not yet initialized
        if (event === 'INITIAL_SESSION') {
          if (!initialized) {
            setLoading(false);
            setInitialized(true);
          }
        }
        // Safety: if we somehow haven't marked initialized after first concrete auth event, do it now
        if (!initialized && (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED')) {
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
      if (tokenRefreshTimeoutRef.current) clearTimeout(tokenRefreshTimeoutRef.current);
      if (roleSyncIntervalRef.current) clearInterval(roleSyncIntervalRef.current);
    };
  }, []); // Remove dependencies to prevent re-initialization

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear timers
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
        tokenRefreshTimeoutRef.current = null;
      }
      if (roleSyncIntervalRef.current) {
        clearInterval(roleSyncIntervalRef.current);
        roleSyncIntervalRef.current = null;
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setUser(null);
      setSession(null);
      setUserProfile(null);
      try {
        APP_LOCALSTORAGE_KEYS.forEach(key => localStorage.removeItem(key));
        // We intentionally keep theme preference
      } catch {}
      try { window.dispatchEvent(new CustomEvent('auth:state-changed', { detail: 'SIGNED_OUT' })); } catch {}
      
      addAlert({
        variant: 'success',
        title: 'Signed out',
        message: 'You have been logged out of your account.',
        scope: 'auth',
        autoDismissMs: 6000,
      });
      
      navigate('/', { replace: true, state: { openAuthModal: true } });
    } catch (error) {
      console.error("Sign out error:", error);
      addAlert({
        variant: 'error',
        title: 'Sign out failed',
        message: 'There was an error signing out. Please try again.',
        scope: 'auth',
      });
    } finally {
      setLoading(false);
    }
  };

  // Persist snapshot whenever userProfile or user changes (lightweight)
  useEffect(() => {
    if (userProfile && user && session) {
      try {
        localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify({
          user: user,
          role: userProfile.role,
          stripeCustomerId: userProfile.stripeCustomerId,
          subscriptionEnd: userProfile.subscriptionEnd?.toISOString(),
          expiresAt: session.expires_at ? new Date(session.expires_at).getTime() : Date.now() + 3600000
        }));
      } catch {}
    } else if (!user) {
      try { localStorage.removeItem(AUTH_SNAPSHOT_KEY); } catch {}
    }
  }, [userProfile, user, session]);

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