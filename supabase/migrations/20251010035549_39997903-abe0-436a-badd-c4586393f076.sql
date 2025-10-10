-- Create table for PMF scores with detailed breakdowns
CREATE TABLE IF NOT EXISTS public.idea_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL,
  user_id UUID NOT NULL,
  pmf_score INTEGER NOT NULL CHECK (pmf_score >= 0 AND pmf_score <= 100),
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  data_sources TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for actionable next steps
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10),
  category TEXT NOT NULL,
  estimated_effort TEXT NOT NULL CHECK (estimated_effort IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  ai_confidence NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for live market context
CREATE TABLE IF NOT EXISTS public.live_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL,
  user_id UUID NOT NULL,
  context_type TEXT NOT NULL,
  data JSONB NOT NULL,
  source TEXT NOT NULL,
  last_refreshed TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for idea evolution tracking
CREATE TABLE IF NOT EXISTS public.idea_evolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL,
  user_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  idea_text TEXT NOT NULL,
  pmf_score INTEGER,
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for team leaderboard
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idea_id UUID NOT NULL,
  idea_text TEXT NOT NULL,
  pmf_score INTEGER NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.idea_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_evolution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies for idea_scores
CREATE POLICY "Users can view their own scores"
  ON public.idea_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scores"
  ON public.idea_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage scores"
  ON public.idea_scores FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for actions
CREATE POLICY "Users can view their own actions"
  ON public.actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own actions"
  ON public.actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actions"
  ON public.actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage actions"
  ON public.actions FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for live_context
CREATE POLICY "Users can view their own context"
  ON public.live_context FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own context"
  ON public.live_context FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage context"
  ON public.live_context FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for idea_evolution
CREATE POLICY "Users can view their own evolution"
  ON public.idea_evolution FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own evolution"
  ON public.idea_evolution FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for leaderboard
CREATE POLICY "Anyone can view public leaderboard"
  ON public.leaderboard FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can manage their own leaderboard entries"
  ON public.leaderboard FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_idea_scores_user_id ON public.idea_scores(user_id);
CREATE INDEX idx_idea_scores_idea_id ON public.idea_scores(idea_id);
CREATE INDEX idx_actions_user_id ON public.actions(user_id);
CREATE INDEX idx_actions_status ON public.actions(status);
CREATE INDEX idx_live_context_idea_id ON public.live_context(idea_id);
CREATE INDEX idx_live_context_expires ON public.live_context(expires_at);
CREATE INDEX idx_idea_evolution_idea_id ON public.idea_evolution(idea_id);
CREATE INDEX idx_leaderboard_pmf_score ON public.leaderboard(pmf_score DESC);
CREATE INDEX idx_leaderboard_upvotes ON public.leaderboard(upvotes DESC);