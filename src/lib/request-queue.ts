import { supabase } from "@/integrations/supabase/client";

// Singleton class to manage all API requests globally
class GlobalRequestManager {
  private static instance: GlobalRequestManager;
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private processing = false;
  private minDelayMs = 1000; // Strictly 1 second between ALL requests
  private maxConcurrent = 1; // Only 1 request at a time
  private lastRequestTime = 0;

  private constructor() {}

  static getInstance(): GlobalRequestManager {
    if (!GlobalRequestManager.instance) {
      GlobalRequestManager.instance = new GlobalRequestManager();
    }
    return GlobalRequestManager.instance;
  }

  async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn: requestFn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`[GlobalRequestQueue] Starting queue processing (${this.queue.length} requests)`);

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      // STRICT: Always enforce exactly minDelayMs between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (this.lastRequestTime > 0 && timeSinceLastRequest < this.minDelayMs) {
        const waitTime = this.minDelayMs - timeSinceLastRequest;
        console.log(`[GlobalRequestQueue] Waiting ${waitTime}ms before next request`);
        await this.delay(waitTime);
      }

      try {
        console.log(`[GlobalRequestQueue] Executing request (${this.queue.length} remaining)`);
        const result = await item.fn();
        item.resolve(result);
        this.lastRequestTime = Date.now();
      } catch (error) {
        console.error('[GlobalRequestQueue] Request failed:', error);
        item.reject(error);
        this.lastRequestTime = Date.now(); // Still update time to maintain spacing
      }
    }

    this.processing = false;
    console.log('[GlobalRequestQueue] Queue processing complete');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setMinDelay(ms: number) {
    this.minDelayMs = ms;
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      minDelayMs: this.minDelayMs
    };
  }
}

// Export singleton instance
export const globalRequestQueue = GlobalRequestManager.getInstance();

// Wrapper for Supabase function invocations
export async function invokeSupabaseFunction(functionName: string, body: any) {
  return globalRequestQueue.executeRequest(async () => {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw error;
    return data;
  });
}

// Wrapper for fetch requests
export async function queuedFetch(url: string, options?: RequestInit) {
  return globalRequestQueue.executeRequest(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  });
}

// Export the class for external use
export { GlobalRequestManager };