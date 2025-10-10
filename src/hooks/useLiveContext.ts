import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/EnhancedAuthContext'
import { useToast } from '@/hooks/use-toast'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export interface LiveContext {
  id: string
  idea_id: string
  context_type: 'market' | 'competitor' | 'sentiment' | 'trends'
  data: any
  confidence_score: number
  sources: string[]
  last_updated: string
  expires_at: string
  metadata?: any
}

interface UseLiveContextReturn {
  contexts: LiveContext[]
  loading: boolean
  error: string | null
  refreshContext: (ideaId: string, forceRefresh?: boolean) => Promise<LiveContext[]>
  getContextByType: (type: LiveContext['context_type']) => LiveContext | null
  isContextExpired: (context: LiveContext) => boolean
}

export function useLiveContext(ideaId?: string): UseLiveContextReturn {
  const [contexts, setContexts] = useState<LiveContext[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchContext = useCallback(async (id: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('idea_live_context')
        .select('*')
        .eq('idea_id', id)
        .order('last_updated', { ascending: false })

      if (fetchError) throw fetchError

      setContexts(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch live context'
      setError(errorMessage)
      console.error('Live context fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const refreshContext = useCallback(async (ideaId: string, forceRefresh = false): Promise<LiveContext[]> => {
    if (!user) {
      setError('User not authenticated')
      return []
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

      // Call the edge function to refresh context
      const { data, error: refreshError } = await supabase.functions.invoke('refresh-live-context', {
        body: {
          idea_id: ideaId,
          idea_text: `${idea.title}: ${idea.description}`,
          category: idea.category,
          force_refresh: forceRefresh
        }
      })

      if (refreshError) throw refreshError

      if (!data.success) {
        throw new Error(data.error || 'Context refresh failed')
      }

      // Update local state
      setContexts(data.context || [])

      if (!data.from_cache) {
        toast({
          title: 'Context Refreshed',
          description: 'Live market data has been updated',
          duration: 3000
        })
      }

      return data.context || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh context'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      return []
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const getContextByType = useCallback((type: LiveContext['context_type']): LiveContext | null => {
    return contexts.find(ctx => ctx.context_type === type) || null
  }, [contexts])

  const isContextExpired = useCallback((context: LiveContext): boolean => {
    return new Date(context.expires_at) <= new Date()
  }, [])

  // Auto-refresh expired context
  useEffect(() => {
    if (!ideaId || !contexts.length) return

    const expiredContexts = contexts.filter(isContextExpired)
    if (expiredContexts.length > 0) {
      console.log('Auto-refreshing expired contexts:', expiredContexts.map(c => c.context_type))
      refreshContext(ideaId, false)
    }
  }, [ideaId, contexts, isContextExpired, refreshContext])

  useEffect(() => {
    if (ideaId) {
      fetchContext(ideaId)
    }
  }, [ideaId, fetchContext])

  return {
    contexts,
    loading,
    error,
    refreshContext,
    getContextByType,
    isContextExpired
  }
}