import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedditPost {
  title: string;
  selftext: string;
  url: string;
  score: number;
  author: string;
  created_utc: number;
  num_comments: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea } = await req.json();
    
    if (!idea || idea.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Valid idea required (min 10 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[reddit-sentiment-analyzer] Analyzing idea:', idea.substring(0, 100));

    // Get Reddit credentials
    const REDDIT_CLIENT_ID = Deno.env.get('REDDIT_CLIENT_ID');
    const REDDIT_CLIENT_SECRET = Deno.env.get('REDDIT_CLIENT_SECRET');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
      throw new Error('Reddit API credentials not configured');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable AI API key not configured');
    }

    // Get Reddit OAuth token
    const authString = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SmoothBrains:v1.0.0 (by /u/smoothbrains)'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Reddit access token');
    }

    const { access_token } = await tokenResponse.json();
    console.log('[reddit-sentiment-analyzer] Got Reddit access token');

    // Extract keywords from idea
    const keywords = idea
      .toLowerCase()
      .split(/\s+/)
      .filter((word: string) => word.length > 3 && !['this', 'that', 'with', 'from', 'have'].includes(word))
      .slice(0, 3)
      .join(' ');

    const searchQuery = encodeURIComponent(keywords);
    
    // Search Reddit posts (limit to 30 for cost efficiency)
    const searchUrl = `https://oauth.reddit.com/search?q=${searchQuery}&limit=30&sort=relevance&t=week&raw_json=1`;
    console.log('[reddit-sentiment-analyzer] Searching Reddit:', searchUrl);

    const redditResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'User-Agent': 'SmoothBrains:v1.0.0 (by /u/smoothbrains)'
      }
    });

    if (!redditResponse.ok) {
      throw new Error(`Reddit API error: ${redditResponse.status}`);
    }

    const redditData = await redditResponse.json();
    const posts: RedditPost[] = redditData.data?.children?.map((child: any) => child.data) || [];

    console.log('[reddit-sentiment-analyzer] Found', posts.length, 'posts');

    if (posts.length === 0) {
      return new Response(
        JSON.stringify({
          positive: 0,
          neutral: 1,
          negative: 0,
          summary: "No recent Reddit discussions found for this topic.",
          topPosts: [],
          totalPosts: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare posts for AI analysis
    const postsForAnalysis = posts.slice(0, 15).map((post: RedditPost) => ({
      title: post.title,
      text: post.selftext?.substring(0, 200) || '',
      score: post.score,
      comments: post.num_comments
    }));

    // Use Lovable AI to analyze sentiment
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a sentiment analysis expert. Analyze Reddit posts and return JSON with this exact structure:
{
  "sentiments": ["positive", "neutral", "negative", ...],
  "summary": "Brief summary of overall community sentiment (max 150 chars)"
}

Rules:
- "sentiments" array must have exactly one sentiment per post (in same order)
- Each sentiment must be: "positive", "neutral", or "negative"
- Summary should highlight key themes and overall mood`
          },
          {
            role: 'user',
            content: `Analyze sentiment for these Reddit posts about "${idea}":\n\n${JSON.stringify(postsForAnalysis, null, 2)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_sentiment",
              description: "Return sentiment analysis for Reddit posts",
              parameters: {
                type: "object",
                properties: {
                  sentiments: {
                    type: "array",
                    items: { type: "string", enum: ["positive", "neutral", "negative"] },
                    description: "Sentiment for each post in order"
                  },
                  summary: {
                    type: "string",
                    description: "Brief overall sentiment summary (max 150 chars)"
                  }
                },
                required: ["sentiments", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_sentiment" } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[reddit-sentiment-analyzer] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No AI analysis result');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('[reddit-sentiment-analyzer] AI analysis complete');

    // Combine posts with their sentiment
    const postsWithSentiment = posts.slice(0, 15).map((post: RedditPost, idx: number) => ({
      title: post.title,
      url: `https://reddit.com${post.url}`,
      sentiment: analysis.sentiments[idx] || 'neutral',
      score: post.score,
      author: post.author,
      created: post.created_utc
    }));

    // Calculate sentiment counts
    const sentimentCounts = analysis.sentiments.reduce((acc: any, sentiment: string) => {
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    const result = {
      positive: sentimentCounts.positive || 0,
      neutral: sentimentCounts.neutral || 0,
      negative: sentimentCounts.negative || 0,
      summary: analysis.summary,
      topPosts: postsWithSentiment.sort((a: any, b: any) => b.score - a.score).slice(0, 3),
      totalPosts: posts.length
    };

    console.log('[reddit-sentiment-analyzer] Result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[reddit-sentiment-analyzer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
