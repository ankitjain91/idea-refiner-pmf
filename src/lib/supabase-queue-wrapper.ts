/**
 * Wrapper that automatically routes ALL supabase.functions.invoke calls through the global request queue
 * Import this BEFORE using supabase to ensure all calls are queued sequentially with 1 req/sec
 */

import { supabase } from '@/integrations/supabase/client';
import { globalRequestQueue } from './request-queue';

// Store the original invoke method
const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

// Replace with queued version
(supabase.functions as any).invoke = async function(functionName: string, options?: any) {
  console.log(`[SupabaseQueueWrapper] Queueing function: ${functionName}`);
  
  return globalRequestQueue.executeRequest(async () => {
    console.log(`[SupabaseQueueWrapper] Executing function: ${functionName}`);
    const result = await originalInvoke(functionName, options);
    
    // Handle errors in the standard Supabase format
    if (result.error) {
      console.error(`[SupabaseQueueWrapper] Function ${functionName} returned error:`, result.error);
    }
    
    return result;
  });
};

console.log('[SupabaseQueueWrapper] Supabase functions.invoke patched with global request queue');

// Re-export the patched supabase client
export { supabase };
