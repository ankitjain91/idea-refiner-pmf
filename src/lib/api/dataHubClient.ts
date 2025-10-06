import { supabase } from '@/integrations/supabase/client';

export interface FetchTilesOptions {
  tiles?: string[];
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

async function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')), { once: true });
    })
  ]);
}

export async function fetchTiles(idea: string, opts: FetchTilesOptions = {}) {
  const { tiles, forceRefresh, signal } = opts;
  const p = supabase.functions.invoke('data-hub', {
    body: { idea, tiles, forceRefresh }
  });
  const { data, error } = await withAbort(p, signal);
  if ((data as any)?.error || error) throw ((data as any)?.error || error);
  return data;
}

export async function refreshTile(idea: string, tile: string) {
  const { data, error } = await supabase.functions.invoke('tile-refresh', {
    body: { idea, tile }
  });
  if ((data as any)?.error || error) throw ((data as any)?.error || error);
  return data;
}
