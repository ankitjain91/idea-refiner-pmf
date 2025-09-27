import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LS_KEYS } from '@/lib/storage-keys';

interface SessionData {
  chatHistory: any[];
  currentIdea: string;
  analysisData: any;
  pmfScore?: number;
  analysisCompleted: boolean;
  lastActivity: string;
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
  
  // Core actions
  loadSessions: () => Promise<void>;
  createSession: (name: string) => Promise<void>;
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

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current session data from localStorage and component state
  const getCurrentSessionData = useCallback((): SessionData => {
    try {
      const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      const currentIdea = localStorage.getItem(LS_KEYS.userIdea) || '';
      const analysisCompleted = localStorage.getItem(LS_KEYS.analysisCompleted) === 'true';
      const pmfScore = parseInt(localStorage.getItem(LS_KEYS.pmfScore) || '0');
      const analysisData = JSON.parse(localStorage.getItem(LS_KEYS.ideaMetadata) || '{}');

      return {
        chatHistory,
        currentIdea,
        analysisData,
        pmfScore: isNaN(pmfScore) ? 0 : pmfScore,
        analysisCompleted,
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting current session data:', error);
      return {
        chatHistory: [],
        currentIdea: '',
        analysisData: {},
        pmfScore: 0,
        analysisCompleted: false,
        lastActivity: new Date().toISOString()
      };
    }
  }, []);

  // Load all sessions for current user
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSessions([]);
        return;
      }

      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mappedSessions: BrainstormingSession[] = (data || []).map((session: any) => ({
        id: session.id,
        name: session.name,
        data: session.state || {
          chatHistory: [],
          currentIdea: '',
          analysisData: {},
          pmfScore: 0,
          analysisCompleted: false,
          lastActivity: session.updated_at
        },
        created_at: session.created_at,
        updated_at: session.updated_at,
        user_id: session.user_id,
        is_anonymous: false // Non-anonymous since they're saved to DB with user_id
      }));

      setSessions(mappedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new session - always requires authentication and name
  const createSession = useCallback(async (name: string) => {
    if (!name || !name.trim()) {
      throw new Error('Session name is required');
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Must be logged in to create sessions');
      }

      const sessionData = getCurrentSessionData();
      
      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .insert({
          user_id: user?.id || '',
          name: name,
          state: sessionData as any
        })
        .select()
        .single();

      if (error) throw error;

      const newSession: BrainstormingSession = {
        id: data.id,
        name: data.name.trim(),
        data: sessionData,
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


      // Restore session data to localStorage
      localStorage.setItem('chatHistory', JSON.stringify(session.data.chatHistory));
      localStorage.setItem(LS_KEYS.userIdea, session.data.currentIdea);
      localStorage.setItem(LS_KEYS.pmfScore, String(session.data.pmfScore || 0));
      localStorage.setItem(LS_KEYS.analysisCompleted, session.data.analysisCompleted ? 'true' : 'false');
      localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(session.data.analysisData));
      localStorage.setItem('currentSessionId', sessionId);

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

  // Save current session data (auto-save for non-anonymous sessions)
  const saveCurrentSession = useCallback(async () => {
    if (!currentSession || saving) return;

    setSaving(true);
    try {
      const sessionData = getCurrentSessionData();
      
      await supabase
        .from('brainstorming_sessions')
        .update({
          state: sessionData as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      // Update local session data
      setCurrentSession(prev => prev ? {
        ...prev,
        data: sessionData,
        updated_at: new Date().toISOString()
      } : null);

    } catch (error) {
      console.error('Error saving session:', error);
    } finally {
      setSaving(false);
    }
  }, [currentSession, saving, getCurrentSessionData]);

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