import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { synthesizeTile, hashIdea, TileData } from '../_shared/orchestrator-core.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
  try {
    const { idea, tile } = await req.json();
    if (!idea || !tile) {
      return new Response(JSON.stringify({ error: 'Missing idea or tile' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const ideaHash = await hashIdea(idea);
    const data: TileData = await synthesizeTile(tile, idea);
    const expires = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await supabase.from('data_hub_cache').upsert({ idea_hash: ideaHash, tile, data, expires_at: expires });
    return new Response(JSON.stringify({ success: true, tile: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
