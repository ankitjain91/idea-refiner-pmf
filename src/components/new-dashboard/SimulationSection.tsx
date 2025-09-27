import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Globe2, Users, DollarSign, Megaphone } from 'lucide-react';

interface SimulationSectionProps {
  demographicsRange?: [number, number];
  region?: string;
  pricing?: number;
  marketingSpend?: number;
  onChange?: (state: Partial<{ demographicsRange: [number, number]; region: string; pricing: number; marketingSpend: number }>) => void;
}

const REGIONS = ['Global','North America','Europe','APAC','LATAM'];

export const SimulationSection: React.FC<SimulationSectionProps> = ({ demographicsRange=[18,40], region='Global', pricing=49, marketingSpend=5000, onChange }) => {
  const pmfShift = Math.min(100, (marketingSpend/10000)*10 + (pricing>0 ? 70 - Math.abs(60-pricing)/2 : 0));
  const profitability = Math.max(0, pricing * 0.6 - (marketingSpend/10000)*5);
  return (
    <div className="grid md:grid-cols-12 gap-4">
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4"/> Target Demographics</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p>Age Range: {demographicsRange[0]} – {demographicsRange[1]}</p>
          <Slider value={demographicsRange} min={12} max={70} step={1} onValueChange={vals => onChange?.({ demographicsRange: [vals[0], vals[1]] as [number,number] })} />
          <p className="text-[10px] text-muted-foreground">Broader ranges dilute early PMF clarity. Start narrow.</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Globe2 className="h-4 w-4"/> Geography</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <select value={region} onChange={e=>onChange?.({ region: e.target.value })} className="w-full rounded-md border bg-background px-2 py-1 text-xs">
            {REGIONS.map(r=>(<option key={r}>{r}</option>))}
          </select>
          <p className="text-[10px] text-muted-foreground">Regional focus can improve messaging resonance & reduce CAC.</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4"/> Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-xs"><span>${pricing}</span></div>
          <Slider value={[pricing]} min={0} max={199} step={1} onValueChange={vals => onChange?.({ pricing: vals[0] })} />
          <p className="text-[10px] text-muted-foreground leading-snug">Pricing interacts with perceived value & retention expectations.</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Megaphone className="h-4 w-4"/> Marketing Spend</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-xs"><span>Monthly Spend</span><span className="font-semibold tabular-nums">${marketingSpend}</span></div>
          <Slider value={[marketingSpend]} min={0} max={20000} step={500} onValueChange={vals => onChange?.({ marketingSpend: vals[0] })} />
          <p className="text-[10px] text-muted-foreground">Spend efficiency is more important than raw volume early on.</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Live Simulation Outputs</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-3">
          <div className="flex items-center justify-between"><span>PM Fit (simulated)</span><span className="font-semibold tabular-nums">{pmfShift.toFixed(1)}</span></div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pmfShift}%` }} /></div>
          <div className="flex items-center justify-between"><span>Profitability Index</span><span className="font-semibold tabular-nums">{profitability.toFixed(1)}</span></div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: `${Math.min(100, Math.max(0, profitability))}%` }} /></div>
          <p className="text-[10px] text-muted-foreground">These outputs are heuristic and for directional exploration only.</p>
        </CardContent>
      </Card>
    </div>
  );
};
