import { BriefFields } from './chat';

export interface PMFAnalysisRaw {
  pmfScore: number;
  marketDemand?: number;
  productReadiness?: number;
  userEngagement?: number;
  revenueViability?: number;
  competitorAnalysis?: any;
  improvements?: string[];
  quickWins?: any[];
  channels?: any[];
  competitors?: any[];
  growthMetrics?: any;
  scoreBreakdown?: any;
}

export interface AnalysisValidationIssue {
  field: string;
  kind: 'missing' | 'vague' | 'invalid';
  message: string;
  severity: 'error' | 'warn' | 'info';
}

export interface AnalysisResult {
  pmfAnalysis: PMFAnalysisRaw;
  meta: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    briefSnapshot: BriefFields;
    validationIssues: AnalysisValidationIssue[];
    evidenceScore: number;
    weakAreas: string[];
    viabilityLabel: string;
  };
}