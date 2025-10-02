import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds between retries

async function callGroqWithRetry(
  endpoint: string,
  body: any,
  retries = 0
): Promise<Response> {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  try {
    // Add delay to avoid rate limiting
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Handle rate limiting
    if (response.status === 429) {
      console.log(`Rate limited, retry ${retries + 1}/${MAX_RETRIES}`);
      if (retries < MAX_RETRIES) {
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * (retries + 1);
        console.log(`Waiting ${delay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGroqWithRetry(endpoint, body, retries + 1);
      }
      throw new Error('Rate limit exceeded after maximum retries');
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    return response;
  } catch (error) {
    if (retries < MAX_RETRIES && error instanceof Error && error.message.includes('Rate limit')) {
      console.log(`Error occurred, retry ${retries + 1}/${MAX_RETRIES}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
      return callGroqWithRetry(endpoint, body, retries + 1);
    }
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY is not configured');
      throw new Error('GROQ_API_KEY is not configured');
    }

    const { searchResults, pageContent, tileType, filters, marketTrendsData, redditData, webSearchData } = await req.json();
    
    // Handle market trends analysis request
    if (marketTrendsData) {
      console.log('Analyzing market trends for profit opportunities');
      
      const systemPrompt = `You are a strategic business advisor specializing in market analysis and profit maximization. Analyze market data to identify the most profitable actions.`;
      
      const userPrompt = `
Analyze this comprehensive market data for "${marketTrendsData.idea || 'the business idea'}" and provide ACTIONABLE PROFIT-FOCUSED RECOMMENDATIONS.

Market Data:
- Search Trends: ${JSON.stringify(marketTrendsData.metrics || [])}
- Regional Data: ${JSON.stringify(marketTrendsData.continentData || {})}
- Top Queries: ${JSON.stringify(marketTrendsData.top_queries || [])}
- News Sentiment: ${JSON.stringify(marketTrendsData.sentiment || {})}
- Market Insights: ${JSON.stringify(marketTrendsData.insights || [])}

Based on this data, provide a concise action plan focusing on:
1. **Highest Profit Opportunities**: Where is demand strongest with least competition?
2. **Geographic Strategy**: Which regions show best profit potential?
3. **Timing**: When to launch for maximum impact?
4. **Product Positioning**: How to position for premium pricing?
5. **Quick Wins**: Immediate actions that can generate revenue

Return a JSON object with this structure:
{
  "profitActions": [
    {
      "action": "specific actionable step",
      "profitPotential": "high|medium|low",
      "timeframe": "immediate|short-term|medium-term",
      "estimatedROI": "percentage or multiplier",
      "reasoning": "data-driven justification"
    }
  ],
  "bestMarkets": [
    {
      "region": "region name",
      "opportunity": "specific opportunity",
      "entryStrategy": "how to enter this market"
    }
  ],
  "competitiveAdvantage": "key differentiator based on data",
  "pricingStrategy": "recommended pricing approach",
  "riskMitigation": "main risk and how to avoid it",
  "executionPriority": ["step 1", "step 2", "step 3"]
}`;

      const response = await callGroqWithRetry(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        }
      );

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      return new Response(
        JSON.stringify({
          success: true,
          analysis,
          usage: {
            model: 'llama-3.3-70b-versatile',
            tokens: data.usage?.total_tokens || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle Reddit data analysis
    if (redditData) {
      console.log('Analyzing Reddit data for business insights');
      
      // Validate reddit data structure
      const sentiment = redditData.sentiment || {};
      const positive = sentiment.positive || 0;
      const neutral = sentiment.neutral || 0;
      const negative = sentiment.negative || 0;
      const mentions = redditData.mentions || 0;
      const engagement = redditData.engagement || {};
      const upvotes = engagement.upvotes || 0;
      const comments = engagement.comments || 0;
      
      const systemPrompt = `You are a business intelligence analyst specializing in Reddit sentiment analysis and market validation.`;
      
      const userPrompt = `
Analyze this Reddit sentiment data for "${redditData.idea}" and provide actionable business insights.

Reddit Data:
- Sentiment: ${positive}% positive, ${neutral}% neutral, ${negative}% negative
- Mentions: ${mentions}
- Engagement: ${upvotes} upvotes, ${comments} comments
- Top Subreddits: ${redditData.topSubreddits?.join(', ') || 'N/A'}
- Trending Topics: ${redditData.trendingTopics?.join(', ') || 'N/A'}
- Key Insights: ${redditData.insights?.join('. ') || 'N/A'}

Provide a JSON response with:
{
  "insights": ["actionable insight 1", "actionable insight 2", "actionable insight 3"],
  "marketValidation": "assessment of market validation based on sentiment",
  "communityStrategy": "recommendations for engaging with the community",
  "risks": ["potential risk 1", "potential risk 2"],
  "opportunities": ["business opportunity 1", "business opportunity 2"],
  "nextSteps": ["immediate action 1", "immediate action 2"]
}`;

      const response = await callGroqWithRetry(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        }
      );

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      return new Response(
        JSON.stringify({
          success: true,
          insights: analysis.insights || [],
          marketValidation: analysis.marketValidation || '',
          communityStrategy: analysis.communityStrategy || '',
          risks: analysis.risks || [],
          opportunities: analysis.opportunities || [],
          nextSteps: analysis.nextSteps || [],
          usage: {
            model: 'llama-3.1-8b-instant',
            tokens: data.usage?.total_tokens || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Original validation and search results logic
    if (!searchResults && !pageContent) {
      throw new Error('Either searchResults, pageContent, redditData, or webSearchData is required');
    }

    console.log('Groq synthesis for tile:', tileType);

    // Build the synthesis prompt based on tile type
    const systemPrompt = `You are a data synthesis expert. Analyze the provided search results and web content to extract structured insights for a startup dashboard. Return ONLY valid JSON with no additional text or markdown.`;

    
    const userPrompt = `
Analyze these search results and page content for "${filters?.idea || 'the startup idea'}".
Focus on extracting data for the "${tileType || 'general'}" dashboard tile.

Search Results:
${searchResults ? JSON.stringify(searchResults).substring(0, 4000) : 'No search results available'}

Page Content:
${pageContent ? JSON.stringify(pageContent).substring(0, 4000) : 'No page content available'}

Return a JSON object with this EXACT structure:
{
  "metrics": [
    {"label": "string", "value": "string or number", "trend": "up|down|neutral", "confidence": 0-100}
  ],
  "items": [
    {"title": "string", "description": "string", "value": "string", "metadata": {}}
  ],
  "competitors": [
    {"name": "string", "strength": 0-100, "marketShare": number, "pricing": "string", "funding": "string"}
  ],
  "insights": ["string"],
  "projections": {"1month": number, "3months": number, "6months": number, "1year": number},
  "citations": [
    {"source": "string", "url": "string", "confidence": 0-100}
  ]
}

Extract real data from the search results. If data is not available for a field, use reasonable estimates based on context.`;

    // Call Groq API with retry logic
    const response = await callGroqWithRetry(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }
    );

    const data = await response.json();
    const synthesized = JSON.parse(data.choices[0].message.content);

    // Calculate token usage for cost tracking
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const costEstimate = (inputTokens * 0.00005) + (outputTokens * 0.00008); // $0.05/M in, $0.08/M out

    return new Response(
      JSON.stringify({
        success: true,
        tileType,
        data: synthesized,
        usage: {
          inputTokens,
          outputTokens,
          costEstimate: `$${costEstimate.toFixed(6)}`,
          model: 'llama-3.1-8b-instant'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in groq-synthesis:', error);
    
    // Return a more graceful error response for rate limiting
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a few moments.',
          retryAfter: 30
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});