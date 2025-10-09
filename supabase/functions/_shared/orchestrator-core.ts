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
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/twitter-ai-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea, idea_text: idea, lang: 'en' })
        });
        if (resp.ok) {
          const json = await resp.json();
          const total = json.metrics?.total_tweets ?? (Array.isArray(json.tweets) ? json.tweets.length : 0);
          return {
            metrics: json.metrics || {},
            explanation: total ? `Estimated ${total} tweets with ${json.sentiment?.positive ?? 0}% positive sentiment` : 'Twitter sentiment analysis completed',
            citations: [],
            charts: [],
            json: json,
            confidence: 0.6,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] twitter_sentiment error:', e);
      }
      return emptyTile('Twitter sentiment data unavailable');
    
    case 'youtube_analysis':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/youtube-ai-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea_text: idea, idea, time_window: 'year', regionCode: 'US' })
        });
        if (resp.ok) {
          const json = await resp.json();
          const count = Array.isArray(json.youtube_insights) ? json.youtube_insights.length : 0;
          return {
            metrics: json.summary || {},
            explanation: `Found ${count} relevant videos`,
            citations: [],
            charts: [],
            json: json,
            confidence: 0.6,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] youtube_analysis error:', e);
      }
      return emptyTile('YouTube analysis data unavailable');
      
    case 'market_size':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/market-size-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.market_size?.metrics || json.metrics || {},
            explanation: json.market_size?.explanation || json.explanation || 'Market size analysis completed',
            citations: json.market_size?.citations || json.citations || [],
            charts: json.market_size?.charts || json.charts || [],
            json: json,
            confidence: 0.75,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] market_size error:', e);
      }
      return emptyTile('Market size data not available yet');
      
    case 'competition':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/competitive-landscape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.competition?.metrics || json.metrics || {},
            explanation: json.competition?.explanation || json.summary || 'Competition analysis completed',
            citations: json.competition?.citations || json.citations || [],
            charts: json.competition?.charts || json.charts || [],
            json: json,
            confidence: 0.75,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] competition error:', e);
      }
      return emptyTile('Competition analysis unavailable');
      
    case 'sentiment':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/unified-sentiment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.sentiment?.metrics || json.metrics || {},
            explanation: json.sentiment?.summary || json.summary || 'Sentiment analysis completed',
            citations: json.sentiment?.citations || json.citations || [],
            charts: json.sentiment?.charts || json.charts || [],
            json: json,
            confidence: 0.70,
            dataQuality: 'medium'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] sentiment error:', e);
      }
      return emptyTile('Sentiment data unavailable');
      
    case 'market_trends':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/market-trends`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.trends?.metrics || json.metrics || {},
            explanation: json.trends?.summary || json.summary || 'Market trends analysis completed',
            citations: json.trends?.citations || json.citations || [],
            charts: json.trends?.charts || json.charts || [],
            json: json,
            confidence: 0.75,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] market_trends error:', e);
      }
      return emptyTile('Market trends data unavailable');
      
    case 'google_trends':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/google-trends`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.google_trends?.metrics || json.metrics || {},
            explanation: json.google_trends?.summary || json.summary || 'Google trends analysis completed',
            citations: json.google_trends?.citations || json.citations || [],
            charts: json.google_trends?.charts || json.charts || [],
            json: json,
            confidence: 0.85,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] google_trends error:', e);
      }
      return emptyTile('Google Trends data unavailable');
      
    case 'web_search':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/web-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.web_search?.metrics || json.metrics || {},
            explanation: json.web_search?.summary || json.summary || 'Web search analysis completed',
            citations: json.web_search?.citations || json.citations || [],
            charts: json.web_search?.charts || json.charts || [],
            json: json,
            confidence: 0.70,
            dataQuality: 'medium'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] web_search error:', e);
      }
      return emptyTile('Web search data unavailable');
      
    case 'news_analysis':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/news-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          return {
            metrics: json.news_analysis?.metrics || json.metrics || {},
            explanation: json.news_analysis?.summary || json.summary || 'News analysis completed',
            citations: json.news_analysis?.citations || json.citations || [],
            charts: json.news_analysis?.charts || json.charts || [],
            json: json,
            confidence: 0.75,
            dataQuality: 'high'
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] news_analysis error:', e);
      }
      return emptyTile('News analysis data unavailable');
      
    case 'reddit_sentiment':
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/reddit-sentiment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: JSON.stringify({ idea })
        });
        if (resp.ok) {
          const json = await resp.json();
          const rs = json.reddit_sentiment || json;
          const getMetric = (name: string) => Array.isArray(rs.metrics) ? (rs.metrics.find((m: any) => m.name === name)?.value ?? null) : null;
          const confidenceMap: Record<string, number> = { High: 0.85, Moderate: 0.7, Low: 0.5 };
          const citationsArr = (rs.clusters?.[0]?.citations || rs.citations || []).map((c: any) => ({
            url: c.url || '#',
            title: c.title || c.label || 'Reddit Source',
            source: c.source || 'Reddit',
            relevance: 0.8,
          }));
          return {
            metrics: {
              positive: rs.overall_sentiment?.positive ?? null,
              neutral: rs.overall_sentiment?.neutral ?? null,
              negative: rs.overall_sentiment?.negative ?? null,
              total_posts: rs.overall_sentiment?.total_posts ?? null,
              engagement_score: getMetric('engagement_score'),
              community_positivity_score: getMetric('community_positivity_score'),
            },
            explanation: rs.clusters?.[0]?.insight || 'Reddit community sentiment analysis',
            citations: citationsArr,
            charts: rs.charts || [],
            json: rs,
            confidence: confidenceMap[String(rs.confidence)] ?? 0.7,
            dataQuality: 'high',
          };
        }
      } catch (e: any) {
        console.error('[synthesizeTile] reddit_sentiment error:', e);
      }
      return emptyTile('Reddit sentiment data unavailable');
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
