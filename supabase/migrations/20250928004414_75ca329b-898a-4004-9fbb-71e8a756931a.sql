-- Create tables for storing idea analysis data
CREATE TABLE public.idea_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  idea_text TEXT NOT NULL,
  market_size JSONB,
  personas JSONB,
  gtm_strategy JSONB,
  competitors JSONB,
  benchmarks JSONB,
  profit_potential NUMERIC,
  marketing_channels JSONB,
  focus_zones JSONB,
  implementation_strategy JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for real-time metrics
CREATE TABLE public.realtime_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES public.idea_analyses NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for task completion tracking
CREATE TABLE public.implementation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES public.idea_analyses NOT NULL,
  task_name TEXT NOT NULL,
  task_category TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.idea_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own analyses" 
ON public.idea_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" 
ON public.idea_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" 
ON public.idea_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" 
ON public.idea_analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for realtime_metrics
CREATE POLICY "Users can view metrics for their analyses" 
ON public.realtime_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.idea_analyses 
    WHERE id = realtime_metrics.analysis_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create metrics for their analyses" 
ON public.realtime_metrics 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.idea_analyses 
    WHERE id = realtime_metrics.analysis_id 
    AND user_id = auth.uid()
  )
);

-- Policies for implementation_tasks
CREATE POLICY "Users can view tasks for their analyses" 
ON public.implementation_tasks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.idea_analyses 
    WHERE id = implementation_tasks.analysis_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage tasks for their analyses" 
ON public.implementation_tasks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.idea_analyses 
    WHERE id = implementation_tasks.analysis_id 
    AND user_id = auth.uid()
  )
);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_idea_analyses_updated_at
BEFORE UPDATE ON public.idea_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER TABLE public.realtime_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.implementation_tasks REPLICA IDENTITY FULL;