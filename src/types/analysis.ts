// Structured analysis related types for enterprise-grade separation
import { BriefFields } from './chat';

export interface PMFAnalysisSection {
  title: string;
  content: string;
  scoreImpact?: number; // optional delta contribution
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface PMFAnalysisRaw {
  pmfScore: number;
  viabilityLabel?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  sections?: PMFAnalysisSection[];
  // Allow arbitrary backend-provided fields
  [key: string]: any;
}

export interface AnalysisValidationIssue {
  field: keyof BriefFields;
  kind: 'missing' | 'vague' | 'weak';
  message: string;
  severity: 'info' | 'warn' | 'error';
}

export interface AnalysisResultMeta {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  briefSnapshot: BriefFields;
  validationIssues: AnalysisValidationIssue[];
  evidenceScore: number;
  weakAreas: string[];
  viabilityLabel?: string;
}

export interface AnalysisResult {
  pmfAnalysis: PMFAnalysisRaw;
  meta: AnalysisResultMeta;
}
