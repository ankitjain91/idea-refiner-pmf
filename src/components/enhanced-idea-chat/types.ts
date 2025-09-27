import { Message, ResponseMode, SuggestionItem } from '../chat/types';

export interface EnhancedIdeaChatProps {
  sessionName?: string;
  onAnalysisReady?: (question: string, analysis: any) => void;
  onAnalyze?: (question: string) => void;
  onReset?: () => void;
  resetTrigger?: number;
}

export interface ChatState {
  responseMode: ResponseMode;
  currentIdea: string;
  messages: Message[];
  input: string;
  isTyping: boolean;
  conversationStarted: boolean;
  isRefining: boolean;
  wrinklePoints: number;
  hoveringBrain: boolean;
  hasValidIdea: boolean;
  persistenceLevel: number;
  anonymous: boolean;
}

export interface WrinkleData {
  tier: number;
  label: string;
  tooltip: string;
}

export const WRINKLE_TIER_LABELS = [
  'Embryonic',
  'Forming', 
  'Structuring',
  'Networked',
  'Compounding',
  'Legendary'
] as const;

export const WRINKLE_TIER_TOOLTIPS = [
  'Just getting started with basic idea exploration',
  'Beginning to shape and define your concept',
  'Building structure and clarity around your idea',
  'Creating connections and expanding your thinking',
  'Ideas are building on each other in powerful ways',
  'Your thinking has reached extraordinary sophistication'
] as const;

export type WrinkleTier = 0 | 1 | 2 | 3 | 4 | 5;