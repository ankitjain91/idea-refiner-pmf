import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea_id, idea_text, user_id } = await req.json();

    if (!idea_id || !idea_text || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    console.log('[refresh-live-context] Fetching live data for:', idea_text.substring(0, 100));

    // Fetch live market data from multiple sources
    const [marketData, trendData, competitorData] = await Promise.allSettled([
      fetchMarketData(idea_text, SERPER_API_KEY),
      fetchTrendData(idea_text, SERPER_API_KEY),
      fetchCompetitorData(idea_text, SERPER_API_KEY)
    ]);

    // Synthesize with Groq AI
    const synthesizedContext = await synthesizeContext(
      {
        market: marketData.status === 'fulfilled' ? marketData.value : null,
        trends: trendData.status === 'fulfilled' ? trendData.value : null,
        competitors: competitorData.status === 'fulfilled' ? competitorData.value : null,
      },
      idea_text,
      GROQ_API_KEY
    );

    // Store in live_context table
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase.from('live_context').insert([
      {
        idea_id,
        user_id,
        context_type: 'market_intelligence',
        data: synthesizedContext,
        source: 'serper+groq',
        expires_at: expiresAt.toISOString()
      }
    ]);

    console.log('[refresh-live-context] Successfully stored context');

    return new Response(
      JSON.stringify({ success: true, context: synthesizedContext }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[refresh-live-context] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchMarketData(idea: string, apiKey: string | undefined) {
  if (!apiKey) return null;

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: `${idea} market size revenue growth`,
      num: 5
    })
  });

  if (!response.ok) return null;
  return await response.json();
}

async function fetchTrendData(idea: string, apiKey: string | undefined) {
  if (!apiKey) return null;

  const response = await fetch('https://google.serper.dev/news', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: idea,
      num: 10
    })
  });

  if (!response.ok) return null;
  return await response.json();
}

async function fetchCompetitorData(idea: string, apiKey: string | undefined) {
  if (!apiKey) return null;

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: `${idea} competitors alternatives`,
      num: 5
    })
  });

  if (!response.ok) return null;
  return await response.json();
}

async function synthesizeContext(data: any, idea: string, apiKey: string | undefined) {
  if (!apiKey) {
    return {
      summary: 'Limited context (Groq API not configured)',
      insights: [],
      raw_data: data
    };
  }

  const prompt = `Analyze the following market intelligence for the idea: "${idea}"

Market Data: ${JSON.stringify(data.market)}
Trend Data: ${JSON.stringify(data.trends)}
Competitor Data: ${JSON.stringify(data.competitors)}

Provide a concise synthesis with:
1. Key market insights (2-3 points)
2. Recent trends (2-3 points)
3. Competitive landscape summary
4. Overall market opportunity score (1-100)

Format as JSON.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a market intelligence analyst. Provide concise, actionable insights.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    return {
      summary: 'AI synthesis unavailable',
      insights: [],
      raw_data: data
    };
  }

  const result = await response.json();
  const content = result.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch {
    return {
      summary: content,
      raw_data: data
    };
  }
}
