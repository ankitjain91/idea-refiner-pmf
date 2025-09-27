import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LS_KEYS } from '@/lib/storage-keys';
import { useAlerts } from '@/contexts/AlertContext';

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
  renameSession: (sessionId: string, name: string) => Promise<void>;
  duplicateSession: (sessionId: string) => Promise<void>;
  saveCurrentState: () => Promise<void>;
  logActivity: (activity: any) => void;
  isSaving: boolean;
  lastSavedAt: Date | null;
  sessionLoadAttempt: number; // 0 = initial, >0 = retries
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
  const interactionSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSerializedStateRef = useRef<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [sessionLoadAttempt, setSessionLoadAttempt] = useState(0);
  const { addAlert } = useAlerts(); // Will only use for error cases now (silent success UX)
  const renamingRef = useRef(false);
  const duplicatingRef = useRef(false);

  // Load all sessions for the current user with simple exponential backoff on transient/network errors
  const loadSessions = useCallback(async (attempt: number = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false });

      if (error) throw error;

      const mappedSessions = (data || []).map((session: any) => ({
        ...session,
        state: session.state || {},
        activity_log: Array.isArray(session.activity_log) ? session.activity_log : []
      }));
      setSessions(mappedSessions);
      if (attempt !== 0) setSessionLoadAttempt(0); // reset on success
    } catch (error: any) {
      const maxRetries = 4; // total attempts = maxRetries + 1
      const transient = typeof error?.message === 'string' && /fetch|network|timeout|503|502|504/i.test(error.message);
      if (attempt < maxRetries && transient) {
        const base = Math.min(8000, 500 * Math.pow(2, attempt));
        const jitterFactor = 0.7 + Math.random() * 0.6; // 0.7x - 1.3x
        const delay = Math.floor(base * jitterFactor);
        const nextAttempt = attempt + 1;
        setSessionLoadAttempt(nextAttempt); // track for UI
        console.warn(`loadSessions transient failure – retrying in ${delay}ms (attempt ${nextAttempt}/${maxRetries + 1})`);
        setTimeout(() => loadSessions(nextAttempt), delay);
      } else {
        console.error('Error loading sessions (final):', error);
      }
    }
  }, []);

  // Create a new session
  const createSession = async (context?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addAlert({ variant: 'error', title: 'Not authenticated', message: 'You must be logged in to create sessions', scope: 'session' });
        return;
      }

      // Prevent duplicate first-session race across mounts/tabs
      const flagKey = 'sessionCreateInProgress';
      try {
        const existingFlag = localStorage.getItem(flagKey);
        if (!currentSession && sessions.length === 0 && existingFlag) {
          // Another create in flight – abort silently
          return;
        }
        localStorage.setItem(flagKey, Date.now().toString());
      } catch {}

      // Initial provisional session name (context snippet or generic)
      const provisional = (context || 'Session').split(/\s+/).slice(0,2).join(' ');
      const sessionName = provisional || 'Session';

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
  try { localStorage.setItem('currentSessionId', mappedSession.id); } catch {}
      await loadSessions();
      // If we have richer context, attempt async upgrade to AI-generated two-word title
      if (context && context.length > 5) {
        try {
          const { data: titleData } = await supabase.functions.invoke('generate-session-title', { body: { idea: context } });
          if (titleData?.title) {
            await supabase.from('brainstorming_sessions').update({ name: titleData.title }).eq('id', mappedSession.id);
            setCurrentSession(prev => prev ? { ...prev, name: titleData.title } : prev);
          }
        } catch (e) {
          console.warn('AI title upgrade failed', e);
        }
      }
      
      // Silent success – no alert
    } catch (error) {
      console.error('Error creating session:', error);
      addAlert({ variant: 'error', title: 'Create failed', message: 'Failed to create session', scope: 'session' });
    } finally {
      try { localStorage.removeItem('sessionCreateInProgress'); } catch {}
      setLoading(false);
    }
  };

  // Load a specific session
  const loadSession = async (sessionId: string) => {
    setLoading(true);
  // Removed loading status announcement
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
  try { localStorage.setItem('currentSessionId', mappedSession.id); } catch {}
      
      // Restore session state
      const sessionState = mappedSession.state as any;
      if (sessionState) {
        // Determine desired path: always prefer dashboard for resumed sessions to show chat immediately
        const allowedPersistPaths = ['/dashboard'];
        const candidate = sessionState.currentPath;
        const desired = allowedPersistPaths.includes(candidate) ? candidate : '/dashboard';
        try { localStorage.setItem('sessionDesiredPath', desired); } catch {}
        // Restore scroll position after React layout paint
        if (sessionState.scrollPosition) {
          requestAnimationFrame(() => {
            window.scrollTo(0, sessionState.scrollPosition);
          });
        }
        // Rehydrate chat history into localStorage so Chat component can pick it up
        if (Array.isArray(sessionState.chatHistory)) {
          try {
            localStorage.setItem('chatHistory', JSON.stringify(sessionState.chatHistory));
          } catch {}
        }
        if (sessionState.ideaData?.idea) {
          localStorage.setItem('userIdea', sessionState.ideaData.idea);
        }
        // Restore richer idea + analysis state
        try {
          if (sessionState.ideaData?.answers) {
            localStorage.setItem('userAnswers', JSON.stringify(sessionState.ideaData.answers));
          }
          if (sessionState.ideaData?.refinements) {
            localStorage.setItem('userRefinements', JSON.stringify(sessionState.ideaData.refinements));
          }
          if (typeof sessionState.ideaData?.pmfScore !== 'undefined') {
            localStorage.setItem('pmfScore', String(sessionState.ideaData.pmfScore || 0));
          }
          if (sessionState.ideaData?.analysisCompleted) {
            localStorage.setItem(LS_KEYS.analysisCompleted, 'true');
          }
          if (sessionState.analysisData?.metadata) {
            localStorage.setItem('ideaMetadata', JSON.stringify(sessionState.analysisData.metadata));
          }
          if (sessionState.analysisData?.features) {
            localStorage.setItem('pmfFeatures', JSON.stringify(sessionState.analysisData.features));
          }
          if (sessionState.analysisData?.tabHistory) {
            localStorage.setItem('pmfTabHistory', JSON.stringify(sessionState.analysisData.tabHistory));
          }
        } catch (e) {
          console.warn('Failed to restore full analysis state', e);
        }
      }

      // Optionally regenerate a richer composite title if current name is very short or generic
      try {
        const currentName = mappedSession.name || '';
        const tooGeneric = currentName.length < 5 || ['session','ideas','concept','vision','analysis'].includes(currentName.toLowerCase());
        if (tooGeneric && (sessionState?.chatHistory?.length || 0) > 0) {
          const transcript = (sessionState.chatHistory as any[]).slice(-25).map(m => `${m.type === 'user' ? 'User' : 'Bot'}: ${m.content}`).join('\n');
          const { data: compData } = await supabase.functions.invoke('generate-session-composite-name', { body: { transcript } });
          if (compData?.title) {
            await supabase.from('brainstorming_sessions').update({ name: compData.title }).eq('id', mappedSession.id);
            setCurrentSession(prev => prev ? { ...prev, name: compData.title } : prev);
          }
        }
      } catch (e) {
        console.warn('Composite session name generation failed', e);
      }

      // Update last accessed
      await supabase
        .from('brainstorming_sessions')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', sessionId);

      // Silent load – no alert
    } catch (error) {
      console.error('Error loading session:', error);
      addAlert({ variant: 'error', title: 'Load failed', message: 'Failed to load session', scope: 'session' });
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
        try { localStorage.removeItem('currentSessionId'); } catch {}
      }
      
      await loadSessions();
      
      // Silent delete – no alert
    } catch (error) {
      console.error('Error deleting session:', error);
      addAlert({ variant: 'error', title: 'Delete failed', message: 'Failed to delete session', scope: 'session' });
    }
  };

  // Rename session
  const renameSession = async (sessionId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (renamingRef.current) return;
    renamingRef.current = true;
    try {
      const { error } = await supabase
        .from('brainstorming_sessions')
        .update({ name: trimmed, last_accessed: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, name: trimmed } : s));
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, name: trimmed } : prev);
      }
  // Silent rename
    } catch (e) {
      console.error('Rename failed', e);
  addAlert({ variant: 'error', title: 'Rename failed', message: 'Could not rename session', scope: 'session' });
    } finally {
      renamingRef.current = false;
    }
  };

  // Duplicate session
  const duplicateSession = async (sessionId: string) => {
    if (duplicatingRef.current) return;
    duplicatingRef.current = true;
    try {
      const base = sessions.find(s => s.id === sessionId);
      if (!base) return;
      const baseName = base.name || 'Session';
      let candidate = `${baseName} Copy`;
      let i = 2;
      const names = new Set(sessions.map(s => s.name));
      while (names.has(candidate) && i < 50) candidate = `${baseName} Copy ${i++}`;
      const { data, error } = await supabase
        .from('brainstorming_sessions')
        .insert({
          user_id: base.user_id,
          name: candidate,
          state: base.state,
          activity_log: base.activity_log || [],
        })
        .select()
        .single();
      if (error) throw error;
      const mapped = { ...data, state: data.state || {}, activity_log: Array.isArray(data.activity_log) ? data.activity_log : [] };
      setSessions(prev => [mapped, ...prev]);
      setCurrentSession(mapped);
      try { localStorage.setItem('currentSessionId', mapped.id); } catch {}
  // Silent duplicate
    } catch (e) {
      console.error('Duplicate failed', e);
  addAlert({ variant: 'error', title: 'Duplicate failed', message: 'Could not duplicate session', scope: 'session' });
    } finally {
      duplicatingRef.current = false;
    }
  };

  // Save current state
  const saveCurrentState = async (force: boolean = false) => {
    if (!currentSession) return;

    try {
      if (!isSaving) setIsSaving(true);
      // Gather richer state from localStorage (graceful fallbacks)
      const idea = localStorage.getItem('userIdea') || '';
      const answers = localStorage.getItem('userAnswers');
      const metadata = localStorage.getItem('ideaMetadata');
      const refinements = localStorage.getItem('userRefinements');
  const chatHistory = localStorage.getItem('chatHistory');
  const derivedPersonas = localStorage.getItem('pmf.derived.personas');
  const derivedPains = localStorage.getItem('pmf.derived.pains');
  const derivedKeywords = localStorage.getItem('pmf.derived.keywords');
  const derivedPricing = localStorage.getItem('pmf.derived.pricing');
      const pmfFeatures = localStorage.getItem('pmfFeatures');
      const pmfTabHistory = localStorage.getItem('pmfTabHistory');
  const analysisCompleted = localStorage.getItem(LS_KEYS.analysisCompleted) === 'true';
  const pmfScoreRaw = localStorage.getItem('pmfScore');
  const pmfScore = pmfScoreRaw ? parseInt(pmfScoreRaw) : 0;

      const parsedAnswers = answers ? JSON.parse(answers) : {};
      const parsedMetadata = metadata ? JSON.parse(metadata) : {};
      const parsedRefinements = refinements ? JSON.parse(refinements) : [];
      const parsedChat = chatHistory ? JSON.parse(chatHistory) : [];
      const parsedDerived = {
        personas: derivedPersonas ? JSON.parse(derivedPersonas) : [],
        pains: derivedPains ? JSON.parse(derivedPains) : [],
        keywords: derivedKeywords ? JSON.parse(derivedKeywords) : [],
        pricing: derivedPricing ? JSON.parse(derivedPricing) : null
      };
      const parsedFeatures = pmfFeatures ? JSON.parse(pmfFeatures) : [];
      const parsedTabHistory = pmfTabHistory ? JSON.parse(pmfTabHistory) : [];

      const currentState: SessionState = {
        currentPath: window.location.pathname,
        chatHistory: parsedChat,
        ideaData: {
          idea,
          answers: parsedAnswers,
          refinements: parsedRefinements,
          analysisCompleted,
          pmfScore,
        },
        analysisData: {
          metadata: parsedMetadata,
          features: parsedFeatures,
          tabHistory: parsedTabHistory,
          derived: parsedDerived,
          lastMessageAt: parsedChat.length ? parsedChat[parsedChat.length-1]?.timestamp : null
        },
        scrollPosition: window.scrollY,
        timestamp: new Date().toISOString(),
      };

      // Avoid redundant writes by comparing serialized state hash
      const serialized = JSON.stringify(currentState);
      if (!force && serialized === lastSerializedStateRef.current && activityBuffer.length === 0) {
        return; // No changes
      }
      lastSerializedStateRef.current = serialized;

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
      if (activityBuffer.length > 0) setActivityBuffer([]);
      setLastSavedAt(new Date());
  // Silence periodic session save announcement
    } catch (error) {
      console.error('Error saving session state:', error);
    }
    finally {
      // Slight delay to prevent flicker
      setTimeout(() => setIsSaving(false), 250);
    }
  };

  // Debounced interaction-based save
  useEffect(() => {
    if (!currentSession) return;

    const scheduleSave = () => {
      if (interactionSaveTimeout.current) clearTimeout(interactionSaveTimeout.current);
      interactionSaveTimeout.current = setTimeout(() => {
        saveCurrentState();
      }, 1500);
    };

    const events: (keyof DocumentEventMap)[] = ['click', 'keydown', 'input', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, scheduleSave, { passive: true }));
    return () => {
      events.forEach(evt => window.removeEventListener(evt, scheduleSave));
    };
  }, [currentSession, saveCurrentState]);

  // Log activity
  const logActivity = (activity: any) => {
    if (!currentSession) return;
    
    const activityEntry = {
      ...activity,
      timestamp: new Date().toISOString(),
    };
    
    setActivityBuffer(prev => [...prev, activityEntry]);
  };

  // Timed auto-save every 30 seconds as a safety net
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
  // One-time migration for legacy key -> namespaced key
  useEffect(() => {
    try {
      const legacy = localStorage.getItem('analysisCompleted');
      const namespaced = localStorage.getItem(LS_KEYS.analysisCompleted);
      if (legacy && !namespaced) {
        localStorage.setItem(LS_KEYS.analysisCompleted, legacy);
        localStorage.removeItem('analysisCompleted');
      }
    } catch {}
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Re-run session load when auth state changes (fix: sessions missing right after login)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadSessions();
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, [loadSessions]);

  // Only auto-create a first session when user has none; do NOT auto-load existing sessions (picker will handle)
  useEffect(() => {
    const maybeCreateInitial = async () => {
      if (!loading && sessions && sessions.length === 0 && !currentSession) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try { await createSession('My First Session'); } catch (e) { console.error('Initial session create failed', e); }
        }
      }
    };
    maybeCreateInitial();
  }, [sessions, currentSession, loading]);

  return (
    <SessionContext.Provider
      value={{
        sessions,
        currentSession,
        loading,
        createSession,
        loadSession,
        deleteSession,
        renameSession,
        duplicateSession,
        saveCurrentState,
        logActivity,
        isSaving,
        lastSavedAt,
        sessionLoadAttempt,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};