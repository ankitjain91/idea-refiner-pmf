-- Create brainstorming_sessions table
CREATE TABLE public.brainstorming_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  activity_log JSONB NOT NULL DEFAULT '[]',
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brainstorming_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own sessions" 
ON public.brainstorming_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.brainstorming_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.brainstorming_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.brainstorming_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_brainstorming_sessions_user_id ON public.brainstorming_sessions(user_id);
CREATE INDEX idx_brainstorming_sessions_last_accessed ON public.brainstorming_sessions(last_accessed DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_brainstorming_sessions_updated_at
BEFORE UPDATE ON public.brainstorming_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();