import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function serperSearch(query: string) {
  if (!SERPER_API_KEY) return null;
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 10 })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('[web-search-ai] Serper error:', e);
    return null;
  }
}

async function tavilySearch(query: string) {
  if (!TAVILY_API_KEY) return null;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify({ query, include_answer: false, max_results: 5 })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('[web-search-ai] Tavily error:', e);
    return null;
  }
}

function normalizeCitations(fromSerper: any, fromTavily: any) {
  const citations: Array<{ url: string; label: string; published: string }> = [];
  try {
    if (fromSerper?.organic) {
      for (const item of fromSerper.organic.slice(0, 5)) {
        citations.push({
          url: item.link,
          label: item.title?.slice(0, 80) || 'Source',
          published: item.date || 'unknown'
        });
      }
    }
  } catch (_) {}
  try {
    if (fromTavily?.results) {
      for (const r of fromTavily.results.slice(0, 5)) {
        citations.push({
          url: r.url,
          label: r.title?.slice(0, 80) || 'Source',
          published: r.published_date || 'unknown'
        });
      }
    }
  } catch (_) {}
  // de-duplicate by URL
  const seen = new Set<string>();
  return citations.filter(c => (seen.has(c.url) ? false : (seen.add(c.url), true)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { query = '', tileType = 'generic', filters = {} } = await req.json();
    console.log('[web-search-ai] Request:', { q: query?.slice(0, 80), tileType });

    // Fetch external context in parallel
    const [serper, tavily] = await Promise.all([
      serperSearch(query || (filters?.idea_keywords || []).join(' ')),
      tavilySearch(query || (filters?.idea_keywords || []).join(' '))
    ]);

    const contextSnippets: string[] = [];
    try {
      serper?.organic?.slice(0, 3).forEach((i: any) => contextSnippets.push(`${i.title}: ${i.snippet}`));
    } catch (_) {}
    try {
      tavily?.results?.slice(0, 3).forEach((r: any) => contextSnippets.push(`${r.title}: ${r.content?.slice(0, 160)}`));
    } catch (_) {}

    // If Groq key is missing, fallback to a basic synthesized payload
    if (!GROQ_API_KEY) {
      const now = new Date().toISOString();
      return new Response(JSON.stringify({
        updatedAt: now,
        filters,
        metrics: [
          { name: 'Signal Strength', value: 62, unit: '%', explanation: 'Heuristic based on available sources', method: 'heuristic', confidence: 0.5 },
          { name: 'Market Momentum', value: 0.7, unit: '', explanation: 'Estimated from recent mentions', method: 'approximation', confidence: 0.4 }
        ],
        items: (serper?.organic || []).slice(0, 4).map((i: any) => ({
          title: i.title,
          snippet: i.snippet,
          url: i.link,
          canonicalUrl: i.link,
          published: i.date || 'unknown',
          source: new URL(i.link).hostname,
          evidence: []
        })),
        assumptions: [
          'Data synthesized without AI model due to missing key',
          'Signals may be incomplete'
        ],
        notes: 'Fallback synthetic summary due to service constraints.',
        citations: normalizeCitations(serper, tavily),
        fromCache: false,
        stale: false
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build Groq prompt to produce TileData JSON
    const systemPrompt = `You are a data synthesis engine that outputs STRICT JSON for dashboard tiles.
Return ONLY a JSON object with these fields:
{
  "updatedAt": ISO8601 string,
  "filters": object,
  "metrics": [ { "name": string, "value": number|string, "unit": string, "explanation": string, "method": string, "confidence": 0..1 } ],
  "items": [ { "title": string, "snippet": string, "url": string, "canonicalUrl": string, "published": string, "source": string, "evidence": string[] } ],
  "assumptions": string[],
  "notes": string,
  "citations": [ { "url": string, "label": string, "published": string } ],
  "fromCache": boolean,
  "stale": boolean
}
Ensure metrics are concise (2-5 items) and confidence is between 0 and 1.`;

    const userPrompt = `Tile Type: ${tileType}
Query: ${query || (filters?.idea_keywords || []).join(' ')}
Filters: ${JSON.stringify(filters)}
Context (top sources): ${contextSnippets.join('\n')}

Generate the JSON now.`;

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        max_tokens: 900,
        temperature: 0.4,
        response_format: { type: 'json_object' }
      })
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error('[web-search-ai] Groq error:', aiRes.status, text);
      throw new Error('Groq request failed');
    }

    const data = await aiRes.json();
    if (!data?.choices?.[0]?.message?.content) {
      console.error('[web-search-ai] Invalid Groq response:', data);
      throw new Error('Invalid AI response');
    }

    let payload;
    try {
      payload = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error('[web-search-ai] JSON parse error:', e);
      // Fallback minimal payload
      const now = new Date().toISOString();
      payload = {
        updatedAt: now,
        filters,
        metrics: [
          { name: 'Signal Strength', value: 55, unit: '%', explanation: 'Fallback metric', method: 'fallback', confidence: 0.4 }
        ],
        items: (serper?.organic || []).slice(0, 3).map((i: any) => ({
          title: i.title,
          snippet: i.snippet,
          url: i.link,
          canonicalUrl: i.link,
          published: i.date || 'unknown',
          source: new URL(i.link).hostname,
          evidence: []
        })),
        assumptions: ['AI response was unstructured; provided minimal data.'],
        notes: 'Fallback due to AI formatting issue.',
        citations: normalizeCitations(serper, tavily),
        fromCache: false,
        stale: false
      };
    }

    // Ensure required fields exist
    payload.updatedAt ||= new Date().toISOString();
    payload.filters ||= filters;
    payload.metrics ||= [];
    payload.items ||= [];
    payload.assumptions ||= [];
    payload.notes ||= '';
    payload.citations ||= normalizeCitations(serper, tavily);
    payload.fromCache = !!payload.fromCache;
    payload.stale = !!payload.stale;

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[web-search-ai] Error:', error);
    return new Response(JSON.stringify({
      error: 'Cannot fetch AI responses',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});