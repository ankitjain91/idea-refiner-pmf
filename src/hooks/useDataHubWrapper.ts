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
  
  // Use optimized version if feature flag is enabled
  const optimizedResult = useOptimizedDataHub(input);
  const originalResult = useDataHub(input);
  
  return flags.useOptimizedDataLoading ? optimizedResult : originalResult;
}