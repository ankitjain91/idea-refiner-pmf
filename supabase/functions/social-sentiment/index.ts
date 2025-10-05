import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[Social Sentiment] Request received:', body)
    
    const { query, idea } = body
    const searchQuery = query || idea
    
    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: 'Missing query or idea parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get Supabase URL for internal function calls
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Call real APIs in parallel
    console.log('[Social Sentiment] Fetching real data from Reddit, Twitter, YouTube...')
    const [redditRes, twitterRes, youtubeRes] = await Promise.all([
      fetch(`${supabaseUrl}/functions/v1/reddit-sentiment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ idea: searchQuery, timeWindow: 'week' })
      }).catch(err => {
        console.error('[Social Sentiment] Reddit error:', err)
        return null
      }),
      
      fetch(`${supabaseUrl}/functions/v1/twitter-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ idea: searchQuery, time_window: 'week' })
      }).catch(err => {
        console.error('[Social Sentiment] Twitter error:', err)
        return null
      }),
      
      fetch(`${supabaseUrl}/functions/v1/youtube-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ idea: searchQuery, time_window: 'week' })
      }).catch(err => {
        console.error('[Social Sentiment] YouTube error:', err)
        return null
      })
    ])

    // Parse responses
    const redditData = redditRes ? await redditRes.json().catch(() => null) : null
    const twitterData = twitterRes ? await twitterRes.json().catch(() => null) : null
    const youtubeData = youtubeRes ? await youtubeRes.json().catch(() => null) : null

    console.log('[Social Sentiment] Data fetched - Reddit:', !!redditData, 'Twitter:', !!twitterData, 'YouTube:', !!youtubeData)

    // Extract real metrics
    const redditMetrics = redditData?.data || redditData || {}
    const twitterMetrics = twitterData?.data || twitterData || {}
    const youtubeMetrics = youtubeData?.data || youtubeData || {}

    // Calculate aggregate sentiment
    let totalPositive = 0, totalNegative = 0, totalNeutral = 0, totalMentions = 0
    let sourcesCount = 0

    // Reddit sentiment
    if (redditMetrics.totalPosts > 0) {
      const redditTotal = redditMetrics.positive + redditMetrics.negative + redditMetrics.neutral
      if (redditTotal > 0) {
        totalPositive += (redditMetrics.positive / redditTotal) * redditMetrics.totalPosts
        totalNegative += (redditMetrics.negative / redditTotal) * redditMetrics.totalPosts
        totalNeutral += (redditMetrics.neutral / redditTotal) * redditMetrics.totalPosts
        totalMentions += redditMetrics.totalPosts
        sourcesCount++
      }
    }

    // Twitter sentiment
    if (twitterMetrics.total_tweets > 0) {
      const twitterTotal = (twitterMetrics.positive || 0) + (twitterMetrics.negative || 0) + (twitterMetrics.neutral || 0)
      if (twitterTotal > 0) {
        totalPositive += twitterMetrics.positive || 0
        totalNegative += twitterMetrics.negative || 0
        totalNeutral += twitterMetrics.neutral || 0
        totalMentions += twitterMetrics.total_tweets
        sourcesCount++
      }
    }

    // YouTube sentiment (approximate from view counts and engagement)
    if (youtubeMetrics.summary?.total_videos > 0) {
      const ytViews = youtubeMetrics.summary.total_views || 0
      const ytVideos = youtubeMetrics.summary.total_videos || 0
      if (ytVideos > 0) {
        // Estimate sentiment based on engagement
        const avgEngagement = youtubeMetrics.summary.avg_relevance || 50
        const ytPositive = ytVideos * (avgEngagement / 100)
        const ytNeutral = ytVideos * (1 - avgEngagement / 100)
        
        totalPositive += ytPositive
        totalNeutral += ytNeutral
        totalMentions += ytVideos
        sourcesCount++
      }
    }

    // Calculate percentages
    const grandTotal = totalPositive + totalNegative + totalNeutral
    let positive = grandTotal > 0 ? Math.round((totalPositive / grandTotal) * 100) : 0
    let negative = grandTotal > 0 ? Math.round((totalNegative / grandTotal) * 100) : 0
    let neutral = 100 - positive - negative

    // Calculate overall score (weighted towards positive)
    const score = grandTotal > 0 ? Math.round(positive - (negative * 0.5)) : 0

    // Extract top keywords from all sources
    const keywords = new Set<string>()
    if (redditMetrics.themes) {
      redditMetrics.themes.forEach((theme: string) => keywords.add(theme))
    }
    if (twitterMetrics.top_hashtags) {
      twitterMetrics.top_hashtags.forEach((tag: string) => keywords.add(tag.replace('#', '')))
    }
    if (youtubeMetrics.summary?.top_channels) {
      youtubeMetrics.summary.top_channels.forEach((channel: any) => keywords.add(channel.name))
    }

    // Build platform breakdown
    const platforms = {
      reddit: {
        mentions: redditMetrics.totalPosts || 0,
        sentiment: redditMetrics.totalPosts > 0 ? redditMetrics.positive : 0,
        trending: redditMetrics.engagementScore > 60 || false
      },
      twitter: {
        mentions: twitterMetrics.total_tweets || 0,
        sentiment: twitterMetrics.positive || 0,
        trending: (twitterMetrics.top_hashtags?.length || 0) > 0
      },
      youtube: {
        mentions: youtubeMetrics.summary?.total_videos || 0,
        sentiment: youtubeMetrics.summary?.avg_relevance || 0,
        trending: (youtubeMetrics.summary?.total_views || 0) > 10000
      }
    }

    // Calculate engagement rate
    const engagementRate = [
      redditMetrics.engagementScore || 0,
      twitterMetrics.engagement_rate || 0,
      youtubeMetrics.summary?.avg_relevance || 0
    ].reduce((sum, val) => sum + val, 0) / sourcesCount || 1

    // Determine trend
    let trend = 'stable'
    if (positive > 70) trend = 'growing'
    else if (positive > 50 && negative < 20) trend = 'improving'
    else if (negative > 40) trend = 'declining'

    const socialSentiment = {
      score: Math.max(0, Math.min(100, score)),
      positive,
      negative,
      neutral,
      mentions: Math.round(totalMentions),
      trend,
      engagement_rate: Math.round(engagementRate),
      viral_potential: Math.min(100, Math.round(engagementRate * 1.2 + (totalMentions / 100))),
      platforms,
      top_keywords: Array.from(keywords).slice(0, 5),
      influencer_mentions: twitterMetrics.top_influencers?.length || 0
    }

    const searchVolume = {
      volume: Math.round(totalMentions * 10), // Approximate search volume
      trend: trend === 'growing' ? 'up' : trend === 'declining' ? 'down' : 'stable',
      growth_rate: positive - 50, // Relative to neutral
      seasonality: totalMentions > 100 ? 'high' : totalMentions > 50 ? 'medium' : 'low'
    }

    // Calculate confidence based on data availability
    const confidence = Math.min(0.95, 0.5 + (sourcesCount * 0.15) + (Math.min(totalMentions, 100) / 200))

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          socialSentiment, 
          searchVolume,
          timeframe: 'Last 7 days',
          confidence,
          sources: ['Reddit', 'Twitter', 'YouTube'].filter((_, i) => 
            [!!redditData, !!twitterData, !!youtubeData][i]
          )
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Social sentiment error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze social sentiment' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})