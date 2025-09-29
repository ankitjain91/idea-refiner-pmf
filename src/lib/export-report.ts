import type { AnalysisResult } from '@/types/analysis';

export function buildMarkdownReport(result: AnalysisResult) {
  const { pmfAnalysis, meta } = result;
  const lines: string[] = [];
  lines.push('# SmoothBrains Analysis Report');
  lines.push(`Generated: ${new Date(meta.completedAt).toLocaleString()}`);
  lines.push('');
  lines.push(`**Overall Score:** ${pmfAnalysis.pmfScore}/100`);
  if (meta.viabilityLabel) lines.push(`**Viability:** ${meta.viabilityLabel}`);
  lines.push('');
  lines.push('## Brief Snapshot');
  Object.entries(meta.briefSnapshot).forEach(([k,v]) => lines.push(`- **${k}**: ${v || '_not provided_'}`));
  lines.push('');
  if (meta.validationIssues.length) {
    lines.push('## Validation Issues');
    meta.validationIssues.forEach(i => lines.push(`- (${i.severity}) ${i.field}: ${i.message}`));
    lines.push('');
  }
  lines.push('## Score Breakdown');
  if (pmfAnalysis.scoreBreakdown) {
    try {
      Object.entries(pmfAnalysis.scoreBreakdown).forEach(([k,v]) => lines.push(`- ${k}: ${v}`));
    } catch {}
  } else {
    lines.push('_No detailed breakdown available_');
  }
  if (pmfAnalysis.improvements?.length) {
    lines.push('');
    lines.push('## Recommended Improvements');
    pmfAnalysis.improvements.forEach(i => lines.push(`- ${i}`));
  }
  if (pmfAnalysis.quickWins?.length) {
    lines.push('');
    lines.push('## Quick Wins');
    pmfAnalysis.quickWins.forEach((q: any) => lines.push(`- ${typeof q === 'string' ? q : q.title || JSON.stringify(q)}`));
  }
  return lines.join('\n');
}

export function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
}
