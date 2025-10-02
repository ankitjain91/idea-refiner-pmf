// Global request queue manager for serializing API requests
class RequestQueueManager {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private minDelay = 1000; // Minimum 1 second between requests
  private lastRequestTime = 0;

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) continue;

      // Ensure minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await this.delay(this.minDelay - timeSinceLastRequest);
      }

      try {
        await request();
        this.lastRequestTime = Date.now();
      } catch (error) {
        console.error('[RequestQueue] Error processing request:', error);
      }

      // Add a small delay between requests to avoid rate limiting
      await this.delay(100);
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to adjust delay based on API type
  setMinDelay(ms: number) {
    this.minDelay = ms;
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      minDelay: this.minDelay
    };
  }
}

// Export singleton instance
export const requestQueue = new RequestQueueManager();