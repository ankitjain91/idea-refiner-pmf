-- Add collaboration features to ideas table
ALTER TABLE public.ideas
ADD COLUMN is_public BOOLEAN DEFAULT true,
ADD COLUMN category TEXT,
ADD COLUMN keywords TEXT[];

-- Create collaborations table for connection requests
CREATE TABLE public.collaborations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on collaborations
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;

-- Create policies for collaborations
CREATE POLICY "Users can view their collaboration requests"
ON public.collaborations
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create collaboration requests"
ON public.collaborations
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Recipients can update collaboration status"
ON public.collaborations
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Update ideas policies to allow viewing public ideas
CREATE POLICY "Users can view public ideas"
ON public.ideas
FOR SELECT
USING (is_public = true);

-- Create an index for better performance on keyword searches
CREATE INDEX idx_ideas_keywords ON public.ideas USING GIN(keywords);
CREATE INDEX idx_ideas_category ON public.ideas(category);