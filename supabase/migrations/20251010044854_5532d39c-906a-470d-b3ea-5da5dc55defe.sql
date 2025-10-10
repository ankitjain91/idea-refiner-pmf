-- Add SET search_path to existing functions to fix security warnings

-- Fix generate_ownership_token function
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

-- Fix create_ledger_entry function
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
  SELECT COALESCE(MAX(block_number), 0) + 1 INTO v_block_number
  FROM public.idea_ledger;
  
  SELECT transaction_hash INTO v_previous_hash
  FROM public.idea_ledger
  WHERE block_number = v_block_number - 1;
  
  v_transaction_hash := encode(
    digest(
      v_block_number::text || 
      COALESCE(v_previous_hash, '') || 
      p_operation_type || 
      p_idea_id::text || 
      p_user_id::text || 
      p_data_hash || 
      p_signature ||
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  );
  
  INSERT INTO public.idea_ledger (
    block_number,
    transaction_hash,
    previous_hash,
    operation_type,
    idea_id,
    user_id,
    data_hash,
    signature,
    metadata
  ) VALUES (
    v_block_number,
    v_transaction_hash,
    v_previous_hash,
    p_operation_type,
    p_idea_id,
    p_user_id,
    p_data_hash,
    p_signature,
    p_metadata
  );
  
  RETURN v_block_number;
END;
$$;

-- Fix verify_ledger_integrity function
CREATE OR REPLACE FUNCTION public.verify_ledger_integrity(
  start_block BIGINT DEFAULT 1,
  end_block BIGINT DEFAULT NULL
)
RETURNS TABLE(
  block_number BIGINT,
  is_valid BOOLEAN,
  expected_hash TEXT,
  actual_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_block BIGINT;
BEGIN
  IF end_block IS NULL THEN
    SELECT MAX(idea_ledger.block_number) INTO v_end_block FROM public.idea_ledger;
  ELSE
    v_end_block := end_block;
  END IF;
  
  RETURN QUERY
  WITH ledger_verification AS (
    SELECT 
      l.block_number,
      l.transaction_hash as actual_hash,
      l.previous_hash,
      encode(
        digest(
          l.block_number::text || 
          COALESCE(l.previous_hash, '') || 
          l.operation_type || 
          l.idea_id::text || 
          l.user_id::text || 
          l.data_hash || 
          l.signature ||
          extract(epoch from l.timestamp)::text,
          'sha256'
        ),
        'hex'
      ) as expected_hash
    FROM public.idea_ledger l
    WHERE l.block_number BETWEEN start_block AND v_end_block
    ORDER BY l.block_number
  )
  SELECT 
    lv.block_number,
    lv.expected_hash = lv.actual_hash as is_valid,
    lv.expected_hash,
    lv.actual_hash
  FROM ledger_verification lv;
END;
$$;