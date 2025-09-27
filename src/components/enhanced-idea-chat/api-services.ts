import { supabase } from '@/integrations/supabase/client';
import { getSaltyResponse, detectTrickery, generateBrainExplanation } from '../chat/utils';

export interface IdeaValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
}

export interface WrinkleEvaluation {
  points: number;
  reasoning: string;
  tier: number;
}

export interface SuggestionResponse {
  suggestions: string[];
  reasoning: string;
}

export const validateIdeaSubmission = async (userInput: string): Promise<IdeaValidationResult> => {
  const validationPrompt = `You are a helpful startup idea validator. Determine if the user submission contains a startup idea with reasonable specificity. Be LENIENT - accept ideas that show genuine effort even if not perfectly detailed. Look for: some indication of target users, a problem they face, and a solution approach. If it's clearly a joke, gibberish, or completely unrelated to business ideas, mark invalid.

User input: "${userInput}"

Respond with JSON: {"isValid": boolean, "confidence": 0-100, "reasoning": "brief explanation"}`;

  const { data: validationData, error: validationError } = await supabase.functions.invoke('idea-chat', {
    body: {
      message: validationPrompt,
      conversationHistory: [],
      responseMode: 'direct'
    }
  });

  if (validationError) {
    console.error('Validation error:', validationError);
    return { isValid: true, confidence: 50, reasoning: 'Validation service unavailable' };
  }

  try {
    const result = JSON.parse(validationData.response);
    return {
      isValid: result.isValid,
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  } catch (parseError) {
    console.error('Parse error:', parseError);
    return { isValid: true, confidence: 50, reasoning: 'Could not parse validation result' };
  }
};

export const sendChatMessage = async (
  message: string,
  conversationHistory: any[],
  responseMode: string = 'verbose'
) => {
  const { data, error } = await supabase.functions.invoke('idea-chat', {
    body: {
      message,
      conversationHistory,
      responseMode
    }
  });

  if (error) {
    throw new Error(`Chat API error: ${error.message}`);
  }

  return data;
};

export const evaluateWrinklePoints = async (
  conversationHistory: any[],
  currentPoints: number
): Promise<WrinkleEvaluation> => {
  const { data: evaluationData } = await supabase.functions.invoke('evaluate-wrinkle-points', {
    body: {
      conversationHistory,
      currentPoints,
      evaluationCriteria: {
        ideaClarity: 0.3,
        marketInsight: 0.25,
        businessModel: 0.2,
        competitiveAdvantage: 0.15,
        executionPlan: 0.1
      }
    }
  });

  if (evaluationData?.points !== undefined) {
    return {
      points: evaluationData.points,
      reasoning: evaluationData.reasoning || 'Wrinkle evaluation completed',
      tier: Math.floor(evaluationData.points / 40) // Simplified tier calculation
    };
  }

  return {
    points: currentPoints,
    reasoning: 'Could not evaluate wrinkles',
    tier: 0
  };
};

export const generateSuggestions = async (
  conversationHistory: any[],
  currentIdea: string,
  responseMode: string
): Promise<SuggestionResponse> => {
  const { data: suggestionData } = await supabase.functions.invoke('generate-suggestions', {
    body: {
      conversationHistory,
      currentIdea,
      responseMode,
      count: 4
    }
  });

  if (suggestionData?.suggestions) {
    return {
      suggestions: suggestionData.suggestions,
      reasoning: suggestionData.reasoning || 'Generated contextual suggestions'
    };
  }

  return {
    suggestions: [
      "Tell me more about your target market",
      "What's your competitive advantage?", 
      "How would you monetize this?",
      "What are the main risks?"
    ],
    reasoning: 'Using fallback suggestions'
  };
};

export const enhanceSaltyResponse = async (originalResponse: string, trickeryDetected: boolean) => {
  if (!trickeryDetected) return originalResponse;

  try {
    const { data: enhancedData } = await supabase.functions.invoke('enhance-salty-response', {
      body: {
        originalResponse,
        saltyContext: getSaltyResponse('generic'),
        enhancementLevel: 'moderate'
      }
    });

    return enhancedData?.enhancedResponse || originalResponse;
  } catch (error) {
    console.error('Enhancement error:', error);
    return originalResponse;
  }
};

export const generateConversationSummary = async (conversationHistory: any[]) => {
  const { data: summaryData } = await supabase.functions.invoke('idea-chat', {
    body: {
      message: `Please provide a brief summary of our conversation so far, highlighting key insights about the startup idea.`,
      conversationHistory,
      responseMode: 'summary'
    }
  });

  return summaryData?.response || 'Summary generation failed';
};