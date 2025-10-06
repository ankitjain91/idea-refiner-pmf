/**
 * Centralized Locked Idea Manager
 * 
 * This is the SINGLE SOURCE OF TRUTH for the locked idea across the dashboard.
 * Only the idea locked via "Lock My Idea" button should be used everywhere.
 */

const LOCKED_IDEA_KEY = 'pmfCurrentIdea';

export class LockedIdeaManager {
  private static instance: LockedIdeaManager;
  private listeners: Set<(idea: string) => void> = new Set();

  static getInstance(): LockedIdeaManager {
    if (!LockedIdeaManager.instance) {
      LockedIdeaManager.instance = new LockedIdeaManager();
    }
    return LockedIdeaManager.instance;
  }

  /**
   * Get the current locked idea - THE ONLY IDEA THAT SHOULD BE USED
   */
  getLockedIdea(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(LOCKED_IDEA_KEY) || '';
  }

  /**
   * Set the locked idea (only called by "Lock My Idea" button)
   */
  setLockedIdea(idea: string): void {
    if (typeof window === 'undefined') return;
    
    const trimmedIdea = idea.trim();
    localStorage.setItem(LOCKED_IDEA_KEY, trimmedIdea);
    
    // Clean up all other idea keys to avoid confusion
    this.cleanupOldIdeaKeys();
    
    // Notify all listeners
    this.notifyListeners(trimmedIdea);
    
    console.log('[LockedIdeaManager] Idea locked:', trimmedIdea.slice(0, 50) + '...');
  }

  /**
   * Check if there's a locked idea
   */
  hasLockedIdea(): boolean {
    return this.getLockedIdea().length > 0;
  }

  /**
   * Clear the locked idea (logout/reset)
   */
  clearLockedIdea(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(LOCKED_IDEA_KEY);
    this.cleanupOldIdeaKeys();
    this.notifyListeners('');
    
    console.log('[LockedIdeaManager] Idea cleared');
  }

  /**
   * Subscribe to idea changes
   */
  subscribe(callback: (idea: string) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Clean up all the old, inconsistent idea keys
   */
  private cleanupOldIdeaKeys(): void {
    if (typeof window === 'undefined') return;
    
    const keysToRemove = [
      'currentIdea',
      'dashboardIdea', 
      'ideaText',
      'pmf.user.idea',
      'current_idea' // Add any other keys you find
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log('[LockedIdeaManager] Cleaned up old key:', key);
      }
    });
  }

  /**
   * Notify all listeners of idea changes
   */
  private notifyListeners(idea: string): void {
    this.listeners.forEach(callback => {
      try {
        callback(idea);
      } catch (error) {
        console.error('[LockedIdeaManager] Error in listener:', error);
      }
    });
  }

  /**
   * Get debug info about current state
   */
  getDebugInfo(): object {
    if (typeof window === 'undefined') return {};
    
    return {
      lockedIdea: this.getLockedIdea(),
      hasLocked: this.hasLockedIdea(),
      listenerCount: this.listeners.size,
      allLocalStorageIdeas: {
        pmfCurrentIdea: localStorage.getItem('pmfCurrentIdea'),
        currentIdea: localStorage.getItem('currentIdea'),
        dashboardIdea: localStorage.getItem('dashboardIdea'),
        ideaText: localStorage.getItem('ideaText')
      }
    };
  }
}

// React hook for using locked idea
import { useState, useEffect } from 'react';

export function useLockedIdea(): {
  lockedIdea: string;
  hasLockedIdea: boolean;
  setLockedIdea: (idea: string) => void;
  clearLockedIdea: () => void;
} {
  const manager = LockedIdeaManager.getInstance();
  const [lockedIdea, setLockedIdeaState] = useState(manager.getLockedIdea());

  useEffect(() => {
    const unsubscribe = manager.subscribe(setLockedIdeaState);
    return unsubscribe;
  }, [manager]);

  return {
    lockedIdea,
    hasLockedIdea: lockedIdea.length > 0,
    setLockedIdea: (idea: string) => manager.setLockedIdea(idea),
    clearLockedIdea: () => manager.clearLockedIdea()
  };
}

// Export singleton instance for direct use
export const lockedIdeaManager = LockedIdeaManager.getInstance();