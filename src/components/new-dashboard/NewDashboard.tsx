import React, { useEffect, useState, useMemo } from 'react';
import { KPIHeader } from './KPIHeader';
import { MarketAudienceSection } from './MarketAudienceSection';
import { MonetizationSection } from './MonetizationSection';
import { AIRecommendationsSection } from './AIRecommendationsSection';
import { SimulationSection } from './SimulationSection';
import { ExportCollaborationSection } from './ExportCollaborationSection';
import { buildMarkdownReport } from '@/lib/export-report';
import type { AnalysisResult } from '@/types/analysis';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download } from 'lucide-react';

interface NewDashboardProps {
  idea: string;
  metadata?: any;
}

export const NewDashboard: React.FC<NewDashboardProps> = ({ idea, metadata }) => {
  // Derived objects from analysis metadata
  const derived = metadata?.derived || {};
  const keywordFreq: Array<{ term: string; count: number }> = derived.keywordFrequencies || [];
  const pricing = derived.pricing || {};
  const storedPersonas = Array.isArray(derived.personas) ? derived.personas : [];

  // Core scores & confidence
  const pmfScore = metadata?.pmfScore ?? metadata?.pmfAnalysis?.pmfScore ?? Math.min(100, Math.round((metadata?.signalsCollected || 42) * 1.2));
  const profitabilityIndex = metadata?.profitPotential ?? 65;
  const confidence: 'Low'|'Medium'|'High' = (metadata?.meta?.validationIssues?.length || 0) === 0 && pmfScore > 70 ? 'High' : pmfScore > 50 ? 'Medium' : 'Low';

  // Pricing model & initial price seeded from derived pricing hints
  const initialModel = pricing.inferredPrimaryModel || (Array.isArray(pricing.models) && pricing.models[0]) || 'Subscription';
  const initialPrice = pricing.avgPrice ? Math.round(pricing.avgPrice) : (pricing.pricePoints && pricing.pricePoints[0]) || 49;
  const [model, setModel] = useState<string>(initialModel);
  const [price, setPrice] = useState<number>(initialPrice);
  const [simState, setSimState] = useState({ demographicsRange: [18,40] as [number,number], region: 'Global', pricing: initialPrice, marketingSpend: 5000 });

  // Market & demographic placeholders (could later link to real data)
  const marketSize = { TAM: 5000000, SAM: 1200000, SOM: 180000 };
  const demographics = [
    { label: '18-24', value: 28 },
    { label: '25-34', value: 42 },
    { label: '35-44', value: 18 },
    { label: '45+', value: 12 },
  ];

  // Build smoothed synthetic trend series from keyword frequencies (deterministic pseudo-noise)
  const trends = useMemo(() => {
    const points = 36;
    if (!keywordFreq.length) {
      return Array.from({ length: points }).map((_,i)=>({ date: `t${i}`, value: Math.max(8, Math.round( (Math.sin(i/3)+1)*40 + (i*0.7) )) % 100 }));
    }
    const top = keywordFreq.slice(0, 12);
    const total = top.reduce((a,b)=>a + b.count, 0) || 1;
    // Base intensity derived from average frequency
    const base = total / top.length;
    // Simple seeded pseudo random based on term char codes
    const seedForIndex = (i: number) => (top.reduce((acc,kw)=>acc + kw.term.charCodeAt(0)*(i+3), 0) % 97);
    const raw: number[] = [];
    for (let i=0;i<points;i++) {
      const t = i / (points-1);
      const momentum = base * 4 * t; // upward drift
      const season = Math.sin(t * Math.PI * 3) * base * 1.6; // oscillation
      const focusShift = top[Math.floor((t * top.length))] || top[top.length-1];
      const focusBoost = (focusShift.count / (base || 1)) * 2.2;
      const noise = (seedForIndex(i) % 11) - 5; // -5..5
      const value = Math.max(3, Math.round(base * 5 + momentum + season + focusBoost + noise));
      raw.push(value);
    }
    // Smooth via simple moving average window=3
    const smoothed = raw.map((v,i,arr)=> Math.round((arr[Math.max(0,i-1)] + v + arr[Math.min(arr.length-1,i+1)]) / 3));
    return smoothed.map((v,i)=>({ date: `t${i}`, value: v }));
  }, [keywordFreq]);

  const competitors = [
    { name: 'Competitor A', share: 34 },
    { name: 'Competitor B', share: 25 },
    { name: 'Competitor C', share: 16 },
    { name: 'LongTail', share: 25 },
  ];

  // Personas fallback when derived list is empty
  const personas = storedPersonas.length ? storedPersonas.slice(0,6) : [
    { name: 'Growth Lead', pains: ['Fragmented tools','Slow insights'], motivators: ['Leverage','Time savings'], spend: '$120/mo' },
    { name: 'Indie Founder', pains: ['Validation risk','Limited time'], motivators: ['Speed','Focus'], spend: '$49/mo' },
  ];

  // Recommendations placeholders (could later map from analysis output if provided)
  const refinements = metadata?.improvements || [ 'Clarify core outcome in value prop', 'Defer advanced analytics v1', 'Tighten ICP to early-stage SaaS founders' ];
  const featureMatrix = [
    { feature: 'Automated Brief Scoring', impact: 78, effort: 45 },
    { feature: 'Competitive Gap Map', impact: 62, effort: 38 },
    { feature: 'Persona Synthesizer', impact: 70, effort: 52 },
    { feature: 'Pricing Simulator', impact: 55, effort: 30 },
  ];
  const competitorGaps = [ 'Few competitors quantify qualitative interview signals', 'Slow manual persona creation in incumbents', 'Limited dynamic pricing exploration tools' ];
  const monetizationTips = metadata?.quickWins || [ 'Introduce usage-based add-on for heavy analysts', 'Bundle persona insights with premium tier', 'Offer annual discount to improve retention' ];
  const nextSteps = [ 'Validate top 2 personas with 5 calls each', 'Ship interactive pricing experiment', 'Run churn reason micro-survey after trial day 3' ];

  const handleExport = async () => {
    // Fabricate a minimal AnalysisResult structure from placeholder data so existing exporter works
    const fabricated: AnalysisResult = {
      pmfAnalysis: {
        pmfScore: pmfScore,
        improvements: refinements,
        quickWins: monetizationTips,
        scoreBreakdown: {
          demand: Math.round(pmfScore * 0.32),
          problem: Math.round(pmfScore * 0.28),
          retention: Math.round(pmfScore * 0.22),
          economics: Math.round(pmfScore * 0.18)
        }
      },
      meta: {
        startedAt: new Date(Date.now()-2000).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 2000,
        briefSnapshot: {
          idea: idea,
          category: metadata?.category || 'Uncategorized',
          targetUser: personas.map(p=>p.name).join(', '),
          coreProblem: refinements[0] || 'N/A',
          solution: 'Iterative solution refinement (placeholder)',
          differentiation: competitorGaps[0] || 'N/A',
          pricing: `$${price}`
        } as any, // cast because brief fields may not align perfectly
        validationIssues: [],
        evidenceScore: confidence === 'High' ? 0.8 : confidence === 'Medium' ? 0.55 : 0.3,
        weakAreas: [],
        viabilityLabel: confidence
      }
    };
    const report = buildMarkdownReport(fabricated);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${idea.replace(/\s+/g,'_')}_analysis.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-8">
      <KPIHeader ideaName={idea} category={metadata?.category} pmfScore={pmfScore} profitabilityIndex={profitabilityIndex} confidence={confidence} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">2. Market & Audience Insights</h2>
        <MarketAudienceSection marketSize={marketSize} demographics={demographics} trends={trends} competitors={competitors} personas={personas} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">3. Monetization & Profitability</h2>
        <MonetizationSection model={model} price={price} onModelChange={setModel} onPriceChange={setPrice} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">4. AI-Driven Recommendations</h2>
        <AIRecommendationsSection refinements={refinements} featureMatrix={featureMatrix} competitorGaps={competitorGaps} monetizationTips={monetizationTips} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">5. Interactive Simulation Area</h2>
        <SimulationSection demographicsRange={simState.demographicsRange} region={simState.region} pricing={simState.pricing} marketingSpend={simState.marketingSpend} onChange={s=>setSimState(prev=>({...prev,...s}))} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">6. Export & Collaboration</h2>
        <ExportCollaborationSection onExport={handleExport} onShare={()=>alert('Sharing coming soon')} nextSteps={nextSteps} />
      </section>

      <div className="text-center text-[10px] text-muted-foreground pt-4 pb-8">All insights are heuristic previews. Refine via continued user discovery.</div>
    </div>
  );
};

export default NewDashboard;
