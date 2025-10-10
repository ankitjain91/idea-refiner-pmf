-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view ledger entries for their ideas" ON public.idea_ledger;
DROP POLICY IF EXISTS "Service role can manage ledger" ON public.idea_ledger;
DROP POLICY IF EXISTS "Users can view ownership for their ideas" ON public.idea_ownership;
DROP POLICY IF EXISTS "Service role can manage ownership" ON public.idea_ownership;
DROP POLICY IF EXISTS "Users can view challenges for their ideas" ON public.ownership_challenges;
DROP POLICY IF EXISTS "Users can create challenges" ON public.ownership_challenges;
DROP POLICY IF EXISTS "Service role can manage challenges" ON public.ownership_challenges;

-- Create idea_ledger table (blockchain ledger)
CREATE TABLE IF NOT EXISTS public.idea_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_number BIGINT NOT NULL UNIQUE,
  transaction_hash TEXT NOT NULL UNIQUE,
  previous_hash TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'transfer', 'version', 'verify', 'lock', 'unlock')),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  data_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_idea_ledger_idea_id ON public.idea_ledger(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_ledger_block_number ON public.idea_ledger(block_number);
CREATE INDEX IF NOT EXISTS idx_idea_ledger_user_id ON public.idea_ledger(user_id);

-- Create idea_ownership table
CREATE TABLE IF NOT EXISTS public.idea_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL UNIQUE REFERENCES public.ideas(id) ON DELETE CASCADE,
  current_owner_id UUID NOT NULL,
  original_creator_id UUID NOT NULL,
  ownership_token TEXT NOT NULL UNIQUE,
  proof_hash TEXT NOT NULL,
  last_transfer_block BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idea_ownership_idea_id ON public.idea_ownership(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_ownership_current_owner ON public.idea_ownership(current_owner_id);

-- Create ownership_challenges table
CREATE TABLE IF NOT EXISTS public.ownership_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('ownership_dispute', 'plagiarism_claim', 'prior_art', 'authenticity')),
  challenge_data JSONB NOT NULL,
  evidence_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution JSONB
);

CREATE INDEX IF NOT EXISTS idx_ownership_challenges_idea_id ON public.ownership_challenges(idea_id);
CREATE INDEX IF NOT EXISTS idx_ownership_challenges_status ON public.ownership_challenges(status);

-- Create ownership_verification view
CREATE OR REPLACE VIEW public.ownership_verification AS
SELECT 
  o.id,
  o.idea_id,
  o.current_owner_id,
  o.original_creator_id,
  o.ownership_token,
  o.proof_hash,
  o.last_transfer_block,
  o.created_at,
  o.updated_at,
  o.metadata,
  COUNT(l.id) as ledger_entry_count,
  COUNT(c.id) FILTER (WHERE c.status = 'pending') as pending_challenges_count
FROM public.idea_ownership o
LEFT JOIN public.idea_ledger l ON l.idea_id = o.idea_id
LEFT JOIN public.ownership_challenges c ON c.idea_id = o.idea_id
GROUP BY o.id;

-- Create function to generate ownership token
CREATE OR REPLACE FUNCTION public.generate_ownership_token(p_idea_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(
    digest(
      p_idea_id::text || p_user_id::text || extract(epoch from now())::text || gen_random_uuid()::text,
      'sha256'
    ),
    'hex'
  );
  RETURN v_token;
END;
$$;

-- Create function to create ledger entry
CREATE OR REPLACE FUNCTION public.create_ledger_entry(
  p_operation_type TEXT,
  p_idea_id UUID,
  p_user_id UUID,
  p_data_hash TEXT,
  p_signature TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block_number BIGINT;
  v_previous_hash TEXT;
  v_transaction_hash TEXT;
BEGIN
  SELECT COALESCE(MAX(block_number), 0) + 1 INTO v_block_number FROM public.idea_ledger;
  SELECT transaction_hash INTO v_previous_hash FROM public.idea_ledger WHERE block_number = v_block_number - 1;
  
  v_transaction_hash := encode(
    digest(
      v_block_number::text || COALESCE(v_previous_hash, '') || p_operation_type || 
      p_idea_id::text || p_user_id::text || p_data_hash || p_signature ||
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  );
  
  INSERT INTO public.idea_ledger (
    block_number, transaction_hash, previous_hash, operation_type,
    idea_id, user_id, data_hash, signature, metadata
  ) VALUES (
    v_block_number, v_transaction_hash, v_previous_hash, p_operation_type,
    p_idea_id, p_user_id, p_data_hash, p_signature, p_metadata
  );
  
  RETURN v_block_number;
END;
$$;

-- Enable RLS
ALTER TABLE public.idea_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view ledger entries for their ideas"
  ON public.idea_ledger FOR SELECT
  USING (idea_id IN (SELECT id FROM public.ideas WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage ledger"
  ON public.idea_ledger FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view ownership for their ideas"
  ON public.idea_ownership FOR SELECT
  USING (idea_id IN (SELECT id FROM public.ideas WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage ownership"
  ON public.idea_ownership FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view challenges for their ideas"
  ON public.ownership_challenges FOR SELECT
  USING (idea_id IN (SELECT id FROM public.ideas WHERE user_id = auth.uid()) OR challenger_id = auth.uid());

CREATE POLICY "Users can create challenges"
  ON public.ownership_challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Service role can manage challenges"
  ON public.ownership_challenges FOR ALL
  USING (auth.role() = 'service_role');