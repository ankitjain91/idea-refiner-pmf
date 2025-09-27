-- Fix the security warning about function search path
DROP FUNCTION IF EXISTS public.get_random_startup_ideas(INTEGER);

-- Recreate the function with proper search path
CREATE OR REPLACE FUNCTION public.get_random_startup_ideas(limit_count INTEGER DEFAULT 4)
RETURNS SETOF public.startup_idea_suggestions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.startup_idea_suggestions
  WHERE is_active = true
  ORDER BY RANDOM()
  LIMIT limit_count;
$$;