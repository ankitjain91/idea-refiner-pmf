import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface LedgerRequest {
  operation: 'create' | 'verify' | 'transfer' | 'challenge' | 'get_proof'
  idea_id?: string
  user_id?: string
  data?: any
  signature?: string
  challenge_data?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { operation, idea_id, user_id, data, signature, challenge_data }: LedgerRequest = await req.json()
    
    console.log('[idea-ledger] Processing operation:', operation)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    switch (operation) {
      case 'create':
        return await createOwnershipRecord(supabase, idea_id!, user_id!, data, signature!)
      
      case 'verify':
        return await verifyOwnership(supabase, idea_id!, user_id!)
      
      case 'transfer':
        return await transferOwnership(supabase, idea_id!, user_id!, data.new_owner_id, signature!)
      
      case 'challenge':
        return await createChallenge(supabase, idea_id!, user_id!, challenge_data)
      
      case 'get_proof':
        return await getOwnershipProof(supabase, idea_id!)
      
      default:
        throw new Error('Invalid operation')
    }

  } catch (error) {
    console.error('[idea-ledger] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function createOwnershipRecord(supabase: any, ideaId: string, userId: string, ideaData: any, signature: string) {
  try {
    // Create data hash
    const dataHash = createHash('sha256').update(JSON.stringify(ideaData)).digest('hex')
    
    // Create ledger entry
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .rpc('create_ledger_entry', {
        p_operation_type: 'create',
        p_idea_id: ideaId,
        p_user_id: userId,
        p_data_hash: dataHash,
        p_signature: signature,
        p_metadata: {
          idea_title: ideaData.title,
          timestamp: new Date().toISOString()
        }
      })

    if (ledgerError) throw ledgerError

    // Generate ownership token
    const { data: ownershipToken, error: tokenError } = await supabase
      .rpc('generate_ownership_token', {
        p_idea_id: ideaId,
        p_user_id: userId
      })

    if (tokenError) throw tokenError

    // Create ownership record
    const proofHash = createHash('sha256').update(`${ideaId}${userId}${dataHash}${ownershipToken}`).digest('hex')
    
    const { data: ownership, error: ownershipError } = await supabase
      .from('idea_ownership')
      .insert({
        idea_id: ideaId,
        current_owner_id: userId,
        original_creator_id: userId,
        ownership_token: ownershipToken,
        proof_hash: proofHash,
        metadata: {
          creation_timestamp: new Date().toISOString(),
          data_hash: dataHash
        }
      })
      .select()
      .single()

    if (ownershipError) throw ownershipError

    return new Response(JSON.stringify({
      success: true,
      ownership_token: ownershipToken,
      proof_hash: proofHash,
      ledger_id: ledgerEntry,
      message: 'Ownership record created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    throw new Error(`Failed to create ownership record: ${error.message}`)
  }
}

async function verifyOwnership(supabase: any, ideaId: string, userId: string) {
  try {
    // Get current ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from('idea_ownership')
      .select('*')
      .eq('idea_id', ideaId)
      .single()

    if (ownershipError) throw ownershipError

    if (!ownership) {
      throw new Error('No ownership record found')
    }

    // Verify ledger integrity for this idea
    const { data: verification, error: verificationError } = await supabase
      .rpc('verify_ledger_integrity', {
        start_block: 1,
        end_block: null
      })

    if (verificationError) throw verificationError

    const isValid = verification.every((block: any) => block.is_valid)

    // Create verification ledger entry
    const verificationData = {
      ownership_token: ownership.ownership_token,
      verification_result: isValid,
      verified_by: userId
    }

    const dataHash = createHash('sha256').update(JSON.stringify(verificationData)).digest('hex')
    const signature = createHash('sha256').update(`verify_${ideaId}_${userId}_${Date.now()}`).digest('hex')

    const { data: ledgerEntry, error: ledgerError } = await supabase
      .rpc('create_ledger_entry', {
        p_operation_type: 'verify',
        p_idea_id: ideaId,
        p_user_id: userId,
        p_data_hash: dataHash,
        p_signature: signature,
        p_metadata: verificationData
      })

    if (ledgerError) throw ledgerError

    return new Response(JSON.stringify({
      success: true,
      is_valid_owner: ownership.current_owner_id === userId,
      is_original_creator: ownership.original_creator_id === userId,
      ownership_token: ownership.ownership_token,
      ledger_integrity: isValid,
      verification_details: verification,
      ledger_entry_id: ledgerEntry
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    throw new Error(`Failed to verify ownership: ${error.message}`)
  }
}

async function transferOwnership(supabase: any, ideaId: string, currentOwnerId: string, newOwnerId: string, signature: string) {
  try {
    // Verify current ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from('idea_ownership')
      .select('*')
      .eq('idea_id', ideaId)
      .eq('current_owner_id', currentOwnerId)
      .single()

    if (ownershipError || !ownership) {
      throw new Error('Invalid current owner or ownership not found')
    }

    // Create transfer data
    const transferData = {
      from_owner: currentOwnerId,
      to_owner: newOwnerId,
      timestamp: new Date().toISOString(),
      original_token: ownership.ownership_token
    }

    const dataHash = createHash('sha256').update(JSON.stringify(transferData)).digest('hex')

    // Create ledger entry
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .rpc('create_ledger_entry', {
        p_operation_type: 'transfer',
        p_idea_id: ideaId,
        p_user_id: currentOwnerId,
        p_data_hash: dataHash,
        p_signature: signature,
        p_metadata: transferData
      })

    if (ledgerError) throw ledgerError

    // Generate new ownership token
    const { data: newOwnershipToken, error: tokenError } = await supabase
      .rpc('generate_ownership_token', {
        p_idea_id: ideaId,
        p_user_id: newOwnerId
      })

    if (tokenError) throw tokenError

    // Update ownership record
    const newProofHash = createHash('sha256').update(`${ideaId}${newOwnerId}${dataHash}${newOwnershipToken}`).digest('hex')

    const { data: updatedOwnership, error: updateError } = await supabase
      .from('idea_ownership')
      .update({
        current_owner_id: newOwnerId,
        ownership_token: newOwnershipToken,
        proof_hash: newProofHash,
        last_transfer_block: ledgerEntry,
        updated_at: new Date().toISOString()
      })
      .eq('idea_id', ideaId)
      .select()
      .single()

    if (updateError) throw updateError

    return new Response(JSON.stringify({
      success: true,
      new_ownership_token: newOwnershipToken,
      new_proof_hash: newProofHash,
      transfer_ledger_entry: ledgerEntry,
      message: 'Ownership transferred successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    throw new Error(`Failed to transfer ownership: ${error.message}`)
  }
}

async function createChallenge(supabase: any, ideaId: string, challengerId: string, challengeData: any) {
  try {
    // Create evidence hash
    const evidenceHash = createHash('sha256').update(JSON.stringify(challengeData)).digest('hex')

    // Insert challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('ownership_challenges')
      .insert({
        idea_id: ideaId,
        challenger_id: challengerId,
        challenge_type: challengeData.type,
        challenge_data: challengeData,
        evidence_hash: evidenceHash
      })
      .select()
      .single()

    if (challengeError) throw challengeError

    // Create ledger entry for challenge
    const signature = createHash('sha256').update(`challenge_${ideaId}_${challengerId}_${Date.now()}`).digest('hex')

    const { data: ledgerEntry, error: ledgerError } = await supabase
      .rpc('create_ledger_entry', {
        p_operation_type: 'verify',
        p_idea_id: ideaId,
        p_user_id: challengerId,
        p_data_hash: evidenceHash,
        p_signature: signature,
        p_metadata: {
          challenge_id: challenge.id,
          challenge_type: challengeData.type
        }
      })

    if (ledgerError) throw ledgerError

    return new Response(JSON.stringify({
      success: true,
      challenge_id: challenge.id,
      evidence_hash: evidenceHash,
      ledger_entry_id: ledgerEntry,
      message: 'Ownership challenge created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    throw new Error(`Failed to create challenge: ${error.message}`)
  }
}

async function getOwnershipProof(supabase: any, ideaId: string) {
  try {
    // Get ownership details
    const { data: ownership, error: ownershipError } = await supabase
      .from('ownership_verification')
      .select('*')
      .eq('idea_id', ideaId)
      .single()

    if (ownershipError) throw ownershipError

    // Get ledger history
    const { data: ledgerHistory, error: ledgerError } = await supabase
      .from('idea_ledger')
      .select('*')
      .eq('idea_id', ideaId)
      .eq('status', 'confirmed')
      .order('block_number', { ascending: true })

    if (ledgerError) throw ledgerError

    // Get pending challenges
    const { data: challenges, error: challengesError } = await supabase
      .from('ownership_challenges')
      .select('*')
      .eq('idea_id', ideaId)
      .eq('status', 'pending')

    if (challengesError) throw challengesError

    return new Response(JSON.stringify({
      success: true,
      ownership: ownership,
      ledger_history: ledgerHistory,
      pending_challenges: challenges,
      proof_strength: calculateProofStrength(ledgerHistory, challenges),
      verification_url: `${SUPABASE_URL}/rest/v1/ownership_verification?idea_id=eq.${ideaId}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    throw new Error(`Failed to get ownership proof: ${error.message}`)
  }
}

function calculateProofStrength(ledgerHistory: any[], challenges: any[]) {
  const baseStrength = 50
  const historyBonus = Math.min(30, ledgerHistory.length * 5)
  const challengePenalty = challenges.length * 10
  const timeBonus = ledgerHistory.length > 0 ? 
    Math.min(20, Math.floor((Date.now() - new Date(ledgerHistory[0].timestamp).getTime()) / (1000 * 60 * 60 * 24))) : 0

  return Math.max(0, Math.min(100, baseStrength + historyBonus + timeBonus - challengePenalty))
}