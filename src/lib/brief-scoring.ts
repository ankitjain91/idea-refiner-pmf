import { BriefFields, EvidenceMetrics } from '@/types/chat';

export function computeEvidenceMetrics(brief: BriefFields, existingUnlocked: boolean): EvidenceMetrics {
  const requiredFilled = ['problem','targetUser'].every(k => (brief as any)[k]?.trim().length > 10);
  const quantitativeHints = Object.values(brief).filter(v => /\b\d+%?|\d+x|\$\d+/i.test(String(v))).length;
  const differentiationStrength = (brief.differentiation.match(/(only|unique|first|fewer|faster|cheaper|more accurate)/gi) || []).length;
  let score = 0;
  if (requiredFilled) score += 30;
  score += Math.min(25, quantitativeHints * 8);
  score += Math.min(25, differentiationStrength * 5);
  if (brief.monetization.trim().length > 8) score += 10;
  if (brief.successMetric.trim().length > 5) score += 10;
  score = Math.min(100, score);

  const weak: string[] = [];
  if (!brief.differentiation || brief.differentiation.split(/\s+/).length < 4) weak.push('differentiation');
  if (!/\d/.test(brief.successMetric)) weak.push('successMetric');
  if (!/\$|subscription|license|ads|fee|pricing|price/i.test(brief.monetization)) weak.push('monetization');
  if (!/\d|%|users|accounts|retention|activation|conversion/i.test(brief.problem)) weak.push('problem-specific metric');

  const positivityUnlocked = score >= 45 || existingUnlocked;
  const viabilityLabel = positivityUnlocked ? (score >= 70 ? 'Viability: moderate-potential' : 'Viability: early-unclear') : 'Viability: evidence-light';

  return { score, weakAreas: weak, positivityUnlocked, viabilityLabel };
}

export function isVagueAnswer(answer: string): boolean {
  return !/(\d|%|\$)/.test(answer) && answer.split(/\s+/).length <= 6;
}
