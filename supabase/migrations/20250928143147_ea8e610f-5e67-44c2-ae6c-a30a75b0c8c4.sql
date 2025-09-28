-- Create table to track OpenAI API usage and costs
CREATE TABLE IF NOT EXISTS public.openai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0.00,
  function_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.openai_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for users to view their own usage
CREATE POLICY "Users can view their own OpenAI usage"
  ON public.openai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for service role to insert usage records
CREATE POLICY "Service role can insert usage records"
  ON public.openai_usage
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_openai_usage_user_id ON public.openai_usage(user_id);
CREATE INDEX idx_openai_usage_created_at ON public.openai_usage(created_at DESC);

-- Create function to get total spending for a user
CREATE OR REPLACE FUNCTION public.get_openai_total_spend(_user_id UUID DEFAULT auth.uid())
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(cost_usd), 0)
  FROM public.openai_usage
  WHERE user_id = _user_id;
$$;