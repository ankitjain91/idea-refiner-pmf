-- Create LLM response cache table
-- This caches AI/LLM responses to reduce API calls, costs, and rate limit issues

CREATE TABLE IF NOT EXISTS public.llm_cache (
  cache_key text PRIMARY KEY,
  model text NOT NULL,
  prompt_hash text NOT NULL,
  response jsonb NOT NULL,
  tokens_used integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  last_accessed timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.llm_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all cache entries
CREATE POLICY "Service role can manage llm cache"
ON public.llm_cache
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for efficient lookups
CREATE INDEX idx_llm_cache_key ON public.llm_cache(cache_key);
CREATE INDEX idx_llm_cache_expires ON public.llm_cache(expires_at);
CREATE INDEX idx_llm_cache_model ON public.llm_cache(model);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_llm_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.llm_cache
  WHERE expires_at < now();
END;
$$;

COMMENT ON TABLE public.llm_cache IS 'Cache for LLM/AI responses to reduce API calls and costs. Access restricted to service role for edge functions.';