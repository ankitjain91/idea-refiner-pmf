/**
 * Circuit Breaker utility for API calls
 * Prevents excessive retries and provides graceful degradation
 */

export interface CircuitBreakerOptions {
  maxRetries?: number;
  resetTimeout?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private retryCount = 0;
  private state: CircuitState = CircuitState.CLOSED;
  private lastFailTime?: number;
  private readonly maxRetries: number;
  private readonly resetTimeout: number;
  private readonly onOpen?: () => void;
  private readonly onClose?: () => void;
  private readonly onHalfOpen?: () => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.maxRetries = options.maxRetries ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000; // 30 seconds default
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onHalfOpen = options.onHalfOpen;
  }

  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.lastFailTime) {
      const timeSinceLastFail = Date.now() - this.lastFailTime;
      if (timeSinceLastFail >= this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.onHalfOpen?.();
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN state');
      }
    }

    // If circuit is OPEN, use fallback immediately
    if (this.state === CircuitState.OPEN) {
      console.log('[CircuitBreaker] Circuit is OPEN, using fallback');
      if (fallback) {
        return await fallback();
      }
      throw new Error('Circuit breaker is open and no fallback provided');
    }

    try {
      const result = await fn();
      
      // Success: reset counters and close circuit
      if (this.state === CircuitState.HALF_OPEN) {
        console.log('[CircuitBreaker] Success in HALF_OPEN state, closing circuit');
        this.state = CircuitState.CLOSED;
        this.onClose?.();
      }
      this.retryCount = 0;
      return result;
    } catch (error) {
      this.retryCount++;
      this.lastFailTime = Date.now();
      
      console.log(`[CircuitBreaker] Failure ${this.retryCount}/${this.maxRetries}`, error);
      
      // Check if we should open the circuit
      if (this.retryCount >= this.maxRetries) {
        this.state = CircuitState.OPEN;
        this.onOpen?.();
        console.log('[CircuitBreaker] Opening circuit after max retries');
      }
      
      // If in HALF_OPEN state, reopen immediately
      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.OPEN;
        this.onOpen?.();
        console.log('[CircuitBreaker] Reopening circuit from HALF_OPEN state');
      }
      
      // Use fallback if available
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }

  reset(): void {
    this.retryCount = 0;
    this.state = CircuitState.CLOSED;
    this.lastFailTime = undefined;
    this.onClose?.();
    console.log('[CircuitBreaker] Circuit manually reset');
  }

  getState(): CircuitState {
    return this.state;
  }

  getRetryCount(): number {
    return this.retryCount;
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
}

// Factory function for creating circuit breakers with common configurations
export function createTileCircuitBreaker(
  tileName: string,
  onStateChange?: (state: CircuitState) => void
): CircuitBreaker {
  return new CircuitBreaker({
    maxRetries: 5,
    resetTimeout: 30000,
    onOpen: () => {
      console.log(`[${tileName}] Circuit breaker opened`);
      onStateChange?.(CircuitState.OPEN);
    },
    onClose: () => {
      console.log(`[${tileName}] Circuit breaker closed`);
      onStateChange?.(CircuitState.CLOSED);
    },
    onHalfOpen: () => {
      console.log(`[${tileName}] Circuit breaker half-open`);
      onStateChange?.(CircuitState.HALF_OPEN);
    }
  });
}