export interface FreeSignalsSentiment {
  kpi: number;
  sampleSize: number;
  confidence: "Low" | "Medium" | "High";
  trend: number[];
  sources: { id: string; items: number }[];
  samples?: Array<{ source: 'hn'|'reddit'; title: string; url: string }>;
  lastUpdated: string;
}
export interface FreeSignalsMarket {
  indicators: {
    internetUsersPct: number|null;
    rdSpendPctGDP: number|null;
    gdpGrowthPct: number|null;
  };
  series?: {
    internetUsersPct: any[];
    rdSpendPctGDP: any[];
    gdpGrowthPct: any[];
  };
  sources?: string[];
  lastUpdated: string;
}
export interface FreeSignalsCompetitors {
  topRepos: { name: string; stars: number; url: string; updated_at: string }[];
  sources?: string[];
  lastUpdated: string;
}
export interface FreeSignals {
  sentiment?: FreeSignalsSentiment;
  market?: FreeSignalsMarket;
  competitors?: FreeSignalsCompetitors;
}
