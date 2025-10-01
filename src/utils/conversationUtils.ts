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
  console.log('[ConversationSummary] Starting with', messages?.length || 0, 'messages');
  console.log('[ConversationSummary] Original idea:', originalIdea?.substring(0, 100));
  
  // Filter out typing indicators and empty messages
  const validMessages = messages?.filter(m => !m.isTyping && m.content) || [];
  console.log('[ConversationSummary] Valid messages after filtering:', validMessages.length);
  
  if (validMessages.length === 0) {
    console.log('[ConversationSummary] No valid messages, returning original idea');
    return originalIdea || '';
  }
  
  // Collect all key information from the conversation
  const extractedInfo = {
    mainIdea: '',
    problem: '',
    solution: '',
    targetMarket: '',
    valueProposition: '',
    monetization: ''
  };
  
  // Process messages to extract the core concept
  validMessages.forEach(msg => {
    const content = msg.content;
    const lowerContent = content.toLowerCase();
    
    // Look for the main idea description (prioritize user messages)
    if (msg.type === 'user' && content.length > 50 && !extractedInfo.mainIdea) {
      // Check if this message contains a clear idea description
      if (lowerContent.includes('app') || lowerContent.includes('platform') || 
          lowerContent.includes('service') || lowerContent.includes('tool') || 
          lowerContent.includes('solution') || lowerContent.includes('system')) {
        extractedInfo.mainIdea = content.split(/[.!?]+/)[0].trim();
      }
    }
    
    // Extract problem statement
    if (!extractedInfo.problem && (lowerContent.includes('problem') || lowerContent.includes('pain') || lowerContent.includes('challenge'))) {
      const sentences = content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes('problem') || sentence.toLowerCase().includes('pain')) {
          extractedInfo.problem = sentence.trim();
          break;
        }
      }
    }
    
    // Extract solution description
    if (!extractedInfo.solution && (lowerContent.includes('solution') || lowerContent.includes('solve') || lowerContent.includes('help'))) {
      const sentences = content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes('solution') || sentence.toLowerCase().includes('solve') || sentence.toLowerCase().includes('help')) {
          extractedInfo.solution = sentence.trim();
          break;
        }
      }
    }
    
    // Extract target market
    if (!extractedInfo.targetMarket && (lowerContent.includes('user') || lowerContent.includes('customer') || lowerContent.includes('target'))) {
      const sentences = content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if ((sentence.toLowerCase().includes('user') || sentence.toLowerCase().includes('customer')) && sentence.length > 30) {
          extractedInfo.targetMarket = sentence.trim();
          break;
        }
      }
    }
    
    // Extract value proposition
    if (!extractedInfo.valueProposition && (lowerContent.includes('value') || lowerContent.includes('benefit') || lowerContent.includes('enable'))) {
      const sentences = content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes('value') || sentence.toLowerCase().includes('benefit')) {
          extractedInfo.valueProposition = sentence.trim();
          break;
        }
      }
    }
    
    // Extract monetization
    if (!extractedInfo.monetization && (lowerContent.includes('revenue') || lowerContent.includes('monetiz') || lowerContent.includes('pricing'))) {
      const sentences = content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().match(/revenue|monetiz|pricing|subscription|fee/)) {
          extractedInfo.monetization = sentence.trim();
          break;
        }
      }
    }
  });
  
  // Use original idea as fallback for main idea
  if (!extractedInfo.mainIdea && originalIdea) {
    extractedInfo.mainIdea = originalIdea;
  }
  
  // If still no main idea, find the most substantial user message
  if (!extractedInfo.mainIdea) {
    const userMessages = validMessages.filter(m => m.type === 'user');
    const bestUserMessage = userMessages
      .filter(m => m.content.length > 50)
      .sort((a, b) => b.content.length - a.content.length)[0];
    
    if (bestUserMessage) {
      extractedInfo.mainIdea = bestUserMessage.content.split(/[.!?]+/)[0].trim();
    }
  }
  
  // Create a 2-sentence summary
  let sentence1 = '';
  let sentence2 = '';
  
  // First sentence: Main idea and what it does
  if (extractedInfo.mainIdea) {
    sentence1 = extractedInfo.mainIdea;
    // Clean up the sentence
    if (!sentence1.endsWith('.')) sentence1 += '.';
    // Remove any trailing quotes or special characters
    sentence1 = sentence1.replace(/["'`]+$/, '').trim();
    // Ensure it starts with a capital letter
    sentence1 = sentence1.charAt(0).toUpperCase() + sentence1.slice(1);
  } else {
    sentence1 = 'A startup platform focused on innovative solutions.';
  }
  
  // Second sentence: Problem it solves or value it provides
  if (extractedInfo.problem) {
    sentence2 = `This addresses ${extractedInfo.problem.toLowerCase()}`;
  } else if (extractedInfo.solution) {
    sentence2 = extractedInfo.solution;
  } else if (extractedInfo.valueProposition) {
    sentence2 = extractedInfo.valueProposition;
  } else if (extractedInfo.targetMarket) {
    sentence2 = `Designed for ${extractedInfo.targetMarket.toLowerCase()}`;
  } else if (extractedInfo.monetization) {
    sentence2 = `Revenue through ${extractedInfo.monetization.toLowerCase()}`;
  } else {
    sentence2 = 'It helps users solve key challenges through technology and innovation.';
  }
  
  // Clean up second sentence
  if (!sentence2.endsWith('.')) sentence2 += '.';
  sentence2 = sentence2.charAt(0).toUpperCase() + sentence2.slice(1);
  
  // Ensure sentences are not too long (max ~150 chars each)
  if (sentence1.length > 150) {
    const truncated = sentence1.substring(0, 147);
    const lastSpace = truncated.lastIndexOf(' ');
    sentence1 = truncated.substring(0, lastSpace) + '...';
  }
  
  if (sentence2.length > 150) {
    const truncated = sentence2.substring(0, 147);
    const lastSpace = truncated.lastIndexOf(' ');
    sentence2 = truncated.substring(0, lastSpace) + '...';
  }
  
  // Combine the two sentences
  const finalSummary = `${sentence1} ${sentence2}`;
  
  console.log('[ConversationSummary] Generated 2-sentence summary:', finalSummary);
  return finalSummary;
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