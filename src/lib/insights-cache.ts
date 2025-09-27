// Simple in-memory + localStorage cached insights manager so dashboard loads instantly if user navigates back.
// Keyed by idea + answers signature.
interface CachedEntry {
  promise: Promise<any>;
  timestamp: number;
  data?: any;
}

const MEMORY_CACHE: Record<string, CachedEntry> = {};
const LS_PREFIX = 'pmf.insights.cache:';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function computeKey(idea: string, answers: Record<string, any>): string {
  const answersSig = Object.entries(answers || {})
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${String(v).slice(0,40)}`)
    .join('&');
  return `${idea.trim().toLowerCase()}::${answersSig}`;
}

export async function getOrFetchInsights(idea: string, answers: Record<string, any>, fetcher: () => Promise<any>, onProgress?: (p: number) => void): Promise<any> {
  const key = computeKey(idea, answers);
  const now = Date.now();

  // LocalStorage cache
  try {
    if (!MEMORY_CACHE[key]) {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.timestamp && (now - parsed.timestamp) < TTL_MS) {
          MEMORY_CACHE[key] = { promise: Promise.resolve(parsed.data), timestamp: parsed.timestamp, data: parsed.data };
        }
      }
    }
  } catch {}

  if (MEMORY_CACHE[key]?.data) {
    if (onProgress) onProgress(100);
    return MEMORY_CACHE[key].data;
  }

  if (MEMORY_CACHE[key] && MEMORY_CACHE[key].promise) {
    // Attach progress listener noop for shared promise
    return MEMORY_CACHE[key].promise;
  }

  let progress = 0;
  const wrapped = (async () => {
    try {
      if (onProgress) onProgress(progress = 15);
      const data = await fetcher();
      if (onProgress) onProgress(progress = 100);
      try {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify({ timestamp: Date.now(), data }));
      } catch {}
      MEMORY_CACHE[key].data = data;
      return data;
    } catch (e) {
      // Invalidate on failure so next mount retries
      delete MEMORY_CACHE[key];
      throw e;
    }
  })();

  MEMORY_CACHE[key] = { promise: wrapped, timestamp: now };
  return wrapped;
}

export function purgeStaleInsights() {
  const now = Date.now();
  Object.entries(MEMORY_CACHE).forEach(([k, entry]) => {
    if ((now - entry.timestamp) > TTL_MS) delete MEMORY_CACHE[k];
  });
}
