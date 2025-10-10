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
      console.log('[twitter-ai] Free period ended, returning error');
      return new Response(JSON.stringify({
        idea: '',
        metrics: {
          total_tweets: 0,
          engagement_rate: 0,
          sentiment_score: 0,
          reach_estimate: 0
        },
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        tweets: [],
        error: 'Free AI analysis period ended on Oct 13, 2025. Please configure Twitter API key.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const { idea, idea_text, lang = 'en' } = await req.json();
    const searchIdea = idea_text || idea;
    
    if (!searchIdea) {
      throw new Error('No idea or idea_text provided');
    }
    
    console.log('[twitter-ai] Analyzing idea:', searchIdea);
    
    // Check cache first
    const cacheKey = `twitter_ai_${searchIdea.slice(0, 100)}_${lang}`;
    const { data: cachedData } = await supabase
      .from('llm_cache')
      .select('response_data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (cachedData?.response_data) {
      console.log('[twitter-ai] Returning cached data');
      return new Response(JSON.stringify(cachedData.response_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a Twitter/X market research analyst. Analyze the Twitter landscape for the given business idea and provide realistic, relevant sentiment analysis.

Generate a comprehensive Twitter analysis with HIGHLY RELEVANT tweets that directly discuss or relate to the business idea:
- 15-20 realistic, highly relevant tweet examples
- Each tweet should be plausible content someone would actually post about this topic
- Include realistic engagement metrics (likes, retweets, replies)
- Use realistic Twitter usernames (mix of individuals and industry accounts)
- Create realistic tweet IDs (numeric strings like "1234567890123456789")
- Sentiment breakdown (positive, neutral, negative percentages)
- Top hashtags actually related to the idea
- Discussion clusters with real insights

Return ONLY valid JSON in this exact structure:
{
  "metrics": {
    "total_tweets": 150,
    "engagement_rate": 4.5,
    "sentiment_score": 0.65,
    "reach_estimate": 50000
  },
  "sentiment": {
    "positive": 45,
    "neutral": 40,
    "negative": 15
  },
  "tweets": [
    {
      "id": "1234567890123456789",
      "text": "Highly relevant tweet content directly about the idea",
      "author": "realistic_username",
      "author_name": "Display Name",
      "likes": 125,
      "retweets": 34,
      "replies": 12,
      "sentiment": "positive",
      "timestamp": "2025-10-01T10:00:00Z",
      "relevance_score": 95
    }
  ],
  "hashtags": ["#RelevantHashtag1", "#RelevantHashtag2"],
  "influencers": [
    {
      "username": "influencer_handle",
      "name": "Influencer Name",
      "followers": 50000,
      "sentiment": "positive",
      "tweet_count": 5
    }
  ],
  "clusters": [
    {
      "title": "Discussion Theme",
      "insight": "Key insight about this theme",
      "sentiment": "positive",
      "tweet_count": 25,
      "tweets": ["sample tweet 1", "sample tweet 2"]
    }
  ]
}

CRITICAL: Make tweets HIGHLY RELEVANT to the specific business idea. Each tweet should feel like real user-generated content discussing this exact topic.`;

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
          { role: 'user', content: `Analyze Twitter/X sentiment and discussions for: ${searchIdea}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[twitter-ai] AI API error:', response.status, errorText);
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
        response_data: result,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('[twitter-ai] Analysis complete');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[twitter-ai] Error:', error);
    return new Response(JSON.stringify({
      idea: '',
      metrics: {
        total_tweets: 0,
        engagement_rate: 0,
        sentiment_score: 0,
        reach_estimate: 0
      },
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      tweets: [],
      error: error instanceof Error ? error.message : 'Analysis failed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});
