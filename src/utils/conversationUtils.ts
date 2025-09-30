/**
 * Utility functions for handling conversation context in dashboard
 */

interface ChatMessage {
  type: 'user' | 'bot' | 'system';
  content: string;
  isTyping?: boolean;
}

/**
 * Creates a concise startup idea summary by analyzing the entire conversation
 * @param messages - Array of chat messages
 * @param originalIdea - The original startup idea
 * @returns A coherent startup idea description synthesized from the conversation
 */
export function createConversationSummary(messages: ChatMessage[], originalIdea?: string): string {
  // Filter out typing indicators and empty messages
  const validMessages = messages.filter(m => !m.isTyping && m.content);
  
  if (validMessages.length === 0) {
    return originalIdea || '';
  }
  
  // Collect all key information from the conversation
  const extractedInfo = {
    problemStatements: [] as string[],
    solutionDescriptions: [] as string[],
    targetAudiences: [] as string[],
    valueProps: [] as string[],
    features: [] as string[],
    monetization: [] as string[],
    marketInfo: [] as string[],
    uniqueAspects: [] as string[]
  };
  
  // Process each message to extract relevant information
  validMessages.forEach(msg => {
    const content = msg.content;
    const lowerContent = content.toLowerCase();
    
    // Extract problem-related content
    if (lowerContent.includes('problem') || lowerContent.includes('pain') || lowerContent.includes('challenge') || lowerContent.includes('issue')) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().includes('problem') || sentence.toLowerCase().includes('pain')) {
          extractedInfo.problemStatements.push(sentence.trim());
        }
      });
    }
    
    // Extract solution/platform descriptions
    if (lowerContent.includes('platform') || lowerContent.includes('app') || lowerContent.includes('solution') || lowerContent.includes('service') || lowerContent.includes('tool')) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();
        if (lower.includes('platform') || lower.includes('app') || lower.includes('solution') || lower.includes('service')) {
          extractedInfo.solutionDescriptions.push(sentence.trim());
        }
      });
    }
    
    // Extract target audience information
    if (lowerContent.includes('user') || lowerContent.includes('customer') || lowerContent.includes('target') || lowerContent.includes('audience') || lowerContent.includes('for')) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();
        if ((lower.includes('user') || lower.includes('customer') || lower.includes('target')) && sentence.length > 20) {
          extractedInfo.targetAudiences.push(sentence.trim());
        }
      });
    }
    
    // Extract value propositions
    if (lowerContent.includes('value') || lowerContent.includes('benefit') || lowerContent.includes('help') || lowerContent.includes('enable')) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().includes('help') || sentence.toLowerCase().includes('enable') || sentence.toLowerCase().includes('value')) {
          extractedInfo.valueProps.push(sentence.trim());
        }
      });
    }
    
    // Extract monetization/revenue info
    if (lowerContent.includes('revenue') || lowerContent.includes('monetiz') || lowerContent.includes('pricing') || lowerContent.includes('subscription') || lowerContent.includes('fee')) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().match(/revenue|monetiz|pricing|subscription|fee/)) {
          extractedInfo.monetization.push(sentence.trim());
        }
      });
    }
    
    // Extract features
    if (lowerContent.includes('feature') || lowerContent.includes('capability') || lowerContent.includes('function')) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.toLowerCase().match(/feature|capability|function/) && sentence.length > 15) {
          extractedInfo.features.push(sentence.trim());
        }
      });
    }
  });
  
  // Find the most recent user message that describes the idea comprehensively
  const userMessages = validMessages.filter(m => m.type === 'user');
  const substantialUserMessage = userMessages
    .reverse()
    .find(m => m.content.length > 100) || userMessages[userMessages.length - 1];
  
  // Build the synthesized startup idea description
  let synthesizedIdea = '';
  
  // Start with the core idea (from original or best user message)
  if (originalIdea && originalIdea.length > 50) {
    synthesizedIdea = originalIdea;
  } else if (substantialUserMessage) {
    synthesizedIdea = substantialUserMessage.content;
  }
  
  // Find the most relevant problem statement
  const bestProblem = extractedInfo.problemStatements
    .sort((a, b) => b.length - a.length)[0];
  
  // Find the best solution description
  const bestSolution = extractedInfo.solutionDescriptions
    .filter(s => s.length > 30)
    .sort((a, b) => b.length - a.length)[0];
  
  // Find target audience
  const bestTarget = extractedInfo.targetAudiences
    .filter(t => t.length > 20)
    .sort((a, b) => b.length - a.length)[0];
  
  // Find monetization strategy
  const bestMonetization = extractedInfo.monetization
    .filter(m => m.length > 20)[0];
  
  // Construct a coherent idea description
  const ideaParts = [];
  
  // If we have a good solution description, use it as the base
  if (bestSolution && bestSolution.length > 50) {
    ideaParts.push(bestSolution);
  } else if (synthesizedIdea) {
    ideaParts.push(synthesizedIdea);
  }
  
  // Add problem context if not already included
  if (bestProblem && !ideaParts[0]?.toLowerCase().includes('problem')) {
    ideaParts.push(`This addresses: ${bestProblem}`);
  }
  
  // Add target audience if not already included
  if (bestTarget && !ideaParts.join(' ').toLowerCase().includes('user') && !ideaParts.join(' ').toLowerCase().includes('customer')) {
    ideaParts.push(`Target market: ${bestTarget}`);
  }
  
  // Add monetization if available and not included
  if (bestMonetization && !ideaParts.join(' ').toLowerCase().includes('revenue') && !ideaParts.join(' ').toLowerCase().includes('monetiz')) {
    ideaParts.push(`Revenue model: ${bestMonetization}`);
  }
  
  // Join the parts into a coherent description
  let finalIdea = ideaParts.join('. ').replace(/\.+/g, '.').trim();
  
  // If the idea is too long, truncate intelligently
  if (finalIdea.length > 500) {
    // Keep the first 450 characters and add ellipsis at a sentence boundary
    const truncated = finalIdea.substring(0, 450);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > 300) {
      finalIdea = truncated.substring(0, lastPeriod + 1);
    } else {
      finalIdea = truncated + '...';
    }
  }
  
  // Fallback to original idea if synthesis failed
  if (!finalIdea || finalIdea.length < 30) {
    return originalIdea || 'A startup idea focused on solving market problems through innovative technology solutions';
  }
  
  return finalIdea;
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