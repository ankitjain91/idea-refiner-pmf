/**
 * Simple hook for locked idea - SINGLE SOURCE OF TRUTH
 * 
 * This hook wraps the LockedIdeaManager and provides the ONLY way
 * to access/modify the idea across the entire app.
 * 
 * All dashboard tiles, analysis, and features should use THIS hook only.
 */

import { useLockedIdea as useLockedIdeaManager } from '@/lib/lockedIdeaManager';
import { useState, useEffect } from 'react';

export function useLockedIdea() {
  const manager = useLockedIdeaManager();
  
  // Also check for unlocked currentIdea from chat
  const [currentIdea, setCurrentIdea] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('currentIdea') || '';
  });
  
  // Listen for idea changes from chat
  useEffect(() => {
    const handleIdeaChange = (e: CustomEvent) => {
      if (e.detail?.idea) {
        setCurrentIdea(e.detail.idea);
      }
    };
    
    window.addEventListener('idea:changed', handleIdeaChange as EventListener);
    return () => {
      window.removeEventListener('idea:changed', handleIdeaChange as EventListener);
    };
  }, []);
  
  // Use locked idea if available, otherwise use current idea from chat
  const activeIdea = manager.lockedIdea || currentIdea;
  
  return {
    // The active idea (locked or current from chat)
    idea: activeIdea,
    hasIdea: !!activeIdea && activeIdea.length >= 20,
    
    // Locked idea specifically
    lockedIdea: manager.lockedIdea,
    isLocked: !!manager.lockedIdea,
    
    // Current idea from chat (not locked)
    currentIdea: currentIdea,
    
    // Lock/unlock actions
    lockIdea: manager.setLockedIdea,
    unlockIdea: manager.clearLockedIdea,
    
    // Pin status
    isPinned: manager.isPinned,
    setPinned: manager.setPinned,
  };
}
