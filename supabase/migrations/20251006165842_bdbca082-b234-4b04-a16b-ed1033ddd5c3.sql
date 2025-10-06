-- Create cache table for Twitter and other API responses
CREATE TABLE IF NOT EXISTS public.twitter_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  response_data JSONB NOT NULL,
  rate_limit_remaining INTEGER,
  rate_limit_reset BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_twitter_cache_query_hash ON public.twitter_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_twitter_cache_expires_at ON public.twitter_cache(expires_at);

-- Enable RLS
ALTER TABLE public.twitter_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access to cache (it's public data anyway)
CREATE POLICY "Allow public read access to cache"
  ON public.twitter_cache
  FOR SELECT
  USING (true);

-- Allow service role to insert/update cache
CREATE POLICY "Allow service role to manage cache"
  ON public.twitter_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_twitter_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.twitter_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;