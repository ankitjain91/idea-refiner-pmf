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
  
  // Call both hooks unconditionally to follow React's Rules of Hooks
  const optimizedResult = useOptimizedDataHub(input);
  const standardResult = useDataHub(input);
  
  // Return the appropriate result based on the feature flag
  return flags.useOptimizedDataLoading ? optimizedResult : standardResult;
}