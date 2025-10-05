-- Create table for tracking idea validations for live feed
CREATE TABLE IF NOT EXISTS public.idea_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idea_text TEXT NOT NULL,
  pmf_score INTEGER,
  tam TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.idea_validations ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view all validations (for live feed)
CREATE POLICY "Anyone can view idea validations"
  ON public.idea_validations
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own validations
CREATE POLICY "Users can insert their own validations"
  ON public.idea_validations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_idea_validations_created_at ON public.idea_validations(created_at DESC);

-- Enable realtime
ALTER TABLE public.idea_validations REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_validations;