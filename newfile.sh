# from your repo root (the folder that contains src/ and supabase/)
set -euo pipefail

mkdir -p supabase/functions/free-signals
mkdir -p src/components/hub
mkdir -p src/types

# 1) Edge Function (supabase/functions/free-signals/index.ts)
cat > supabase/functions/free-signals/index.ts <<'TS'
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
TS

# 2) DeepTile UI
cat > src/components/hub/DeepTile.tsx <<'TSX'
import { useState } from "react";
import { Info, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

export function DeepTile({
  title, kpi, delta, conf, trend, summary, onDetails, children,
}: {
  title: string;
  kpi: { label: string; value: string };
  delta?: { value: string; dir: "up" | "down" | "flat" };
  conf?: "Low" | "Medium" | "High";
  trend?: number[];
  summary?: string[];
  onDetails?: () => Promise<JSX.Element>;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<JSX.Element | null>(null);

  async function openDetails() {
    setOpen(true);
    if (onDetails) setPanel(await onDetails());
  }

  return (
    <Card className="group relative p-4 rounded-2xl bg-white/5 border-white/10 hover:bg-white/[0.07] transition">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-base/6 text-white">{title}</h3>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-semibold text-white">{kpi.value}</div>
            {delta && (
              <Badge variant="outline" className="text-xs">
                {delta.dir === "up" ? "▲" : delta.dir === "down" ? "▼" : "—"} {delta.value}
              </Badge>
            )}
            {conf && <Badge className="text-xs">{conf} confidence</Badge>}
          </div>
        </div>
        <button onClick={openDetails} className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
          Details <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {trend && (
        <div className="mt-3 h-8 w-full opacity-80">
          <svg viewBox={`0 0 ${trend.length-1} 10`} preserveAspectRatio="none" className="w-full h-full">
            <polyline fill="none" stroke="currentColor" strokeWidth="0.5"
              points={trend.map((v,i)=>`${i},${10 - Math.max(0, Math.min(10, (v / Math.max(...trend)) * 10))}`).join(" ")}/>
          </svg>
        </div>
      )}
      {children}

      {summary && (
        <ul className="mt-3 text-sm text-white/80 list-disc list-inside space-y-1">
          {summary.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="p-6 bg-[#0B0D10] border-white/10">
          <div className="flex items-center gap-2 mb-4 text-white">
            <Info className="w-4 h-4" /> <h4 className="text-lg">{title} — Full analysis</h4>
          </div>
          {panel ?? <div className="text-white/70">Loading…</div>}
        </DrawerContent>
      </Drawer>
    </Card>
  );
}
TSX

# 3) Smart wrapper that pulls and renders 3 tiles
cat > src/components/hub/EnterpriseFreeSignals.tsx <<'TSX'
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { DeepTile } from "./DeepTile";
import { toast } from "sonner";

export function EnterpriseFreeSignals({ idea }: { idea: string }) {
  const [data, setData] = useState<any|null>(null);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
  const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnon);

  const load = useCallback(async () => {
    if (!idea) return;
    try {
      const { data, error } = await supabase.functions.invoke('free-signals', {
        body: { idea, tiles: ['sentiment','market','competitors'], horizonDays: 90 }
      });
      if (error) throw error;
      setData(data?.data || data);
    } catch (e:any) {
      console.error(e);
      toast.error(`Free data error: ${e.message || e}`);
    }
  }, [idea]);

  useEffect(()=>{ load(); }, [load]);

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <DeepTile
        title="User Sentiment & Buzz (Free)"
        kpi={{ label: "Net Sentiment", value: (data?.sentiment?.kpi != null ? (data.sentiment.kpi*100).toFixed(0)+'%' : '—') }}
        conf={data?.sentiment?.confidence}
        trend={data?.sentiment?.trend}
        summary={[
          `Sample: ${data?.sentiment?.sampleSize ?? 0}`,
          `Sources: ${data?.sentiment?.sources?.map((s:any)=>s.id).join(', ') || '—'}`,
          `Updated: ${new Date(data?.sentiment?.lastUpdated||Date.now()).toLocaleString()}`
        ]}
        onDetails={async () => {
          return (
            <div className="space-y-4 text-white/80">
              <p>Why this score: basic lexicon over Reddit/HN texts; Wikipedia pageviews show awareness trend.</p>
              <div className="text-sm opacity-80">
                <div>Sources: {data?.sentiment?.sources?.map((s:any)=>`${s.id} (${s.items})`).join(', ')}</div>
              </div>
            </div>
          )
        }}
      />

      <DeepTile
        title="Market Proxies (World Bank, Free)"
        kpi={{ label: "Internet Users", value: (data?.market?.indicators?.internetUsersPct != null ? data.market.indicators.internetUsersPct.toFixed(1)+'%' : '—') }}
        conf={"High"}
        summary={[
          `R&D %GDP: ${data?.market?.indicators?.rdSpendPctGDP ?? '—'}`,
          `GDP growth: ${data?.market?.indicators?.gdpGrowthPct ?? '—'}`,
          `Updated: ${new Date(data?.market?.lastUpdated||Date.now()).toLocaleString()}`
        ]}
        onDetails={async () => {
          return (
            <div className="space-y-4 text-white/80">
              <p>World Bank series over the last decade. Use this to gauge macro suitability.</p>
            </div>
          )
        }}
      />

      <DeepTile
        title="Competitor Heat (GitHub, Free)"
        kpi={{ label: "Top Repo Stars", value: (data?.competitors?.topRepos?.[0]?.stars != null ? String(data.competitors.topRepos[0].stars) : '—') }}
        conf={"Medium"}
        summary={[
          `Top: ${data?.competitors?.topRepos?.[0]?.name ?? '—'}`,
          `Repos: ${data?.competitors?.topRepos?.length ?? 0}`,
          `Updated: ${new Date(data?.competitors?.lastUpdated||Date.now()).toLocaleString()}`
        ]}
        onDetails={async () => {
          return (
            <div className="space-y-2 text-white/80">
              <ul className="list-disc list-inside">
                {(data?.competitors?.topRepos ?? []).map((r:any)=>(
                  <li key={r.url}><a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.name}</a> — ★{r.stars}</li>
                ))}
              </ul>
            </div>
          )
        }}
      />
    </div>
  );
}
TSX

# 4) Types (optional)
cat > src/types/free-signals.ts <<'TS'
export interface FreeSignalsSentiment {
  kpi: number;
  sampleSize: number;
  confidence: "Low" | "Medium" | "High";
  trend: number[];
  sources: { id: string; items: number }[];
  lastUpdated: string;
}
export interface FreeSignalsMarket {
  indicators: {
    internetUsersPct: number|null;
    rdSpendPctGDP: number|null;
    gdpGrowthPct: number|null;
  };
  lastUpdated: string;
}
export interface FreeSignalsCompetitors {
  topRepos: { name: string; stars: number; url: string; updated_at: string }[];
  lastUpdated: string;
}
export interface FreeSignals {
  sentiment?: FreeSignalsSentiment;
  market?: FreeSignalsMarket;
  competitors?: FreeSignalsCompetitors;
}
TS

# 5) Safely modify src/pages/EnterpriseHub.tsx
#   - Add import line ONLY if not present
#   - Inject <EnterpriseFreeSignals idea={currentIdea} /> at start of overview tab
FILE="src/pages/EnterpriseHub.tsx"
if ! grep -q 'EnterpriseFreeSignals' "$FILE"; then
  # insert import after the accordion import block
  # fallback: append to top if pattern not found
  if grep -n 'from "@/components/ui/accordion";' "$FILE" >/dev/null; then
    lineno=$(grep -n 'from "@/components/ui/accordion";' "$FILE" | head -1 | cut -d: -f1)
    awk -v ln="$lineno" 'NR==ln{print; print "import { EnterpriseFreeSignals } from \"@/components/hub/EnterpriseFreeSignals\";"; next}1' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
  else
    sed -i.bak '1i import { EnterpriseFreeSignals } from "@/components/hub/EnterpriseFreeSignals";' "$FILE"
  fi
fi

# inject component inside overview tab if not already present
if ! grep -q 'EnterpriseFreeSignals idea={currentIdea}' "$FILE"; then
  # find the <TabsContent value="overview" line and append the component right after it
  perl -0777 -pe 's|(<TabsContent value="overview"[^>]*>)|\1\n            <EnterpriseFreeSignals idea={currentIdea} />|s' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
fi

echo "All files created and EnterpriseHub wired. Next steps below."

