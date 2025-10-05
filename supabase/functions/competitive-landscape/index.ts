import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Competitor {
  name: string;
  url?: string;
  marketShare: number;
  valuation?: string;
  fundingStage?: string;
  strength?: 'strong' | 'moderate' | 'weak';
  founded?: string;
  strengths?: string[];
  weaknesses?: string[];
}

function getDomain(u: string): string {
  try {
    const h = new URL(u).hostname.replace(/^www\./, '');
    return h;
  } catch {
    return u;
  }
}

const AGGREGATOR_DOMAINS = new Set([
  'g2.com','capterra.com','getapp.com','gartner.com','wikipedia.org','reddit.com','medium.com','youtube.com','github.com','stackshare.io','quora.com'
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, depth = 'standard' } = await req.json();
    if (!idea || typeof idea !== 'string' || idea.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Missing or invalid idea parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!BRAVE_API_KEY) {
      console.error('[competitive-landscape] BRAVE_SEARCH_API_KEY not set');
      return new Response(
        JSON.stringify({ 
          error: 'BRAVE_SEARCH_API_KEY is not configured.',
          data: { topCompetitors: [], marketConcentration: 'unknown', barrierToEntry: 'unknown' }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('[competitive-landscape] LOVABLE_API_KEY not set');
      return new Response(
        JSON.stringify({ 
          error: 'LOVABLE_API_KEY is not configured.',
          data: { topCompetitors: [], marketConcentration: 'unknown', barrierToEntry: 'unknown' }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for competitors
    const queries = [
      `${idea} top companies startups`,
      `${idea} market leaders competitors`,
      `best ${idea} platforms solutions`
    ];

    const searchResults: Array<{ title: string; url: string; snippet?: string }> = [];

    await Promise.all(queries.map(async (q) => {
      try {
        const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=15&freshness=month`, {
          headers: { 'X-Subscription-Token': BRAVE_API_KEY },
        });
        
        if (!res.ok) {
          console.error('[competitive-landscape] Brave API error:', res.status);
          return;
        }
        
        const json = await res.json();
        const items = json?.web?.results || [];
        for (const item of items) {
          if (item?.url && item?.title) {
            const domain = getDomain(item.url);
            if (!AGGREGATOR_DOMAINS.has(domain)) {
              searchResults.push({ 
                title: item.title as string, 
                url: item.url as string,
                snippet: item.snippet as string || ''
              });
            }
          }
        }
      } catch (error) {
        console.error('[competitive-landscape] Query error:', q, error);
      }
    }));

    if (searchResults.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No search results found',
          data: { topCompetitors: [], marketConcentration: 'Low', barrierToEntry: 'Low' }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to extract actual competitor information
    console.log('[competitive-landscape] Analyzing', searchResults.length, 'search results with AI');
    
    const aiPrompt = `You are a market research analyst. Analyze these search results about "${idea}" and extract the actual competitor companies/products.

Search Results:
${searchResults.slice(0, 20).map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet || ''}`).join('\n\n')}

Task: Identify 5-8 actual COMPETITOR COMPANIES (not articles, not educational content). For each competitor, extract:
- Company/Product name (the actual business name, not article titles)
- A brief 1-line description
- Estimated market position (1-3 = strong, 4-6 = moderate, 7+ = weak)
- Estimated founding year (if mentioned or inferable)
- 2-3 key strengths
- 2-3 key weaknesses

Focus on actual companies/products that compete in this space. Ignore news sites, educational articles, and generic information pages.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: aiPrompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_competitors',
            description: 'Extract structured competitor information',
            parameters: {
              type: 'object',
              properties: {
                competitors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Company/product name' },
                      description: { type: 'string', description: 'Brief 1-line description' },
                      position: { type: 'number', description: 'Market position rank (1-10)' },
                      founded: { type: 'string', description: 'Founding year or "Unknown"' },
                      strengths: { type: 'array', items: { type: 'string' }, description: '2-3 strengths' },
                      weaknesses: { type: 'array', items: { type: 'string' }, description: '2-3 weaknesses' },
                      url: { type: 'string', description: 'Company website URL if available' }
                    },
                    required: ['name', 'description', 'position', 'strengths', 'weaknesses'],
                    additionalProperties: false
                  }
                }
              },
              required: ['competitors'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_competitors' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[competitive-landscape] AI error:', aiResponse.status, errorText);
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error('[competitive-landscape] No tool call in AI response');
      throw new Error('AI did not return structured data');
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    const aiCompetitors = extracted.competitors || [];

    console.log('[competitive-landscape] AI extracted', aiCompetitors.length, 'competitors');

    // Calculate market shares based on position
    const totalPositions = aiCompetitors.reduce((sum: number, c: any) => sum + (11 - c.position), 0);
    
    const topCompetitors: Competitor[] = aiCompetitors.map((c: any, i: number) => {
      const weight = (11 - c.position) / totalPositions;
      const marketShare = Math.round(weight * 80); // Total to ~80%
      
      return {
        name: c.name,
        url: c.url || searchResults.find(r => r.title.toLowerCase().includes(c.name.toLowerCase()))?.url,
        marketShare: Math.max(1, marketShare),
        founded: c.founded || 'Unknown',
        fundingStage: c.position <= 2 ? 'Series C+' : c.position <= 4 ? 'Series B' : c.position <= 6 ? 'Series A' : 'Seed/Early',
        valuation: c.position === 1 ? '$500M+' : c.position === 2 ? '$100M-500M' : c.position <= 4 ? '$50M-100M' : 'N/A',
        strength: (c.position <= 3 ? 'strong' : c.position <= 6 ? 'moderate' : 'weak') as 'strong' | 'moderate' | 'weak',
        strengths: c.strengths || [],
        weaknesses: c.weaknesses || []
      };
    });

    // Calculate HHI for market concentration
    const hhi = topCompetitors.reduce((sum, c) => sum + (c.marketShare * c.marketShare), 0);
    const marketConcentration = hhi >= 2500 ? `High (HHI: ${hhi})` : hhi >= 1500 ? `Moderate (HHI: ${hhi})` : `Low (HHI: ${hhi})`;
    
    const barrierToEntry = topCompetitors.length >= 8 ? 'Low - fragmented market' : 
                           topCompetitors.length >= 4 ? 'Medium - some differentiation needed' : 
                           'High - few established players';

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        topCompetitors,
        marketConcentration,
        barrierToEntry,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[competitive-landscape] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: { topCompetitors: [], marketConcentration: 'unknown', barrierToEntry: 'unknown' }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
