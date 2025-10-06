// Shared server-safe orchestrator core (extracted minimal subset)
// NOTE: Do NOT import browser-only modules. This file runs in Deno edge functions.

export interface TileData {
  metrics: Record<string, any>;
  explanation: string;
  citations: Array<{ url: string; title: string; source: string; relevance: number }>;
  charts: any[];
  json: any;
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  insights?: any;
  error?: string;
  stale?: boolean;
}

export interface DataHubResponseMeta {
  cacheHits: string[];
  generated: string[];
  elapsedMs: number;
  ideaHash: string;
  warnings?: string[];
}

export interface DataHubRequestBody {
  idea: string;
  tiles?: string[];
  sessionId?: string;
  forceRefresh?: boolean;
}

// Simple SHA-256 helper for deterministic idea key
export async function hashIdea(idea: string): Promise<string> {
  const data = new TextEncoder().encode(idea.toLowerCase().trim());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Sentinel empty tile WITHOUT fabricated data (no mock numbers)
export function emptyTile(reason: string): TileData {
  return {
    metrics: {},
    explanation: reason,
    citations: [],
    charts: [],
    json: {},
    confidence: 0,
    dataQuality: 'low',
  };
}

// Synthesis placeholder (no mock values) — real providers should populate metrics.
export async function synthesizeTile(type: string, idea: string): Promise<TileData> {
  const SUPABASE_URL = (globalThis as any).Deno?.env?.get('SUPABASE_URL') || '';
  const SERVICE_KEY = (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  switch (type) {
    case 'twitter_sentiment':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/twitter-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea, query: idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.twitter_buzz?.metrics || {},
            explanation: json.twitter_buzz?.summary || 'Twitter sentiment analysis completed',
            citations: [],
            charts: [],
            json: json.twitter_buzz || json,
            confidence: json.twitter_buzz?.confidence === 'High' ? 0.8 : 0.5,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] twitter_sentiment error:', e);
      }
      return emptyTile('Twitter sentiment data unavailable');
    
    case 'youtube_analysis':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/youtube-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea_text: idea, idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.summary || {},
            explanation: `Found ${json.youtube_insights?.length || 0} relevant videos`,
            citations: [],
            charts: [],
            json: json,
            confidence: json.meta?.confidence === 'High' ? 0.8 : 0.5,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] youtube_analysis error:', e);
      }
      return emptyTile('YouTube analysis data unavailable');
      
    case 'market_size':
      return emptyTile('Market size data not available yet – connect provider / ingestion pipeline.');
    case 'competition':
      return emptyTile('Competition analysis pending real scraping integration.');
    case 'sentiment':
      return emptyTile('Sentiment requires social / reviews ingestion – none connected.');
    case 'market_trends':
      return emptyTile('Trends not computed – enable trends provider.');
    case 'google_trends':
      return emptyTile('Google Trends API not configured.');
    case 'web_search':
      return emptyTile('Web intelligence unavailable – search providers not configured.');
    case 'news_analysis':
      return emptyTile('News analysis requires news feed API configuration.');
    default:
      return emptyTile(`Tile "${type}" not implemented.`);
  }
}

// Core orchestrator: fetch (or load from cache) a set of tiles.
export async function buildTiles(idea: string, tiles: string[], opts: { force?: boolean; loadCache: (id: string, tile: string) => Promise<TileData | null>; saveCache: (id: string, tile: string, data: TileData) => Promise<void>; }): Promise<{ tiles: Record<string, TileData>; meta: DataHubResponseMeta; }> {
  const start = Date.now();
  const ideaHash = await hashIdea(idea);
  const out: Record<string, TileData> = {};
  const cacheHits: string[] = [];
  const generated: string[] = [];
  const warnings: string[] = [];

  for (const tile of tiles) {
    try {
      let cached: TileData | null = null;
      if (!opts.force) {
        cached = await opts.loadCache(ideaHash, tile);
      }
      if (cached) {
        out[tile] = { ...cached, stale: false };
        cacheHits.push(tile);
        continue;
      }
      const synthesized = await synthesizeTile(tile, idea);
      out[tile] = synthesized;
      generated.push(tile);
      // Persist even placeholder so front-end knows tile exists (could mark with low confidence)
      await opts.saveCache(ideaHash, tile, synthesized).catch(() => {
        warnings.push(`Failed to cache tile ${tile}`);
      });
    } catch (e: any) {
      out[tile] = { ...emptyTile('Tile failed to generate'), error: e?.message || 'Unknown error' };
      warnings.push(`Tile ${tile} error: ${e?.message}`);
    }
  }

  return {
    tiles: out,
    meta: {
      cacheHits,
      generated,
      elapsedMs: Date.now() - start,
      ideaHash,
      warnings: warnings.length ? warnings : undefined
    }
  };
}
