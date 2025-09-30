/**
 * Utility functions for handling conversation context in dashboard
 */

interface ChatMessage {
  type: 'user' | 'bot' | 'system';
  content: string;
  isTyping?: boolean;
}

/**
 * Creates a concise summary of the conversation focusing on the core idea and key refinements
 * @param messages - Array of chat messages
 * @param originalIdea - The original startup idea
 * @returns A concise summary of the refined idea
 */
export function createConversationSummary(messages: ChatMessage[], originalIdea?: string): string {
  // Filter out typing indicators and empty messages
  const validMessages = messages.filter(m => !m.isTyping && m.content);
  
  if (validMessages.length === 0) {
    return originalIdea || '';
  }
  
  // Extract key business concepts from the conversation
  const keyElements = {
    problem: '',
    solution: '',
    target: '',
    value: '',
    features: [] as string[],
    monetization: '',
    market: ''
  };
  
  // Process messages to extract key information
  validMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    
    // Extract problem statements
    if (content.includes('problem') || content.includes('pain') || content.includes('challenge')) {
      const problemMatch = msg.content.match(/(?:problem|pain|challenge)[^.!?]*[.!?]/gi);
      if (problemMatch && !keyElements.problem) {
        keyElements.problem = problemMatch[0];
      }
    }
    
    // Extract solution descriptions
    if (content.includes('solution') || content.includes('platform') || content.includes('app') || content.includes('service')) {
      const solutionMatch = msg.content.match(/(?:solution|platform|app|service)[^.!?]*[.!?]/gi);
      if (solutionMatch && !keyElements.solution) {
        keyElements.solution = solutionMatch[0];
      }
    }
    
    // Extract target audience
    if (content.includes('target') || content.includes('users') || content.includes('customers') || content.includes('audience')) {
      const targetMatch = msg.content.match(/(?:target|users|customers|audience)[^.!?]*[.!?]/gi);
      if (targetMatch && !keyElements.target) {
        keyElements.target = targetMatch[0];
      }
    }
    
    // Extract monetization strategy
    if (content.includes('revenue') || content.includes('pricing') || content.includes('monetization') || content.includes('subscription')) {
      const monetizationMatch = msg.content.match(/(?:revenue|pricing|monetization|subscription)[^.!?]*[.!?]/gi);
      if (monetizationMatch && !keyElements.monetization) {
        keyElements.monetization = monetizationMatch[0];
      }
    }
  });
  
  // Get the most recent substantive user message as the base idea
  const recentUserMessages = validMessages
    .filter(m => m.type === 'user' && m.content.length > 50)
    .slice(-3);
  
  // Build the summary
  const summaryParts: string[] = [];
  
  // Start with the original idea or most recent detailed user input
  if (originalIdea) {
    summaryParts.push(originalIdea);
  } else if (recentUserMessages.length > 0) {
    summaryParts.push(recentUserMessages[recentUserMessages.length - 1].content);
  }
  
  // Add extracted key elements if they provide additional context
  if (keyElements.problem && !summaryParts[0]?.includes(keyElements.problem)) {
    summaryParts.push(`Addressing: ${keyElements.problem}`);
  }
  
  if (keyElements.target && !summaryParts[0]?.includes(keyElements.target)) {
    summaryParts.push(`For: ${keyElements.target}`);
  }
  
  if (keyElements.monetization && !summaryParts[0]?.includes(keyElements.monetization)) {
    summaryParts.push(`Revenue model: ${keyElements.monetization}`);
  }
  
  // If we still don't have a good summary, use the last substantial message
  if (summaryParts.length === 0) {
    const lastSubstantialMessage = validMessages
      .filter(m => m.content.length > 30)
      .pop();
    
    if (lastSubstantialMessage) {
      summaryParts.push(lastSubstantialMessage.content);
    }
  }
  
  // Join the parts into a cohesive summary, limiting length
  const summary = summaryParts.join('. ').replace(/\.\./g, '.');
  
  // Limit to a reasonable length for API calls (around 500 characters)
  if (summary.length > 500) {
    return summary.substring(0, 497) + '...';
  }
  
  return summary || originalIdea || 'startup idea';
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