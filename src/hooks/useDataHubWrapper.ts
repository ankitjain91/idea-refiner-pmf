
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

  // Call both hooks unconditionally to keep hook order stable
  // Gate the inactive one by passing an empty idea so it becomes a no-op
  const optimizedResult = useOptimizedDataHub(
    flags.useOptimizedDataLoading ? input : { ...input, idea: '' }
  );
  const standardResult = useDataHub(
    flags.useOptimizedDataLoading ? { ...input, idea: '' } : input
  );

  // Return based on the flag; both have been called so hook order never changes
  return flags.useOptimizedDataLoading ? optimizedResult : standardResult;
}