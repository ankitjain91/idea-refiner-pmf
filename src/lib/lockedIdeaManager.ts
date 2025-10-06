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

    // First check the primary storage key
    let idea = localStorage.getItem(LOCKED_IDEA_KEY);
    
    // If no idea found, check other known keys and migrate if found
    if (!idea || idea.trim().length === 0) {
      const alternateKeys = [
        'ideaSummaryName',
        'pmf.user.idea',
        'appIdea',
        'dashboardIdea',
        'currentIdea',
        'userIdea',
        'ideaText'
      ];

      for (const key of alternateKeys) {
        const altIdea = localStorage.getItem(key);
        if (altIdea && altIdea.trim().length > 0) {
          // Found an idea in alternate storage, migrate it
          idea = altIdea.trim();
          this.setLockedIdea(idea); // This will clean up old keys
          console.log(`[LockedIdeaManager] Migrated idea from ${key}:`, idea.slice(0, 50));
          break;
        }
      }
    }

    // Handle JSON stored ideas
    if (idea) {
      try {
        const parsed = JSON.parse(idea);
        if (parsed.summary) {
          idea = parsed.summary;
          this.setLockedIdea(idea); // Store as plain text
        }
      } catch {}
    }

    const finalIdea = idea || '';
    console.log('[LockedIdeaManager] Getting locked idea:', {
      exists: !!finalIdea,
      length: finalIdea.length,
      preview: finalIdea.slice(0, 50),
      isValid: finalIdea.trim().length >= 20
    });
    
    return finalIdea;
  }

  /**
   * Set the locked idea (only called by "Lock My Idea" button)
   */
  setLockedIdea(idea: string): void {
    if (typeof window === 'undefined') return;
    
    const trimmedIdea = idea.trim();
    if (trimmedIdea.length < 20) {
      console.warn('[LockedIdeaManager] Attempt to set invalid idea (too short):', trimmedIdea);
      return;
    }

    localStorage.setItem(LOCKED_IDEA_KEY, trimmedIdea);
    
    // Clean up all other idea keys to avoid confusion
    this.cleanupOldIdeaKeys();
    
    // Notify all listeners
    this.notifyListeners(trimmedIdea);
    
    console.log('[LockedIdeaManager] Idea locked:', trimmedIdea.slice(0, 50) + '...');
  }

  /**
   * Check if there's a valid locked idea
   */
  hasLockedIdea(): boolean {
    const idea = this.getLockedIdea();
    // Ensure idea exists and is substantial (more than just whitespace)
    return idea && idea.trim().length >= 20; // Minimum length for a meaningful idea
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
   * Check if conversation is pinned
   */
  isPinned(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const pinned = localStorage.getItem('conversation_pinned');
      return pinned === 'true';
    } catch (error) {
      console.error('[LockedIdeaManager] Error checking pinned status:', error);
      return false;
    }
  }

  /**
   * Set pinned status for conversation
   */
  setPinned(pinned: boolean): void {
    if (typeof window === 'undefined') return;
    
    try {
      if (pinned) {
        localStorage.setItem('conversation_pinned', 'true');
        console.log('[LockedIdeaManager] Conversation pinned');
      } else {
        localStorage.removeItem('conversation_pinned');
        console.log('[LockedIdeaManager] Conversation unpinned');
      }
    } catch (error) {
      console.error('[LockedIdeaManager] Error setting pinned status:', error);
    }
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
      'current_idea',
      'ideaSummaryName',
      'appIdea',
      'userIdea'
    ];

    let cleanupCount = 0;
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        cleanupCount++;
        console.log('[LockedIdeaManager] Cleaned up old key:', key);
      }
    });

    if (cleanupCount > 0) {
      console.log(`[LockedIdeaManager] Cleaned up ${cleanupCount} old idea keys`);
    }
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
      isPinned: this.isPinned(),
      listenerCount: this.listeners.size,
      allLocalStorageIdeas: {
        pmfCurrentIdea: localStorage.getItem('pmfCurrentIdea'),
        currentIdea: localStorage.getItem('currentIdea'),
        dashboardIdea: localStorage.getItem('dashboardIdea'),
        ideaText: localStorage.getItem('ideaText'),
        pinnedValue: localStorage.getItem('conversation_pinned')
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
  isPinned: boolean;
  setPinned: (pinned: boolean) => void;
} {
  const manager = LockedIdeaManager.getInstance();
  const [lockedIdea, setLockedIdeaState] = useState(manager.getLockedIdea());
  const [isPinned, setIsPinnedState] = useState(manager.isPinned());

  useEffect(() => {
    const unsubscribe = manager.subscribe(setLockedIdeaState);
    return unsubscribe;
  }, [manager]);

  // Poll for pinned status changes (since we don't have an event system for it yet)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPinnedState(manager.isPinned());
    }, 1000);
    return () => clearInterval(interval);
  }, [manager]);

  return {
    lockedIdea,
    hasLockedIdea: lockedIdea.length > 0,
    setLockedIdea: (idea: string) => manager.setLockedIdea(idea),
    clearLockedIdea: () => manager.clearLockedIdea(),
    isPinned,
    setPinned: (pinned: boolean) => manager.setPinned(pinned)
  };
}

// Export singleton instance for direct use
export const lockedIdeaManager = LockedIdeaManager.getInstance();