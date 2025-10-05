import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Optional keys (increase limits)
const REDDIT_CLIENT_ID = Deno.env.get("REDDIT_CLIENT_ID");
const REDDIT_CLIENT_SECRET = Deno.env.get("REDDIT_CLIENT_SECRET");
const REDDIT_USER_AGENT = Deno.env.get("REDDIT_USER_AGENT") || "enterprisehub/1.0 (by u/you)";
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN"); // optional

type Req = {
  idea: string;
  tiles?: ("sentiment"|"market"|"competitors")[];
  horizonDays?: number;
  country?: string;
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "+");
}

async function fetchHN(query: string, days: number) {
  const now = Math.floor(Date.now()/1000);
  const since = now - days*24*3600;
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story,comment&numericFilters=created_at_i>${since}`;
  const res = await fetch(url);
  return await res.json();
}

async function redditToken() {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) return null;
  const creds = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: { "Authorization": `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": REDDIT_USER_AGENT },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.access_token as string;
}

async function fetchReddit(query: string, days: number, token: string|null) {
  if (!token) {
    const url = `https://api.pushshift.io/reddit/search/submission/?q=${encodeURIComponent(query)}&after=${days}d&size=100`;
    const res = await fetch(url);
    const data = await res.json();
    return { mode: "pushshift", data };
  }
  const headers = { "Authorization": `Bearer ${token}`, "User-Agent": REDDIT_USER_AGENT };
  const url = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=100&type=link`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  return { mode: "reddit", data };
}

async function fetchWikipediaPageviews(title: string, days: number) {
  const end = new Date();
  const start = new Date(end.getTime() - days*24*3600*1000);
  function fmt(d: Date){ return d.toISOString().slice(0,10).replace(/-/g,""); }
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(title)}/daily/${fmt(start)}/${fmt(end)}`;
  const res = await fetch(url);
  if (!res.ok) return { items: [] };
  return await res.json();
}

async function fetchWorldBank(indicator: string, country = "USA", years = 10) {
  const end = new Date().getFullYear();
  const start = end - years;
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&date=${start}:${end}`;
  const res = await fetch(url);
  const j = await res.json();
  return Array.isArray(j) ? j[1] : [];
}

async function fetchGitHubRepos(keyword: string) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(keyword)}&sort=stars&order=desc&per_page=10`;
  const headers: Record<string,string> = { "Accept": "application/vnd.github+json" };
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  return await res.json();
}

function basicSentiment(text: string): number {
  const pos = ["good","great","love","win","fast","awesome","amazing","easy","helpful","wow","solid","clean","reliable","beautiful"];
  const neg = ["bad","hate","slow","bug","issue","problem","hard","fail","crash","expensive","confusing","ugly"];
  const t = text.toLowerCase();
  let score = 0;
  for (const w of pos) if (t.includes(w)) score++;
  for (const w of neg) if (t.includes(w)) score--;
  return Math.max(-1, Math.min(1, score/5));
}

function aggregateSentiment(texts: string[]) {
  const vals = texts.map(basicSentiment);
  const n = vals.length || 1;
  const mean = vals.reduce((a,b)=>a+b,0)/n;
  const conf = n >= 200 ? "High" : n >= 60 ? "Medium" : "Low";
  return { value: mean, sampleSize: n, conf };
}

serve(async (req) => {
  console.log('[free-signals] Request received');
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: Req = await req.json();
    const idea = (body.idea || "").slice(0, 120);
    const tiles = body.tiles?.length ? body.tiles : ["sentiment","market","competitors"];
    const days = Math.min(Math.max(body.horizonDays ?? 90, 7), 365);
    const country = body.country || "USA";

    if (!idea) throw new Error("idea is required");
    const query = slugify(idea);

    const redditTok = await redditToken();

    const tasks: Record<string, Promise<any>> = {};
    if (tiles.includes("sentiment")) {
      tasks["hn"] = fetchHN(query, days);
      tasks["reddit"] = fetchReddit(query, days, redditTok);
      tasks["wiki"] = fetchWikipediaPageviews(idea, Math.min(days, 60));
    }
    if (tiles.includes("market")) {
      tasks["wb_users"] = fetchWorldBank("IT.NET.USER.ZS", country, 10);
      tasks["wb_rd_gdp"] = fetchWorldBank("GB.XPD.RSDV.GD.ZS", country, 10);
      tasks["wb_gdp_growth"] = fetchWorldBank("NY.GDP.MKTP.KD.ZG", country, 10);
    }
    if (tiles.includes("competitors")) {
      tasks["github"] = fetchGitHubRepos(idea);
    }

    const results = await Promise.all(Object.values(tasks));
    const keyed: Record<string, any> = {};
    Object.keys(tasks).forEach((k, i) => keyed[k] = results[i]);

    const payload: Record<string, any> = {};

    if (tiles.includes("sentiment")) {
      const hnHits = (keyed.hn?.hits || []) as any[];
      const hnTexts = hnHits.map((h) => `${h.title ?? ""} ${h.comment_text ?? ""}`.trim()).filter(Boolean);
      const redditItems = keyed.reddit?.data?.data?.children ?? keyed.reddit?.data?.data ?? [];
      const rdTexts = redditItems.map((i: any) => (i.data?.title || i.title || "") + " " + (i.data?.selftext || i.selftext || "")).filter(Boolean);
      const texts = [...hnTexts, ...rdTexts].slice(0, 1000);
      const agg = aggregateSentiment(texts);
      const wikiViews = (keyed.wiki?.items ?? []).map((d:any)=>d.views);
      const trend = wikiViews.slice(-30);

      // Collect up to 5 sample items
      const samples: Array<{ source: 'hn'|'reddit'; title: string; url: string }> = [];
      hnHits.slice(0, 3).forEach((h) => {
        if (h.title) {
          samples.push({
            source: 'hn',
            title: h.title,
            url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`
          });
        }
      });
      redditItems.slice(0, 2).forEach((i: any) => {
        const title = i.data?.title || i.title;
        const permalink = i.data?.permalink || i.permalink;
        if (title && permalink) {
          samples.push({
            source: 'reddit',
            title,
            url: `https://reddit.com${permalink}`
          });
        }
      });

      payload.sentiment = {
        kpi: agg.value,
        sampleSize: agg.sampleSize,
        confidence: agg.conf,
        trend,
        sources: [
          { id: "hn.algolia", items: hnHits.length },
          { id: keyed.reddit?.mode === "reddit" ? "reddit.oauth" : "pushshift", items: redditItems.length },
          { id: "wikipedia.pageviews", items: (keyed.wiki?.items ?? []).length }
        ],
        samples: samples.slice(0, 5),
        lastUpdated: new Date().toISOString()
      };
    }

    if (tiles.includes("market")) {
      function lastVal(arr:any[]) {
        const v = arr?.find((x:any)=>x?.value!=null);
        return v?.value ?? null;
      }
      payload.market = {
        indicators: {
          internetUsersPct: lastVal(keyed.wb_users),
          rdSpendPctGDP: lastVal(keyed.wb_rd_gdp),
          gdpGrowthPct: lastVal(keyed.wb_gdp_growth),
        },
        series: {
          internetUsersPct: keyed.wb_users,
          rdSpendPctGDP: keyed.wb_rd_gdp,
          gdpGrowthPct: keyed.wb_gdp_growth,
        },
        sources: ["worldbank"],
        lastUpdated: new Date().toISOString()
      };
    }

    if (tiles.includes("competitors")) {
      const repos = (keyed.github?.items ?? []).map((r:any)=>({
        name: r.full_name,
        stars: r.stargazers_count,
        url: r.html_url,
        updated_at: r.updated_at
      }));
      payload.competitors = {
        topRepos: repos,
        sources: ["github"],
        lastUpdated: new Date().toISOString()
      };
    }

    return new Response(JSON.stringify({ ok: true, data: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
