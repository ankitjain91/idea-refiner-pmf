import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionState {
  currentPath: string;
  chatHistory: any[];
  ideaData: any;
  analysisData: any;
  scrollPosition: number;
  timestamp: string;
  [key: string]: any; // Allow additional properties for JSON compatibility
}

interface BrainstormingSession {
  id: string;
  name: string;
  state: SessionState | any; // Allow JSON type
  activity_log: any[];
  last_accessed: string;
  created_at: string;
  user_id?: string;
}

interface SessionContextType {
  sessions: BrainstormingSession[];
  currentSession: BrainstormingSession | null;
  loading: boolean;
  createSession: (context?: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  saveCurrentState: () => Promise<void>;
  logActivity: (activity: any) => void;
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
  const [activityBuffer, setActivityBuffer] = useState<any[]>([]);
  const { toast } = useToast();

  // Load all sessions for the current user
  const loadSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false });

      if (error) throw error;
      
      // Map the data to match our interface
      const mappedSessions = (data || []).map((session: any) => ({
        ...session,
        state: session.state || {},
        activity_log: Array.isArray(session.activity_log) ? session.activity_log : []
      }));
      
      setSessions(mappedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, []);

  // Create a new session
  const createSession = async (context?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to create sessions',
          variant: 'destructive',
        });
        return;
      }

      // Generate session name using edge function
      const { data: nameData, error: nameError } = await supabase.functions.invoke(
        'generate-session-name',
        {
          body: { context: context || 'Brainstorming session' }
        }
      );

      const sessionName = nameData?.name || 'Session';

      // Capture current state
      const currentState: SessionState = {
        currentPath: window.location.pathname,
        chatHistory: [],
        ideaData: {},
        analysisData: {},
        scrollPosition: window.scrollY,
        timestamp: new Date().toISOString(),
      };

      // Create session in database
      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .insert({
          user_id: user.id,
          name: sessionName,
          state: currentState,
          activity_log: [],
        })
        .select()
        .single();

      if (error) throw error;

      // Map the data to match our interface
      const mappedSession = {
        ...data,
        state: data.state || {},
        activity_log: Array.isArray(data.activity_log) ? data.activity_log : []
      };

      setCurrentSession(mappedSession);
      await loadSessions();
      
      toast({
        title: 'Session Created',
        description: `New session "${sessionName}" has been created`,
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load a specific session
  const loadSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      // Map the data to match our interface
      const mappedSession = {
        ...data,
        state: data.state || {},
        activity_log: Array.isArray(data.activity_log) ? data.activity_log : []
      };

      setCurrentSession(mappedSession);
      
      // Restore session state
      const sessionState = mappedSession.state as any;
      if (sessionState) {
        // Navigate to saved path
        if (sessionState.currentPath) {
          window.location.pathname = sessionState.currentPath;
        }
        
        // Restore scroll position
        if (sessionState.scrollPosition) {
          setTimeout(() => {
            window.scrollTo(0, sessionState.scrollPosition);
          }, 100);
        }
      }

      // Update last accessed
      await supabase
        .from('brainstorming_sessions')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', sessionId);

      toast({
        title: 'Session Loaded',
        description: `Resumed session "${mappedSession.name}"`,
      });
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: 'Error',
        description: 'Failed to load session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('brainstorming_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      
      await loadSessions();
      
      toast({
        title: 'Session Deleted',
        description: 'The session has been removed',
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
    }
  };

  // Save current state
  const saveCurrentState = async () => {
    if (!currentSession) return;

    try {
      const currentState: SessionState = {
        currentPath: window.location.pathname,
        chatHistory: [],
        ideaData: {},
        analysisData: {},
        scrollPosition: window.scrollY,
        timestamp: new Date().toISOString(),
      };

      // Merge activity buffer into activity log
      const updatedActivityLog = [...(currentSession.activity_log || []), ...activityBuffer];

      const { error } = await supabase
        .from('brainstorming_sessions')
        .update({
          state: currentState,
          activity_log: updatedActivityLog,
          last_accessed: new Date().toISOString(),
        })
        .eq('id', currentSession.id);

      if (error) throw error;
      
      // Clear activity buffer after successful save
      setActivityBuffer([]);
    } catch (error) {
      console.error('Error saving session state:', error);
    }
  };

  // Log activity
  const logActivity = (activity: any) => {
    if (!currentSession) return;
    
    const activityEntry = {
      ...activity,
      timestamp: new Date().toISOString(),
    };
    
    setActivityBuffer(prev => [...prev, activityEntry]);
  };

  // Auto-save every 30 seconds if there's an active session
  useEffect(() => {
    if (!currentSession) return;

    const interval = setInterval(() => {
      saveCurrentState();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentSession, activityBuffer]);

  // Save state when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSession) {
        saveCurrentState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSession]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <SessionContext.Provider
      value={{
        sessions,
        currentSession,
        loading,
        createSession,
        loadSession,
        deleteSession,
        saveCurrentState,
        logActivity,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};