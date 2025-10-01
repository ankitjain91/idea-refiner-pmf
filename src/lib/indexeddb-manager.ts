import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CachedApiResponse {
  id: string;
  idea: string;
  source: string;
  endpoint: string;
  rawResponse: any;
  timestamp: number;
  expiresAt: number;
  metadata: {
    searchQuery?: string;
    filters?: any;
    extractedTopics?: string[];
    confidence?: number;
    relatedIdeas?: string[];
  };
  extractedInsights?: {
    sentiment?: any;
    marketSize?: any;
    competitors?: any;
    trends?: any;
    engagement?: any;
    financial?: any;
  };
}

interface ExtractedInsight {
  id: string;
  idea: string;
  tileType: string;
  data: any;
  sourceResponseIds: string[];
  timestamp: number;
  confidence: number;
}

interface CacheMetadata {
  id: string;
  key: string;
  value: any;
}

interface PMFCacheSchema extends DBSchema {
  responses: {
    key: string;
    value: CachedApiResponse;
    indexes: {
      'by-idea': string;
      'by-source': string;
      'by-timestamp': number;
      'by-expires': number;
    };
  };
  insights: {
    key: string;
    value: ExtractedInsight;
    indexes: {
      'by-idea': string;
      'by-tile': string;
      'by-timestamp': number;
    };
  };
  metadata: {
    key: string;
    value: CacheMetadata;
  };
}

export class IndexedDBManager {
  private static instance: IndexedDBManager;
  private db: IDBPDatabase<PMFCacheSchema> | null = null;
  private readonly DB_NAME = 'PMFAnalysisCache';
  private readonly DB_VERSION = 1;
  
  private constructor() {
    this.initDB();
  }
  
  static getInstance(): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager();
    }
    return IndexedDBManager.instance;
  }
  
  private async initDB() {
    try {
      this.db = await openDB<PMFCacheSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create responses store
          if (!db.objectStoreNames.contains('responses')) {
            const responseStore = db.createObjectStore('responses', { keyPath: 'id' });
            responseStore.createIndex('by-idea', 'idea', { unique: false });
            responseStore.createIndex('by-source', 'source', { unique: false });
            responseStore.createIndex('by-timestamp', 'timestamp', { unique: false });
            responseStore.createIndex('by-expires', 'expiresAt', { unique: false });
          }
          
          // Create insights store
          if (!db.objectStoreNames.contains('insights')) {
            const insightStore = db.createObjectStore('insights', { keyPath: 'id' });
            insightStore.createIndex('by-idea', 'idea', { unique: false });
            insightStore.createIndex('by-tile', 'tileType', { unique: false });
            insightStore.createIndex('by-timestamp', 'timestamp', { unique: false });
          }
          
          // Create metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'id' });
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      // Fallback to in-memory only mode
    }
  }
  
  private async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('IndexedDB not available');
    }
  }
  
  // Response operations
  async storeResponse(response: CachedApiResponse): Promise<void> {
    await this.ensureDB();
    const tx = this.db!.transaction('responses', 'readwrite');
    await tx.objectStore('responses').put(response);
    await tx.done;
  }
  
  async getResponse(id: string): Promise<CachedApiResponse | undefined> {
    await this.ensureDB();
    return await this.db!.get('responses', id);
  }
  
  async getResponsesByIdea(idea: string): Promise<CachedApiResponse[]> {
    await this.ensureDB();
    const index = this.db!.transaction('responses').store.index('by-idea');
    return await index.getAll(idea);
  }
  
  async getResponsesBySource(source: string): Promise<CachedApiResponse[]> {
    await this.ensureDB();
    const index = this.db!.transaction('responses').store.index('by-source');
    return await index.getAll(source);
  }
  
  async getRecentResponses(limit: number): Promise<CachedApiResponse[]> {
    await this.ensureDB();
    const tx = this.db!.transaction('responses');
    const index = tx.store.index('by-timestamp');
    const all = await index.getAll();
    
    // Sort by timestamp descending and take limit
    return all
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  async getAllResponses(): Promise<CachedApiResponse[]> {
    await this.ensureDB();
    return await this.db!.getAll('responses');
  }
  
  async updateResponse(response: CachedApiResponse): Promise<void> {
    await this.storeResponse(response);
  }
  
  async clearExpiredResponses(): Promise<number> {
    await this.ensureDB();
    const now = Date.now();
    const tx = this.db!.transaction('responses', 'readwrite');
    const store = tx.objectStore('responses');
    const index = store.index('by-expires');
    
    let count = 0;
    const cursor = await index.openCursor();
    
    let currentCursor = cursor;
    while (currentCursor) {
      if (currentCursor.value.expiresAt <= now) {
        await currentCursor.delete();
        count++;
        currentCursor = await currentCursor.continue();
      } else {
        break; // Since indexed by expiry, all following will be valid
      }
    }
    
    await tx.done;
    return count;
  }
  
  async clearAllResponses(): Promise<void> {
    await this.ensureDB();
    const tx = this.db!.transaction('responses', 'readwrite');
    await tx.objectStore('responses').clear();
    await tx.done;
  }
  
  // Insight operations
  async storeInsight(insight: ExtractedInsight): Promise<void> {
    await this.ensureDB();
    const tx = this.db!.transaction('insights', 'readwrite');
    await tx.objectStore('insights').put(insight);
    await tx.done;
  }
  
  async getInsightsByIdea(idea: string): Promise<ExtractedInsight[]> {
    await this.ensureDB();
    const index = this.db!.transaction('insights').store.index('by-idea');
    return await index.getAll(idea);
  }
  
  async getInsightsByTile(tileType: string): Promise<ExtractedInsight[]> {
    await this.ensureDB();
    const index = this.db!.transaction('insights').store.index('by-tile');
    return await index.getAll(tileType);
  }
  
  async clearAllInsights(): Promise<void> {
    await this.ensureDB();
    const tx = this.db!.transaction('insights', 'readwrite');
    await tx.objectStore('insights').clear();
    await tx.done;
  }
  
  // Metadata operations
  async setMetadata(key: string, value: any): Promise<void> {
    await this.ensureDB();
    const tx = this.db!.transaction('metadata', 'readwrite');
    await tx.objectStore('metadata').put({ id: key, key, value });
    await tx.done;
  }
  
  async getMetadata(key: string): Promise<any> {
    await this.ensureDB();
    const result = await this.db!.get('metadata', key);
    return result?.value;
  }
  
  // Storage size estimation
  async getStorageEstimate(): Promise<{ usage: number; quota: number; percent: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota > 0 ? (usage / quota) * 100 : 0;
      
      return { usage, quota, percent };
    }
    
    return { usage: 0, quota: 0, percent: 0 };
  }
  
  // Clear all data
  async clearAll(): Promise<void> {
    await this.clearAllResponses();
    await this.clearAllInsights();
    
    await this.ensureDB();
    const tx = this.db!.transaction('metadata', 'readwrite');
    await tx.objectStore('metadata').clear();
    await tx.done;
  }
}