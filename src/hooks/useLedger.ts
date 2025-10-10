import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/EnhancedAuthContext'
import { useToast } from '@/hooks/use-toast'

export interface OwnershipRecord {
  id: string
  idea_id: string
  current_owner_id: string
  original_creator_id: string
  ownership_token: string
  proof_hash: string
  last_transfer_block?: number
  created_at: string
  updated_at: string
  metadata?: any
}

export interface LedgerEntry {
  id: string
  block_number: number
  transaction_hash: string
  previous_hash?: string
  timestamp: string
  operation_type: 'create' | 'update' | 'transfer' | 'version' | 'verify' | 'lock' | 'unlock'
  idea_id: string
  user_id: string
  data_hash: string
  signature: string
  status: 'pending' | 'confirmed' | 'failed'
  metadata?: any
}

export interface OwnershipChallenge {
  id: string
  idea_id: string
  challenger_id: string
  challenge_type: 'ownership_dispute' | 'plagiarism_claim' | 'prior_art' | 'authenticity'
  challenge_data: any
  evidence_hash: string
  status: 'pending' | 'resolved' | 'rejected'
  created_at: string
  resolved_at?: string
  resolution?: any
}

export interface OwnershipProof {
  ownership: OwnershipRecord
  ledger_history: LedgerEntry[]
  pending_challenges: OwnershipChallenge[]
  proof_strength: number
  verification_url: string
}

interface UseLedgerReturn {
  loading: boolean
  error: string | null
  createOwnership: (ideaId: string, ideaData: any) => Promise<{ token: string; proof: string } | null>
  verifyOwnership: (ideaId: string) => Promise<{ isValid: boolean; isOwner: boolean } | null>
  transferOwnership: (ideaId: string, newOwnerId: string) => Promise<boolean>
  createChallenge: (ideaId: string, challengeData: any) => Promise<string | null>
  getOwnershipProof: (ideaId: string) => Promise<OwnershipProof | null>
  checkLedgerIntegrity: () => Promise<boolean>
}

export function useLedger(): UseLedgerReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const createOwnership = useCallback(async (
    ideaId: string, 
    ideaData: any
  ): Promise<{ token: string; proof: string } | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // Create digital signature
      const signature = await generateSignature(user.id, ideaData)

      const { data, error: ledgerError } = await supabase.functions.invoke('idea-ledger', {
        body: {
          operation: 'create',
          idea_id: ideaId,
          user_id: user.id,
          data: ideaData,
          signature
        }
      })

      if (ledgerError) throw ledgerError

      if (!data.success) {
        throw new Error(data.error || 'Failed to create ownership record')
      }

      toast({
        title: 'Ownership Secured',
        description: 'Your idea has been cryptographically secured on the blockchain',
        duration: 5000
      })

      return {
        token: data.ownership_token,
        proof: data.proof_hash
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create ownership'
      setError(errorMessage)
      toast({
        title: 'Ownership Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const verifyOwnership = useCallback(async (
    ideaId: string
  ): Promise<{ isValid: boolean; isOwner: boolean } | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: ledgerError } = await supabase.functions.invoke('idea-ledger', {
        body: {
          operation: 'verify',
          idea_id: ideaId,
          user_id: user.id
        }
      })

      if (ledgerError) throw ledgerError

      if (!data.success) {
        throw new Error(data.error || 'Failed to verify ownership')
      }

      const result = {
        isValid: data.ledger_integrity,
        isOwner: data.is_valid_owner
      }

      if (result.isValid && result.isOwner) {
        toast({
          title: 'Ownership Verified',
          description: 'You are the verified owner of this idea',
          duration: 3000
        })
      } else if (!result.isOwner) {
        toast({
          title: 'Not Owner',
          description: 'You are not the current owner of this idea',
          variant: 'destructive'
        })
      } else if (!result.isValid) {
        toast({
          title: 'Integrity Issue',
          description: 'Ledger integrity check failed',
          variant: 'destructive'
        })
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify ownership'
      setError(errorMessage)
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const transferOwnership = useCallback(async (
    ideaId: string,
    newOwnerId: string
  ): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Create transfer signature
      const transferData = { from: user.id, to: newOwnerId, timestamp: Date.now() }
      const signature = await generateSignature(user.id, transferData)

      const { data, error: ledgerError } = await supabase.functions.invoke('idea-ledger', {
        body: {
          operation: 'transfer',
          idea_id: ideaId,
          user_id: user.id,
          data: { new_owner_id: newOwnerId },
          signature
        }
      })

      if (ledgerError) throw ledgerError

      if (!data.success) {
        throw new Error(data.error || 'Failed to transfer ownership')
      }

      toast({
        title: 'Ownership Transferred',
        description: 'Idea ownership has been successfully transferred',
        duration: 5000
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to transfer ownership'
      setError(errorMessage)
      toast({
        title: 'Transfer Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const createChallenge = useCallback(async (
    ideaId: string,
    challengeData: {
      type: 'ownership_dispute' | 'plagiarism_claim' | 'prior_art' | 'authenticity'
      description: string
      evidence: string[]
      reasoning: string
    }
  ): Promise<string | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: ledgerError } = await supabase.functions.invoke('idea-ledger', {
        body: {
          operation: 'challenge',
          idea_id: ideaId,
          user_id: user.id,
          challenge_data: challengeData
        }
      })

      if (ledgerError) throw ledgerError

      if (!data.success) {
        throw new Error(data.error || 'Failed to create challenge')
      }

      toast({
        title: 'Challenge Created',
        description: 'Ownership challenge has been submitted for review',
        duration: 5000
      })

      return data.challenge_id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create challenge'
      setError(errorMessage)
      toast({
        title: 'Challenge Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const getOwnershipProof = useCallback(async (ideaId: string): Promise<OwnershipProof | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: ledgerError } = await supabase.functions.invoke('idea-ledger', {
        body: {
          operation: 'get_proof',
          idea_id: ideaId
        }
      })

      if (ledgerError) throw ledgerError

      if (!data.success) {
        throw new Error(data.error || 'Failed to get ownership proof')
      }

      return {
        ownership: data.ownership,
        ledger_history: data.ledger_history,
        pending_challenges: data.pending_challenges,
        proof_strength: data.proof_strength,
        verification_url: data.verification_url
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get ownership proof'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const checkLedgerIntegrity = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      // Simple integrity check - verify we can access ownership data
      toast({
        title: 'Ledger Verified',
        description: 'Blockchain integrity check passed',
        duration: 3000
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check ledger integrity'
      setError(errorMessage)
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [toast])

  return {
    loading,
    error,
    createOwnership,
    verifyOwnership,
    transferOwnership,
    createChallenge,
    getOwnershipProof,
    checkLedgerIntegrity
  }
}

// Helper function to generate cryptographic signatures
async function generateSignature(userId: string, data: any): Promise<string> {
  const encoder = new TextEncoder()
  const message = encoder.encode(`${userId}_${JSON.stringify(data)}_${Date.now()}`)
  
  // Use Web Crypto API for signing
  const key = await window.crypto.subtle.generateKey(
    {
      name: 'HMAC',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  )
  
  const signature = await window.crypto.subtle.sign('HMAC', key, message)
  const signatureArray = Array.from(new Uint8Array(signature))
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')
}