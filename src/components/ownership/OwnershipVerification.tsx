import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Lock, 
  Unlock,
  ExternalLink,
  Clock,
  Flag,
  Copy,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useLedger, OwnershipProof, LedgerEntry } from '@/hooks/useLedger'
import { useAuth } from '@/contexts/EnhancedAuthContext'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface OwnershipVerificationProps {
  ideaId: string
  className?: string
}

export function OwnershipVerification({ ideaId, className }: OwnershipVerificationProps) {
  const [ownershipProof, setOwnershipProof] = useState<OwnershipProof | null>(null)
  const [showLedgerHistory, setShowLedgerHistory] = useState(false)
  const [challengeType, setChallengeType] = useState<string>('')
  const [challengeDescription, setChallengeDescription] = useState('')
  const [challengeEvidence, setChallengeEvidence] = useState('')
  const [challengeReasoning, setChallengeReasoning] = useState('')
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [isOwner, setIsOwner] = useState<boolean | null>(null)

  const { 
    loading, 
    error, 
    verifyOwnership, 
    createChallenge, 
    getOwnershipProof,
    checkLedgerIntegrity 
  } = useLedger()
  
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    loadOwnershipProof()
  }, [ideaId])

  const loadOwnershipProof = async () => {
    const proof = await getOwnershipProof(ideaId)
    if (proof) {
      setOwnershipProof(proof)
    } else {
      // No ownership record found - show message
      setOwnershipProof(null)
    }
  }

  const handleVerifyOwnership = async () => {
    const result = await verifyOwnership(ideaId)
    if (result) {
      setIsVerified(result.isValid)
      setIsOwner(result.isOwner)
    }
  }

  const handleCreateChallenge = async () => {
    if (!challengeType || !challengeDescription || !challengeReasoning) {
      toast({
        title: 'Incomplete Challenge',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    const challengeData = {
      type: challengeType as any,
      description: challengeDescription,
      evidence: challengeEvidence.split('\n').filter(e => e.trim()),
      reasoning: challengeReasoning
    }

    const challengeId = await createChallenge(ideaId, challengeData)
    if (challengeId) {
      setChallengeType('')
      setChallengeDescription('')
      setChallengeEvidence('')
      setChallengeReasoning('')
      loadOwnershipProof() // Refresh to show new challenge
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'Text copied to clipboard',
      duration: 2000
    })
  }

  const getProofStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-600'
    if (strength >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProofStrengthLabel = (strength: number) => {
    if (strength >= 80) return 'Strong'
    if (strength >= 60) return 'Moderate'
    if (strength >= 40) return 'Weak'
    return 'Very Weak'
  }

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'create':
        return <Lock className="h-4 w-4 text-green-500" />
      case 'verify':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'transfer':
        return <Unlock className="h-4 w-4 text-orange-500" />
      default:
        return <Eye className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Ownership Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* No ownership record message */}
        {!ownershipProof && !loading && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-900">No Ownership Record</span>
            </div>
            <p className="text-sm text-amber-700">
              This idea hasn't been registered on the blockchain yet. Ownership will be automatically created when you calculate PMF score.
            </p>
          </div>
        )}

        {/* Verification Status */}
        {ownershipProof && (
          <div className="space-y-4">
            <Button 
              onClick={handleVerifyOwnership}
              disabled={loading}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              Verify Ownership
            </Button>

            {isVerified !== null && (
              <div className={cn(
                'p-3 rounded-lg border',
                isVerified && isOwner ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              )}>
                <div className="flex items-center gap-2">
                  {isVerified && isOwner ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {isVerified && isOwner ? 'Verified Owner' : 
                     !isOwner ? 'Not Current Owner' : 'Verification Failed'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ownership Details */}
        {ownershipProof && (
          <div className="space-y-4">
            <Separator />
            
            <div>
              <h4 className="font-medium mb-3">Ownership Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Owner:</span>
                  <span>{ownershipProof.ownership.current_owner_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Creator:</span>
                  <span>{ownershipProof.ownership.original_creator_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ledger Entries:</span>
                  <span>{ownershipProof.ledger_history.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ownership Token:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(ownershipProof.ownership.ownership_token)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Proof Strength */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Proof Strength</span>
                <span className={cn('text-sm font-bold', getProofStrengthColor(ownershipProof.proof_strength))}>
                  {ownershipProof.proof_strength}/100 ({getProofStrengthLabel(ownershipProof.proof_strength)})
                </span>
              </div>
              <Progress value={ownershipProof.proof_strength} className="h-2" />
            </div>

            {/* Pending Challenges */}
            {ownershipProof.pending_challenges.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Pending Challenges</span>
                </div>
                <div className="space-y-2">
                  {ownershipProof.pending_challenges.map((challenge) => (
                    <div key={challenge.id} className="text-sm">
                      <Badge variant="outline" className="mb-1">
                        {challenge.challenge_type.replace('_', ' ')}
                      </Badge>
                      <p className="text-muted-foreground">
                        {JSON.parse(challenge.challenge_data).description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ledger History */}
            <div>
              <Button
                variant="ghost"
                onClick={() => setShowLedgerHistory(!showLedgerHistory)}
                className="w-full justify-between p-0 h-auto"
              >
                <span className="font-medium">Ledger History</span>
                {showLedgerHistory ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showLedgerHistory && (
                <ScrollArea className="h-64 mt-3">
                  <div className="space-y-2">
                    {ownershipProof.ledger_history.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getOperationIcon(entry.operation_type)}
                            <span className="font-medium capitalize">
                              {entry.operation_type}
                            </span>
                            <Badge variant="outline">
                              Block #{entry.block_number}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(entry.timestamp)}
                          </div>
                        </div>
                        
                        <div className="text-xs font-mono bg-muted p-2 rounded">
                          Hash: {entry.transaction_hash.substring(0, 16)}...
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(entry.transaction_hash)}
                            className="ml-2 h-4 w-4 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Verification URL */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(ownershipProof.verification_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Public Verification
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={checkLedgerIntegrity}
                disabled={loading}
              >
                <Shield className="h-4 w-4 mr-2" />
                Check Integrity
              </Button>
            </div>
          </div>
        )}

        {/* Challenge Creation */}
        {user && ownershipProof && (
          <div className="space-y-4">
            <Separator />
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Flag className="h-4 w-4 mr-2" />
                  Challenge Ownership
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Ownership Challenge</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Challenge Type</label>
                    <Select value={challengeType} onValueChange={setChallengeType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select challenge type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ownership_dispute">Ownership Dispute</SelectItem>
                        <SelectItem value="plagiarism_claim">Plagiarism Claim</SelectItem>
                        <SelectItem value="prior_art">Prior Art</SelectItem>
                        <SelectItem value="authenticity">Authenticity Question</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={challengeDescription}
                      onChange={(e) => setChallengeDescription(e.target.value)}
                      placeholder="Describe your challenge..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Evidence (one per line)</label>
                    <Textarea
                      value={challengeEvidence}
                      onChange={(e) => setChallengeEvidence(e.target.value)}
                      placeholder="List evidence URLs or references..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Reasoning</label>
                    <Textarea
                      value={challengeReasoning}
                      onChange={(e) => setChallengeReasoning(e.target.value)}
                      placeholder="Explain your reasoning for this challenge..."
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleCreateChallenge}
                    disabled={loading || !challengeType || !challengeDescription || !challengeReasoning}
                    className="w-full"
                  >
                    Submit Challenge
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}