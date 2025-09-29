import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LS_KEYS } from '@/lib/storage-keys';

interface SessionData {
  chatHistory: any[];
  currentIdea: string;
  analysisData: any;
  pmfScore?: number;
  analysisCompleted: boolean;
  wrinklePoints?: number;
  lastActivity: string;
  // Dashboard specific data
  dashboardData?: {
    marketSize?: string;
    competition?: string;
    sentiment?: string;
    smoothBrainsScore?: number;
    tileCaches?: Record<string, any>;
    lastRefreshTimes?: Record<string, string>;
    currentTab?: string;
    analysisResults?: any;
  };
}

interface BrainstormingSession {
  id: string;
  name: string;
  data: SessionData;
  created_at: string;
  updated_at: string;
  user_id?: string;
  is_anonymous: boolean;
}

interface SessionContextType {
  sessions: BrainstormingSession[];
  currentSession: BrainstormingSession | null;
  loading: boolean;
  saving: boolean;
  
  // Auto-save control
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  
  // Core actions
  loadSessions: () => Promise<void>;
  createSession: (name: string, anonymous?: boolean) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  
  // Session management
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  duplicateSession: (sessionId: string) => Promise<void>;
  
  // Auto-save for all authenticated sessions
  saveCurrentSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<BrainstormingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<BrainstormingSession | null>(null);
  
  // Auto-save state (default to ON)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved === null ? true : saved === 'true';
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current session data from localStorage and component state
  const getCurrentSessionData = useCallback((): SessionData => {
    try {
      // Try to get EnhancedIdeaChat messages first (main chat interface)
      const enhancedMessages = localStorage.getItem('enhancedIdeaChatMessages');
      let chatHistory = [];
      
      if (enhancedMessages) {
        chatHistory = JSON.parse(enhancedMessages);
      } else {
        // Fallback to legacy chatHistory
        chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      }
      
      // Also check for currentIdea from EnhancedIdeaChat
      const currentIdea = localStorage.getItem('currentIdea') || localStorage.getItem(LS_KEYS.userIdea) || '';
      const analysisCompleted = localStorage.getItem(LS_KEYS.analysisCompleted) === 'true';
      const pmfScore = parseInt(localStorage.getItem(LS_KEYS.pmfScore) || '0');
      const analysisData = JSON.parse(localStorage.getItem(LS_KEYS.ideaMetadata) || '{}');
      
      // Get wrinkle points if available
      const wrinklePoints = parseInt(localStorage.getItem('wrinklePoints') || '0');
      
      // Collect dashboard data
      const dashboardData: any = {
        marketSize: localStorage.getItem('market_size_value'),
        competition: localStorage.getItem('competition_value'),
        sentiment: localStorage.getItem('sentiment_value'),
        smoothBrainsScore: parseInt(localStorage.getItem('smoothBrainsScore') || '0'),
        currentTab: localStorage.getItem('currentTab'),
        analysisResults: JSON.parse(localStorage.getItem('analysisResults') || '{}'),
        tileCaches: {},
        lastRefreshTimes: {}
      };
      
      // Collect all tile caches and refresh times
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('tile_cache_')) {
          try {
            dashboardData.tileCaches[key] = JSON.parse(localStorage.getItem(key) || '{}');
          } catch {}
        }
        if (key.startsWith('tile_last_refresh_')) {
          dashboardData.lastRefreshTimes[key] = localStorage.getItem(key) || '';
        }
      });

      return {
        chatHistory,
        currentIdea,
        analysisData,
        pmfScore: isNaN(pmfScore) ? 0 : pmfScore,
        analysisCompleted,
        wrinklePoints: isNaN(wrinklePoints) ? 0 : wrinklePoints,
        lastActivity: new Date().toISOString(),
        dashboardData
      };
    } catch (error) {
      console.error('Error getting current session data:', error);
      return {
        chatHistory: [],
        currentIdea: '',
        analysisData: {},
        pmfScore: 0,
        analysisCompleted: false,
        wrinklePoints: 0,
        lastActivity: new Date().toISOString(),
        dashboardData: {}
      };
    }
  }, []);

  // Load all sessions for current user and auto-load most recent if none is currently loaded
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSessions([]);
        // Don't load anonymous sessions for non-authenticated state
        setCurrentSession(null);
        return;
      }

      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Map database sessions (anonymous sessions are never saved to DB)
      const mappedSessions: BrainstormingSession[] = (data || []).map(session => ({
        ...session,
        data: (session.state as unknown as SessionData) || {
          chatHistory: [],
          currentIdea: '',
          analysisData: {},
          analysisCompleted: false,
          lastActivity: new Date().toISOString()
        },
        analysis_data: {
          score: 0,
          insights: [],
          recommendations: []
        },
        is_anonymous: false // All database sessions are non-anonymous
      }));

      setSessions(mappedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new session (authenticated or anonymous)
  const createSession = useCallback(async (name: string, anonymous: boolean = false) => {
    if (!name || !name.trim()) {
      throw new Error('Session name is required');
    }
    
    setLoading(true);
    try {
      // Clear the chat and reset to fresh state
      const freshSessionData: SessionData = {
        chatHistory: [],
        currentIdea: '',
        analysisData: {},
        pmfScore: 0,
        analysisCompleted: false,
        lastActivity: new Date().toISOString(),
        wrinklePoints: 0,
        dashboardData: {} // Initialize empty dashboard data
      };
      
      // Clear ALL generic localStorage to reset for new session
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('enhancedIdeaChatMessages');
      localStorage.removeItem(LS_KEYS.userIdea);
      localStorage.removeItem('currentIdea');
      localStorage.removeItem('pmf.user.idea');
      localStorage.removeItem('userIdea');
      localStorage.removeItem('pmf.user.answers');
      localStorage.removeItem('ideaMetadata');
      localStorage.removeItem('conversationHistory');
      localStorage.removeItem(LS_KEYS.pmfScore);
      localStorage.removeItem(LS_KEYS.analysisCompleted);
      localStorage.removeItem('pmf.analysis.completed');
      localStorage.removeItem(LS_KEYS.ideaMetadata);
      localStorage.removeItem('wrinklePoints');
      
      // Clear dashboard specific data
      localStorage.removeItem('dashboardValidation');
      localStorage.removeItem('dashboardAccessGrant');
      localStorage.removeItem('showAnalysisDashboard');
      localStorage.removeItem('currentTab');
      localStorage.removeItem('analysisResults');
      localStorage.removeItem('pmfScore');
      localStorage.removeItem('userRefinements');
      localStorage.removeItem('pmfFeatures');
      localStorage.removeItem('pmfTabHistory');
      localStorage.removeItem('market_size_value');
      localStorage.removeItem('competition_value');
      localStorage.removeItem('sentiment_value');
      localStorage.removeItem('smoothBrainsScore');
      
      // Clear all tile caches
      const dashboardKeys = Object.keys(localStorage);
      dashboardKeys.forEach(key => {
        if (key.includes('tile_cache_') || 
            key.includes('tile_last_refresh_') ||
            key.includes('trends_cache_') ||
            key.includes('market_data_') ||
            key.includes('reddit_sentiment_') ||
            key.includes('web_search_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear ALL session-specific storage from previous sessions
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('session_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Trigger a custom event to reset the chat component
      window.dispatchEvent(new CustomEvent('session:reset'));
      
      if (anonymous) {
        // Create anonymous session (not persisted to database)
        const anonymousSession: BrainstormingSession = {
          id: `anon-${Date.now()}`,
          name: name.trim(),
          data: freshSessionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_anonymous: true
        };
        
        // Store locally but don't persist to database or add to sessions list
        localStorage.setItem('currentAnonymousSession', JSON.stringify(anonymousSession));
        localStorage.setItem('currentSessionId', anonymousSession.id);
        setCurrentSession(anonymousSession);
        
        console.log('Created anonymous session:', anonymousSession.name);
        // Note: Anonymous sessions are not added to the sessions array to keep them out of recents
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Must be logged in to create sessions');
      }
      
      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .insert({
          user_id: user?.id || '',
          name: name,
          state: freshSessionData as any
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: BrainstormingSession = {
        id: data.id,
        name: data.name.trim(),
        data: freshSessionData,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        is_anonymous: false
      };

      setCurrentSession(newSession);
      setSessions(prev => [newSession, ...prev]);

      // Store session ID for persistence
      localStorage.setItem('currentSessionId', data.id);
      
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getCurrentSessionData]);



  // Load a specific session
  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      const session: BrainstormingSession = {
        id: data.id,
        name: data.name,
        data: (data.state as any) || {
          chatHistory: [],
          currentIdea: '',
          analysisData: {},
          pmfScore: 0,
          analysisCompleted: false,
          lastActivity: data.updated_at
        },
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        is_anonymous: false
      };

      setCurrentSession(session);

      // Clear ALL localStorage data first to prevent cross-session pollution
      localStorage.removeItem('chatHistory');
      localStorage.removeItem('enhancedIdeaChatMessages');
      localStorage.removeItem(LS_KEYS.userIdea);
      localStorage.removeItem('currentIdea');
      localStorage.removeItem('pmf.user.idea');
      localStorage.removeItem('userIdea');
      localStorage.removeItem('pmf.user.answers');
      localStorage.removeItem('ideaMetadata');
      localStorage.removeItem('conversationHistory');
      localStorage.removeItem(LS_KEYS.pmfScore);
      localStorage.removeItem(LS_KEYS.analysisCompleted);
      localStorage.removeItem('pmf.analysis.completed');
      localStorage.removeItem(LS_KEYS.ideaMetadata);
      localStorage.removeItem('wrinklePoints');
      
      // Clear dashboard specific data when switching sessions
      localStorage.removeItem('dashboardValidation');
      localStorage.removeItem('dashboardAccessGrant');
      localStorage.removeItem('showAnalysisDashboard');
      localStorage.removeItem('currentTab');
      localStorage.removeItem('analysisResults');
      localStorage.removeItem('pmfScore');
      localStorage.removeItem('userRefinements');
      localStorage.removeItem('pmfFeatures');
      localStorage.removeItem('pmfTabHistory');
      localStorage.removeItem('market_size_value');
      localStorage.removeItem('competition_value');
      localStorage.removeItem('sentiment_value');
      localStorage.removeItem('smoothBrainsScore');
      
      // Clear all tile caches for dashboard
      const dashboardKeys = Object.keys(localStorage);
      dashboardKeys.forEach(key => {
        if (key.includes('tile_cache_') || 
            key.includes('tile_last_refresh_') ||
            key.includes('trends_cache_') ||
            key.includes('market_data_') ||
            key.includes('reddit_sentiment_') ||
            key.includes('web_search_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear any session-specific storage from other sessions
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('session_') && !key.includes(sessionId)) {
          // Don't remove data from the session we're loading
          if (!key.includes(sessionId)) {
            localStorage.removeItem(key);
          }
        }
      });

      // Now restore session data to localStorage
      // Store in both locations for compatibility
      localStorage.setItem('chatHistory', JSON.stringify(session.data.chatHistory));
      localStorage.setItem('enhancedIdeaChatMessages', JSON.stringify(session.data.chatHistory));
      
      // Only restore idea and analysis data if they actually exist in the session
      if (session.data.currentIdea) {
        localStorage.setItem(LS_KEYS.userIdea, session.data.currentIdea);
        localStorage.setItem('currentIdea', session.data.currentIdea);
        // Store in session-specific key
        localStorage.setItem(`session_${sessionId}_idea`, session.data.currentIdea);
        if (session.data.analysisData) {
          localStorage.setItem(`session_${sessionId}_metadata`, JSON.stringify({ refined: session.data.currentIdea }));
        }
      }
      
      localStorage.setItem(LS_KEYS.pmfScore, String(session.data.pmfScore || 0));
      localStorage.setItem(LS_KEYS.analysisCompleted, session.data.analysisCompleted ? 'true' : 'false');
      localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(session.data.analysisData || {}));
      localStorage.setItem('currentSessionId', sessionId);
      
      // Restore wrinkle points if available
      if (session.data.wrinklePoints !== undefined) {
        localStorage.setItem('wrinklePoints', String(session.data.wrinklePoints));
      }
      
      // Restore dashboard data if available
      if (session.data.dashboardData) {
        const { dashboardData } = session.data;
        
        // Restore dashboard values
        if (dashboardData.marketSize) localStorage.setItem('market_size_value', dashboardData.marketSize);
        if (dashboardData.competition) localStorage.setItem('competition_value', dashboardData.competition);
        if (dashboardData.sentiment) localStorage.setItem('sentiment_value', dashboardData.sentiment);
        if (dashboardData.smoothBrainsScore) localStorage.setItem('smoothBrainsScore', String(dashboardData.smoothBrainsScore));
        if (dashboardData.currentTab) localStorage.setItem('currentTab', dashboardData.currentTab);
        if (dashboardData.analysisResults) localStorage.setItem('analysisResults', JSON.stringify(dashboardData.analysisResults));
        
        // Restore tile caches
        if (dashboardData.tileCaches) {
          Object.entries(dashboardData.tileCaches).forEach(([key, value]) => {
            try {
              localStorage.setItem(key, JSON.stringify(value));
            } catch {}
          });
        }
        
        // Restore refresh times
        if (dashboardData.lastRefreshTimes) {
          Object.entries(dashboardData.lastRefreshTimes).forEach(([key, value]) => {
            if (value) localStorage.setItem(key, value as string);
          });
        }
      }

      // Update last accessed time
      await supabase
        .from('brainstorming_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

    } catch (error) {
      console.error('Error loading session:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save current session data to database (skip anonymous sessions or when auto-save is disabled)
  const saveCurrentSession = useCallback(async () => {
    if (!currentSession || saving) return;
    
    // Don't save if auto-save is disabled
    if (!autoSaveEnabled) {
      return;
    }
    
    // Don't save anonymous sessions to database
    if (currentSession.is_anonymous) {
      // Update local storage for anonymous sessions
      const sessionData = getCurrentSessionData();
      const updatedSession = {
        ...currentSession,
        data: sessionData,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('currentAnonymousSession', JSON.stringify(updatedSession));
      return;
    }
    
    setSaving(true);
    try {
      const sessionData = getCurrentSessionData();
      
      const { error } = await supabase
        .from('brainstorming_sessions')
        .update({
          state: sessionData as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;
      
    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setSaving(false);
    }
  }, [currentSession, saving, getCurrentSessionData, autoSaveEnabled]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('brainstorming_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);

        localStorage.removeItem('currentSessionId');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }, [currentSession]);

  // Rename a session
  const renameSession = useCallback(async (sessionId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('brainstorming_sessions')
        .update({ name: newName })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, name: newName } : s
      ));

      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, name: newName } : null);
      }
    } catch (error) {
      console.error('Error renaming session:', error);
      throw error;
    }
  }, [currentSession]);

  // Duplicate a session
  const duplicateSession = useCallback(async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .insert({
          user_id: user.id,
          name: `${session.name} (Copy)`,
          state: session.data as any
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: BrainstormingSession = {
        id: data.id,
        name: data.name,
        data: session.data,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        is_anonymous: false
      };

      setSessions(prev => [newSession, ...prev]);
    } catch (error) {
      console.error('Error duplicating session:', error);
      throw error;
    }
  }, [sessions]);

  // Initialize session on mount - check for existing session
  useEffect(() => {
    const initializeSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[SessionContext] Initializing session, user:', user?.email);
      
      // Clear anonymous session data if user is not authenticated
      if (!user) {
        console.log('[SessionContext] No user, clearing all session data');
        localStorage.removeItem('currentSessionId');
        localStorage.removeItem('currentAnonymousSession');
        setCurrentSession(null);
        setSessions([]);
        return;
      }
      
      // For authenticated users, check if we have a stored session (from before refresh)
      const storedSessionId = localStorage.getItem('currentSessionId');
      console.log('[SessionContext] Checking for stored session ID:', storedSessionId);
      
      if (storedSessionId && !storedSessionId.startsWith('anon-')) {
        // Try to load the stored session (this is a refresh scenario)
        console.log('[SessionContext] Found stored session, attempting to load:', storedSessionId);
        try {
          await loadSession(storedSessionId);
          console.log('[SessionContext] Successfully loaded stored session');
          return; // Exit early, we have a session
        } catch (error) {
          console.error('[SessionContext] Failed to load stored session:', error);
          // Clear the invalid session ID
          localStorage.removeItem('currentSessionId');
        }
      } else if (storedSessionId && storedSessionId.startsWith('anon-')) {
        // Clear anonymous sessions for authenticated users
        console.log('[SessionContext] Clearing anonymous session for authenticated user');
        localStorage.removeItem('currentSessionId');
        localStorage.removeItem('currentAnonymousSession');
      }
      
      // Only clear session data if we're coming from a fresh login (no valid stored session)
      if (!storedSessionId) {
        console.log('[SessionContext] No stored session, clearing any stale data');
        localStorage.removeItem('chatHistory');
        localStorage.removeItem('userIdea');
        localStorage.removeItem('userAnswers');
        localStorage.removeItem('ideaMetadata');
      }
      
      // Ensure no current session is set if we couldn't load one
      setCurrentSession(null);
      
      // Load all sessions from database for authenticated user
      console.log('[SessionContext] Loading sessions from database...');
      await loadSessions();
    };
    
    initializeSession();
  }, []);

  // Auto-save functionality (debounced)
  useEffect(() => {
    if (!currentSession) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveCurrentSession();
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [currentSession, saveCurrentSession]);

  // Listen for user activity to trigger auto-save
  useEffect(() => {


    const handleActivity = () => {
      // Trigger auto-save debounce
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveCurrentSession();
      }, 5000);
    };

    // Listen for various activity events
    window.addEventListener('beforeunload', () => saveCurrentSession());
    window.addEventListener('storage', handleActivity);
    
    // Listen for custom events from chat components
    window.addEventListener('chat:activity', handleActivity);
    window.addEventListener('analysis:completed', handleActivity);

    return () => {
      window.removeEventListener('beforeunload', () => saveCurrentSession());
      window.removeEventListener('storage', handleActivity);
      window.removeEventListener('chat:activity', handleActivity);
      window.removeEventListener('analysis:completed', handleActivity);
    };
  }, [saveCurrentSession]);

  const contextValue: SessionContextType = {
    sessions,
    currentSession,
    loading,
    saving,
    autoSaveEnabled,
    setAutoSaveEnabled: (enabled: boolean) => {
      setAutoSaveEnabled(enabled);
      localStorage.setItem('autoSaveEnabled', enabled.toString());
    },
    loadSessions,
    createSession,
    loadSession,
    deleteSession,
    renameSession,
    duplicateSession,
    saveCurrentSession
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};