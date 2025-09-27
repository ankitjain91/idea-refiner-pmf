export interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: any[];
  isTyping?: boolean;
  pmfAnalysis?: any;
  pointsEarned?: number;
  pointsExplanation?: string;
  suggestionExplanation?: string;
}

export interface EnhancedIdeaChatProps {
  onAnalysisReady: (idea: string, metadata: any) => void;
  resetTrigger?: number;
  onReset?: () => void;
  onAnalyze?: () => void;
  sessionName?: string;
}

export type ResponseMode = 'summary' | 'verbose';

export interface SuggestionItem {
  text: string;
  explanation?: string;
}