import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Hard cutoff date - Oct 13, 2025
const CUTOFF_DATE = new Date('2025-10-13T23:59:59Z');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date();
    
    // Check if we're past the free period
    if (now > CUTOFF_DATE) {
      console.log('[youtube-ai] Free period ended, returning error');
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
          error: 'Free AI analysis period ended on Oct 13, 2025. Please configure YouTube API key.'
        },
        meta: {
          confidence: 'Low',
          error: 'free_period_ended',
          error_type: 'config'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const { idea_text, idea, time_window = 'year', regionCode = 'US' } = await req.json();
    const searchIdea = idea_text || idea;
    
    if (!searchIdea) {
      throw new Error('No idea_text or idea provided');
    }
    
    console.log('[youtube-ai] Analyzing idea:', searchIdea);
    
    // Check cache first
    const cacheKey = `youtube_ai_${searchIdea.slice(0, 100)}_${time_window}_${regionCode}`;
    const { data: cachedData } = await supabase
      .from('llm_cache')
      .select('response')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (cachedData?.response) {
      console.log('[youtube-ai] Returning cached data');
      return new Response(JSON.stringify(cachedData.response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a YouTube market research analyst. Analyze the YouTube landscape for the given business idea and provide realistic estimates.

Generate a comprehensive YouTube analysis with:
- 15-25 realistic video entries with titles, channels, view counts, likes, comments
- Top performing channels in this space
- Relevance scores (0-1) based on how well videos match the idea
- Recent publication dates within the specified time window
- Regional relevance for ${regionCode}

Return ONLY valid JSON in this exact structure:
{
  "youtube_insights": [
    {
      "videoId": "unique_id",
      "title": "video title",
      "channel": "channel name",
      "views": 12345,
      "likes": 234,
      "comments": 45,
      "published_at": "2025-09-15T10:00:00Z",
      "relevance": 0.85,
      "url": "https://youtu.be/unique_id",
      "thumbnail": "https://i.ytimg.com/vi/unique_id/mqdefault.jpg"
    }
  ],
  "summary": {
    "total_videos": 20,
    "total_views": 500000,
    "total_likes": 12000,
    "avg_relevance": 0.75,
    "top_channels": [
      {"channel": "Channel Name", "video_count": 5}
    ],
    "time_window": "${time_window}",
    "region": "${regionCode}"
  }
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze YouTube landscape for: ${searchIdea}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[youtube-ai] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON from the AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const analysisData = JSON.parse(jsonMatch[0]);
    
    const result = {
      idea: searchIdea,
      ...analysisData,
      meta: {
        confidence: 'Medium',
        ai_generated: true,
        cached_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    };

    // Cache for 24 hours
    await supabase
      .from('llm_cache')
      .upsert({
        cache_key: cacheKey,
        prompt_hash: cacheKey,
        model: 'google/gemini-2.5-flash',
        response: result,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('[youtube-ai] Analysis complete');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[youtube-ai] Error:', error);
    return new Response(JSON.stringify({
      idea: '',
      youtube_insights: [],
      summary: {
        total_videos: 0,
        total_views: 0,
        total_likes: 0,
        avg_relevance: 0,
        top_channels: [],
        error: error instanceof Error ? error.message : 'Analysis failed'
      },
      meta: {
        confidence: 'Low',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});
