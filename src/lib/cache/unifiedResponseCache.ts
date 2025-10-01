import { IndexedDBManager } from '../indexeddb-manager';

export interface CachedApiResponse {
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

export class UnifiedResponseCache {
  private static instance: UnifiedResponseCache;
  private db: IndexedDBManager;
  private memoryCache: Map<string, CachedApiResponse>;
  private readonly MAX_MEMORY_ITEMS = 100;
  
  private constructor() {
    this.db = IndexedDBManager.getInstance();
    this.memoryCache = new Map();
    this.loadRecentToMemory();
  }
  
  static getInstance(): UnifiedResponseCache {
    if (!UnifiedResponseCache.instance) {
      UnifiedResponseCache.instance = new UnifiedResponseCache();
    }
    return UnifiedResponseCache.instance;
  }
  
  private async loadRecentToMemory() {
    try {
      const recent = await this.db.getRecentResponses(this.MAX_MEMORY_ITEMS);
      recent.forEach(response => {
        this.memoryCache.set(response.id, response);
      });
    } catch (error) {
      console.error('Failed to load recent responses to memory:', error);
    }
  }
  
  async storeResponse(response: Omit<CachedApiResponse, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generateId(response.idea, response.source, response.endpoint);
    const timestamp = Date.now();
    
    const cachedResponse: CachedApiResponse = {
      id,
      timestamp,
      ...response
    };
    
    // Store in IndexedDB
    await this.db.storeResponse(cachedResponse);
    
    // Update memory cache
    this.updateMemoryCache(cachedResponse);
    
    return id;
  }
  
  async storeResponses(responses: Omit<CachedApiResponse, 'id' | 'timestamp'>[]): Promise<string[]> {
    const ids = await Promise.all(responses.map(r => this.storeResponse(r)));
    return ids;
  }
  
  async getResponsesForIdea(idea: string): Promise<CachedApiResponse[]> {
    // Check memory cache first
    const memoryResults = Array.from(this.memoryCache.values())
      .filter(r => r.idea === idea && r.expiresAt > Date.now());
    
    if (memoryResults.length > 0) {
      return memoryResults;
    }
    
    // Fallback to IndexedDB
    return await this.db.getResponsesByIdea(idea);
  }
  
  async getResponsesBySource(source: string, idea?: string): Promise<CachedApiResponse[]> {
    const responses = await this.db.getResponsesBySource(source);
    
    if (idea) {
      return responses.filter(r => r.idea === idea);
    }
    
    return responses;
  }
  
  async queryResponses(params: {
    idea?: string;
    sources?: string[];
    topics?: string[];
    minConfidence?: number;
    maxAge?: number;
  }): Promise<CachedApiResponse[]> {
    let responses = await this.db.getAllResponses();
    const now = Date.now();
    
    // Apply filters
    if (params.idea) {
      responses = responses.filter(r => 
        r.idea === params.idea || 
        r.metadata.relatedIdeas?.includes(params.idea)
      );
    }
    
    if (params.sources?.length) {
      responses = responses.filter(r => params.sources!.includes(r.source));
    }
    
    if (params.topics?.length) {
      responses = responses.filter(r => 
        params.topics!.some(topic => 
          r.metadata.extractedTopics?.includes(topic)
        )
      );
    }
    
    if (params.minConfidence !== undefined) {
      responses = responses.filter(r => 
        (r.metadata.confidence || 0) >= params.minConfidence!
      );
    }
    
    if (params.maxAge !== undefined) {
      const cutoff = now - params.maxAge;
      responses = responses.filter(r => r.timestamp >= cutoff);
    }
    
    // Filter expired
    responses = responses.filter(r => r.expiresAt > now);
    
    return responses;
  }
  
  async extractInsights(responseId: string, insights: CachedApiResponse['extractedInsights']) {
    const response = await this.db.getResponse(responseId);
    if (!response) return;
    
    response.extractedInsights = {
      ...response.extractedInsights,
      ...insights
    };
    
    await this.db.updateResponse(response);
    
    // Update memory cache if present
    if (this.memoryCache.has(responseId)) {
      this.memoryCache.set(responseId, response);
    }
  }
  
  async getRelatedData(idea: string): Promise<Map<string, CachedApiResponse[]>> {
    // Find all related ideas based on topic similarity
    const primaryResponses = await this.getResponsesForIdea(idea);
    const topics = new Set<string>();
    
    primaryResponses.forEach(r => {
      r.metadata.extractedTopics?.forEach(t => topics.add(t));
    });
    
    // Get responses for related topics
    const relatedResponses = await this.queryResponses({
      topics: Array.from(topics),
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Group by source
    const grouped = new Map<string, CachedApiResponse[]>();
    relatedResponses.forEach(r => {
      if (!grouped.has(r.source)) {
        grouped.set(r.source, []);
      }
      grouped.get(r.source)!.push(r);
    });
    
    return grouped;
  }
  
  async clearExpired(): Promise<number> {
    const deleted = await this.db.clearExpiredResponses();
    
    // Clear from memory cache
    const now = Date.now();
    Array.from(this.memoryCache.entries()).forEach(([id, response]) => {
      if (response.expiresAt <= now) {
        this.memoryCache.delete(id);
      }
    });
    
    return deleted;
  }
  
  async clearAll(): Promise<void> {
    await this.db.clearAllResponses();
    this.memoryCache.clear();
  }
  
  private generateId(idea: string, source: string, endpoint: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${idea.substring(0, 20)}_${source}_${endpoint}_${timestamp}_${random}`;
  }
  
  private updateMemoryCache(response: CachedApiResponse) {
    // Implement LRU eviction if needed
    if (this.memoryCache.size >= this.MAX_MEMORY_ITEMS) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    
    this.memoryCache.set(response.id, response);
  }
  
  // Get statistics about cache usage
  async getStats() {
    const allResponses = await this.db.getAllResponses();
    const now = Date.now();
    const valid = allResponses.filter(r => r.expiresAt > now);
    const expired = allResponses.length - valid.length;
    
    const bySource = new Map<string, number>();
    const byIdea = new Map<string, number>();
    
    valid.forEach(r => {
      bySource.set(r.source, (bySource.get(r.source) || 0) + 1);
      byIdea.set(r.idea, (byIdea.get(r.idea) || 0) + 1);
    });
    
    return {
      total: allResponses.length,
      valid: valid.length,
      expired,
      memoryCache: this.memoryCache.size,
      bySource: Object.fromEntries(bySource),
      byIdea: Object.fromEntries(byIdea),
      oldestTimestamp: Math.min(...valid.map(r => r.timestamp)),
      newestTimestamp: Math.max(...valid.map(r => r.timestamp))
    };
  }
}