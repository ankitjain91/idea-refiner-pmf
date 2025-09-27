import { supabase } from '@/integrations/supabase/client';
import { isIdeaDescription, createIdeaPreview } from '../chat/utils';
import { Message } from '../chat/types';

export interface ValidationResult {
  valid: boolean;
  preview?: string;
  gateMessage?: Message;
}

export async function validateFirstIdea(messageText: string, wrinklePoints: number, hasValidIdea: boolean): Promise<ValidationResult> {
  if (hasValidIdea) return { valid: true };
  const heuristicLooksLikeIdea = isIdeaDescription(messageText);
  const validationPrompt = `You are a STRICT startup idea validator. Determine if the user submission is a CONCRETE startup idea (must specify: target user or segment, a real painful problem or workflow friction, and a hint of the proposed solution or wedge). If it is vague (e.g. 'an AI app to help everyone be productive'), purely aspirational, joke content, or missing key specifics, mark it invalid. Respond ONLY with minified JSON: {"valid": true|false, "reason": "short reason why or what is missing", "improvementHints": ["array of 2-4 very tactical improvement prompts the user can answer" ]}. User submission: """${messageText}"""`;
  try {
    const { data, error } = await supabase.functions.invoke('idea-chat', { body: { message: validationPrompt, conversationHistory: [] }});
    if (error) throw error;
    let parsed: any = {};
    try {
      const jsonMatch = data?.response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {}
    const isValid = parsed.valid === true && heuristicLooksLikeIdea;
    if (!isValid) {
      const funnyLines = [
        'That was a vibe, not a startup. Need: WHO + painful workflow + wedge.',
        'Cortical folds will not wrinkle for fluff. Specify the user and the manual grind.',
        'Like ordering “food” at a restaurant. Give me the dish, spice level, plating angle.',
        'Motivational poster energy. Narrow the wedge.'
      ];
      const randomFunny = funnyLines[Math.floor(Math.random()*funnyLines.length)];
      const improvementHints = Array.isArray(parsed.improvementHints) && parsed.improvementHints.length > 0 ? parsed.improvementHints : [
        'Who EXACTLY (role/segment) has this recurring pain?',
        'Manual workaround used today?',
        'Ultra-narrow starting feature?',
        'Why now / unique data or timing?'
      ];
      const gateMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: `🧪 Idea Validation: NOT APPROVED\n\n${randomFunny}\n\nReason: ${parsed.reason || 'Missing concrete target, problem, or wedge.'}\n\nAnswer one of these to refine:\n- ${improvementHints.join('\n- ')}`,
        timestamp: new Date(),
        suggestions: improvementHints.map(h => `Answer: ${h}`),
        pointsEarned: -0.5,
        pointsExplanation: 'No wrinkles granted until a real idea forms.'
      };
      return { valid: false, gateMessage };
    }
    return { valid: true, preview: createIdeaPreview(messageText) };
  } catch {
    if (isIdeaDescription(messageText)) {
      return { valid: true, preview: createIdeaPreview(messageText) };
    }
    const gateMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: '🧪 Idea Validation Glitch: Provide WHO + painful moment + narrow wedge feature.',
      timestamp: new Date(),
      suggestions: [
        'Target user: [role / segment] facing [specific recurring pain]',
        'Manual workaround today: [hack / spreadsheet / duct tape]',
        'Starting wedge feature: [ultra-specific capability]',
        'Why now / unique insight: [data / behavior / timing]'
      ],
      pointsEarned: -0.25,
      pointsExplanation: 'Need clearer idea before wrinkling.'
    };
    return { valid: false, gateMessage };
  }
}
