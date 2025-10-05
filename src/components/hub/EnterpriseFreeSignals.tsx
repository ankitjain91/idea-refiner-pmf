import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DeepTile } from "./DeepTile";
import { toast } from "sonner";

export function EnterpriseFreeSignals({ idea }: { idea: string }) {
  const [data, setData] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idea) return;
    setLoading(true);
    setError(null);
    try {
      console.log('[EnterpriseFreeSignals] Fetching data for:', idea);
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('free-signals', {
        body: { idea, tiles: ['sentiment','market','competitors'], horizonDays: 90 }
      });
      
      if (invokeError) {
        console.error('[EnterpriseFreeSignals] Invoke error:', invokeError);
        throw invokeError;
      }
      
      console.log('[EnterpriseFreeSignals] Response:', responseData);
      
      const extractedData = responseData?.data || responseData;
      console.log('[EnterpriseFreeSignals] Extracted data:', extractedData);
      
      setData(extractedData);
      
      if (!extractedData) {
        setError('No data received from free signals');
      }
    } catch (e:any) {
      console.error('[EnterpriseFreeSignals] Error:', e);
      setError(e.message || 'Failed to load free signals data');
      toast.error(`Free data error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [idea]);

  useEffect(()=>{ load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
          <button 
            onClick={load} 
            className="mt-2 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <DeepTile
        title="User Sentiment & Buzz (Free)"
        kpi={{ label: "Net Sentiment", value: (data?.sentiment?.kpi != null ? (data.sentiment.kpi*100).toFixed(0)+'%' : '—') }}
        conf={data?.sentiment?.confidence}
        trend={data?.sentiment?.trend}
        summary={[
          `Sample Size: ${data?.sentiment?.sampleSize ?? 0} mentions`,
          `Confidence: ${data?.sentiment?.confidence || '—'}`,
          `Trend Points: ${data?.sentiment?.trend?.length ?? 0}`,
          `Sources: ${data?.sentiment?.sources?.length ?? 0}`,
          `Updated: ${new Date(data?.sentiment?.lastUpdated||Date.now()).toLocaleString()}`
        ]}
        onDetails={async () => {
          return (
            <div className="space-y-4 text-white/80">
              <div>
                <h4 className="font-semibold mb-2">Sentiment Analysis</h4>
                <p className="mb-4">Basic lexicon analysis over Reddit/HN texts. Wikipedia pageviews show awareness trend.</p>
                <div className="space-y-2">
                  <p><strong>Net Sentiment Score:</strong> {data?.sentiment?.kpi != null ? (data.sentiment.kpi*100).toFixed(1)+'%' : '—'}</p>
                  <p><strong>Sample Size:</strong> {data?.sentiment?.sampleSize ?? 0} mentions analyzed</p>
                  <p><strong>Confidence Level:</strong> {data?.sentiment?.confidence || 'Unknown'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Data Sources</h4>
                <ul className="space-y-1">
                  {data?.sentiment?.sources?.map((s:any, i:number)=>(
                    <li key={i} className="flex justify-between">
                      <span>{s.id}</span>
                      <span className="opacity-70">{s.items} items</span>
                    </li>
                  ))}
                </ul>
              </div>

              {data?.sentiment?.trend && data.sentiment.trend.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Trend Data (Last {data.sentiment.trend.length} days)</h4>
                  <p className="text-sm opacity-70">
                    Average: {(data.sentiment.trend.reduce((a:number,b:number)=>a+b,0)/data.sentiment.trend.length).toFixed(0)} views/day
                  </p>
                </div>
              )}
            </div>
          )
        }}
      />

      <DeepTile
        title="Market Proxies (World Bank, Free)"
        kpi={{ label: "Internet Users", value: (data?.market?.indicators?.internetUsersPct != null ? data.market.indicators.internetUsersPct.toFixed(1)+'%' : '—') }}
        conf={"High"}
        summary={[
          `Internet Users: ${data?.market?.indicators?.internetUsersPct?.toFixed(1) ?? '—'}%`,
          `R&D Spending: ${data?.market?.indicators?.rdSpendPctGDP?.toFixed(2) ?? '—'}% of GDP`,
          `GDP Growth: ${data?.market?.indicators?.gdpGrowthPct?.toFixed(2) ?? '—'}%`,
          `Data Points: ${Object.values(data?.market?.series || {}).reduce((acc:number, arr:any) => acc + (arr?.length || 0), 0)}`,
          `Updated: ${new Date(data?.market?.lastUpdated||Date.now()).toLocaleString()}`
        ]}
        onDetails={async () => {
          return (
            <div className="space-y-4 text-white/80">
              <div>
                <h4 className="font-semibold mb-2">Market Indicators</h4>
                <p className="mb-4">World Bank economic series over the last decade. Use this to gauge macro market suitability.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Current Indicators</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Internet Users (% of population)</span>
                    <span className="font-semibold">{data?.market?.indicators?.internetUsersPct?.toFixed(2) ?? '—'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R&D Spending (% of GDP)</span>
                    <span className="font-semibold">{data?.market?.indicators?.rdSpendPctGDP?.toFixed(2) ?? '—'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GDP Growth Rate</span>
                    <span className="font-semibold">{data?.market?.indicators?.gdpGrowthPct?.toFixed(2) ?? '—'}%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Historical Data Available</h4>
                <ul className="space-y-1 text-sm">
                  <li>Internet Users: {data?.market?.series?.internetUsersPct?.length ?? 0} data points</li>
                  <li>R&D Spending: {data?.market?.series?.rdSpendPctGDP?.length ?? 0} data points</li>
                  <li>GDP Growth: {data?.market?.series?.gdpGrowthPct?.length ?? 0} data points</li>
                </ul>
              </div>

              <div className="text-xs opacity-60">
                <p>Source: {data?.market?.sources?.join(', ') || 'World Bank'}</p>
              </div>
            </div>
          )
        }}
      />

      <DeepTile
        title="Competitor Heat (GitHub, Free)"
        kpi={{ label: "Top Repo Stars", value: (data?.competitors?.topRepos?.[0]?.stars != null ? String(data.competitors.topRepos[0].stars) : '—') }}
        conf={"Medium"}
        summary={[
          `Total Repos Found: ${data?.competitors?.topRepos?.length ?? 0}`,
          `Top Repo: ${data?.competitors?.topRepos?.[0]?.name ?? '—'}`,
          `Top Stars: ${data?.competitors?.topRepos?.[0]?.stars ?? '—'}`,
          `Last Updated: ${data?.competitors?.topRepos?.[0]?.updated_at ? new Date(data.competitors.topRepos[0].updated_at).toLocaleDateString() : '—'}`,
          `Data Updated: ${new Date(data?.competitors?.lastUpdated||Date.now()).toLocaleString()}`
        ]}
        onDetails={async () => {
          return (
            <div className="space-y-4 text-white/80">
              <div>
                <h4 className="font-semibold mb-2">GitHub Repository Analysis</h4>
                <p className="mb-4">Top repositories related to your idea, ranked by stars. Indicates existing open-source competition and community interest.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Top Repositories ({data?.competitors?.topRepos?.length ?? 0} found)</h4>
                {data?.competitors?.topRepos && data.competitors.topRepos.length > 0 ? (
                  <ul className="space-y-3">
                    {data.competitors.topRepos.map((r:any, idx:number)=>(
                      <li key={r.url} className="border-l-2 border-primary/30 pl-3">
                        <div className="flex justify-between items-start mb-1">
                          <a className="underline hover:text-primary font-medium" href={r.url} target="_blank" rel="noreferrer">
                            {idx + 1}. {r.name}
                          </a>
                          <span className="text-yellow-400">★ {r.stars.toLocaleString()}</span>
                        </div>
                        <p className="text-xs opacity-60">
                          Last updated: {new Date(r.updated_at).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-60">No repositories found</p>
                )}
              </div>

              <div className="text-xs opacity-60 pt-2 border-t border-white/10">
                <p>Source: {data?.competitors?.sources?.join(', ') || 'GitHub Search API'}</p>
              </div>
            </div>
          )
        }}
      />
    </div>
  );
}
