import { RealDataImprovement, SourceRef } from '@/types/pmfit-real-data';

export function computeRealDataScores(inputs: {
  searchIoTScore: number;      // 0..100 from Trends velocity
  redditPainDensity: number;   // % posts with explicit pain phrases
  competitorStrength: number;  // 0..100 (higher = stronger incumbents)
  differentiationSignals: number; // 0..100 from benchmarkable claims
  distributionReadiness: number; // 0..100 from channel volume & reachability
}) {
  const demand = inputs.searchIoTScore;
  const painIntensity = inputs.redditPainDensity;
  const competitionGap = 100 - inputs.competitorStrength; // bigger gap = better
  const differentiation = inputs.differentiationSignals;
  const distribution = inputs.distributionReadiness;

  const pmFitScore = Math.round(
    demand * 0.25 + 
    painIntensity * 0.2 + 
    competitionGap * 0.2 + 
    differentiation * 0.2 + 
    distribution * 0.15
  );

  return { 
    demand, 
    painIntensity, 
    competitionGap, 
    differentiation, 
    distribution, 
    pmFitScore 
  };
}

export function recommendRealDataImprovements(ctx: {
  scores: { 
    demand: number; 
    painIntensity: number; 
    competitionGap: number; 
    differentiation: number; 
    distribution: number 
  };
  signalsSummary: {
    googleTrendsVelocity?: number;
    redditPainMentions?: number;
    dominantChannel?: 'tiktok'|'instagram'|'reddit'|'youtube'|'linkedin'|'seo'|'amazon';
    b2b?: boolean;
    priceBand?: 'budget'|'mid'|'premium';
  };
  citations: Record<string, SourceRef[]>;
}): RealDataImprovement[] {
  const R: RealDataImprovement[] = [];
  const cite = (k: string) => ctx.citations[k] || [];

  // Demand improvements
  if (ctx.scores.demand < 70) {
    R.push({
      factor: 'demand',
      title: 'Intercept rising intents via SEO + short-form video',
      why: 'Search/social velocity below benchmark; adjacent queries can expand reach.',
      howTo: [
        'Ship 3–5 SEO pages for rising queries; link from hero.',
        'Run a $200 TikTok Spark Ads test targeting those intents.',
        'Add schema markup and FAQ to rank faster.',
        'Create comparison pages for "vs competitor" queries.'
      ],
      experiment: {
        hypothesis: 'Adjacent intents increase qualified visits 20% and signups 10%.',
        metric: 'CR',
        design: [
          'A/B landing page: current vs +adjacent intents',
          'Hold geo constant for clean comparison',
          '14-day run with daily monitoring'
        ],
        costBand: '$',
        timeToImpactDays: 14
      },
      estDelta: 6,
      confidence: 'med',
      citations: cite('search')
    });
  }

  // Pain intensity improvements
  if (ctx.scores.painIntensity < 70 || (ctx.signalsSummary.redditPainMentions ?? 0) < 5) {
    R.push({
      factor: 'painIntensity',
      title: 'Narrow ICP and rewrite hero problem-first',
      why: 'Community complaints are diffuse; sharper ICP will boost resonance.',
      howTo: [
        'Pick 1 subsegment with frequent pain mentions from forums.',
        'Rewrite hero: "{pain statement} → in {time} with {mechanism}"',
        'Add 3 proof bullets (before/after, time saved, money saved).',
        'Include customer quotes that echo the exact pain language.'
      ],
      experiment: {
        hypothesis: 'Pain-first hero for narrower ICP lifts LP→signup by 25%.',
        metric: 'CR',
        design: [
          'Multivariate test: current vs pain-first copy',
          'Record session replays with Hotjar/FullStory',
          '1-question exit survey for 50 visitors'
        ],
        costBand: '$',
        timeToImpactDays: 7
      },
      estDelta: 8,
      confidence: 'high',
      citations: cite('forums')
    });
  }

  // Competition gap improvements
  if (ctx.scores.competitionGap < 70) {
    R.push({
      factor: 'competitionGap',
      title: 'Launch wedge feature + switching guide',
      why: 'Incumbents own broad use cases; win via underserved workflow.',
      howTo: [
        'Identify neglected workflow from competitor reviews.',
        'Ship a micro-feature that is 10× better for that workflow.',
        'Publish "Switch in 15 minutes" guide with import tool.',
        'Offer switching incentive (e.g., 3 months free for switchers).'
      ],
      experiment: {
        hypothesis: 'Wedge feature + import raises win-rate 15% on competitive deals.',
        metric: 'ARR',
        design: [
          'Tag all "switch" deals in CRM',
          'Compare close-rate pre/post feature launch',
          'Track time-to-close for switcher cohort'
        ],
        costBand: '$$',
        timeToImpactDays: 21
      },
      estDelta: 7,
      confidence: 'med',
      citations: cite('commerce')
    });
  }

  // Differentiation improvements
  if (ctx.scores.differentiation < 70) {
    R.push({
      factor: 'differentiation',
      title: 'Make the 10× moment legible with benchmark + demo',
      why: 'Users cannot articulate why you are uniquely better.',
      howTo: [
        'Benchmark 3 core tasks vs top alternatives (time, cost, quality).',
        'Add interactive demo/sandbox that proves the benchmark.',
        'Secure 2 creator reviews that replicate benchmark results.',
        'Build ROI calculator showing concrete savings.'
      ],
      experiment: {
        hypothesis: 'Visible 10× proof increases demo→close by 20%.',
        metric: 'CR',
        design: [
          'Prospect flow A/B: with vs without benchmark section',
          'Track engagement with interactive elements',
          'Survey closed-won deals on decision factors'
        ],
        costBand: '$$',
        timeToImpactDays: 10
      },
      estDelta: 6,
      confidence: 'med',
      citations: cite('social')
    });
  }

  // Distribution improvements
  if (ctx.scores.distribution < 70) {
    const ch = ctx.signalsSummary.dominantChannel || 'tiktok';
    R.push({
      factor: 'distribution',
      title: `Concentrate on ${ch} with 2 repeatable formats`,
      why: 'Broad-but-shallow channel mix dilutes learning and CAC improvements.',
      howTo: [
        `Pick 2 repeatable formats for ${ch} (e.g., myth-busters, POV demo).`,
        'Post 5× per week for 3 weeks to build momentum.',
        'Partner with 3 micro-creators (10–50k followers) for seeded UGC.',
        'Retarget site visitors with 2 pain-based hooks.'
      ],
      experiment: {
        hypothesis: 'Channel focus improves CAC by 20% and signups by 15%.',
        metric: 'CTR',
        design: [
          'Hold budget constant; reallocate 80% to one channel',
          'Compare CAC on 2-week rolling basis',
          'Track virality metrics (shares, saves, comments)'
        ],
        costBand: '$$',
        timeToImpactDays: 14
      },
      estDelta: 5,
      confidence: 'med',
      citations: cite('social')
    });
  }

  return R.sort((a, b) => b.estDelta - a.estDelta);
}