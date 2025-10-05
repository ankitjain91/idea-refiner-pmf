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
