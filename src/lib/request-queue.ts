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
  private minDelayMs = 1000; // 1 second between requests
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

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      // Ensure minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelayMs) {
        await this.delay(this.minDelayMs - timeSinceLastRequest);
      }

      try {
        console.log(`[RequestQueue] Processing request (${this.queue.length} remaining)`);
        const result = await item.fn();
        item.resolve(result);
        this.lastRequestTime = Date.now();
      } catch (error) {
        console.error('[RequestQueue] Request failed:', error);
        item.reject(error);
      }

      // Small delay between requests
      await this.delay(100);
    }

    this.processing = false;
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