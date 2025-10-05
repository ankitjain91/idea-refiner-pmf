import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const IDEA_KEY = 'appIdea';

interface IdeaData {
  summary: string;
  generatedAt: number;
}

export const useIdeaContext = () => {
  const [hasIdea, setHasIdea] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<string>('');

  useEffect(() => {
    checkIdea();
    
    window.addEventListener('storage', checkIdea);
    window.addEventListener('idea:changed', checkIdea);
    
    return () => {
      window.removeEventListener('storage', checkIdea);
      window.removeEventListener('idea:changed', checkIdea);
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
    // Call Groq edge function to generate smart summary
    const { data, error } = await supabase.functions.invoke('groq-conversation-summary', {
      body: { messages: conversationHistory }
    });

    if (error) {
      console.error('[useIdeaContext] Groq summary error:', error);
      throw new Error('Failed to generate idea summary');
    }

    const summary = data.summary;
    
    const ideaData: IdeaData = {
      summary,
      generatedAt: Date.now()
    };
    
    localStorage.setItem(IDEA_KEY, JSON.stringify(ideaData));
    
    // Cleanup old keys
    cleanupOldKeys();
    
    // Dispatch event
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

  const clearIdea = () => {
    localStorage.removeItem(IDEA_KEY);
    cleanupOldKeys();
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
    getIdea,
    generateIdea,
    updateIdea,
    clearIdea
  };
};
