-- Create a table for storing pre-generated startup ideas
CREATE TABLE IF NOT EXISTS public.startup_idea_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_text TEXT NOT NULL,
  category TEXT,
  difficulty_level TEXT,
  target_audience TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.startup_idea_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can read ideas)
CREATE POLICY "Anyone can view active startup ideas" 
ON public.startup_idea_suggestions 
FOR SELECT 
USING (is_active = true);

-- Create policy for service role to manage ideas
CREATE POLICY "Service role can manage startup ideas" 
ON public.startup_idea_suggestions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create an index for better performance on random queries
CREATE INDEX idx_startup_ideas_active ON public.startup_idea_suggestions(is_active);

-- Create function to get random ideas
CREATE OR REPLACE FUNCTION public.get_random_startup_ideas(limit_count INTEGER DEFAULT 4)
RETURNS SETOF public.startup_idea_suggestions
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.startup_idea_suggestions
  WHERE is_active = true
  ORDER BY RANDOM()
  LIMIT limit_count;
$$;