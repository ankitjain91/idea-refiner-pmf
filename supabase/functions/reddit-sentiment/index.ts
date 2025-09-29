import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Reddit OAuth helper
async function getRedditAccessToken(): Promise<string> {
  const clientId = Deno.env.get('REDDIT_CLIENT_ID');
  const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('Reddit credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'PMFitHub/1.0'
    },
    body: 'grant_type=client_credentials&scope=read'
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Simple sentiment lexicon (no external API needed)
const POSITIVE_WORDS = [
  'love', 'excellent', 'good', 'nice', 'wonderful', 'best', 'great', 'awesome', 'amazing',
  'fantastic', 'perfect', 'beautiful', 'helpful', 'useful', 'valuable', 'brilliant', 'super',
  'outstanding', 'impressive', 'exceptional', 'remarkable', 'extraordinary', 'delightful',
  'happy', 'excited', 'success', 'win', 'profitable', 'growth', 'improve', 'better'
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst', 'hate', 'dislike', 'ugly',
  'useless', 'worthless', 'disappointing', 'failure', 'fail', 'broken', 'wrong', 'mistake',
  'problem', 'issue', 'difficult', 'hard', 'complex', 'frustrating', 'annoying', 'angry',
  'sad', 'loss', 'expensive', 'overpriced', 'scam', 'waste', 'crash', 'bug'
];

const EMOJI_SCORES: Record<string, number> = {
  '😍': 2, '❤️': 2, '💕': 2, '😊': 1, '😄': 1, '👍': 1, '🔥': 1, '🚀': 2,
  '😡': -2, '😠': -2, '💔': -2, '😔': -1, '😢': -1, '👎': -1, '💩': -2, '🤮': -2,
  '🤔': 0, '😐': 0, '🙄': -1
};

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  url?: string;
}

function analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral', score: number } {
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;
  
  // Count positive/negative words
  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) score += 1;
    if (NEGATIVE_WORDS.includes(word)) score -= 1;
  }
  
  // Check for boosters
  if (text.includes('!')) score += 0.5;
  if (text.includes('?')) score -= 0.2;
  if (text.includes('very')) score *= 1.5;
  if (text.includes('not')) score *= -0.8;
  
  // Check emojis
  for (const [emoji, emojiScore] of Object.entries(EMOJI_SCORES)) {
    if (text.includes(emoji)) score += emojiScore;
  }
  
  // Determine sentiment
  if (score >= 2) return { sentiment: 'positive', score };
  if (score <= -2) return { sentiment: 'negative', score };
  return { sentiment: 'neutral', score };
}

function extractThemes(posts: RedditPost[]): string[] {
  const wordFreq: Record<string, number> = {};
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'of', 'to', 'in', 'for', 'with', 'it', 'this', 'that', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might']);
  
  posts.forEach(post => {
    const words = post.title.toLowerCase().split(/\W+/);
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
  });
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function extractPainPoints(posts: RedditPost[]): string[] {
  const painPoints: string[] = [];
  const painKeywords = ['problem', 'issue', 'difficult', 'hard', 'frustrating', 'annoying', 'cant', "can't", 'unable', 'broken', 'need', 'want', 'wish'];
  
  posts.forEach(post => {
    const text = (post.title + ' ' + post.selftext).toLowerCase();
    for (const keyword of painKeywords) {
      if (text.includes(keyword)) {
        const sentences = text.split(/[.!?]/);
        for (const sentence of sentences) {
          if (sentence.includes(keyword) && sentence.length > 10 && sentence.length < 100) {
            painPoints.push(sentence.trim().substring(0, 80));
            break;
          }
        }
        break;
      }
    }
  });
  
  return [...new Set(painPoints)].slice(0, 6);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // Prepare variables for logging and fallback
  let idea: string | undefined;
  let industry: string | undefined;
  let geography: string | undefined;
  let timeWindow: string | undefined;
  let analyzeType: string | undefined;
  let searchTerms = '';

  try {
    const body = await req.json();
    idea = body?.idea;
    industry = body?.industry;
    geography = body?.geography;
    timeWindow = body?.timeWindow;
    analyzeType = body?.analyzeType;
    
    console.log('[reddit-sentiment] Processing request:', { idea, industry, geography, timeWindow, analyzeType });
    
    // Build search query
    searchTerms = [idea, industry, geography].filter(Boolean).join(' ');
    
    // Get Reddit OAuth token
    let accessToken: string;
    try {
      accessToken = await getRedditAccessToken();
      console.log('[reddit-sentiment] Got Reddit access token');
    } catch (authError) {
      console.error('[reddit-sentiment] Auth failed:', authError);
      throw new Error('Reddit authentication failed. Please check your credentials.');
    }
    
    // Reddit search using OAuth API
    const redditUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(searchTerms)}&limit=50&sort=relevance&t=${timeWindow || 'month'}`;
    
    console.log('[reddit-sentiment] Fetching from Reddit:', redditUrl);
    
    const redditResponse = await fetch(redditUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'PMFitHub/1.0'
      }
    });
    
    if (!redditResponse.ok) {
      const errorText = await redditResponse.text();
      console.error('[reddit-sentiment] Reddit API error:', redditResponse.status, errorText);
      throw new Error(`Reddit API error: ${redditResponse.status}`);
    }
    
    const redditData = await redditResponse.json();
    const posts: RedditPost[] = redditData.data.children
      .filter((child: any) => child.data && !child.data.over_18 && !child.data.removed)
      .map((child: any) => ({
        id: child.data.id,
        title: child.data.title,
        selftext: (child.data.selftext || '').substring(0, 500),
        subreddit: child.data.subreddit,
        score: child.data.score || 0,
        num_comments: child.data.num_comments || 0,
        created_utc: child.data.created_utc,
        permalink: child.data.permalink,
        url: child.data.url
      }));
    
    console.log(`[reddit-sentiment] Found ${posts.length} posts`);
    
    // Analyze sentiment for each post
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    const analyzedPosts = posts.map(post => {
      const text = `${post.title} ${post.selftext}`;
      const { sentiment, score } = analyzeSentiment(text);
      
      if (sentiment === 'positive') positiveCount++;
      else if (sentiment === 'negative') negativeCount++;
      else neutralCount++;
      
      return {
        ...post,
        sentiment,
        sentimentScore: score
      };
    });
    
    const totalPosts = posts.length || 1;
    const positivePercent = Math.round((positiveCount / totalPosts) * 100);
    const negativePercent = Math.round((negativeCount / totalPosts) * 100);
    const neutralPercent = 100 - positivePercent - negativePercent;
    
    // Calculate engagement score
    const avgUpvotes = posts.reduce((sum, p) => sum + p.score, 0) / totalPosts;
    const postsPerWeek = totalPosts / 4; // Assuming monthly window
    const engagementRaw = 0.6 * Math.min(1, avgUpvotes / 50) + 0.4 * Math.min(1, postsPerWeek / 10);
    const engagementScore = Math.round(100 * engagementRaw);
    
    // Calculate sentiment core and CPS
    const sentimentCore = Math.round(0.7 * positivePercent + 0.3 * (100 - negativePercent));
    const cps = Math.round(0.8 * sentimentCore + 0.2 * engagementScore);
    
    // Determine confidence
    const confidence = totalPosts < 20 ? 0.5 : 0.7;
    
    // Extract themes and pain points
    const themes = extractThemes(posts);
    const painPoints = extractPainPoints(posts);
    
    // Build response
    const response = {
      updatedAt: new Date().toISOString(),
      filters: { idea, industry, geography, timeWindow },
      metrics: [
        { name: 'sentiment_positive', value: positivePercent, unit: '%', explanation: 'share of positive posts', confidence },
        { name: 'sentiment_neutral', value: neutralPercent, unit: '%', explanation: 'share of neutral posts', confidence },
        { name: 'sentiment_negative', value: negativePercent, unit: '%', explanation: 'share of negative posts', confidence },
        { name: 'engagement_score', value: engagementScore, unit: '/100', explanation: 'avg upvotes & posts/week', confidence },
        { name: 'community_positivity_score', value: cps, unit: '/100', explanation: '0.8*sentiment_core+0.2*engagement', confidence }
      ],
      themes,
      pain_points: painPoints,
      items: analyzedPosts.slice(0, 10).map(post => ({
        title: post.title,
        snippet: post.selftext,
        url: `https://reddit.com${post.permalink}`,
        published: new Date(post.created_utc * 1000).toISOString(),
        source: `r/${post.subreddit}`,
        evidence: [post.sentiment],
        score: post.score,
        num_comments: post.num_comments
      })),
      citations: [
        { label: 'Reddit Search API', url: `https://reddit.com/search?q=${encodeURIComponent(searchTerms)}` }
      ],
      warnings: totalPosts < 20 ? ['Sparse results; signals may be noisy'] : [],
      totalPosts
    };
    
    console.log('[reddit-sentiment] Analysis complete:', {
      totalPosts,
      sentiment: { positive: positivePercent, negative: negativePercent, neutral: neutralPercent },
      cps
    });
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[reddit-sentiment] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    // Build deterministic fallback so UI can render gracefully
    const now = new Date().toISOString();
    const q = [idea, industry, geography].filter(Boolean).join(' ');
    const fallback = {
      updatedAt: now,
      filters: { idea, industry, geography, timeWindow },
      metrics: [
        { name: 'sentiment_positive', value: 0, unit: '%', explanation: 'share of positive posts', confidence: 0.5 },
        { name: 'sentiment_neutral', value: 100, unit: '%', explanation: 'share of neutral posts', confidence: 0.5 },
        { name: 'sentiment_negative', value: 0, unit: '%', explanation: 'share of negative posts', confidence: 0.5 },
        { name: 'engagement_score', value: 0, unit: '/100', explanation: 'avg upvotes & posts/week', confidence: 0.5 },
        { name: 'community_positivity_score', value: 0, unit: '/100', explanation: '0.8*sentiment_core+0.2*engagement', confidence: 0.5 }
      ],
      themes: [],
      pain_points: [],
      items: [],
      citations: [ { label: 'Reddit Search', url: `https://reddit.com/search?q=${encodeURIComponent(q)}` } ],
      warnings: [
        'Using fallback data due to Reddit API error. Results may be incomplete.',
        errorMessage
      ],
      totalPosts: 0
    };

    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});