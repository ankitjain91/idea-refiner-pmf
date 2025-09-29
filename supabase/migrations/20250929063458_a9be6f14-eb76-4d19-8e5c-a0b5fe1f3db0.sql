-- Create a table to store dashboard data
CREATE TABLE public.dashboard_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.brainstorming_sessions(id) ON DELETE CASCADE,
  tile_type TEXT NOT NULL,
  data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, session_id, tile_type)
);

-- Enable Row Level Security
ALTER TABLE public.dashboard_data ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own dashboard data" 
ON public.dashboard_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dashboard data" 
ON public.dashboard_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard data" 
ON public.dashboard_data 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard data" 
ON public.dashboard_data 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_dashboard_data_user_session ON public.dashboard_data(user_id, session_id);
CREATE INDEX idx_dashboard_data_tile_type ON public.dashboard_data(tile_type);

-- Create function to clean up expired data
CREATE OR REPLACE FUNCTION public.cleanup_expired_dashboard_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.dashboard_data
  WHERE expires_at < now();
END;
$$;