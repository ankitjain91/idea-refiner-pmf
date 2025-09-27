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
  
  // Very lenient heuristic - accept if it mentions any problem-solving concept
  const heuristicLooksLikeIdea = messageText.length > 15 && (
    messageText.toLowerCase().includes('connect') ||
    messageText.toLowerCase().includes('platform') ||
    messageText.toLowerCase().includes('app') ||
    messageText.toLowerCase().includes('tool') ||
    messageText.toLowerCase().includes('service') ||
    messageText.toLowerCase().includes('help') ||
    messageText.toLowerCase().includes('solve') ||
    messageText.toLowerCase().includes('build') ||
    messageText.toLowerCase().includes('create') ||
    messageText.toLowerCase().includes('startup') ||
    messageText.toLowerCase().includes('business') ||
    messageText.toLowerCase().includes('idea') ||
    messageText.toLowerCase().includes('automate') ||
    messageText.toLowerCase().includes('manage') ||
    messageText.toLowerCase().includes('track') ||
    messageText.toLowerCase().includes('find') ||
    messageText.toLowerCase().includes('match') ||
    messageText.toLowerCase().includes('marketplace')
  );
  
  const validationPrompt = `You are an EXTREMELY LENIENT startup idea validator. Accept ANY attempt at describing a business idea, no matter how vague. Only reject if it's clearly just a greeting, random text, or explicit joke. If there's ANY mention of solving a problem, connecting people, building something, or providing value, mark it VALID. Respond ONLY with JSON: {"valid": true|false, "reason": "brief reason"}. User submission: """${messageText}"""`;
  try {
    const { data, error } = await supabase.functions.invoke('idea-chat', { body: { message: validationPrompt, conversationHistory: [] }});
    if (error) throw error;
    let parsed: any = {};
    try {
      const jsonMatch = data?.response?.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {}
    // Be EXTREMELY lenient - accept if either check passes OR if it's long enough and seems intentional
    const isValid = parsed.valid === true || heuristicLooksLikeIdea || (messageText.length > 30 && !messageText.toLowerCase().match(/^(hi|hello|hey|test|testing|lol|haha)/));
    if (!isValid) {
      const funnyLines = [
        'That was a vibe, not a startup. Need: WHO + painful workflow + wedge.',
        'Cortical folds will not wrinkle for fluff. Specify the user and the manual grind.',
        'Like ordering "food" at a restaurant. Give me the dish, spice level, plating angle.',
        'Motivational poster energy. Narrow the wedge.'
      ];
      const randomFunny = funnyLines[Math.floor(Math.random()*funnyLines.length)];
      const improvementHints = Array.isArray(parsed.improvementHints) && parsed.improvementHints.length > 0 ? parsed.improvementHints : [
        'My target users are [role/segment] who face [specific pain]',
        'They currently solve this by [manual workaround]',
        'My starting feature will be [ultra-narrow capability]',
        'This is the right time because [unique insight/timing]'
      ];
      const gateMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: `🧪 Idea Validation: NOT APPROVED\n\n${randomFunny}\n\nReason: ${parsed.reason || 'Missing concrete target, problem, or wedge.'}\n\nAnswer one of these to refine:\n- ${improvementHints.join('\n- ')}`,
        timestamp: new Date(),
        suggestions: improvementHints.map(h => h.startsWith('My') || h.startsWith('I') || h.startsWith('They') || h.startsWith('This') ? h : `I'll answer: ${h}`),
        pointsEarned: -0.5,
        pointsExplanation: 'No wrinkles granted until a real idea forms.'
      };
      return { valid: false, gateMessage };
    }
    return { valid: true, preview: createIdeaPreview(messageText) };
  } catch {
    // If validation fails, be lenient and accept anything that looks like an idea attempt
    if (messageText.length > 20) {
      return { valid: true, preview: createIdeaPreview(messageText) };
    }
    const gateMessage: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content: '🧪 Idea Validation Glitch: Provide WHO + painful moment + narrow wedge feature.',
      timestamp: new Date(),
      suggestions: [
        'My target users are [role/segment] facing [specific recurring pain]',
        'They currently use [hack/spreadsheet/manual process] to solve this',
        "I'll start with [ultra-specific capability] as my wedge",
        'My unique insight is [data/behavior/timing advantage]'
      ],
      pointsEarned: -0.25,
      pointsExplanation: 'Need clearer idea before wrinkling.'
    };
    return { valid: false, gateMessage };
  }
}