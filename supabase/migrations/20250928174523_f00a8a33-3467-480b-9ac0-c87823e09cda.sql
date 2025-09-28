-- Create web search cache table
CREATE TABLE IF NOT EXISTS public.web_search_cache (
  cache_key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_web_search_cache_expires ON public.web_search_cache(expires_at);

-- Enable RLS
ALTER TABLE public.web_search_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (cache is shared across users)
CREATE POLICY "Public can read cache" 
ON public.web_search_cache 
FOR SELECT 
USING (true);

-- Only service role can write
CREATE POLICY "Service role can manage cache" 
ON public.web_search_cache 
FOR ALL 
USING (auth.role() = 'service_role');