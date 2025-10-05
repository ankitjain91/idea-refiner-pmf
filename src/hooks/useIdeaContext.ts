import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { saveIdeaToLeaderboard, removeIdeaFromLeaderboard } from '@/utils/saveIdeaToLeaderboard';

const IDEA_KEY = 'appIdea';

interface IdeaData {
  summary: string;
  generatedAt: number;
}

export const useIdeaContext = () => {
  const [hasIdea, setHasIdea] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<string>('');
  const [version, setVersion] = useState(0); // Force re-render counter

  useEffect(() => {
    checkIdea();
    
    const handleIdeaChange = () => {
      console.log('[useIdeaContext] idea:changed event received');
      setVersion(v => v + 1); // Increment to force re-render
      checkIdea();
    };
    
    window.addEventListener('storage', handleIdeaChange);
    window.addEventListener('idea:changed', handleIdeaChange);
    
    return () => {
      window.removeEventListener('storage', handleIdeaChange);
      window.removeEventListener('idea:changed', handleIdeaChange);
    };
  }, []);

  const checkIdea = () => {
    const ideaData = getIdea();
    setHasIdea(!!ideaData);
    setCurrentIdea(ideaData || '');
  };

  const getIdea = (): string => {
    try {
      // 1) Preferred: AI-generated idea summary
      const stored = localStorage.getItem(IDEA_KEY);
      if (stored) {
        const data: IdeaData = JSON.parse(stored);
        if (data?.summary) return data.summary;
      }

      // 2) Fallback: sessionData persisted by the app (contains state.currentIdea)
      const sessionDataRaw = localStorage.getItem('sessionData');
      if (sessionDataRaw) {
        try {
          const session = JSON.parse(sessionDataRaw);
          const fromState = session?.state?.currentIdea || session?.currentIdea;
          if (typeof fromState === 'string' && fromState.trim().length > 0) {
            return fromState.trim();
          }
        } catch {}
      }

      // 3) Legacy keys fallback for backwards compatibility
      const legacyKeys = ['dashboardIdea', 'currentIdea', 'userIdea', 'ideaText'];
      for (const key of legacyKeys) {
        const val = localStorage.getItem(key);
        if (val && val.trim().length > 0) return val.trim();
      }

      return '';
    } catch {
      return '';
    }
  };

  const generateIdea = async (conversationHistory: any[]): Promise<string> => {
    console.log('[useIdeaContext] Generating idea from conversation');
    
    // Call Groq edge function to generate smart summary
    const { data, error } = await supabase.functions.invoke('groq-conversation-summary', {
      body: { messages: conversationHistory }
    });

    if (error) {
      console.error('[useIdeaContext] Groq summary error:', error);
      throw new Error('Failed to generate idea summary');
    }

    const summary = data.summary;
    console.log('[useIdeaContext] Idea summary generated:', summary.substring(0, 100));
    
    const ideaData: IdeaData = {
      summary,
      generatedAt: Date.now()
    };
    
    // Save to localStorage
    localStorage.setItem(IDEA_KEY, JSON.stringify(ideaData));
    console.log('[useIdeaContext] Idea saved to localStorage');
    
    // Save to database
    try {
      const pmfScore = parseInt(localStorage.getItem('pmfScore') || '0');
      const result = await saveIdeaToLeaderboard({
        idea: summary,
        refinedIdea: summary,
        pmfScore: pmfScore,
        category: 'Uncategorized',
        isPublic: true
      });
      console.log('[useIdeaContext] Idea saved to database:', result);
    } catch (dbError) {
      console.error('[useIdeaContext] Error saving to database:', dbError);
      // Don't fail the whole operation if DB save fails
    }
    
    // Cleanup old keys
    cleanupOldKeys();
    
    // Dispatch event
    console.log('[useIdeaContext] Dispatching idea:changed event');
    window.dispatchEvent(new Event('idea:changed'));
    
    checkIdea();
    return summary;
  };

  const updateIdea = (summary: string) => {
    const ideaData: IdeaData = {
      summary,
      generatedAt: Date.now()
    };
    
    localStorage.setItem(IDEA_KEY, JSON.stringify(ideaData));
    window.dispatchEvent(new Event('idea:changed'));
    checkIdea();
  };

  const clearIdea = async () => {
    console.log('[useIdeaContext] Clearing idea from system');
    
    // Get current idea before clearing
    const currentIdeaText = getIdea();
    
    // Remove from database if exists
    if (currentIdeaText && currentIdeaText.length > 0) {
      try {
        console.log('[useIdeaContext] Removing idea from database:', currentIdeaText.substring(0, 100));
        await removeIdeaFromLeaderboard(currentIdeaText);
        console.log('[useIdeaContext] Idea removed from database');
      } catch (dbError) {
        console.error('[useIdeaContext] Error removing from database:', dbError);
        // Don't fail the whole operation if DB remove fails
      }
    }
    
    // Clear localStorage
    localStorage.removeItem(IDEA_KEY);
    cleanupOldKeys();
    
    console.log('[useIdeaContext] Dispatching idea:changed event after clear');
    window.dispatchEvent(new Event('idea:changed'));
    checkIdea();
  };

  const cleanupOldKeys = () => {
    // Remove all old idea-related keys
    const oldKeys = [
      'dashboardIdea',
      'currentIdea',
      'userIdea',
      'ideaText',
      'pmfCurrentIdea',
      'ideaMetadata',
      'dashboardConversationHistory',
      'enhancedIdeaChatMessages',
      'chatHistory'
    ];
    
    oldKeys.forEach(key => localStorage.removeItem(key));
  };

  return {
    hasIdea,
    currentIdea,
    version, // Export version for components to detect changes
    getIdea,
    generateIdea,
    updateIdea,
    clearIdea
  };
};
