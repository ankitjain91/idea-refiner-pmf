/**
 * Cache Restoration Service
 * Synchronizes data between IndexedDB and localStorage on app mount
 */

import { UnifiedResponseCache } from '@/lib/cache/unifiedResponseCache';
import { IndexedDBManager } from '@/lib/indexeddb-manager';

export class CacheRestorationService {
  private static instance: CacheRestorationService;
  private cache: UnifiedResponseCache;
  private db: IndexedDBManager;

  private constructor() {
    this.cache = UnifiedResponseCache.getInstance();
    this.db = IndexedDBManager.getInstance();
  }

  static getInstance(): CacheRestorationService {
    if (!CacheRestorationService.instance) {
      CacheRestorationService.instance = new CacheRestorationService();
    }
    return CacheRestorationService.instance;
  }

  /**
   * Restore cache from IndexedDB and localStorage
   * Ensures data is available in both locations
   */
  async restore(): Promise<void> {
    console.log('[CacheRestoration] Starting cache restoration...');

    try {
      // Get stats from both caches
      const stats = await this.cache.getStats();
      const localStorageCount = this.countLocalStorageCacheItems();

      console.log('[CacheRestoration] Cache status:', {
        indexedDB: stats.valid,
        localStorage: localStorageCount
      });

      // If IndexedDB has data but localStorage is empty, export to localStorage
      if (stats.valid > 0 && localStorageCount === 0) {
        console.log('[CacheRestoration] Exporting IndexedDB data to localStorage...');
        await this.exportToLocalStorage();
      }

      // If localStorage has data but IndexedDB is empty, import to IndexedDB
      if (localStorageCount > 0 && stats.valid === 0) {
        console.log('[CacheRestoration] Importing localStorage data to IndexedDB...');
        await this.importFromLocalStorage();
      }

      console.log('[CacheRestoration] Cache restoration complete');
    } catch (error) {
      console.error('[CacheRestoration] Failed to restore cache:', error);
    }
  }

  /**
   * Export IndexedDB cache to localStorage as backup
   */
  private async exportToLocalStorage(): Promise<void> {
    try {
      const responses = await this.db.getAllResponses();
      let exported = 0;

      for (const response of responses) {
        // Only export non-expired responses
        if (response.expiresAt > Date.now()) {
          const key = `pmf.v2.cache.${response.source}:${response.idea.substring(0, 50).replace(/\s+/g, '_')}`;
          try {
            localStorage.setItem(key, JSON.stringify(response));
            exported++;
          } catch (e) {
            console.warn('[CacheRestoration] Failed to export to localStorage:', e);
            break; // Stop if localStorage is full
          }
        }
      }

      console.log(`[CacheRestoration] Exported ${exported} items to localStorage`);
    } catch (error) {
      console.error('[CacheRestoration] Export failed:', error);
    }
  }

  /**
   * Import localStorage cache to IndexedDB
   */
  private async importFromLocalStorage(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(k => k.startsWith('pmf.v2.cache.'));
      let imported = 0;

      for (const key of cacheKeys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const response = JSON.parse(data);
            // Only import non-expired responses
            if (response.expiresAt && response.expiresAt > Date.now()) {
              await this.db.storeResponse(response);
              imported++;
            }
          }
        } catch (e) {
          console.warn('[CacheRestoration] Failed to import from localStorage:', key, e);
        }
      }

      console.log(`[CacheRestoration] Imported ${imported} items to IndexedDB`);
    } catch (error) {
      console.error('[CacheRestoration] Import failed:', error);
    }
  }

  /**
   * Count cache items in localStorage
   */
  private countLocalStorageCacheItems(): number {
    const keys = Object.keys(localStorage);
    return keys.filter(k => k.startsWith('pmf.v2.')).length;
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const stats = await this.cache.getStats();
    const localStorageCount = this.countLocalStorageCacheItems();

    return {
      indexedDB: {
        total: stats.total,
        valid: stats.valid,
        expired: stats.expired
      },
      localStorage: {
        items: localStorageCount
      },
      synchronized: stats.valid > 0 && localStorageCount > 0
    };
  }
}
