import { useState, useEffect, useCallback } from 'react';
import { ChannelInsight, ChannelKey } from '@/components/dashboard/MarketingChannels';

export interface RealtimeSnapshot {
  profitScore: number;
  updatedAt: string;
  channels: ChannelInsight[];
  focusNow: ChannelKey[];
  trends: {
    roiByChannel: Record<ChannelKey, number>;
    leadVelocity: { date: string; value: number }[];
    cacVsLtv: { channel: ChannelKey; cac: number; ltv: number }[];
    funnelTop: { stage: string; value: number }[];
  };
}

// Mock data generator for demo
const generateMockInsight = (channel: ChannelKey): ChannelInsight => {
  const baseMetrics: Record<ChannelKey, Partial<ChannelInsight['metrics']>> = {
    seo: { ctr: 3.2, cvr: 2.1, cac: 45, cpmOrCpc: 0.8, ltvToCac: 4.2, timeToImpactDays: 90 },
    sem: { ctr: 4.5, cvr: 3.2, cac: 35, cpmOrCpc: 2.5, ltvToCac: 5.1, timeToImpactDays: 7 },
    linkedin: { ctr: 2.8, cvr: 4.1, cac: 55, cpmOrCpc: 8.5, ltvToCac: 3.8, timeToImpactDays: 14 },
    tiktok: { ctr: 5.2, cvr: 1.8, cac: 25, cpmOrCpc: 1.2, ltvToCac: 3.2, timeToImpactDays: 21 },
    influencers: { ctr: 6.1, cvr: 3.5, cac: 40, cpmOrCpc: 150, ltvToCac: 4.5, timeToImpactDays: 30 },
    partnerships: { ctr: 0, cvr: 8.5, cac: 80, cpmOrCpc: 0, ltvToCac: 6.2, timeToImpactDays: 60 },
    email: { ctr: 22.5, cvr: 5.2, cac: 15, cpmOrCpc: 0.05, ltvToCac: 8.5, timeToImpactDays: 7 },
    content: { ctr: 2.1, cvr: 1.8, cac: 30, cpmOrCpc: 0, ltvToCac: 5.5, timeToImpactDays: 45 },
    communities: { ctr: 8.2, cvr: 6.5, cac: 20, cpmOrCpc: 0, ltvToCac: 7.2, timeToImpactDays: 14 },
    marketplace: { ctr: 3.5, cvr: 2.8, cac: 50, cpmOrCpc: 3.5, ltvToCac: 3.5, timeToImpactDays: 30 },
    plg: { ctr: 0, cvr: 12.5, cac: 10, cpmOrCpc: 0, ltvToCac: 12.5, timeToImpactDays: 1 }
  };

  const whyReasons: Record<ChannelKey, string[]> = {
    seo: [
      "Captures intent-driven traffic from users already looking for solutions",
      "Builds compounding traffic value over time (low CAC long-term)",
      "Strengthens credibility and trust signals for your idea"
    ],
    sem: [
      "Targets high-intent keywords immediately (fast ROI)",
      "Scalable budget control with instant visibility",
      "Useful for A/B testing positioning and messaging"
    ],
    linkedin: [
      "Direct access to professionals, founders, and decision makers",
      "Laser-targeted filters (role, company size, industry)",
      "Strong fit for B2B ideas with enterprise potential"
    ],
    tiktok: [
      "Virality engine: high potential reach at relatively low cost",
      "Strong fit if idea resonates emotionally or visually",
      "Early adopter audience often discovers new products here"
    ],
    influencers: [
      "Leverage trust and authority of existing voices in niche",
      "Cost-efficient compared to building your own large following",
      "High conversion in tight communities"
    ],
    partnerships: [
      "Access pre-built distribution (piggyback on bigger brands)",
      "Long-term contracts provide predictable revenue",
      "High leverage for enterprise or infra products"
    ],
    email: [
      "Owned channel: low incremental CAC once list is built",
      "Direct line to nurture users through education & updates",
      "Perfect for converting early interest into repeat engagement"
    ],
    content: [
      "Creates evergreen assets that build SEO + authority",
      "Enables thought leadership and story-driven positioning",
      "Works well in tandem with social and email"
    ],
    communities: [
      "Tap into high-intent, self-organized groups",
      "Great for feedback loops and early traction signals",
      "Authentic discussions lead to stronger market insights"
    ],
    marketplace: [
      "Built-in discovery and trust from platform",
      "Access to existing payment infrastructure",
      "Organic distribution through platform algorithms"
    ],
    plg: [
      "Product itself drives acquisition and expansion",
      "Viral loops reduce CAC to near zero",
      "Usage-based growth compounds exponentially"
    ]
  };

  const experiments: Record<ChannelKey, { title: string; hypothesis: string }[]> = {
    seo: [
      { title: "Long-tail keyword targeting", hypothesis: "Specific queries convert 3x better than broad terms" },
      { title: "Comparison pages", hypothesis: "VS pages capture high-intent switchers" }
    ],
    sem: [
      { title: "Dynamic keyword insertion", hypothesis: "Personalized ads increase CTR by 40%" },
      { title: "Competitor bidding", hypothesis: "Brand searches of competitors yield 5x conversion" }
    ],
    linkedin: [
      { title: "Video ads vs static", hypothesis: "Video content gets 2x engagement from executives" },
      { title: "InMail sequences", hypothesis: "3-touch cadence improves response rate by 60%" }
    ],
    tiktok: [
      { title: "UGC-style content", hypothesis: "Native-feeling videos get 4x more shares" },
      { title: "Trend-jacking", hypothesis: "Riding trending sounds increases reach by 10x" }
    ],
    influencers: [
      { title: "Micro vs macro influencers", hypothesis: "Micro-influencers drive 2x higher engagement" },
      { title: "Product seeding", hypothesis: "Free products generate authentic reviews" }
    ],
    partnerships: [
      { title: "Integration partnerships", hypothesis: "API integrations drive 50% of new signups" },
      { title: "Co-marketing webinars", hypothesis: "Joint events convert at 15% to trial" }
    ],
    email: [
      { title: "Segmented onboarding", hypothesis: "Persona-based emails improve activation by 35%" },
      { title: "Re-engagement campaigns", hypothesis: "Win-back series recovers 20% of churned users" }
    ],
    content: [
      { title: "Data-driven reports", hypothesis: "Original research gets 5x more backlinks" },
      { title: "Interactive tools", hypothesis: "Calculators drive 3x longer session times" }
    ],
    communities: [
      { title: "AMA sessions", hypothesis: "Founder presence increases trust and conversion" },
      { title: "Community-first launches", hypothesis: "Beta access drives 10x word-of-mouth" }
    ],
    marketplace: [
      { title: "Featured placement", hypothesis: "Top spot increases installs by 300%" },
      { title: "Ratings optimization", hypothesis: "4.5+ stars improve conversion by 50%" }
    ],
    plg: [
      { title: "Referral program", hypothesis: "Incentivized sharing drives 30% of new users" },
      { title: "Freemium limits", hypothesis: "Strategic limits increase paid conversion by 25%" }
    ]
  };

  const metrics = baseMetrics[channel];
  const confidence = metrics.ltvToCac! > 5 ? "high" : metrics.ltvToCac! > 3 ? "medium" : "low";

  return {
    channel,
    why: whyReasons[channel],
    metrics: {
      ...metrics,
      confidence
    } as ChannelInsight['metrics'],
    budgetSuggestion: {
      daily: Math.round(100 + Math.random() * 400),
      weekly: Math.round(700 + Math.random() * 2800),
      currency: "USD"
    },
    impactEstimate: {
      leads: Math.round(50 + Math.random() * 450),
      revenue: Math.round(5000 + Math.random() * 45000)
    },
    experiments: experiments[channel]
  };
};

export const useRealtimeInsights = (idea?: string, personas?: string[]) => {
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchInsights = useCallback(async () => {
    // In production, this would call your edge function with ChatGPT
    // For now, we'll use mock data with simulated variations
    
    const allChannels: ChannelKey[] = [
      "seo", "sem", "linkedin", "tiktok", "influencers",
      "partnerships", "email", "content", "communities",
      "marketplace", "plg"
    ];

    const channels = allChannels.map(generateMockInsight);
    
    // Sort by LTV/CAC ratio to determine focus
    const sorted = [...channels].sort((a, b) => b.metrics.ltvToCac - a.metrics.ltvToCac);
    const focusNow = sorted.slice(0, 3).map(c => c.channel);

    // Generate trend data
    const trends = {
      roiByChannel: channels.reduce((acc, c) => ({
        ...acc,
        [c.channel]: c.metrics.ltvToCac
      }), {} as Record<ChannelKey, number>),
      leadVelocity: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
        value: Math.round(100 + Math.random() * 200 + i * 20)
      })),
      cacVsLtv: channels.map(c => ({
        channel: c.channel,
        cac: c.metrics.cac,
        ltv: c.metrics.cac * c.metrics.ltvToCac
      })),
      funnelTop: [
        { stage: "View", value: 10000 },
        { stage: "Click", value: 450 },
        { stage: "Sign-up", value: 125 },
        { stage: "Activation", value: 45 }
      ]
    };

    const newSnapshot: RealtimeSnapshot = {
      profitScore: Math.round(70 + Math.random() * 25),
      updatedAt: new Date().toISOString(),
      channels,
      focusNow,
      trends
    };

    setSnapshot(newSnapshot);
    setLastUpdated(new Date());
    setLoading(false);
  }, [idea, personas]);

  // Initial fetch
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchInsights, 30000);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  return {
    snapshot,
    loading,
    lastUpdated,
    refresh: fetchInsights
  };
};