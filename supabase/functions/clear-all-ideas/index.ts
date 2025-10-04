import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'enterprise')) {
      throw new Error('Insufficient permissions - admin access required')
    }

    console.log(`Admin ${user.id} initiated clearing all ideas from database`)

    const deletionSummary = {
      implementation_tasks: 0,
      refinements: 0,
      realtime_metrics: 0,
      idea_analyses: 0,
      analysis_sessions: 0,
      brainstorming_sessions: 0,
      dashboard_data: 0,
      ideas: 0
    }

    // Delete in order of foreign key dependencies (child tables first)
    
    // 1. Delete implementation tasks (references idea_analyses)
    const { count: tasksCount } = await supabaseClient
      .from('implementation_tasks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    deletionSummary.implementation_tasks = tasksCount || 0

    // 2. Delete refinements (references ideas)
    const { count: refinementsCount } = await supabaseClient
      .from('refinements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    deletionSummary.refinements = refinementsCount || 0

    // 3. Delete realtime metrics (references idea_analyses)
    const { count: metricsCount } = await supabaseClient
      .from('realtime_metrics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    deletionSummary.realtime_metrics = metricsCount || 0

    // 4. Delete idea analyses
    const { count: analysesCount } = await supabaseClient
      .from('idea_analyses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    deletionSummary.idea_analyses = analysesCount || 0

    // 5. Delete analysis sessions
    const { count: sessionsCount } = await supabaseClient
      .from('analysis_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    deletionSummary.analysis_sessions = sessionsCount || 0

    // 6. Delete brainstorming sessions
    const { count: brainstormCount } = await supabaseClient
      .from('brainstorming_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    deletionSummary.brainstorming_sessions = brainstormCount || 0

    // 7. Delete dashboard data
    const { count: dashboardCount } = await supabaseClient
      .from('dashboard_data')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    deletionSummary.dashboard_data = dashboardCount || 0

    // 8. Finally delete ideas
    const { count: ideasCount } = await supabaseClient
      .from('ideas')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    deletionSummary.ideas = ideasCount || 0

    console.log('Deletion summary:', deletionSummary)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All ideas and related data cleared successfully',
        deletionSummary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error clearing ideas:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Unauthorized') || error.message.includes('permissions') ? 403 : 500
      }
    )
  }
})
