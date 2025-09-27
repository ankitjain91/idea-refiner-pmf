import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users2, Globe2, TrendingUp, Target, MapPin } from 'lucide-react';

interface MarketAudienceSectionProps {
  marketSize?: { TAM: number; SAM: number; SOM: number };
  demographics?: Array<{ label: string; value: number }>;
  trends?: Array<{ date: string; value: number }>;
  competitors?: Array<{ name: string; share: number }>;
  personas?: Array<{ name: string; pains: string[]; motivators: string[]; spend: string }>;
}

export const MarketAudienceSection: React.FC<MarketAudienceSectionProps> = ({
  marketSize = { TAM: 0, SAM: 0, SOM: 0 },
  demographics = [],
  trends = [],
  competitors = [],
  personas = [],
}) => {
  return (
    <div className="grid md:grid-cols-12 gap-4">
      {/* Market Size Funnel */}
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4"/> Market Size</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {(['TAM','SAM','SOM'] as const).map((k,i) => {
              const val = marketSize[k];
              const pct = marketSize.TAM ? (val/marketSize.TAM)*100 : 0;
              return (
                <div key={k} className="flex items-center gap-2">
                  <div className="w-10 font-medium">{k}</div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${i===0?'bg-primary/60':i===1?'bg-primary':'bg-primary/90'} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-20 text-right tabular-nums">{val.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users2 className="h-4 w-4"/> Demographics</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {demographics.length === 0 && <p className="text-muted-foreground">No demographic data yet.</p>}
          {demographics.map(d => (
            <div key={d.label} className="flex items-center gap-2">
              <span className="w-20 truncate" title={d.label}>{d.label}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500" style={{ width: `${d.value}%` }} />
              </div>
              <span className="w-10 tabular-nums text-right">{d.value}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trends */}
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Trends</CardTitle></CardHeader>
        <CardContent>
          <div className="h-24 flex items-end gap-1">
            {trends.slice(-24).map((t,i) => (
              <div key={i} className="flex-1 bg-primary/20 rounded-sm" style={{ height: `${t.value}%` }} />
            ))}
            {trends.length===0 && <p className="text-xs text-muted-foreground">No trend data</p>}
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      <Card className="md:col-span-5">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4"/> Competitor Presence</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {competitors.length === 0 && <p className="text-muted-foreground">No competitor data yet.</p>}
          {competitors.map(c => (
            <div key={c.name} className="flex items-center gap-2">
              <span className="w-28 truncate" title={c.name}>{c.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary/70" style={{ width: `${c.share}%` }} />
              </div>
              <span className="w-10 text-right tabular-nums">{c.share}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Personas */}
      <Card className="md:col-span-7">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Globe2 className="h-4 w-4"/> Audience Personas</CardTitle></CardHeader>
        <CardContent>
          {personas.length===0 && <p className="text-xs text-muted-foreground">No personas generated yet.</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            {personas.map(p => (
              <div key={p.name} className="rounded-lg border p-3 flex flex-col gap-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold leading-tight">{p.name}</h4>
                  <span className="text-[10px] uppercase text-muted-foreground">Persona</span>
                </div>
                <div className="text-[11px] space-y-1">
                  <p><span className="font-medium">Pains:</span> {p.pains.join(', ')}</p>
                  <p><span className="font-medium">Motivators:</span> {p.motivators.join(', ')}</p>
                  <p><span className="font-medium">Spend:</span> {p.spend}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
