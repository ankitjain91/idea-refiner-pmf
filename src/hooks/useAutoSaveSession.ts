import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from 'lodash';
import { LS_KEYS } from '@/lib/storage-keys';

interface SessionState {
  currentPath: string;
  chatHistory: any[];
  ideaData: any;
  analysisData: any;
  scrollPosition: number;
  formInputs: Record<string, any>;
  uiState: Record<string, any>;
  timestamp: string;
  [key: string]: any; // Allow additional properties for JSON compatibility
}

export const useAutoSaveSession = (sessionId: string | null) => {
  const stateRef = useRef<SessionState | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Collect current application state
  const captureState = useCallback((): SessionState => {
    const state: SessionState = {
      currentPath: window.location.pathname,
      chatHistory: [],
      ideaData: {
        idea: localStorage.getItem('userIdea') || '',
        answers: JSON.parse(localStorage.getItem('userAnswers') || '{}'),
        metadata: JSON.parse(localStorage.getItem('ideaMetadata') || '{}'),
        pmfScore: parseInt(localStorage.getItem('pmfScore') || '0'),
      },
      analysisData: {
  completed: localStorage.getItem(LS_KEYS.analysisCompleted) === 'true',
        results: JSON.parse(localStorage.getItem('analysisResults') || '{}'),
      },
      scrollPosition: window.scrollY,
      formInputs: {},
      uiState: {
        showAnalysisDashboard: localStorage.getItem('showAnalysisDashboard') === 'true',
        currentTab: localStorage.getItem('currentTab') || '',
      },
      timestamp: new Date().toISOString(),
    };

    // Capture form inputs
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input: any) => {
      if (input.name || input.id) {
        state.formInputs[input.name || input.id] = input.value;
      }
    });

    return state;
  }, []);

  // Save state to database
  const saveState = useCallback(async (immediate = false) => {
    if (!sessionId) return;

    try {
      const currentState = captureState();
      
      // Compare with previous state to avoid unnecessary saves
      if (!immediate && JSON.stringify(currentState) === JSON.stringify(stateRef.current)) {
        return;
      }

      stateRef.current = currentState;

      const { error } = await supabase
        .from('brainstorming_sessions')
        .update({
          state: currentState,
          last_accessed: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      console.log('Session auto-saved at', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error saving session state:', error);
    }
  }, [sessionId, captureState]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(() => saveState(), 1000),
    [saveState]
  );

  // Restore state from saved session
  const restoreState = useCallback(async (sessionData: any) => {
    if (!sessionData?.state) return;

    const state = sessionData.state;

    // Restore localStorage items
    if (state.ideaData) {
      localStorage.setItem('userIdea', state.ideaData.idea || '');
      localStorage.setItem('userAnswers', JSON.stringify(state.ideaData.answers || {}));
      localStorage.setItem('ideaMetadata', JSON.stringify(state.ideaData.metadata || {}));
      localStorage.setItem('pmfScore', String(state.ideaData.pmfScore || 0));
    }

    if (state.analysisData) {
  localStorage.setItem(LS_KEYS.analysisCompleted, String(state.analysisData.completed || false));
      localStorage.setItem('analysisResults', JSON.stringify(state.analysisData.results || {}));
    }

    if (state.uiState) {
      localStorage.setItem('showAnalysisDashboard', String(state.uiState.showAnalysisDashboard || false));
      localStorage.setItem('currentTab', state.uiState.currentTab || '');
    }

    // Restore form inputs after a short delay
    setTimeout(() => {
      if (state.formInputs) {
        Object.entries(state.formInputs).forEach(([key, value]) => {
          const input = document.querySelector(`[name="${key}"], [id="${key}"]`) as any;
          if (input) {
            input.value = value;
          }
        });
      }

      // Restore scroll position
      if (state.scrollPosition) {
        window.scrollTo(0, state.scrollPosition);
      }
    }, 100);

    // Replaced toast with accessible status announcement only
    try { window.dispatchEvent(new CustomEvent('status:announce', { detail: 'Session state restored' })); } catch {}
  }, []);

  // Set up event listeners for auto-save
  useEffect(() => {
    if (!sessionId) return;

    // Track all user interactions
    const events = [
      'click',
      'input',
      'change',
      'keyup',
      'scroll',
      'focus',
      'blur'
    ];

    const handleInteraction = (event: Event) => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // For input events, save immediately
      if (event.type === 'input' || event.type === 'change') {
        debouncedSave();
      } else {
        // For other events, save after a short delay
        saveTimeoutRef.current = setTimeout(() => {
          saveState();
        }, 2000);
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, true);
    });

    // Save on visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveState(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Save before unload
    const handleBeforeUnload = () => {
      saveState(true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Auto-save every 30 seconds as backup
    const interval = setInterval(() => {
      saveState();
    }, 30000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [sessionId, saveState, debouncedSave]);

  return {
    saveState,
    restoreState,
    captureState,
  };
};