import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=21600, s-maxage=21600', // 6h cache
}

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea_text, idea, time_window = 'year', regionCode = 'US', relevanceLanguage = 'en' } = await req.json();
    
    const searchIdea = idea_text || idea;
    if (!searchIdea) {
      throw new Error('No idea_text or idea provided');
    }
    
    console.log('[youtube-search] Processing research for idea:', searchIdea);
    
    if (!YOUTUBE_API_KEY) {
      console.warn('[youtube-search] YOUTUBE_API_KEY not configured');
      throw new Error('YouTube API not configured');
    }
    
    // 1. Query Expansion - extract keywords and create search variations
    const keywords = searchIdea.toLowerCase().split(' ').filter(w => w.length > 3);
    const coreKeywords = keywords.slice(0, 3);
    
    // Build queries
    const broadQuery = searchIdea;
    const reviewQuery = `${searchIdea} review OR comparison OR vs`;
    
    console.log('[youtube-search] Queries:', { broadQuery, reviewQuery });
    
    // Calculate publishedAfter based on time_window
    let publishedAfter = '';
    const now = new Date();
    if (time_window === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      publishedAfter = monthAgo.toISOString();
    } else if (time_window === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      publishedAfter = yearAgo.toISOString();
    }
    
    // 2. API Calls - search for videos
    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      order: 'relevance',
      maxResults: '50',
      q: broadQuery,
      regionCode,
      relevanceLanguage,
      key: YOUTUBE_API_KEY
    });
    
    if (publishedAfter) {
      searchParams.append('publishedAfter', publishedAfter);
    }
    
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams}`;
    console.log('[youtube-search] Fetching from YouTube Search API');
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[youtube-search] Search API error:', searchResponse.status, errorText);
      throw new Error(`YouTube Search API error: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const videos = searchData.items || [];
    
    // Deduplicate video IDs
    const videoIds = [...new Set(videos.map((v: any) => v.id.videoId).filter(Boolean))];
    console.log(`[youtube-search] Found ${videoIds.length} unique videos`);
    
    if (videoIds.length === 0) {
      const response = {
        idea: searchIdea,
        youtube_insights: [],
        summary: {
          total_videos: 0,
          total_views: 0,
          total_likes: 0,
          avg_relevance: 0,
          top_channels: [],
          time_window,
          region: regionCode,
          error: 'No videos found for this idea'
        },
        meta: {
          confidence: 'Low',
          cached_until: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
        }
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get video statistics (batch up to 50)
    const statsParams = new URLSearchParams({
      part: 'snippet,statistics',
      id: videoIds.slice(0, 50).join(','),
      key: YOUTUBE_API_KEY
    });
    
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?${statsParams}`;
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();
    const videoStats = statsData.items || [];
    
    console.log(`[youtube-search] Retrieved stats for ${videoStats.length} videos`);
    
    // 3. Scoring and ranking
    const scoredVideos = videoStats.map((video: any) => {
      const title = video.snippet.title.toLowerCase();
      const description = (video.snippet.description || '').toLowerCase();
      const views = parseInt(String(video.statistics.viewCount || '0'));
      const likes = parseInt(String(video.statistics.likeCount || '0'));
      const comments = parseInt(String(video.statistics.commentCount || '0'));
      const publishedAt = new Date(video.snippet.publishedAt);
      const ageInDays = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      // Keyword match score
      let keywordScore = 0;
      coreKeywords.forEach(kw => {
        if (title.includes(kw)) keywordScore += 2;
        if (description.includes(kw)) keywordScore += 1;
      });
      
      // Engagement score (normalized)
      const engagementScore = Math.log(views + 1) + Math.log(likes + 1) * 0.5 + Math.log(comments + 1) * 0.3;
      
      // Recency boost (newer = higher)
      const recencyBoost = Math.max(0, 1 - (ageInDays / 365));
      
      // Total relevance score (0-1)
      const relevance = Math.min(1, (keywordScore * 0.4 + engagementScore * 0.01 + recencyBoost * 0.3) / 10);
      
      return {
        videoId: video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        views,
        likes,
        comments,
        published_at: video.snippet.publishedAt,
        relevance: Math.round(relevance * 100) / 100,
        url: `https://youtu.be/${video.id}`,
        thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url
      };
    });
    
    // Sort by relevance and take top 25
    scoredVideos.sort((a, b) => b.relevance - a.relevance);
    const topVideos = scoredVideos.slice(0, 25);
    
    // Calculate summary stats
    const totalViews = topVideos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = topVideos.reduce((sum, v) => sum + v.likes, 0);
    const avgRelevance = topVideos.reduce((sum, v) => sum + v.relevance, 0) / topVideos.length;
    
    // Top channels by video count
    const channelCounts = new Map<string, number>();
    topVideos.forEach(v => {
      channelCounts.set(v.channel, (channelCounts.get(v.channel) || 0) + 1);
    });
    const topChannels = Array.from(channelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([channel, count]) => ({ channel, video_count: count }));
    
    const response = {
      idea: searchIdea,
      youtube_insights: topVideos,
      summary: {
        total_videos: topVideos.length,
        total_views: totalViews,
        total_likes: totalLikes,
        avg_relevance: Math.round(avgRelevance * 100) / 100,
        top_channels: topChannels,
        time_window,
        region: regionCode
      },
      meta: {
        confidence: topVideos.length >= 10 ? 'High' : topVideos.length >= 5 ? 'Medium' : 'Low',
        cached_until: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      }
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      },
    });
  } catch (error) {
    console.error('[youtube-search] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch YouTube data';
    
    return new Response(JSON.stringify({
      idea: '',
      youtube_insights: [],
      summary: {
        total_videos: 0,
        total_views: 0,
        total_likes: 0,
        avg_relevance: 0,
        top_channels: [],
        time_window: 'year',
        region: 'US',
        error: errorMessage
      },
      meta: {
        confidence: 'Low',
        error: errorMessage,
        error_type: (errorMessage.toLowerCase().includes('rate limit')) ? 'rate_limit' : (errorMessage.toLowerCase().includes('config') || errorMessage.toLowerCase().includes('auth')) ? 'config' : 'unknown',
        cached_until: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});