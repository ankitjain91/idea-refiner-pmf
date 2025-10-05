import { useState, useEffect } from 'react';
import { createConversationSummary } from '@/utils/conversationUtils';

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
      const stored = localStorage.getItem(IDEA_KEY);
      if (!stored) return '';
      
      const data: IdeaData = JSON.parse(stored);
      return data.summary || '';
    } catch {
      return '';
    }
  };

  const generateIdea = async (conversationHistory: any[]): Promise<string> => {
    const summary = createConversationSummary(conversationHistory);
    
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
