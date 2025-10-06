// Edge function: data-hub
// Provides tile aggregation WITHOUT mock fabricated metrics. Tiles return explanatory placeholders until real providers wired.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildTiles, DataHubRequestBody, hashIdea, TileData, emptyTile } from '../_shared/orchestrator-core.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// Simple cache table contract (document):
// CREATE TABLE IF NOT EXISTS data_hub_cache (
//   id uuid primary key default gen_random_uuid(),
//   idea_hash text not null,
//   tile text not null,
//   data jsonb not null,
//   created_at timestamptz default now(),
//   expires_at timestamptz,
//   unique(idea_hash, tile)
// );

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Recognized tile ids
const ALLOWED_TILES = new Set(['market_size','competition','sentiment','market_trends','google_trends','web_search','news_analysis','financial_analysis','twitter_sentiment','youtube_analysis']);

async function safeLoadCache(ideaHash: string, tile: string): Promise<TileData | null> {
  try {
    const { data, error } = await supabase
      .from('data_hub_cache')
      .select('data, expires_at')
      .eq('idea_hash', ideaHash)
      .eq('tile', tile)
      .maybeSingle();
    if (error) { console.warn('[data-hub] cache read error', tile, error.message); return null; }
    if (!data) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
    return data.data as TileData;
  } catch (e) { console.warn('[data-hub] cache load exception', tile, e); return null; }
}

async function safeSaveCache(ideaHash: string, tile: string, data: TileData) {
  try {
    const expires = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('data_hub_cache')
      .upsert({ idea_hash: ideaHash, tile, data, expires_at: expires });
    if (error) console.warn('[data-hub] cache write error', tile, error.message);
  } catch (e) { console.warn('[data-hub] cache save exception', tile, e); }
}

const loadCache = safeLoadCache; // backward compatible names
const saveCache = safeSaveCache;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, version: '1.2.0', timestamp: new Date().toISOString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
  let body: DataHubRequestBody;
  try { body = await req.json() as DataHubRequestBody; } catch { return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    if (!body.idea || typeof body.idea !== 'string' || body.idea.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Invalid idea' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // If no explicit tiles passed, default (financial_analysis only when explicitly requested)
    let tiles = (body.tiles && body.tiles.length ? body.tiles : [
      'market_size','competition','sentiment','market_trends','google_trends','web_search','news_analysis'
    ]).slice(0, 12);
    const invalid = tiles.filter(t => !ALLOWED_TILES.has(t));
    if (invalid.length) tiles = tiles.filter(t => ALLOWED_TILES.has(t));
    const metaErrors: string[] = [];
    if (invalid.length) metaErrors.push(`Removed invalid tiles: ${invalid.join(', ')}`);

    const { tiles: resultTiles, meta } = await buildTiles(body.idea, tiles, {
      force: body.forceRefresh,
      loadCache,
      saveCache
    });

    // FINANCIAL ANALYSIS (integrate existing edge function)
    if (tiles.includes('financial_analysis')) {
      try {
        const finResp = await fetch(`${SUPABASE_URL}/functions/v1/financial-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea: body.idea })
        });
        if (finResp.ok) {
          const finJson = await finResp.json();
          const f = finJson?.financials;
          if (f) {
            const tile: TileData = {
              metrics: {
                tam: f.marketSize?.TAM?.value,
                sam: f.marketSize?.SAM?.value,
                som: f.marketSize?.SOM?.value,
                cac: f.unitEconomics?.CAC?.value,
                ltv: f.unitEconomics?.LTV?.value,
                ltv_cac_ratio: f.unitEconomics?.LTVtoCACRatio,
                growthRate: f.revenueProjections?.growthRate,
              },
              explanation: Array.isArray(f.insights) && f.insights.length ? f.insights.slice(0,3).join('\n') : 'Financial analysis available.',
              citations: [],
              charts: [],
              json: f,
              confidence: 0.6,
              dataQuality: 'medium'
            };
            resultTiles['financial_analysis'] = tile;
            const h = await hashIdea(body.idea);
            await saveCache(h, 'financial_analysis', tile).catch(()=>{});
          } else {
            resultTiles['financial_analysis'] = { ...emptyTile('No financial data returned'), confidence: 0, dataQuality: 'low' } as TileData;
          }
        } else {
          resultTiles['financial_analysis'] = { ...emptyTile('Financial analysis request failed'), confidence: 0, dataQuality: 'low' } as TileData;
        }
      } catch (err: any) {
        resultTiles['financial_analysis'] = { ...emptyTile(err?.message || 'Financial analysis error'), error: err?.message, confidence: 0, dataQuality: 'low' } as TileData;
      }
    }

  const responseMeta = { ...meta, errors: metaErrors.length ? metaErrors : undefined };
  return new Response(JSON.stringify({ success: true, tiles: resultTiles, meta: responseMeta }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[data-hub] fatal', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
