/**
 * Utility to clear all cache data from the application
 */

import { UnifiedResponseCache } from '@/lib/cache/unifiedResponseCache';

export async function clearAllCache(): Promise<void> {
  console.log('🧹 Starting complete cache cleanup...');
  
  try {
    // 1. Clear IndexedDB (UnifiedResponseCache)
    const cache = UnifiedResponseCache.getInstance();
    await cache.clearExpired(); // This clears expired entries
    
    // Clear all IndexedDB databases
    const databases = await indexedDB.databases?.() || [];
    for (const db of databases) {
      if (db.name) {
        await indexedDB.deleteDatabase(db.name);
        console.log(`✅ Cleared IndexedDB: ${db.name}`);
      }
    }
    
    // 2. Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      // Keep auth-related keys
      if (!key.includes('supabase') && !key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    console.log(`✅ Cleared ${localStorageKeys.length} localStorage items`);
    
    // 3. Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      // Keep auth-related keys
      if (!key.includes('supabase') && !key.includes('auth')) {
        sessionStorage.removeItem(key);
      }
    });
    console.log(`✅ Cleared ${sessionStorageKeys.length} sessionStorage items`);
    
    // 4. Clear specific app caches
    localStorage.removeItem('dashboardData');
    localStorage.removeItem('currentIdea');
    localStorage.removeItem('dashboardIdea');
    localStorage.removeItem('tileCache');
    localStorage.removeItem('apiResponseCache');
    localStorage.removeItem('groqCache');
    localStorage.removeItem('enrichmentCache');
    localStorage.removeItem('lastFetchTime');
    
    // 5. Clear session-specific caches
    sessionStorage.removeItem('dataHubCache');
    sessionStorage.removeItem('optimizedDataCache');
    sessionStorage.removeItem('tileDataCache');
    
    console.log('✅ Complete cache cleanup finished successfully');
    
    // Return success
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Error during cache cleanup:', error);
    throw error;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  indexedDB: { databases: string[], totalSize: string };
  localStorage: { items: number, keys: string[] };
  sessionStorage: { items: number, keys: string[] };
}> {
  const databases = await indexedDB.databases?.() || [];
  
  return {
    indexedDB: {
      databases: databases.map(db => db.name || 'unknown'),
      totalSize: 'N/A' // Size calculation would require iterating through all objects
    },
    localStorage: {
      items: localStorage.length,
      keys: Object.keys(localStorage)
    },
    sessionStorage: {
      items: sessionStorage.length,
      keys: Object.keys(sessionStorage)
    }
  };
}
