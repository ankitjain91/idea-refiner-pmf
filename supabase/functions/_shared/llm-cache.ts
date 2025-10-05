import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * LLM Cache Utility for Edge Functions
 * Caches LLM/AI responses to reduce API calls, costs, and rate limits
 */

interface LLMCacheConfig {
  model: string;
  prompt: string;
  parameters?: Record<string, any>;
  ttlMinutes?: number; // Time to live in minutes, default 24 hours
}

interface CachedResponse {
  response: any;
  hit_count: number;
  created_at: string;
}

/**
 * Generate a cache key from model, prompt, and parameters
 */
function generateCacheKey(config: LLMCacheConfig): string {
  const { model, prompt, parameters = {} } = config;
  
  // Create a stable string representation
  const paramsStr = Object.keys(parameters)
    .sort()
    .map(key => `${key}:${JSON.stringify(parameters[key])}`)
    .join('|');
  
  // Create hash of the combined string
  const content = `${model}::${prompt}::${paramsStr}`;
  
  // Use TextEncoder to properly handle UTF-8 characters
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  // Convert to hex string instead of base64 to avoid btoa() Latin1 issues
  const hex = Array.from(data)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return hex.substring(0, 64); // Truncate to 64 chars
}

/**
 * Generate a hash of the prompt for indexing
 */
function generatePromptHash(prompt: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(prompt.substring(0, 100));
  
  // Convert to hex string
  const hex = Array.from(data)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return hex.substring(0, 32);
}

/**
 * Get cached LLM response if available
 */
export async function getCachedLLMResponse(
  supabase: SupabaseClient,
  config: LLMCacheConfig
): Promise<any | null> {
  try {
    const cacheKey = generateCacheKey(config);
    
    const { data, error } = await supabase
      .from('llm_cache')
      .select('response, hit_count, created_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) {
      console.log(`[LLM Cache] MISS for key: ${cacheKey}`);
      return null;
    }
    
    // Update hit count and last accessed
    await supabase
      .from('llm_cache')
      .update({
        hit_count: data.hit_count + 1,
        last_accessed: new Date().toISOString()
      })
      .eq('cache_key', cacheKey);
    
    console.log(`[LLM Cache] HIT for key: ${cacheKey} (hits: ${data.hit_count + 1})`);
    return data.response;
  } catch (err) {
    console.error('[LLM Cache] Error getting cached response:', err);
    return null;
  }
}

/**
 * Store LLM response in cache
 */
export async function cacheLLMResponse(
  supabase: SupabaseClient,
  config: LLMCacheConfig,
  response: any,
  tokensUsed?: number
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(config);
    const promptHash = generatePromptHash(config.prompt);
    const ttlMinutes = config.ttlMinutes || 1440; // 24 hours default
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
    
    const { error } = await supabase
      .from('llm_cache')
      .upsert({
        cache_key: cacheKey,
        model: config.model,
        prompt_hash: promptHash,
        response: response,
        tokens_used: tokensUsed,
        expires_at: expiresAt.toISOString(),
        hit_count: 0,
        last_accessed: new Date().toISOString()
      });
    
    if (error) {
      console.error('[LLM Cache] Error caching response:', error);
    } else {
      console.log(`[LLM Cache] STORED for key: ${cacheKey} (TTL: ${ttlMinutes}m)`);
    }
  } catch (err) {
    console.error('[LLM Cache] Error caching response:', err);
  }
}

/**
 * Wrapper function for LLM calls with automatic caching
 */
export async function cachedLLMCall<T = any>(
  supabase: SupabaseClient,
  config: LLMCacheConfig,
  apiCall: () => Promise<T>
): Promise<T> {
  // Try to get cached response first
  const cached = await getCachedLLMResponse(supabase, config);
  if (cached !== null) {
    return cached as T;
  }
  
  // Make the actual API call
  console.log(`[LLM Cache] Making fresh API call for model: ${config.model}`);
  const response = await apiCall();
  
  // Cache the response
  await cacheLLMResponse(supabase, config, response);
  
  return response;
}

/**
 * Clear expired cache entries (should be called periodically)
 */
export async function clearExpiredLLMCache(supabase: SupabaseClient): Promise<number> {
  try {
    const { error } = await supabase.rpc('cleanup_expired_llm_cache');
    
    if (error) {
      console.error('[LLM Cache] Error clearing expired entries:', error);
      return 0;
    }
    
    console.log('[LLM Cache] Cleared expired entries');
    return 1;
  } catch (err) {
    console.error('[LLM Cache] Error clearing expired entries:', err);
    return 0;
  }
}
