import { BriefFields } from '@/types/chat';
import { computeEvidenceMetrics, isVagueAnswer } from './brief-scoring';
import { PMFAnalysisRaw, AnalysisResult, AnalysisValidationIssue } from '@/types/analysis';
import { supabase } from '@/integrations/supabase/client';

export interface RunAnalysisOptions {
  brief: BriefFields;
  idea: string;
  signalAbort?: () => boolean;
}

export interface RunAnalysisProgress {
  phase: string;
  pct: number; // 0-100 approximate progress indicator
  note?: string;
}

export type ProgressCallback = (update: RunAnalysisProgress) => void;

export async function runEnterpriseAnalysis(opts: RunAnalysisOptions, onProgress: ProgressCallback): Promise<AnalysisResult> {
  const { brief, idea } = opts;
  const start = Date.now();
  onProgress({ phase: 'validate', pct: 5, note: 'Validating brief completeness' });

  // Validate fields & vagueness
  const validation: AnalysisValidationIssue[] = [];
  (['problem','targetUser','differentiation','alternatives','monetization','scenario','successMetric'] as (keyof BriefFields)[]).forEach(field => {
    const val = brief[field]?.trim();
    if (!val && (field === 'problem' || field === 'targetUser')) {
      validation.push({ field, kind: 'missing', message: `${field} is required for analysis`, severity: 'error' });
    } else if (!val) {
      validation.push({ field, kind: 'missing', message: `${field} not provided`, severity: 'warn' });
    } else if (isVagueAnswer(val)) {
      validation.push({ field, kind: 'vague', message: `${field} may be too generic – add specificity`, severity: 'warn' });
    }
  });

  const metrics = computeEvidenceMetrics(brief, false);
  onProgress({ phase: 'fetch-model', pct: 18, note: 'Requesting model analysis' });

  const { data, error } = await supabase.functions.invoke('idea-chat', {
    body: {
      message: idea || brief.problem,
      generatePMFAnalysis: true,
      analysisContext: { brief }
    }
  });
  if (error) throw error;

  onProgress({ phase: 'structure', pct: 62, note: 'Structuring analysis output' });

  const raw: PMFAnalysisRaw = data?.pmfAnalysis || { pmfScore: 0 };
  const end = Date.now();

  const result: AnalysisResult = {
    pmfAnalysis: raw,
    meta: {
      startedAt: new Date(start).toISOString(),
      completedAt: new Date(end).toISOString(),
      durationMs: end - start,
      briefSnapshot: { ...brief },
      validationIssues: validation,
      evidenceScore: metrics.score,
      weakAreas: metrics.weakAreas,
      viabilityLabel: metrics.viabilityLabel
    }
  };

  onProgress({ phase: 'finalize', pct: 92, note: 'Finalizing & persisting' });
  return result;
}
