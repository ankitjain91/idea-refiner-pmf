-- Blockchain-style Ledger for Secure Idea Ownership
-- Immutable record of all idea operations with cryptographic verification

-- Ledger entries table - immutable record of all operations
CREATE TABLE IF NOT EXISTS public.idea_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_number BIGSERIAL UNIQUE NOT NULL,
    transaction_hash TEXT UNIQUE NOT NULL,
    previous_hash TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    operation_type TEXT NOT NULL, -- 'create', 'update', 'transfer', 'version', 'verify'
    idea_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    data_hash TEXT NOT NULL, -- SHA-256 of the idea content
    signature TEXT NOT NULL, -- Cryptographic signature
    merkle_root TEXT, -- For batching multiple operations
    nonce TEXT NOT NULL,
    gas_used INTEGER DEFAULT 1,
    status TEXT DEFAULT 'confirmed', -- 'pending', 'confirmed', 'failed'
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_operation_type CHECK (operation_type IN ('create', 'update', 'transfer', 'version', 'verify', 'lock', 'unlock')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- Ownership proofs table - current ownership state
CREATE TABLE IF NOT EXISTS public.idea_ownership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID UNIQUE NOT NULL,
    current_owner_id UUID NOT NULL REFERENCES auth.users(id),
    original_creator_id UUID NOT NULL REFERENCES auth.users(id),
    ownership_token TEXT UNIQUE NOT NULL, -- NFT-like token
    proof_hash TEXT NOT NULL, -- Current proof of ownership
    last_transfer_block BIGINT REFERENCES public.idea_ledger(block_number),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Verification challenges table - for proving ownership
CREATE TABLE IF NOT EXISTS public.ownership_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID NOT NULL,
    challenger_id UUID NOT NULL REFERENCES auth.users(id),
    challenge_type TEXT NOT NULL, -- 'ownership_dispute', 'plagiarism_claim', 'prior_art'
    challenge_data JSONB NOT NULL,
    evidence_hash TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'rejected'
    resolution JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolver_id UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_challenge_type CHECK (challenge_type IN ('ownership_dispute', 'plagiarism_claim', 'prior_art', 'authenticity')),
    CONSTRAINT valid_challenge_status CHECK (status IN ('pending', 'resolved', 'rejected'))
);

-- Smart contract-like rules table
CREATE TABLE IF NOT EXISTS public.ownership_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT UNIQUE NOT NULL,
    rule_type TEXT NOT NULL, -- 'transfer', 'verification', 'challenge'
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_block_number ON public.idea_ledger(block_number);
CREATE INDEX IF NOT EXISTS idx_ledger_idea_id ON public.idea_ledger(idea_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON public.idea_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON public.idea_ledger(timestamp);
CREATE INDEX IF NOT EXISTS idx_ledger_operation_type ON public.idea_ledger(operation_type);
CREATE INDEX IF NOT EXISTS idx_ledger_tx_hash ON public.idea_ledger(transaction_hash);

CREATE INDEX IF NOT EXISTS idx_ownership_idea_id ON public.idea_ownership(idea_id);
CREATE INDEX IF NOT EXISTS idx_ownership_current_owner ON public.idea_ownership(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_ownership_token ON public.idea_ownership(ownership_token);

CREATE INDEX IF NOT EXISTS idx_challenges_idea_id ON public.ownership_challenges(idea_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.ownership_challenges(status);

-- Triggers for immutability and integrity
CREATE OR REPLACE FUNCTION public.prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent any modification to confirmed ledger entries
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        IF OLD.status = 'confirmed' THEN
            RAISE EXCEPTION 'Cannot modify confirmed ledger entries - blockchain immutability';
        END IF;
    END IF;
    
    -- Allow only status updates from pending to confirmed/failed
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'pending' AND NEW.status != OLD.status THEN
            RAISE EXCEPTION 'Can only update status of pending transactions';
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ledger_immutability
    BEFORE UPDATE OR DELETE ON public.idea_ledger
    FOR EACH ROW EXECUTE FUNCTION public.prevent_ledger_modification();

-- Function to calculate hash chain integrity
CREATE OR REPLACE FUNCTION public.verify_ledger_integrity(start_block BIGINT DEFAULT 1, end_block BIGINT DEFAULT NULL)
RETURNS TABLE(
    block_number BIGINT,
    is_valid BOOLEAN,
    expected_hash TEXT,
    actual_hash TEXT
) AS $$
DECLARE
    current_block RECORD;
    prev_hash TEXT := '';
    calculated_hash TEXT;
BEGIN
    end_block := COALESCE(end_block, (SELECT MAX(block_number) FROM public.idea_ledger));
    
    FOR current_block IN 
        SELECT * FROM public.idea_ledger 
        WHERE block_number BETWEEN start_block AND end_block
        ORDER BY block_number
    LOOP
        -- Calculate expected hash based on previous block
        calculated_hash := encode(
            digest(
                CONCAT(
                    prev_hash,
                    current_block.timestamp::text,
                    current_block.operation_type,
                    current_block.idea_id::text,
                    current_block.user_id::text,
                    current_block.data_hash,
                    current_block.nonce
                ), 
                'sha256'
            ), 
            'hex'
        );
        
        RETURN QUERY SELECT 
            current_block.block_number,
            current_block.transaction_hash = calculated_hash,
            calculated_hash,
            current_block.transaction_hash;
            
        prev_hash := current_block.transaction_hash;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create ledger entry
CREATE OR REPLACE FUNCTION public.create_ledger_entry(
    p_operation_type TEXT,
    p_idea_id UUID,
    p_user_id UUID,
    p_data_hash TEXT,
    p_signature TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_previous_hash TEXT;
    v_nonce TEXT;
    v_transaction_hash TEXT;
    v_ledger_id UUID;
BEGIN
    -- Get previous block hash
    SELECT transaction_hash INTO v_previous_hash
    FROM public.idea_ledger
    ORDER BY block_number DESC
    LIMIT 1;
    
    v_previous_hash := COALESCE(v_previous_hash, '0000000000000000000000000000000000000000000000000000000000000000');
    
    -- Generate nonce
    v_nonce := encode(gen_random_bytes(16), 'hex');
    
    -- Calculate transaction hash
    v_transaction_hash := encode(
        digest(
            CONCAT(
                v_previous_hash,
                NOW()::text,
                p_operation_type,
                p_idea_id::text,
                p_user_id::text,
                p_data_hash,
                v_nonce
            ), 
            'sha256'
        ), 
        'hex'
    );
    
    -- Insert ledger entry
    INSERT INTO public.idea_ledger (
        transaction_hash,
        previous_hash,
        operation_type,
        idea_id,
        user_id,
        data_hash,
        signature,
        nonce,
        metadata
    ) VALUES (
        v_transaction_hash,
        v_previous_hash,
        p_operation_type,
        p_idea_id,
        p_user_id,
        p_data_hash,
        p_signature,
        v_nonce,
        p_metadata
    ) RETURNING id INTO v_ledger_id;
    
    RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate ownership token
CREATE OR REPLACE FUNCTION public.generate_ownership_token(p_idea_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            CONCAT(
                'SMOOTHBRAINS_IDEA_',
                p_idea_id::text,
                '_OWNER_',
                p_user_id::text,
                '_',
                extract(epoch from NOW())::text
            ),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.idea_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_rules ENABLE ROW LEVEL SECURITY;

-- Ledger is read-only for all authenticated users (transparency)
CREATE POLICY "Ledger is publicly readable" ON public.idea_ledger
    FOR SELECT USING (true);

-- Only system can insert to ledger (via functions)
CREATE POLICY "System can insert ledger entries" ON public.idea_ledger
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ownership policies
CREATE POLICY "Users can view ownership of their ideas" ON public.idea_ownership
    FOR SELECT USING (
        current_owner_id = auth.uid() 
        OR original_creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.ideas 
            WHERE ideas.id = idea_ownership.idea_id 
            AND ideas.user_id = auth.uid()
        )
    );

-- Challenge policies
CREATE POLICY "Users can create challenges" ON public.ownership_challenges
    FOR INSERT WITH CHECK (challenger_id = auth.uid());

CREATE POLICY "Users can view challenges they created or are involved in" ON public.ownership_challenges
    FOR SELECT USING (
        challenger_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.idea_ownership 
            WHERE idea_ownership.idea_id = ownership_challenges.idea_id
            AND idea_ownership.current_owner_id = auth.uid()
        )
    );

-- View for ownership verification
CREATE OR REPLACE VIEW public.ownership_verification AS
SELECT 
    io.idea_id,
    io.current_owner_id,
    io.original_creator_id,
    io.ownership_token,
    io.proof_hash,
    i.title as idea_title,
    p1.username as current_owner_username,
    p2.username as original_creator_username,
    (
        SELECT COUNT(*) 
        FROM public.idea_ledger il 
        WHERE il.idea_id = io.idea_id 
        AND il.status = 'confirmed'
    ) as ledger_entries,
    (
        SELECT MAX(il.timestamp) 
        FROM public.idea_ledger il 
        WHERE il.idea_id = io.idea_id 
        AND il.operation_type = 'verify'
        AND il.status = 'confirmed'
    ) as last_verification,
    (
        SELECT COUNT(*) 
        FROM public.ownership_challenges oc 
        WHERE oc.idea_id = io.idea_id 
        AND oc.status = 'pending'
    ) as pending_challenges
FROM public.idea_ownership io
JOIN public.ideas i ON i.id = io.idea_id
LEFT JOIN public.profiles p1 ON p1.user_id = io.current_owner_id
LEFT JOIN public.profiles p2 ON p2.user_id = io.original_creator_id;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.idea_ledger TO anon, authenticated;
GRANT ALL ON public.idea_ownership TO authenticated;
GRANT ALL ON public.ownership_challenges TO authenticated;
GRANT SELECT ON public.ownership_rules TO authenticated;
GRANT SELECT ON public.ownership_verification TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ledger_integrity TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ledger_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ownership_token TO authenticated;