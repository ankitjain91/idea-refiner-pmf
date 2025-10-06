-- Add locked_idea column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS locked_idea TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_locked_idea ON public.profiles(user_id) WHERE locked_idea IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.locked_idea IS 'The users locked/pinned idea - single source of truth for dashboard and analysis';