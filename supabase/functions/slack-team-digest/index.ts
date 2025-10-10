import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
}

const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface DigestRequest {
  webhook_url?: string
  channel?: string
  time_period?: 'daily' | 'weekly'
  include_leaderboard?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      webhook_url = SLACK_WEBHOOK_URL, 
      channel = '#general', 
      time_period = 'weekly',
      include_leaderboard = true 
    }: DigestRequest = await req.json()
    
    if (!webhook_url) {
      throw new Error('No Slack webhook URL configured')
    }

    console.log('[slack_team_digest] Generating digest:', { time_period, include_leaderboard })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Calculate date range
    const now = new Date()
    const daysBack = time_period === 'daily' ? 1 : 7
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))

    // Get recent ideas
    const { data: recentIdeas } = await supabase
      .from('ideas')
      .select(`
        *,
        profiles:user_id (username, full_name)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Get recent PMF scores
    const { data: recentScores } = await supabase
      .from('idea_scores')
      .select(`
        *,
        ideas (title, user_id, profiles:user_id (username, full_name))
      `)
      .gte('created_at', startDate.toISOString())
      .order('pmf_score', { ascending: false })

    // Get completed actions
    const { data: completedActions } = await supabase
      .from('actions')
      .select(`
        *,
        ideas (title, user_id, profiles:user_id (username, full_name))
      `)
      .eq('status', 'completed')
      .gte('completed_at', startDate.toISOString())

    // Get leaderboard if requested
    let leaderboardData = null
    if (include_leaderboard) {
      const { data: leaderboard } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(5)
      
      leaderboardData = leaderboard
    }

    // Get referral stats
    const { data: referralStats } = await supabase
      .from('referrals')
      .select('status')
      .gte('created_at', startDate.toISOString())

    const newReferrals = referralStats?.filter(r => r.status === 'pending').length || 0
    const completedReferrals = referralStats?.filter(r => r.status === 'completed').length || 0

    // Build digest context
    const digestContext = {
      time_period,
      date_range: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      stats: {
        new_ideas: recentIdeas?.length || 0,
        pmf_scores_calculated: recentScores?.length || 0,
        actions_completed: completedActions?.length || 0,
        new_referrals: newReferrals,
        completed_referrals: completedReferrals,
        avg_pmf_score: recentScores?.length ? 
          Math.round(recentScores.reduce((sum, s) => sum + s.pmf_score, 0) / recentScores.length) : 0
      },
      highlights: {
        top_ideas: recentScores?.slice(0, 3) || [],
        recent_ideas: recentIdeas?.slice(0, 5) || [],
        completed_actions: completedActions?.slice(0, 5) || []
      },
      leaderboard: leaderboardData
    }

    console.log('[slack_team_digest] Context built, generating digest')

    // Generate digest with AI
    const digestMessage = await generateDigestWithAI(digestContext)

    // Send to Slack
    const slackPayload = {
      channel: channel,
      username: 'SmoothBrains Bot',
      icon_emoji: ':brain:',
      blocks: digestMessage.blocks
    }

    const slackResponse = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackPayload)
    })

    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.status}`)
    }

    console.log('[slack_team_digest] Digest sent successfully')

    return new Response(JSON.stringify({
      success: true,
      digest: digestMessage,
      stats: digestContext.stats,
      sent_to_slack: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[slack_team_digest] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

async function generateDigestWithAI(context: any) {
  const prompt = `
  Generate a ${context.time_period} team digest for SmoothBrains AI startup platform.

  STATS:
  - New Ideas: ${context.stats.new_ideas}
  - PMF Scores Calculated: ${context.stats.pmf_scores_calculated}
  - Actions Completed: ${context.stats.actions_completed}
  - Average PMF Score: ${context.stats.avg_pmf_score}
  - New Referrals: ${context.stats.new_referrals}
  - Completed Referrals: ${context.stats.completed_referrals}

  TOP IDEAS: ${JSON.stringify(context.highlights.top_ideas)}
  RECENT IDEAS: ${JSON.stringify(context.highlights.recent_ideas)}
  COMPLETED ACTIONS: ${JSON.stringify(context.highlights.completed_actions)}
  LEADERBOARD: ${JSON.stringify(context.leaderboard)}

  Generate a Slack message using Slack Block Kit format in JSON:
  {
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "🧠 SmoothBrains ${context.time_period.charAt(0).toUpperCase() + context.time_period.slice(1)} Digest"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Summary text here*"
        }
      }
    ]
  }

  Include:
  - Engaging summary with key metrics
  - Top performing ideas with PMF scores
  - Recent activity highlights
  - Leaderboard (if data available)
  - Motivational/encouraging tone
  - Emojis for visual appeal
  - Call to action for engagement

  Keep blocks concise but informative. Use Slack markdown formatting.
  `

  try {
    if (GROQ_API_KEY) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'You are a community manager creating engaging team updates. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          return JSON.parse(content)
        }
      }
    }

    // Fallback digest
    return generateFallbackDigest(context)
  } catch (error) {
    console.error('AI digest generation failed:', error)
    return generateFallbackDigest(context)
  }
}

function generateFallbackDigest(context: any) {
  const period = context.time_period.charAt(0).toUpperCase() + context.time_period.slice(1)
  
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🧠 SmoothBrains ${period} Digest`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${period} Highlights*\n\n` +
              `📝 *${context.stats.new_ideas}* new ideas submitted\n` +
              `📊 *${context.stats.pmf_scores_calculated}* PMF scores calculated\n` +
              `✅ *${context.stats.actions_completed}* actions completed\n` +
              `📈 Average PMF Score: *${context.stats.avg_pmf_score}*\n` +
              `🤝 *${context.stats.new_referrals}* new referrals`
      }
    }
  ]

  // Add top ideas if available
  if (context.highlights.top_ideas.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🏆 Top Performing Ideas*\n` +
              context.highlights.top_ideas.slice(0, 3).map((idea: any) => 
                `• *${idea.ideas?.title || 'Idea'}* - PMF Score: ${idea.pmf_score}`
              ).join('\n')
      }
    })
  }

  // Add leaderboard if available
  if (context.leaderboard && context.leaderboard.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🥇 Leaderboard*\n` +
              context.leaderboard.slice(0, 3).map((user: any, index: number) => 
                `${index + 1}. ${user.username || user.full_name} - Best PMF: ${user.best_pmf_score}`
              ).join('\n')
      }
    })
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Keep building amazing ideas! 🚀\n\n*Visit SmoothBrains to submit your next big idea.*`
    }
  })

  return { blocks }
}