// Background processor for handling ongoing API requests
// This ensures that chat responses continue processing even when navigating away

interface PendingRequest {
  id: string;
  promise: Promise<any>;
  controller?: AbortController;
  sessionId?: string;
  type: 'chat' | 'evaluation' | 'enhancement';
  timestamp: number;
}

class BackgroundProcessor {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private processingResults: Map<string, any> = new Map();
  
  // Register a request for background processing
  register(requestId: string, promise: Promise<any>, type: PendingRequest['type'], sessionId?: string): void {
    this.pendingRequests.set(requestId, {
      id: requestId,
      promise,
      type,
      sessionId,
      timestamp: Date.now()
    });
    
    // Process in background
    promise
      .then(result => {
        this.processingResults.set(requestId, { success: true, data: result });
        this.pendingRequests.delete(requestId);
        
        // Dispatch event to notify listeners
        window.dispatchEvent(new CustomEvent('background-request-complete', {
          detail: { requestId, result, type, sessionId }
        }));
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          this.processingResults.set(requestId, { success: false, error });
          this.pendingRequests.delete(requestId);
          
          // Dispatch error event
          window.dispatchEvent(new CustomEvent('background-request-error', {
            detail: { requestId, error, type, sessionId }
          }));
        }
      });
  }
  
  // Check if a request is still pending
  isPending(requestId: string): boolean {
    return this.pendingRequests.has(requestId);
  }
  
  // Get result if available
  getResult(requestId: string): any {
    return this.processingResults.get(requestId);
  }
  
  // Clear old results (cleanup)
  clearOldResults(maxAge: number = 5 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        this.pendingRequests.delete(id);
        this.processingResults.delete(id);
      }
    }
  }
  
  // Get pending requests for a session
  getSessionRequests(sessionId: string): PendingRequest[] {
    return Array.from(this.pendingRequests.values())
      .filter(req => req.sessionId === sessionId);
  }
  
  // Clear all requests for a session
  clearSessionRequests(sessionId: string): void {
    for (const [id, request] of this.pendingRequests.entries()) {
      if (request.sessionId === sessionId) {
        this.pendingRequests.delete(id);
        this.processingResults.delete(id);
      }
    }
  }
}

// Singleton instance
export const backgroundProcessor = new BackgroundProcessor();

// Auto-cleanup old results every minute
setInterval(() => {
  backgroundProcessor.clearOldResults();
}, 60000);