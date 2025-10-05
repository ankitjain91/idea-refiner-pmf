-- Add is_active column to brainstorming_sessions for filtering
ALTER TABLE public.brainstorming_sessions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add index for efficient queries on user_id, is_active, and last_accessed
CREATE INDEX IF NOT EXISTS idx_brainstorming_sessions_user_active 
ON public.brainstorming_sessions(user_id, is_active, last_accessed DESC);