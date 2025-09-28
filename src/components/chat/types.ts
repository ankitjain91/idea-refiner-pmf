export interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  detailedContent?: string; // Full detailed response
  summaryContent?: string;  // Summarized version of response
  timestamp: Date;
  suggestions?: any[];
  isTyping?: boolean;
  pmfAnalysis?: any;
  pointsEarned?: number;
  pointsExplanation?: string;
  suggestionExplanation?: string;
  isError?: boolean;
  originalUserMessage?: string; // Store the user message that triggered this bot response
  awaitingResponse?: boolean; // Flag for user messages waiting for bot response
  failedToGetResponse?: boolean; // Flag when bot response failed
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