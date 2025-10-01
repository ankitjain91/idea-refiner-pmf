-- Add idea_text column to dashboard_data table
ALTER TABLE public.dashboard_data 
ADD COLUMN IF NOT EXISTS idea_text TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_dashboard_data_idea_text 
ON public.dashboard_data(user_id, idea_text, tile_type);