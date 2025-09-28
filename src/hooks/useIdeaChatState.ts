import { useState, useEffect } from 'react';
import { LS_KEYS } from '@/lib/storage-keys';

export type ChatMode = 'idea' | 'refine' | 'analysis';
export type ResponseMode = 'summary' | 'verbose';

export function useIdeaChatState() {
  const [chatMode, setChatMode] = useState<ChatMode>('idea');
  const [responseMode, setResponseMode] = useState<ResponseMode>(() => {
    try {
      return (localStorage.getItem('responseMode') as ResponseMode) || 'verbose';
    } catch {
      return 'verbose';
    }
  });
  
  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(() => {
    try { 
      return localStorage.getItem(LS_KEYS.analysisCompleted) === 'true'; 
    } catch { 
      return false; 
    }
  });
  
  // Listen for chat mode changes dispatched from Chat component
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.mode) setChatMode(detail.mode);
    };
    window.addEventListener('chat:mode', handler as any);
    return () => window.removeEventListener('chat:mode', handler as any);
  }, []);
  
  // Listen for response mode changes from chat component
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.mode) {
        setResponseMode(detail.mode);
        try {
          localStorage.setItem('responseMode', detail.mode);
        } catch {}
      }
    };
    window.addEventListener('responseMode:changed', handler as any);
    return () => window.removeEventListener('responseMode:changed', handler as any);
  }, []);
  
  // Listen for analysis completion (custom event + storage changes)
  useEffect(() => {
    const handleAnalysisComplete = () => {
      try { 
        if (localStorage.getItem(LS_KEYS.analysisCompleted) === 'true') {
          setAnalysisCompleted(true);
        }
      } catch {}
    };
    window.addEventListener('analysis:completed', handleAnalysisComplete as any);
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LS_KEYS.analysisCompleted) {
        handleAnalysisComplete();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('analysis:completed', handleAnalysisComplete as any);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
  
  const toggleResponseMode = () => {
    const newMode = responseMode === 'summary' ? 'verbose' : 'summary';
    setResponseMode(newMode);
    localStorage.setItem('responseMode', newMode);
    window.dispatchEvent(new CustomEvent('responseMode:changed', { detail: { mode: newMode } }));
  };
  
  return {
    chatMode,
    setChatMode,
    responseMode,
    setResponseMode,
    toggleResponseMode,
    analysisCompleted,
    setAnalysisCompleted
  };
}