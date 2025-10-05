/**
 * Centralized Idea Manager
 * 
 * This ensures all tiles, components, and services use the EXACT same idea text
 * from the canonical source (Generate My Idea button's appIdea).
 */

const CANONICAL_IDEA_KEY = 'appIdea';

interface IdeaData {
  summary: string;
  generatedAt: number;
}

export class IdeaManager {
  private static instance: IdeaManager;
  private currentIdea: string = '';
  private listeners: Set<(idea: string) => void> = new Set();

  private constructor() {
    this.loadIdea();
    
    // Listen for storage changes
    window.addEventListener('storage', this.handleStorageChange);
    window.addEventListener('idea:changed', this.handleIdeaChange);
  }

  static getInstance(): IdeaManager {
    if (!IdeaManager.instance) {
      IdeaManager.instance = new IdeaManager();
    }
    return IdeaManager.instance;
  }

  private handleStorageChange = () => {
    this.loadIdea();
  };

  private handleIdeaChange = () => {
    this.loadIdea();
  };

  private loadIdea() {
    const idea = this.getCanonicalIdea();
    if (idea !== this.currentIdea) {
      this.currentIdea = idea;
      this.notifyListeners();
    }
  }

  /**
   * Get the canonical idea from the Generate My Idea button
   * This is the single source of truth for the entire application
   */
  getCanonicalIdea(): string {
    try {
      // Priority 1: appIdea from Generate My Idea button
      const appIdeaRaw = localStorage.getItem(CANONICAL_IDEA_KEY);
      if (appIdeaRaw) {
        const appIdeaData: IdeaData = JSON.parse(appIdeaRaw);
        if (appIdeaData.summary) {
          return appIdeaData.summary.trim();
        }
      }
    } catch (e) {
      console.error('[IdeaManager] Error parsing canonical idea:', e);
    }

    // Priority 2: Fallback to legacy keys (for backwards compatibility)
    const fallbackKeys = [
      'pmfCurrentIdea',
      'dashboardIdea',
      'currentIdea',
      'userIdea'
    ];

    for (const key of fallbackKeys) {
      const value = localStorage.getItem(key);
      if (value && value.trim()) {
        console.warn(`[IdeaManager] Using fallback key: ${key}. Consider using Generate My Idea button.`);
        return value.trim();
      }
    }

    return '';
  }

  /**
   * Get current idea (cached version)
   */
  getCurrentIdea(): string {
    return this.currentIdea || this.getCanonicalIdea();
  }

  /**
   * Subscribe to idea changes
   */
  subscribe(listener: (idea: string) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current idea
    listener(this.currentIdea);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentIdea);
      } catch (e) {
        console.error('[IdeaManager] Error in listener:', e);
      }
    });
  }

  /**
   * Clean up old/deprecated keys
   */
  cleanupOldKeys() {
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
    
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`[IdeaManager] Cleaning up old key: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Convenience hook-like function to get the canonical idea
 * Use this everywhere instead of reading from localStorage directly
 */
export function getCanonicalIdea(): string {
  return IdeaManager.getInstance().getCanonicalIdea();
}
