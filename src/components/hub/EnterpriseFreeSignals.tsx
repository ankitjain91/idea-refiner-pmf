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

  // Compute sentiment delta (last 7 days vs previous 7 days from trend)
  const sentimentDelta = (() => {
    const trend = data?.sentiment?.trend || [];
    if (trend.length < 14) return null;
    const recent = trend.slice(-7).reduce((a:number, b:number) => a + b, 0) / 7;
    const previous = trend.slice(-14, -7).reduce((a:number, b:number) => a + b, 0) / 7;
    const change = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      dir: change > 2 ? 'up' : change < -2 ? 'down' : 'flat'
    } as { value: string; dir: 'up' | 'down' | 'flat' };
  })();

  // Compute market delta (YoY from internet users series)
  const marketDelta = (() => {
    const series = data?.market?.series?.internetUsersPct || [];
    if (series.length < 2) return null;
    const latest = series[0]?.value;
    const yearAgo = series[1]?.value;
    if (latest == null || yearAgo == null || yearAgo === 0) return null;
    const change = ((latest - yearAgo) / yearAgo) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      dir: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
    } as { value: string; dir: 'up' | 'down' | 'flat' };
  })();

  // Build market trend from series
  const marketTrend = (() => {
    const series = data?.market?.series?.internetUsersPct || [];
    return series.slice(0, 10).reverse().map((d:any) => d?.value ?? 0).filter((v:number) => v > 0);
  })();

  // Compute total stars for competitors
  const totalStars = (data?.competitors?.topRepos || []).reduce((sum:number, r:any) => sum + (r.stars || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
      <DeepTile
        title="User Sentiment & Buzz"
        kpi={{ label: "Net Sentiment", value: (data?.sentiment?.kpi != null ? (data.sentiment.kpi*100).toFixed(0)+'%' : '—') }}
        delta={sentimentDelta || undefined}
        conf={data?.sentiment?.confidence}
        trend={data?.sentiment?.trend}
        summary={[
          `${data?.sentiment?.sampleSize ?? 0} mentions analyzed`,
          `${data?.sentiment?.sources?.length ?? 0} data sources`,
          data?.sentiment?.samples?.[0]?.title ? `Top: "${data.sentiment.samples[0].title.slice(0, 40)}..."` : 'See samples in details'
        ]}
        onDetails={async () => {
          return (
            <div className="space-y-4 text-white/80">
              <div>
                <h4 className="font-semibold mb-2 text-white">Sentiment Analysis</h4>
                <p className="mb-4">Lexicon-based analysis over Reddit/HN texts. Wikipedia pageviews show awareness trend.</p>
                <div className="space-y-2">
                  <p><strong>Net Sentiment:</strong> {data?.sentiment?.kpi != null ? (data.sentiment.kpi*100).toFixed(1)+'%' : '—'}</p>
                  <p><strong>Sample Size:</strong> {data?.sentiment?.sampleSize?.toLocaleString() ?? 0} mentions</p>
                  <p><strong>Confidence:</strong> {data?.sentiment?.confidence || 'Unknown'}</p>
                </div>
              </div>

              {data?.sentiment?.samples && data.sentiment.samples.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-white">Sample Mentions</h4>
                  <ul className="space-y-2">
                    {data.sentiment.samples.map((s:any, i:number) => (
                      <li key={i} className="border-l-2 border-primary/30 pl-3">
                        <span className="text-xs uppercase opacity-60">{s.source === 'hn' ? 'Hacker News' : 'Reddit'}</span>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" 
                           className="block text-sm hover:text-primary underline mt-1">
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2 text-white">Data Sources</h4>
                <ul className="space-y-1">
                  {data?.sentiment?.sources?.map((s:any, i:number)=>(
                    <li key={i} className="flex justify-between text-sm">
                      <span>{s.id}</span>
                      <span className="opacity-70">{s.items} items</span>
                    </li>
                  ))}
                </ul>
              </div>

              {data?.sentiment?.trend && data.sentiment.trend.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-white">Wikipedia Pageviews Trend</h4>
                  <p className="text-sm opacity-70">
                    Avg: {(data.sentiment.trend.reduce((a:number,b:number)=>a+b,0)/data.sentiment.trend.length).toFixed(0)} views/day
                    {sentimentDelta && ` (${sentimentDelta.dir === 'up' ? '▲' : sentimentDelta.dir === 'down' ? '▼' : '—'} ${sentimentDelta.value} vs. prev week)`}
                  </p>
                </div>
              )}
            </div>
          )
        }}
      />

      <DeepTile
        title="Market Proxies (World Bank)"
        kpi={{ label: "Internet Users", value: (data?.market?.indicators?.internetUsersPct != null ? data.market.indicators.internetUsersPct.toFixed(1)+'%' : '—') }}
        delta={marketDelta || undefined}
        conf={"High"}
        trend={marketTrend.length > 0 ? marketTrend : undefined}
        summary={[
          `Internet Users: ${data?.market?.indicators?.internetUsersPct?.toFixed(1) ?? '—'}%`,
          `R&D Spend: ${data?.market?.indicators?.rdSpendPctGDP?.toFixed(2) ?? '—'}% GDP`,
          `GDP Growth: ${data?.market?.indicators?.gdpGrowthPct?.toFixed(2) ?? '—'}%`
        ]}
        onDetails={async () => {
          const renderSeries = (seriesData: any[], label: string, unit: string) => {
            if (!seriesData || seriesData.length === 0) return null;
            const validData = seriesData.filter((d:any) => d?.value != null).slice(0, 5);
            if (validData.length === 0) return null;
            
            return (
              <div className="mb-4">
                <h5 className="text-sm font-semibold mb-2 text-white">{label}</h5>
                <div className="space-y-1">
                  {validData.map((d:any, i:number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="opacity-70">{d.date || d.year || 'Year'}</span>
                      <span className="font-semibold">{d.value?.toFixed(2)}{unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-4 text-white/80">
              <div>
                <h4 className="font-semibold mb-2 text-white">Market Indicators</h4>
                <p className="mb-4">World Bank economic series. Use to gauge macro market suitability.</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-white">Current Snapshot</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Internet Users (% pop.)</span>
                    <span className="font-semibold">{data?.market?.indicators?.internetUsersPct?.toFixed(2) ?? '—'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R&D Spend (% GDP)</span>
                    <span className="font-semibold">{data?.market?.indicators?.rdSpendPctGDP?.toFixed(2) ?? '—'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GDP Growth</span>
                    <span className="font-semibold">{data?.market?.indicators?.gdpGrowthPct?.toFixed(2) ?? '—'}%</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="font-semibold mb-3 text-white">Historical Series (Last 5 Years)</h4>
                {renderSeries(data?.market?.series?.internetUsersPct, 'Internet Users', '%')}
                {renderSeries(data?.market?.series?.rdSpendPctGDP, 'R&D Spending', '% GDP')}
                {renderSeries(data?.market?.series?.gdpGrowthPct, 'GDP Growth', '%')}
              </div>

              <div className="text-xs opacity-60 pt-2 border-t border-white/10">
                <p>Source: {data?.market?.sources?.join(', ') || 'World Bank Open Data'}</p>
              </div>
            </div>
          )
        }}
      />

      <DeepTile
        title="Competitor Heat (GitHub)"
        kpi={{ label: "Total Stars", value: totalStars > 0 ? totalStars.toLocaleString() : '—' }}
        conf={"Medium"}
        summary={[
          `${data?.competitors?.topRepos?.length ?? 0} repos found`,
          data?.competitors?.topRepos?.[0] ? `Top: ${data.competitors.topRepos[0].name.split('/')[1] || data.competitors.topRepos[0].name}` : 'No repos',
          data?.competitors?.topRepos?.[0] ? `${data.competitors.topRepos[0].stars.toLocaleString()} ★` : ''
        ].filter(Boolean)}
        onDetails={async () => {
          const avgStars = (data?.competitors?.topRepos?.length ?? 0) > 0 
            ? (totalStars / data.competitors.topRepos.length).toFixed(0) 
            : '0';

          return (
            <div className="space-y-4 text-white/80">
              <div>
                <h4 className="font-semibold mb-2 text-white">GitHub Repository Analysis</h4>
                <p className="mb-4">Top repos ranked by stars. Indicates open-source competition and community interest.</p>
                <div className="space-y-1 text-sm">
                  <p><strong>Total Stars:</strong> {totalStars.toLocaleString()}</p>
                  <p><strong>Average Stars:</strong> {avgStars}</p>
                  <p><strong>Repositories Found:</strong> {data?.competitors?.topRepos?.length ?? 0}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-white">Top Repositories</h4>
                {data?.competitors?.topRepos && data.competitors.topRepos.length > 0 ? (
                  <ul className="space-y-3">
                    {data.competitors.topRepos.map((r:any, idx:number)=>(
                      <li key={r.url} className="border-l-2 border-primary/30 pl-3">
                        <div className="flex justify-between items-start mb-1">
                          <a className="underline hover:text-primary font-medium text-sm" href={r.url} target="_blank" rel="noopener noreferrer">
                            {idx + 1}. {r.name}
                          </a>
                          <span className="text-yellow-400 text-sm">★ {r.stars.toLocaleString()}</span>
                        </div>
                        <p className="text-xs opacity-60">
                          Updated: {new Date(r.updated_at).toLocaleDateString()}
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
