// Shared chat-related types
export interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  metadata?: any;
  isTyping?: boolean;
  pmfAnalysis?: any;
}

export interface BriefFields {
  problem: string;
  targetUser: string;
  differentiation: string;
  alternatives: string;
  monetization: string;
  scenario: string;
  successMetric: string;
}

export interface EvidenceMetrics {
  score: number;
  weakAreas: string[];
  positivityUnlocked: boolean;
  viabilityLabel: string;
}
