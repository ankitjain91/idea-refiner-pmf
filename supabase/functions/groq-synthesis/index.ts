import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const { searchResults, pageContent, tileType, filters, marketTrendsData } = await req.json();
    
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

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Groq API error:', error);
        throw new Error(`Groq API error: ${response.status}`);
      }

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
    
    // Original search results synthesis logic
    if (!searchResults && !pageContent) {
      throw new Error('Either searchResults or pageContent is required');
    }

    console.log('Groq synthesis for tile:', tileType);

    // Build the synthesis prompt based on tile type
    const systemPrompt = `You are a data synthesis expert. Analyze the provided search results and web content to extract structured insights for a startup dashboard. Return ONLY valid JSON with no additional text or markdown.`;

    const userPrompt = `
Analyze these search results and page content for "${filters?.idea || 'the startup idea'}".
Focus on extracting data for the "${tileType}" dashboard tile.

Search Results:
${JSON.stringify(searchResults).substring(0, 4000)}

Page Content:
${JSON.stringify(pageContent).substring(0, 4000)}

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

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      throw new Error(`Groq API error: ${response.status}`);
    }

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});