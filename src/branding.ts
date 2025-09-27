// Centralized branding constants for user-facing labels
// Internal variable names (e.g., pmfScore) intentionally preserved for now for backward compatibility.

export const BRAND = 'HyperFlux';
export const SCORE_LABEL = 'HyperFlux Score';
export const ANALYZER_LABEL = 'HyperFlux Analyzer';
export const ADVISOR_LABEL = 'HyperFlux Advisor';
export const DASHBOARD_LABEL = 'HyperFlux Dashboard';
export const ANALYSIS_NOUN = 'HyperFlux Analysis';
export const ANALYSIS_VERB = 'Run HyperFlux Analysis';
export const IMPROVEMENT_NOUN = 'HyperFlux Optimization';

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
