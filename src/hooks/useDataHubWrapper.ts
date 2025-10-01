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
  
  // Only call the appropriate hook based on the feature flag
  // This ensures we follow React's rules of hooks
  if (flags.useOptimizedDataLoading) {
    return useOptimizedDataHub(input);
  } else {
    return useDataHub(input);
  }
}