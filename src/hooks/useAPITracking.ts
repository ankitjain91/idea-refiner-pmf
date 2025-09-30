/**
 * Hook to add API call tracking to components
 */
import { useEffect, useRef } from 'react';
import { apiCallAnalyzer } from '@/lib/api-call-analyzer';

interface UseAPITrackingOptions {
  endpoint: string;
  enabled?: boolean;
  dependencies?: any[];
}

export function useAPITracking({ 
  endpoint, 
  enabled = true, 
  dependencies = [] 
}: UseAPITrackingOptions) {
  const startTimeRef = useRef<number>(0);
  const trackedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    // Track the start of the API call
    if (!trackedRef.current) {
      startTimeRef.current = Date.now();
      trackedRef.current = true;
    }

    return () => {
      // Track completion when component unmounts or dependencies change
      if (startTimeRef.current > 0) {
        const duration = Date.now() - startTimeRef.current;
        apiCallAnalyzer.trackCall(endpoint, true, duration);
        startTimeRef.current = 0;
        trackedRef.current = false;
      }
    };
  }, dependencies);

  const trackSuccess = (additionalData?: any) => {
    if (startTimeRef.current > 0) {
      const duration = Date.now() - startTimeRef.current;
      apiCallAnalyzer.trackCall(endpoint, true, duration);
      console.log(`✅ API Call tracked: ${endpoint} (${duration}ms)`, additionalData);
    }
  };

  const trackError = (error: any) => {
    if (startTimeRef.current > 0) {
      const duration = Date.now() - startTimeRef.current;
      apiCallAnalyzer.trackCall(endpoint, false, duration);
      console.error(`❌ API Call failed: ${endpoint} (${duration}ms)`, error);
    }
  };

  return { trackSuccess, trackError };
}