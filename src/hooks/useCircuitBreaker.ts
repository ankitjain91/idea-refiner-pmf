/**
 * React hook for using circuit breakers in components
 */

import { useRef, useCallback, useState } from 'react';
import { CircuitBreaker, CircuitState, createTileCircuitBreaker } from '@/lib/circuit-breaker';
import { toast } from 'sonner';

export interface UseCircuitBreakerOptions {
  name: string;
  maxRetries?: number;
  resetTimeout?: number;
  onStateChange?: (state: CircuitState) => void;
}

export function useCircuitBreaker(options: UseCircuitBreakerOptions) {
  const { name, maxRetries = 5, resetTimeout = 30000, onStateChange } = options;
  const [state, setState] = useState<CircuitState>(CircuitState.CLOSED);
  const [retryCount, setRetryCount] = useState(0);
  
  const circuitBreakerRef = useRef<CircuitBreaker>();
  
  if (!circuitBreakerRef.current) {
    circuitBreakerRef.current = new CircuitBreaker({
      maxRetries,
      resetTimeout,
      onOpen: () => {
        setState(CircuitState.OPEN);
        toast.warning(`${name}: Too many failures, using cached data`);
        onStateChange?.(CircuitState.OPEN);
      },
      onClose: () => {
        setState(CircuitState.CLOSED);
        setRetryCount(0);
        onStateChange?.(CircuitState.CLOSED);
      },
      onHalfOpen: () => {
        setState(CircuitState.HALF_OPEN);
        onStateChange?.(CircuitState.HALF_OPEN);
      }
    });
  }
  
  const execute = useCallback(async <T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> => {
    const breaker = circuitBreakerRef.current!;
    setRetryCount(breaker.getRetryCount());
    return breaker.execute(fn, fallback);
  }, []);
  
  const reset = useCallback(() => {
    circuitBreakerRef.current?.reset();
    setState(CircuitState.CLOSED);
    setRetryCount(0);
  }, []);
  
  return {
    execute,
    reset,
    state,
    retryCount,
    isOpen: state === CircuitState.OPEN,
    isHalfOpen: state === CircuitState.HALF_OPEN,
    isClosed: state === CircuitState.CLOSED
  };
}