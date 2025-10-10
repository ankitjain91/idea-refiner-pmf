-- SmoothBrains AI Assistant Schema Extension
-- Creates tables for ideas, versions, actions, live context, feedback, scores, and referrals

-- Ideas table - Core idea storage
CREATE TABLE IF NOT EXISTS public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    target_market JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Idea versions - Track evolution over time
CREATE TABLE IF NOT EXISTS public.idea_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    changes_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(idea_id, version_number)
);

-- Actions - AI-generated next steps
CREATE TABLE IF NOT EXISTS public.actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    category TEXT, -- 'market_research', 'product', 'marketing', 'funding'
    estimated_effort TEXT, -- 'low', 'medium', 'high'
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
    ai_confidence DECIMAL(3,2) DEFAULT 0.8,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Live context - Real-time market/competitor/sentiment data
CREATE TABLE IF NOT EXISTS public.idea_live_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL, -- 'market', 'competitor', 'sentiment', 'trends'
    data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.7,
    sources JSONB DEFAULT '[]'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(idea_id, context_type)
);

-- Feedback - Team collaboration and AI summaries
CREATE TABLE IF NOT EXISTS public.idea_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feedback_type TEXT DEFAULT 'comment', -- 'comment', 'question', 'suggestion', 'concern'
    content TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT false,
    parent_feedback_id UUID REFERENCES public.idea_feedback(id) ON DELETE CASCADE,
    sentiment TEXT, -- 'positive', 'neutral', 'negative'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- PMF Scores - Track Product-Market Fit over time
CREATE TABLE IF NOT EXISTS public.idea_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    pmf_score INTEGER NOT NULL CHECK (pmf_score >= 0 AND pmf_score <= 100),
    score_breakdown JSONB NOT NULL, -- detailed scoring components
    market_size_score INTEGER,
    competition_score INTEGER,
    execution_score INTEGER,
    timing_score INTEGER,
    team_score INTEGER,
    ai_confidence DECIMAL(3,2) DEFAULT 0.8,
    data_sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Referrals - Viral growth tracking
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_email TEXT NOT NULL,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referral_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'expired'
    reward_type TEXT, -- 'premium_month', 'credits', 'feature_unlock'
    reward_claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Pitch decks - Generated presentations
CREATE TABLE IF NOT EXISTS public.pitch_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slides JSONB NOT NULL, -- Array of slide objects
    template_type TEXT DEFAULT 'standard',
    export_formats JSONB DEFAULT '["pdf", "pptx"]'::jsonb,
    file_urls JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON public.ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_active ON public.ideas(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_idea_versions_idea_id ON public.idea_versions(idea_id);
CREATE INDEX IF NOT EXISTS idx_actions_idea_id ON public.actions(idea_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON public.actions(status);
CREATE INDEX IF NOT EXISTS idx_live_context_idea_id ON public.idea_live_context(idea_id);
CREATE INDEX IF NOT EXISTS idx_live_context_type ON public.idea_live_context(context_type);
CREATE INDEX IF NOT EXISTS idx_live_context_expires ON public.idea_live_context(expires_at);
CREATE INDEX IF NOT EXISTS idx_feedback_idea_id ON public.idea_feedback(idea_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.idea_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_idea_id ON public.idea_scores(idea_id);
CREATE INDEX IF NOT EXISTS idx_scores_pmf ON public.idea_scores(pmf_score DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_idea_id ON public.pitch_decks(idea_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ideas_updated_at
    BEFORE UPDATE ON public.ideas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_pitch_decks_updated_at
    BEFORE UPDATE ON public.pitch_decks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_live_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_decks ENABLE ROW LEVEL SECURITY;

-- Ideas policies
CREATE POLICY "Users can view their own ideas" ON public.ideas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ideas" ON public.ideas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ideas" ON public.ideas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas" ON public.ideas
    FOR DELETE USING (auth.uid() = user_id);

-- Idea versions policies
CREATE POLICY "Users can view versions of their ideas" ON public.idea_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ideas 
            WHERE ideas.id = idea_versions.idea_id 
            AND ideas.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert versions of their ideas" ON public.idea_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ideas 
            WHERE ideas.id = idea_versions.idea_id 
            AND ideas.user_id = auth.uid()
        )
    );

-- Actions policies
CREATE POLICY "Users can manage actions for their ideas" ON public.actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ideas 
            WHERE ideas.id = actions.idea_id 
            AND ideas.user_id = auth.uid()
        )
    );

-- Live context policies
CREATE POLICY "Users can manage live context for their ideas" ON public.idea_live_context
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ideas 
            WHERE ideas.id = idea_live_context.idea_id 
            AND ideas.user_id = auth.uid()
        )
    );

-- Feedback policies
CREATE POLICY "Users can view feedback on their ideas" ON public.idea_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ideas 
            WHERE ideas.id = idea_feedback.idea_id 
            AND ideas.user_id = auth.uid()
        )
        OR auth.uid() = user_id
    );

CREATE POLICY "Users can insert feedback" ON public.idea_feedback
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ideas 
            WHERE ideas.id = idea_feedback.idea_id 
            AND ideas.user_id = auth.uid()
        )
        OR auth.uid() = user_id
    );

-- Scores policies
CREATE POLICY "Users can view scores for their ideas" ON public.idea_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ideas 
            WHERE ideas.id = idea_scores.idea_id 
            AND ideas.user_id = auth.uid()
        )
    );

-- Referrals policies
CREATE POLICY "Users can view their referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can create referrals" ON public.referrals
    FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update their referrals" ON public.referrals
    FOR UPDATE USING (auth.uid() = referrer_id);

-- Pitch decks policies
CREATE POLICY "Users can manage their pitch decks" ON public.pitch_decks
    FOR ALL USING (auth.uid() = user_id);

-- Create view for leaderboard
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
    p.username,
    p.full_name,
    p.avatar_url,
    COUNT(DISTINCT i.id) as total_ideas,
    COALESCE(AVG(s.pmf_score), 0) as avg_pmf_score,
    MAX(s.pmf_score) as best_pmf_score,
    COUNT(DISTINCT r.id) as total_referrals,
    COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as successful_referrals
FROM public.profiles p
LEFT JOIN public.ideas i ON i.user_id = p.user_id AND i.is_active = true
LEFT JOIN public.idea_scores s ON s.idea_id = i.id
LEFT JOIN public.referrals r ON r.referrer_id = p.user_id
WHERE p.username IS NOT NULL
GROUP BY p.user_id, p.username, p.full_name, p.avatar_url
HAVING COUNT(DISTINCT i.id) > 0 OR COUNT(DISTINCT r.id) > 0
ORDER BY best_pmf_score DESC, avg_pmf_score DESC, successful_referrals DESC
LIMIT 100;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.leaderboard TO anon, authenticated;