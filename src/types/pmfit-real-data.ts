export type SourceRef = { 
  source: string; 
  url: string; 
  fetchedAtISO: string; 
  notes?: string 
};

export type AudienceCluster = {
  name: string;
  share: number; // 0..1
  demographics?: { 
    ages?: string; 
    genderSplit?: string; 
    geos?: string[] 
  };
  psychographics?: string[];
  channels?: string[];
  topKeywords?: string[];
  citations: SourceRef[];
};

export type RealDataImprovement = {
  factor: 'demand'|'painIntensity'|'competitionGap'|'differentiation'|'distribution';
  title: string;
  why: string;
  howTo: string[];
  experiment: {
    hypothesis: string;
    metric: 'CTR'|'CR'|'ARPU'|'Waitlist'|'ReplyRate'|'ARR';
    design: string[];
    costBand: '$'|'$$'|'$$$';
    timeToImpactDays: number;
  };
  estDelta: number;
  confidence: 'low'|'med'|'high';
  citations: SourceRef[];
};

export type PMFitRealDataOutput = {
  idea: string;
  assumptions: Record<string, string|number|boolean>;
  metrics: {
    search: { 
      interestOverTime?: number[]; 
      relatedQueries?: string[]; 
      regions?: string[]; 
      citations: SourceRef[] 
    };
    social: { 
      tiktok?: any; 
      twitter?: any; 
      youtube?: any; 
      citations: SourceRef[] 
    };
    forums: { 
      redditThreads: number; 
      painMentionsTop: string[]; 
      citations: SourceRef[] 
    };
    commerce: { 
      topListings?: Array<{
        title: string; 
        price?: number; 
        stars?: number; 
        reviews?: number; 
        url: string
      }>; 
      citations: SourceRef[] 
    };
  };
  scores: {
    demand: number;
    painIntensity: number;
    competitionGap: number;
    differentiation: number;
    distribution: number;
    pmFitScore: number;
  };
  audience: { 
    primary?: AudienceCluster; 
    secondary?: AudienceCluster[] 
  };
  trends: { 
    keywords: string[]; 
    hashtags: string[]; 
    regions: string[]; 
    notes?: string; 
    citations: SourceRef[] 
  };
  monetization: {
    recommendedModels: Array<{ 
      model:'subscription'|'one_time'|'ads'|'affiliate'|'b2b_saas'|'marketplace_fee'; 
      why: string; 
      starterPricingHint?: string; 
      citations: SourceRef[] 
    }>;
  };
  channelPlan: Array<{ 
    channel:'tiktok'|'instagram'|'reddit'|'youtube'|'linkedin'|'seo'|'amazon'; 
    tactics: string[]; 
    citations: SourceRef[] 
  }>;
  improvements: RealDataImprovement[];
  sourceStatus: Record<string,'ok'|'degraded'|'unavailable'>;
};