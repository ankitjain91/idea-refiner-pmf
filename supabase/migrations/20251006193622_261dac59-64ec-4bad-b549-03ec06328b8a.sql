-- Add is_locked and is_pinned columns to analysis_sessions table
ALTER TABLE public.analysis_sessions 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add comment to explain the columns
COMMENT ON COLUMN public.analysis_sessions.is_locked IS 'Indicates if the idea is locked and should not be cleared on reset';
COMMENT ON COLUMN public.analysis_sessions.is_pinned IS 'Indicates if the conversation is pinned and should not be cleared on session change';

-- Create index for faster queries on locked/pinned sessions
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_locked_pinned 
ON public.analysis_sessions(user_id, is_locked, is_pinned);