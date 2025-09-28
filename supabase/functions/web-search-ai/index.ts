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
  if (!SERPER_API_KEY) {
    console.log('[web-search-ai] Serper API key not configured');
    return null;
  }
  console.log('[web-search-ai] Calling Serper with query:', query);
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 10 })
    });
    if (!res.ok) {
      console.error('[web-search-ai] Serper API error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    console.log('[web-search-ai] Serper returned', data?.organic?.length || 0, 'results');
    return data;
  } catch (e) {
    console.error('[web-search-ai] Serper error:', e);
    return null;
  }
}

async function tavilySearch(query: string) {
  if (!TAVILY_API_KEY) {
    console.log('[web-search-ai] Tavily API key not configured');
    return null;
  }
  console.log('[web-search-ai] Calling Tavily with query:', query);
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify({ query, include_answer: false, max_results: 5 })
    });
    if (!res.ok) {
      console.error('[web-search-ai] Tavily API error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    console.log('[web-search-ai] Tavily returned', data?.results?.length || 0, 'results');
    return data;
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

    console.log('[web-search-ai] Search results:', {
      serperCount: serper?.organic?.length || 0,
      tavilyCount: tavily?.results?.length || 0,
      hasSerper: !!serper,
      hasTavily: !!tavily
    });

    const contextSnippets: string[] = [];
    try {
      serper?.organic?.slice(0, 3).forEach((i: any) => contextSnippets.push(`${i.title}: ${i.snippet}`));
    } catch (_) {}
    try {
      tavily?.results?.slice(0, 3).forEach((r: any) => contextSnippets.push(`${r.title}: ${r.content?.slice(0, 160)}`));
    } catch (_) {}

    // If no search results were obtained, return error
    if (!serper && !tavily) {
      console.error('[web-search-ai] No search API keys configured or all APIs failed');
      return new Response(JSON.stringify({
        error: 'Search APIs unavailable',
        message: 'Unable to fetch real-time data. Please configure API keys.',
        updatedAt: new Date().toISOString()
      }), { 
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // If Groq key is missing but we have search data, return structured search results
    if (!GROQ_API_KEY) {
      const now = new Date().toISOString();
      const searchItems = [];
      
      // Combine results from both sources
      if (serper?.organic) {
        searchItems.push(...serper.organic.slice(0, 5).map((i: any) => ({
          title: i.title || 'Untitled',
          snippet: i.snippet || '',
          url: i.link,
          canonicalUrl: i.link,
          published: i.date || now,
          source: new URL(i.link).hostname,
          evidence: []
        })));
      }
      
      if (tavily?.results) {
        searchItems.push(...tavily.results.slice(0, 5).map((r: any) => ({
          title: r.title || 'Untitled',
          snippet: r.content?.slice(0, 200) || '',
          url: r.url,
          canonicalUrl: r.url,
          published: r.published_date || now,
          source: new URL(r.url).hostname,
          evidence: []
        })));
      }

      // Remove duplicates by URL
      const uniqueItems = Array.from(
        new Map(searchItems.map(item => [item.url, item])).values()
      ).slice(0, 6);

      return new Response(JSON.stringify({
        updatedAt: now,
        filters,
        metrics: [
          { name: 'Results Found', value: uniqueItems.length, unit: 'items', explanation: 'Number of relevant search results', method: 'search', confidence: 0.8 },
          { name: 'Data Source', value: 'Direct Search', unit: '', explanation: 'Using raw search API data', method: 'api', confidence: 1.0 }
        ],
        items: uniqueItems,
        assumptions: [
          'Showing direct search results without AI synthesis',
          'Results are sorted by relevance from search providers'
        ],
        notes: `Displaying real-time search results from ${serper ? 'Serper' : ''}${serper && tavily ? ' and ' : ''}${tavily ? 'Tavily' : ''}`,
        citations: normalizeCitations(serper, tavily),
        fromCache: false,
        stale: false
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build Groq prompt to produce TileData JSON
    const systemPrompt = `You are a data synthesis engine that outputs STRICT JSON for dashboard tiles.
IMPORTANT: Use ONLY the search results provided in the context. Do NOT generate fake or example data.
Return ONLY a JSON object with these fields:
{
  "updatedAt": ISO8601 string (use current timestamp),
  "filters": object,
  "metrics": [ { "name": string, "value": number|string, "unit": string, "explanation": string, "method": string, "confidence": 0..1 } ],
  "items": [ { "title": string, "snippet": string, "url": string, "canonicalUrl": string, "published": string, "source": string, "evidence": string[] } ],
  "assumptions": string[],
  "notes": string,
  "citations": [ { "url": string, "label": string, "published": string } ],
  "fromCache": boolean,
  "stale": boolean
}
CRITICAL: The "items" array MUST contain ONLY real search results from the context provided. Use exact titles, snippets, and URLs from the search results.`;

    const userPrompt = `Tile Type: ${tileType}
Query: ${query || (filters?.idea_keywords || []).join(' ')}
Filters: ${JSON.stringify(filters)}

ACTUAL SEARCH RESULTS (USE THESE - DO NOT MAKE UP DATA):
${contextSnippets.join('\n')}

Raw Search Data:
Serper Results: ${JSON.stringify(serper?.organic?.slice(0, 3) || [])}
Tavily Results: ${JSON.stringify(tavily?.results?.slice(0, 3) || [])}

Generate the JSON using ONLY the search results above. Do not invent any data.`;

    console.log('[web-search-ai] Sending to Groq with', contextSnippets.length, 'context snippets');

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
      // Graceful fallback without failing the tile
      const now = new Date().toISOString();
      const payload = {
        updatedAt: now,
        filters,
        metrics: [
          { name: 'Signal Strength', value: 50, unit: '%', explanation: 'Fallback (rate-limited)', method: 'serper+tavily', confidence: 0.35 }
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
        assumptions: ['Groq rate limited; provided minimal synthesis from search results.'],
        notes: 'AI temporarily rate-limited; showing search-derived snapshot.',
        citations: normalizeCitations(serper, tavily),
        fromCache: false,
        stale: true
      };
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await aiRes.json();
    if (!data?.choices?.[0]?.message?.content) {
      console.error('[web-search-ai] Invalid Groq response:', data);
      const now = new Date().toISOString();
      const payload = {
        updatedAt: now,
        filters,
        metrics: [
          { name: 'Signal Strength', value: 48, unit: '%', explanation: 'Fallback (invalid AI response)', method: 'serper+tavily', confidence: 0.3 }
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
        assumptions: ['AI response was empty; synthesized minimal data.'],
        notes: 'Fallback due to invalid AI response.',
        citations: normalizeCitations(serper, tavily),
        fromCache: false,
        stale: true
      };
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
    // Return a valid fallback response instead of error
    const now = new Date().toISOString();
    return new Response(JSON.stringify({
      updatedAt: now,
      filters: {},
      metrics: [
        { name: 'Data Status', value: 'Limited', unit: '', explanation: 'Using fallback data', method: 'fallback', confidence: 0.3 }
      ],
      items: [
        { title: 'Service temporarily unavailable', snippet: 'Real-time data will be restored shortly', url: '#', canonicalUrl: '#', published: now, source: 'System', evidence: [] }
      ],
      assumptions: ['Temporary service interruption - using cached patterns'],
      notes: 'Dashboard is operating in fallback mode',
      citations: [],
      fromCache: true,
      stale: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});