// Centralized branding constants for user-facing labels
// Internal variable names (e.g., pmfScore) intentionally preserved for now for backward compatibility.

export const BRAND = 'SmoothBrains';
export const SCORE_LABEL = 'SmoothBrains Score';
export const ANALYZER_LABEL = 'SmoothBrains Analyzer';
export const ADVISOR_LABEL = 'SmoothBrains Advisor';
export const DASHBOARD_LABEL = 'SmoothBrains Dashboard';
export const ANALYSIS_NOUN = 'SmoothBrains Analysis';
export const ANALYSIS_VERB = 'Run SmoothBrains Analysis';
export const IMPROVEMENT_NOUN = 'SmoothBrains Optimization';

export const brand = {
  BRAND,
  SCORE_LABEL,
  ANALYZER_LABEL,
  ADVISOR_LABEL,
  DASHBOARD_LABEL,
  ANALYSIS_NOUN,
  ANALYSIS_VERB,
  IMPROVEMENT_NOUN,
};

// Helper to swap legacy PMF phrasing inside dynamic strings
export function replaceLegacyPMF(text: string = ''): string {
  return text
    .replace(/PM-?F(it)?/gi, SCORE_LABEL)
    .replace(/product-market fit/gi, 'market traction & fit');
}
