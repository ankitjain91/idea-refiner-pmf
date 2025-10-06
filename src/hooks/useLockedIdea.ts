/**
 * Simple hook for locked idea - SINGLE SOURCE OF TRUTH
 * 
 * This hook wraps the LockedIdeaManager and provides the ONLY way
 * to access/modify the idea across the entire app.
 * 
 * All dashboard tiles, analysis, and features should use THIS hook only.
 */

import { useLockedIdea as useLockedIdeaManager } from '@/lib/lockedIdeaManager';

export function useLockedIdea() {
  const manager = useLockedIdeaManager();
  
  return {
    // The one and only source of truth
    idea: manager.lockedIdea,
    hasIdea: manager.hasLockedIdea,
    
    // Lock/unlock actions
    lockIdea: manager.setLockedIdea,
    unlockIdea: manager.clearLockedIdea,
    
    // Pin status
    isPinned: manager.isPinned,
    setPinned: manager.setPinned,
  };
}
