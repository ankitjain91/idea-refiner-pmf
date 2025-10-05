import { useRef } from 'react';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';
import { useDataHub } from './useDataHub';
import { useOptimizedDataHub } from './useOptimizedDataHub';
import { DataHubInput } from '@/lib/data-hub-orchestrator';

/**
 * Wrapper hook that switches between original and optimized data loading
 * based on feature flag
 */
export function useDataHubWrapper(input: DataHubInput) {
  const { flags } = useFeatureFlags();

  // Freeze the choice on first render to keep hook order stable across renders
  const useOptimizedRef = useRef<boolean | null>(null);
  if (useOptimizedRef.current === null) {
    useOptimizedRef.current = !!flags.useOptimizedDataLoading;
  }

  // Call only one hook consistently for this component lifecycle
  return useOptimizedRef.current ? useOptimizedDataHub(input) : useDataHub(input);
}