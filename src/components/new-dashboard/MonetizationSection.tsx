import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { DollarSign, Wallet, Filter } from 'lucide-react';

interface MonetizationSectionProps {
  model?: string;
  price?: number;
  adoption?: { awareness: number; conversion: number; retention: number; churn: number };
  onModelChange?: (model: string) => void;
  onPriceChange?: (price: number) => void;
}

const MODELS = ['Freemium','Subscription','One-Time','Marketplace','Usage-Based'];

export const MonetizationSection: React.FC<MonetizationSectionProps> = ({ model='Subscription', price=49, adoption={awareness:60, conversion:20, retention:70, churn:8}, onModelChange, onPriceChange }) => {
  const revenueProjection = price * (adoption.conversion/100) * (adoption.retention/100) * 1000; // simplistic
  const profitScenarioLean = revenueProjection * 0.55;
  const profitScenarioAggressive = revenueProjection * 0.35; // higher costs
  return (
    <div className="grid md:grid-cols-12 gap-4">
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wallet className="h-4 w-4"/> Revenue Model</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={model} onValueChange={v => onModelChange?.(v)} className="grid grid-cols-2 gap-2">
            {MODELS.map(m => (
              <Label key={m} className="flex items-center gap-2 rounded-md border py-2 px-2 cursor-pointer text-[11px] font-medium">
                <RadioGroupItem value={m} id={m} /> {m}
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4"/> Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-xs"><span>Price: </span><span className="font-semibold tabular-nums">${price}</span></div>
          <Slider value={[price]} min={0} max={499} step={5} onValueChange={vals => onPriceChange?.(vals[0])} />
          <p className="text-[11px] text-muted-foreground leading-snug">Adjust pricing to see estimated revenue & profit scenarios update.</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Filter className="h-4 w-4"/> Adoption Funnel</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {[['Awareness', adoption.awareness], ['Conversion', adoption.conversion], ['Retention', adoption.retention], ['Churn', adoption.churn]].map(([label,val]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-16">{label}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${label==='Churn'?'bg-red-500/70':'bg-primary/70'}`} style={{ width: `${val}%` }} />
              </div>
              <span className="w-10 text-right tabular-nums">{val}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="md:col-span-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Profit/Loss Scenarios</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md border p-3 bg-muted/30">
              <p className="font-medium text-[11px] uppercase tracking-wide mb-1">Lean Growth</p>
              <p className="text-sm font-semibold tabular-nums">${profitScenarioLean.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Assumes disciplined CAC and organic traction.</p>
            </div>
            <div className="flex-1 rounded-md border p-3 bg-muted/30">
              <p className="font-medium text-[11px] uppercase tracking-wide mb-1">Aggressive Growth</p>
              <p className="text-sm font-semibold tabular-nums">${profitScenarioAggressive.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Assumes higher paid acquisition & burn.</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">These are simplified forward-looking estimates for exploration only.</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Key Notes</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-[11px] space-y-1 list-disc pl-4 text-muted-foreground">
            <li>Increase retention to exponentially increase lifetime value.</li>
            <li>Freemium works best when activation is instant & value obvious.</li>
            <li>Upsells should follow aha-moment, not precede it.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
