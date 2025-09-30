/**
 * Utility functions for handling conversation context in dashboard
 */

interface ChatMessage {
  type: 'user' | 'bot';
  content: string;
  isTyping?: boolean;
}

/**
 * Creates a comprehensive summary of the conversation for use in dashboard data fetching
 * @param messages - Array of chat messages
 * @param originalIdea - The original startup idea
 * @returns A comprehensive string summary of the conversation
 */
export function createConversationSummary(messages: ChatMessage[], originalIdea?: string): string {
  // Filter out typing indicators and empty messages
  const validMessages = messages.filter(m => !m.isTyping && m.content);
  
  if (validMessages.length === 0) {
    return originalIdea || '';
  }
  
  // Create a comprehensive summary with conversation flow
  const conversationParts: string[] = [];
  
  // Add original idea context if available
  if (originalIdea) {
    conversationParts.push(`Original Idea: ${originalIdea}`);
    conversationParts.push('---');
  }
  
  // Add conversation flow
  conversationParts.push('Conversation Context:');
  validMessages.forEach((msg, index) => {
    const role = msg.type === 'user' ? 'User' : 'Assistant';
    conversationParts.push(`${role}: ${msg.content}`);
    
    // Add separator between exchanges for clarity
    if (index < validMessages.length - 1 && msg.type === 'bot' && validMessages[index + 1]?.type === 'user') {
      conversationParts.push('');
    }
  });
  
  return conversationParts.join('\n');
}

/**
 * Extracts key insights and topics from conversation for focused analysis
 * @param conversationSummary - The full conversation summary
 * @returns A condensed version focusing on key business insights
 */
export function extractKeyInsights(conversationSummary: string): string {
  // Extract lines that contain key business terms
  const keyTerms = [
    'market', 'revenue', 'customer', 'problem', 'solution', 'competition',
    'growth', 'scale', 'profit', 'cost', 'pricing', 'user', 'feature',
    'value', 'proposition', 'target', 'audience', 'strategy', 'business',
    'model', 'monetization', 'acquisition', 'retention', 'churn'
  ];
  
  const lines = conversationSummary.split('\n');
  const relevantLines = lines.filter(line => {
    const lowerLine = line.toLowerCase();
    return keyTerms.some(term => lowerLine.includes(term));
  });
  
  // If we have enough relevant lines, use them; otherwise use full summary
  if (relevantLines.length >= 3) {
    return relevantLines.join('\n');
  }
  
  return conversationSummary;
}

/**
 * Gets the dashboard idea from localStorage, prioritizing full conversation context
 * @returns The idea to use for dashboard data fetching
 */
export function getDashboardIdea(): string {
  // Prioritize the full conversation context
  const dashboardIdea = localStorage.getItem('dashboardIdea');
  if (dashboardIdea) {
    return dashboardIdea;
  }
  
  // Fallback to other idea sources
  const currentIdea = localStorage.getItem('currentIdea');
  const userIdea = localStorage.getItem('userIdea');
  const ideaText = localStorage.getItem('ideaText');
  const pmfCurrentIdea = localStorage.getItem('pmfCurrentIdea');
  
  return currentIdea || userIdea || ideaText || pmfCurrentIdea || '';
}