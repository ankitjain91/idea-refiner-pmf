import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/EnhancedAuthContext'
import { useToast } from '@/hooks/use-toast'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export interface PMFScore {
  id: string
  idea_id: string
  pmf_score: number
  score_breakdown: {
    market_size: number
    competition: number
    execution: number
    timing: number
    team: number
    product_uniqueness: number
    customer_validation: number
  }
  ai_confidence: number
  data_sources: string[]
  created_at: string
  metadata?: any
}

export interface Action {
  id: string
  idea_id: string
  title: string
  description: string
  priority: number
  category: string
  estimated_effort: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  ai_confidence: number
  due_date?: string
  completed_at?: string
  created_at: string
  metadata?: any
}

interface UsePMFReturn {
  currentScore: PMFScore | null
  scoreHistory: PMFScore[]
  actions: Action[]
  loading: boolean
  error: string | null
  computePMF: (ideaId: string, forceRecalculate?: boolean) => Promise<PMFScore | null>
  updateActionStatus: (actionId: string, status: Action['status']) => Promise<boolean>
  getScoreHistory: (ideaId: string) => Promise<PMFScore[]>
  refreshActions: (ideaId: string) => Promise<Action[]>
}

export function usePMF(ideaId?: string): UsePMFReturn {
  const [currentScore, setCurrentScore] = useState<PMFScore | null>(null)
  const [scoreHistory, setScoreHistory] = useState<PMFScore[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchPMFData = useCallback(async (id: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Get latest PMF score
      const { data: latestScore, error: scoreError } = await supabase
        .from('idea_scores')
        .select('*')
        .eq('idea_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (scoreError && scoreError.code !== 'PGRST116') { // PGRST116 = no rows
        throw scoreError
      }

      setCurrentScore(latestScore)

      // Get score history
      const { data: history, error: historyError } = await supabase
        .from('idea_scores')
        .select('*')
        .eq('idea_id', id)
        .order('created_at', { ascending: false })

      if (historyError) throw historyError

      setScoreHistory(history || [])

      // Get pending actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select('*')
        .eq('idea_id', id)
        .order('priority', { ascending: true })

      if (actionsError) throw actionsError

      setActions(actionsData || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch PMF data'
      setError(errorMessage)
      console.error('PMF fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const computePMF = useCallback(async (ideaId: string, forceRecalculate = false): Promise<PMFScore | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // Get idea details
      const { data: idea, error: ideaError } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .eq('user_id', user.id)
        .single()

      if (ideaError) throw ideaError

      // Call the edge function
      const { data, error: computeError } = await supabase.functions.invoke('compute-pmf-and-next-steps', {
        body: {
          idea_id: ideaId,
          idea_text: `${idea.title}: ${idea.description}`,
          user_context: {
            category: idea.category,
            target_market: idea.target_market
          },
          force_recalculate: forceRecalculate
        }
      })

      if (computeError) throw computeError

      if (!data.success) {
        throw new Error(data.error || 'PMF computation failed')
      }

      // Update local state
      const newScore: PMFScore = {
        id: '', // Will be set by database
        idea_id: ideaId,
        pmf_score: data.pmf_score,
        score_breakdown: data.score_breakdown,
        ai_confidence: data.confidence,
        data_sources: data.reasoning?.data_sources || [],
        created_at: new Date().toISOString(),
        metadata: {
          reasoning: data.reasoning,
          from_cache: data.from_cache
        }
      }

      setCurrentScore(newScore)
      setScoreHistory(prev => [newScore, ...prev])
      setActions(data.actions || [])

      toast({
        title: 'PMF Score Updated',
        description: `New PMF Score: ${data.pmf_score}/100`,
        duration: 5000
      })

      return newScore
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to compute PMF'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const updateActionStatus = useCallback(async (actionId: string, status: Action['status']): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    try {
      const updateData: any = { status }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { data: updatedAction, error: updateError } = await supabase
        .from('actions')
        .update(updateData)
        .eq('id', actionId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update local state
      setActions(prev => prev.map(action => 
        action.id === actionId ? { ...action, ...updatedAction } : action
      ))

      toast({
        title: 'Action Updated',
        description: `Action marked as ${status}`,
        duration: 3000
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update action'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    }
  }, [user, toast])

  const getScoreHistory = useCallback(async (ideaId: string): Promise<PMFScore[]> => {
    try {
      const { data, error } = await supabase
        .from('idea_scores')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setScoreHistory(data || [])
      return data || []
    } catch (err) {
      console.error('Failed to fetch score history:', err)
      return []
    }
  }, [])

  const refreshActions = useCallback(async (ideaId: string): Promise<Action[]> => {
    try {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('idea_id', ideaId)
        .order('priority', { ascending: true })

      if (error) throw error

      setActions(data || [])
      return data || []
    } catch (err) {
      console.error('Failed to refresh actions:', err)
      return []
    }
  }, [])

  useEffect(() => {
    if (ideaId) {
      fetchPMFData(ideaId)
    }
  }, [ideaId, fetchPMFData])

  return {
    currentScore,
    scoreHistory,
    actions,
    loading,
    error,
    computePMF,
    updateActionStatus,
    getScoreHistory,
    refreshActions
  }
}