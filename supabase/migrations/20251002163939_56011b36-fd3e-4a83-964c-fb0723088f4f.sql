-- Fix critical security issue: Remove public read access from web_search_cache
-- This cache contains sensitive user research and business strategies
-- Only edge functions (service role) should be able to access it

-- Drop the dangerous public read policy
DROP POLICY IF EXISTS "Public can read cache" ON public.web_search_cache;

-- The "Service role can manage cache" policy remains, which is correct
-- Edge functions use the service role to read/write cache, not end users
-- This prevents competitors from monitoring user research and stealing ideas

-- Add a comment to document the security decision
COMMENT ON TABLE public.web_search_cache IS 'Cache for web search results. Access restricted to service role only to protect user research and business strategies from public exposure.';