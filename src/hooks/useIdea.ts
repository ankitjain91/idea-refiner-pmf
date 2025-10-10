import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/EnhancedAuthContext'
import { useToast } from '@/hooks/use-toast'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export interface Idea {
  id: string
  user_id: string
  title: string
  description: string
  category?: string
  target_market?: string[]
  created_at: string
  updated_at: string
  is_active: boolean
  metadata?: any
}

export interface IdeaVersion {
  id: string
  idea_id: string
  version_number: number
  title: string
  description: string
  changes_summary?: string
  created_at: string
  metadata?: any
}

interface UseIdeaReturn {
  idea: Idea | null
  versions: IdeaVersion[]
  loading: boolean
  error: string | null
  createIdea: (data: Partial<Idea>) => Promise<Idea | null>
  updateIdea: (id: string, data: Partial<Idea>) => Promise<boolean>
  deleteIdea: (id: string) => Promise<boolean>
  createVersion: (ideaId: string, changes: Partial<IdeaVersion>) => Promise<boolean>
  getUserIdeas: () => Promise<Idea[]>
}

export function useIdea(ideaId?: string): UseIdeaReturn {
  const [idea, setIdea] = useState<Idea | null>(null)
  const [versions, setVersions] = useState<IdeaVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchIdea = useCallback(async (id: string) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError

      setIdea(data)

      // Fetch versions
      const { data: versionsData, error: versionsError } = await supabase
        .from('idea_versions')
        .select('*')
        .eq('idea_id', id)
        .order('version_number', { ascending: false })

      if (versionsError) throw versionsError

      setVersions(versionsData || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch idea'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const createIdea = useCallback(async (data: Partial<Idea>): Promise<Idea | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const ideaData = {
        user_id: user.id,
        title: data.title || '',
        description: data.description || '',
        category: data.category,
        target_market: data.target_market || [],
        metadata: data.metadata || {}
      }

      const { data: newIdea, error: createError } = await supabase
        .from('ideas')
        .insert(ideaData)
        .select()
        .single()

      if (createError) throw createError

      // Create initial version
      await supabase
        .from('idea_versions')
        .insert({
          idea_id: newIdea.id,
          version_number: 1,
          title: newIdea.title,
          description: newIdea.description,
          changes_summary: 'Initial version'
        })

      setIdea(newIdea)
      
      toast({
        title: 'Success',
        description: 'Idea created successfully'
      })

      return newIdea
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create idea'
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

  const updateIdea = useCallback(async (id: string, data: Partial<Idea>): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { data: updatedIdea, error: updateError } = await supabase
        .from('ideas')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      setIdea(updatedIdea)
      
      toast({
        title: 'Success',
        description: 'Idea updated successfully'
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update idea'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const deleteIdea = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      if (idea?.id === id) {
        setIdea(null)
        setVersions([])
      }
      
      toast({
        title: 'Success',
        description: 'Idea deleted successfully'
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete idea'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [user, idea, toast])

  const createVersion = useCallback(async (ideaId: string, changes: Partial<IdeaVersion>): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Get current version number
      const { data: lastVersion } = await supabase
        .from('idea_versions')
        .select('version_number')
        .eq('idea_id', ideaId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      const nextVersion = (lastVersion?.version_number || 0) + 1

      const { data: newVersion, error: versionError } = await supabase
        .from('idea_versions')
        .insert({
          idea_id: ideaId,
          version_number: nextVersion,
          title: changes.title || '',
          description: changes.description || '',
          changes_summary: changes.changes_summary || `Version ${nextVersion}`,
          metadata: changes.metadata || {}
        })
        .select()
        .single()

      if (versionError) throw versionError

      setVersions(prev => [newVersion, ...prev])
      
      toast({
        title: 'Success',
        description: `Version ${nextVersion} created`
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create version'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  const getUserIdeas = useCallback(async (): Promise<Idea[]> => {
    if (!user) return []

    try {
      const { data, error: fetchError } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError

      return data || []
    } catch (err) {
      console.error('Failed to fetch user ideas:', err)
      return []
    }
  }, [user])

  useEffect(() => {
    if (ideaId) {
      fetchIdea(ideaId)
    }
  }, [ideaId, fetchIdea])

  return {
    idea,
    versions,
    loading,
    error,
    createIdea,
    updateIdea,
    deleteIdea,
    createVersion,
    getUserIdeas
  }
}