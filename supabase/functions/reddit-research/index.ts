import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
      'User-Agent': 'SmoothBrainsHub/2.0'
    },
    body: 'grant_type=client_credentials&scope=read'
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Keyword expansion from idea
function expandKeywords(ideaText: string): {
  core: string[];
  synonyms: string[];
  painPhrases: string[];
  competitors: string[];
} {
  const words = ideaText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  // Core keywords (top 3-4 meaningful words)
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'that', 'this', 'for', 'with']);
  const core = words.filter(w => !stopWords.has(w)).slice(0, 4);
  
  // Generate synonyms based on domain
  const synonymMap: Record<string, string[]> = {
    'ai': ['artificial intelligence', 'machine learning', 'automated', 'smart'],
    'app': ['application', 'software', 'tool', 'platform', 'service'],
    'track': ['monitor', 'measure', 'analyze', 'record'],
    'manage': ['organize', 'handle', 'control', 'administer'],
    'help': ['assist', 'support', 'aid', 'facilitate'],
  };
  
  const synonyms: string[] = [];
  core.forEach(word => {
    if (synonymMap[word]) {
      synonyms.push(...synonymMap[word]);
    }
  });
  
  // Pain phrases
  const painPhrases = [
    'struggling with',
    'need help',
    'looking for',
    'frustrated',
    'difficult to',
    'problem with',
    'wish there was',
    'alternative to'
  ];
  
  // Generic competitors (would be enhanced with real data)
  const competitors = ['alternative', 'competitor', 'vs', 'comparison', 'better than'];
  
  return { core, synonyms, painPhrases, competitors };
}

// Infer relevant subreddits based on idea
function inferSubreddits(ideaText: string): string[] {
  const text = ideaText.toLowerCase();
  const subreddits = ['startups', 'Entrepreneur', 'SaaS', 'smallbusiness'];
  
  // Domain-specific subreddits
  if (text.includes('fitness') || text.includes('health') || text.includes('exercise')) {
    subreddits.push('fitness', 'health', 'bodyweightfitness', 'loseit');
  }
  if (text.includes('book') || text.includes('reading')) {
    subreddits.push('books', 'reading', 'bookclub', 'suggestmeabook');
  }
  if (text.includes('invest') || text.includes('finance') || text.includes('money')) {
    subreddits.push('investing', 'personalfinance', 'financialindependence', 'stocks');
  }
  if (text.includes('tech') || text.includes('software') || text.includes('app')) {
    subreddits.push('technology', 'software', 'webdev', 'programming');
  }
  if (text.includes('nutrition') || text.includes('diet') || text.includes('meal')) {
    subreddits.push('nutrition', 'EatCheapAndHealthy', 'MealPrepSunday', 'loseit');
  }
  
  return [...new Set(subreddits)].slice(0, 12);
}

// Build search queries
function buildQueries(keywords: ReturnType<typeof expandKeywords>): string[] {
  const { core, synonyms, painPhrases } = keywords;
  
  const coreTerms = core.join(' OR ');
  const allTerms = [...core, ...synonyms.slice(0, 3)].join(' OR ');
  
  return [
    `(${allTerms})`, // Broad query
    `(${coreTerms}) AND (${painPhrases.slice(0, 3).join(' OR ')})`, // Pain-focused
    `(${allTerms}) AND (alternative OR solution OR tool OR app)` // Solution-focused
  ];
}

// Search Reddit with query
async function searchReddit(
  accessToken: string,
  query: string,
  subreddit: string,
  timeFilter: string = 'year',
  sort: string = 'relevance',
  limit: number = 25
): Promise<any[]> {
  const url = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=true&sort=${sort}&t=${timeFilter}&limit=${limit}&raw_json=1`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'SmoothBrainsHub/2.0'
    }
  });
  
  if (!response.ok) {
    console.error(`Reddit search failed for r/${subreddit}:`, response.status);
    return [];
  }
  
  const data = await response.json();
  return data.data?.children?.map((c: any) => c.data) || [];
}

// Calculate relevance score
function calculateRelevance(
  post: any,
  keywords: ReturnType<typeof expandKeywords>,
  allScores: number[]
): number {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  
  // Exact match scoring
  let score = 0;
  keywords.core.forEach(word => {
    if (text.includes(word)) score += 2;
  });
  keywords.synonyms.forEach(word => {
    if (text.includes(word)) score += 1;
  });
  
  // Engagement scoring (normalized)
  const avgScore = allScores.length > 0 
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
    : post.score;
  const zScore = avgScore > 0 ? (post.score - avgScore) / Math.max(avgScore, 1) : 0;
  score += Math.max(0, Math.min(5, zScore)); // Cap z-score contribution
  
  // Comment engagement
  const commentBoost = Math.log(post.num_comments + 1);
  score += commentBoost * 0.5;
  
  // Recency boost
  const ageInDays = (Date.now() / 1000 - post.created_utc) / 86400;
  const recencyBoost = Math.max(0, 3 - Math.log(ageInDays + 1));
  score += recencyBoost;
  
  // Flair bonus
  if (post.link_flair_text) {
    const flair = post.link_flair_text.toLowerCase();
    if (flair.includes('help') || flair.includes('question') || flair.includes('review')) {
      score += 1;
    }
  }
  
  return score;
}

// Extract insights from post
function extractInsights(post: any, keywords: ReturnType<typeof expandKeywords>): {
  summary: string;
  painPoints: string[];
  jtbd: string;
  stage: string;
  sentiment: number;
} {
  const text = post.selftext || post.title;
  const sentences = text.split(/[.!?]+/).filter(s => s.length > 20);
  
  // Extract pain points
  const painPoints: string[] = [];
  keywords.painPhrases.forEach(phrase => {
    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes(phrase) && painPoints.length < 3) {
        painPoints.push(sentence.trim().substring(0, 120) + '...');
      }
    });
  });
  
  // Determine JTBD and stage
  const hasQuestion = text.includes('?') || post.title.includes('?');
  const hasSolution = text.toLowerCase().includes('solution') || text.toLowerCase().includes('alternative');
  
  let jtbd = 'Problem Discovery';
  let stage = 'problem_discovery';
  
  if (hasSolution) {
    jtbd = 'Solution Evaluation';
    stage = 'solution_fit';
  } else if (hasQuestion) {
    jtbd = 'Information Seeking';
    stage = 'problem_discovery';
  }
  
  // Sentiment analysis (simple)
  const positiveWords = ['love', 'great', 'excellent', 'good', 'helpful', 'recommend'];
  const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'frustrated', 'disappointed'];
  
  let sentiment = 0;
  const lowerText = text.toLowerCase();
  positiveWords.forEach(word => { if (lowerText.includes(word)) sentiment += 0.2; });
  negativeWords.forEach(word => { if (lowerText.includes(word)) sentiment -= 0.2; });
  sentiment = Math.max(-1, Math.min(1, sentiment));
  
  return {
    summary: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
    painPoints,
    jtbd,
    stage,
    sentiment
  };
}

// Deduplicate posts
function deduplicatePosts(posts: any[]): any[] {
  const seen = new Set<string>();
  const unique: any[] = [];
  
  for (const post of posts) {
    const key = post.url || post.id;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(post);
    }
  }
  
  return unique;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea_text, target_subreddits, time_window = 'year' } = await req.json();
    
    if (!idea_text) {
      throw new Error('idea_text is required');
    }
    
    console.log('[reddit-research] Processing:', idea_text);
    
    // Step 1: Keyword expansion
    const keywords = expandKeywords(idea_text);
    console.log('[reddit-research] Keywords:', keywords);
    
    // Step 2: Subreddit targeting
    const subreddits = target_subreddits || inferSubreddits(idea_text);
    console.log('[reddit-research] Target subreddits:', subreddits);
    
    // Step 3: Build queries
    const queries = buildQueries(keywords);
    console.log('[reddit-research] Queries:', queries);
    
    // Get Reddit access token
    const accessToken = await getRedditAccessToken();
    
    // Step 4: Search Reddit
    const allPosts: any[] = [];
    const allScores: number[] = [];
    
    for (const subreddit of subreddits.slice(0, 8)) {
      for (const query of queries) {
        try {
          const posts = await searchReddit(accessToken, query, subreddit, time_window);
          allPosts.push(...posts);
          allScores.push(...posts.map(p => p.score));
          
          // Rate limiting: wait 500ms between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[reddit-research] Error searching r/${subreddit}:`, error);
        }
      }
    }
    
    console.log(`[reddit-research] Found ${allPosts.length} total posts`);
    
    // Step 5: Deduplicate
    const uniquePosts = deduplicatePosts(allPosts);
    console.log(`[reddit-research] ${uniquePosts.length} unique posts after dedup`);
    
    // Step 6: Score posts
    const scoredPosts = uniquePosts.map(post => ({
      ...post,
      relevance_score: calculateRelevance(post, keywords, allScores),
      insights: extractInsights(post, keywords)
    }));
    
    // Sort by relevance
    scoredPosts.sort((a, b) => b.relevance_score - a.relevance_score);
    
    // Top 25 posts
    const topPosts = scoredPosts.slice(0, 25);
    
    // Step 7: Generate insights summary
    const subredditCounts: Record<string, number> = {};
    const allPainPoints: string[] = [];
    const competitorMentions: string[] = [];
    
    topPosts.forEach(post => {
      subredditCounts[post.subreddit] = (subredditCounts[post.subreddit] || 0) + 1;
      allPainPoints.push(...post.insights.painPoints);
      
      // Look for competitor mentions
      keywords.competitors.forEach(comp => {
        if (post.selftext?.toLowerCase().includes(comp)) {
          competitorMentions.push(post.title);
        }
      });
    });
    
    const topSubreddits = Object.entries(subredditCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sub, count]) => ({ subreddit: sub, posts: count }));
    
    // Step 8: Build response
    const response = {
      summary: {
        total_posts_analyzed: uniquePosts.length,
        top_subreddits: topSubreddits,
        common_pain_points: [...new Set(allPainPoints)].slice(0, 10),
        competitor_mentions: competitorMentions.length,
        time_window,
        keywords_used: keywords
      },
      posts: topPosts.map(post => ({
        subreddit: post.subreddit,
        title: post.title,
        score: post.score,
        comments: post.num_comments,
        age_days: Math.floor((Date.now() / 1000 - post.created_utc) / 86400),
        relevance_score: post.relevance_score.toFixed(2),
        permalink: `https://reddit.com${post.permalink}`,
        url: post.url,
        flair: post.link_flair_text,
        author: post.author,
        summary: post.insights.summary,
        pain_points: post.insights.painPoints,
        jtbd: post.insights.jtbd,
        stage: post.insights.stage,
        sentiment: post.insights.sentiment
      })),
      insights: {
        top_pain_categories: extractPainCategories(allPainPoints),
        sentiment_distribution: calculateSentimentDist(topPosts),
        stage_breakdown: calculateStageBreakdown(topPosts)
      }
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[reddit-research] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractPainCategories(painPoints: string[]): Record<string, number> {
  const categories: Record<string, number> = {
    'cost': 0,
    'complexity': 0,
    'time': 0,
    'features': 0,
    'support': 0
  };
  
  painPoints.forEach(pain => {
    const lower = pain.toLowerCase();
    if (lower.includes('expensive') || lower.includes('price') || lower.includes('cost')) categories.cost++;
    if (lower.includes('complex') || lower.includes('difficult') || lower.includes('hard')) categories.complexity++;
    if (lower.includes('time') || lower.includes('slow') || lower.includes('takes too long')) categories.time++;
    if (lower.includes('feature') || lower.includes('missing') || lower.includes('lacking')) categories.features++;
    if (lower.includes('support') || lower.includes('help') || lower.includes('documentation')) categories.support++;
  });
  
  return categories;
}

function calculateSentimentDist(posts: any[]): { positive: number; neutral: number; negative: number } {
  let positive = 0, neutral = 0, negative = 0;
  
  posts.forEach(post => {
    const s = post.insights?.sentiment || 0;
    if (s > 0.2) positive++;
    else if (s < -0.2) negative++;
    else neutral++;
  });
  
  const total = posts.length || 1;
  return {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100)
  };
}

function calculateStageBreakdown(posts: any[]): Record<string, number> {
  const stages: Record<string, number> = {};
  
  posts.forEach(post => {
    const stage = post.insights?.stage || 'unknown';
    stages[stage] = (stages[stage] || 0) + 1;
  });
  
  return stages;
}
