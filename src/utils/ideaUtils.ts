/**
 * Utility functions for idea processing and keyword extraction
 */

// List of common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'into', 
  'about', 'over', 'using', 'you', 'are', 'our', 'their', 'them', 'they', 
  'have', 'has', 'can', 'will', 'just', 'very', 'much', 'more', 'less', 
  'when', 'what', 'how', 'why', 'where', 'who', 'app', 'tool', 'idea', 
  'project', 'startup', 'ai', 'new', 'way', 'use', 'like', 'make', 'help',
  'get', 'one', 'would', 'could', 'should', 'may', 'might', 'must'
]);

/**
 * Extract keywords from text for analysis
 * @param text The input text to extract keywords from
 * @param maxKeywords Maximum number of keywords to return
 * @returns Array of extracted keywords
 */
export function extractKeywords(text: string, maxKeywords: number = 5): string[] {
  if (!text || typeof text !== 'string') return [];
  
  // Clean and split the text
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word && 
      word.length > 2 && 
      !STOP_WORDS.has(word)
    );
  
  // Get unique words
  const uniqueWords = Array.from(new Set(words));
  
  // If we have unique words, return them
  if (uniqueWords.length > 0) {
    return uniqueWords.slice(0, maxKeywords);
  }
  
  // Fallback: if no keywords found, take first few words that aren't empty
  const fallbackWords = text
    .split(/\s+/)
    .filter(word => word.length >= 2)
    .slice(0, Math.min(3, maxKeywords));
  
  // If still nothing, return a truncated version of the original text
  if (fallbackWords.length === 0 && text.trim()) {
    return [text.trim().slice(0, 30)];
  }
  
  return fallbackWords;
}

/**
 * Extract idea from various storage locations
 * @returns The extracted idea text or null
 */
export function extractIdeaFromStorage(): string | null {
  // Priority 1: Dashboard-specific idea
  const dashboardIdea = localStorage.getItem('dashboardIdea');
  if (dashboardIdea) return dashboardIdea;
  
  // Priority 2: Extract from conversation history
  const conversationIdea = extractFromConversationHistory();
  if (conversationIdea) return conversationIdea;
  
  // Priority 3: Various localStorage keys
  const storageKeys = [
    'userIdea',
    'currentIdea', 
    'ideaText',
    'pmfCurrentIdea'
  ];
  
  for (const key of storageKeys) {
    const value = localStorage.getItem(key);
    if (value && value.trim()) return value.trim();
  }
  
  // Priority 4: Metadata
  const metaRaw = localStorage.getItem('ideaMetadata');
  if (metaRaw) {
    try {
      const meta = JSON.parse(metaRaw);
      const ideaFromMeta = meta?.refined || meta?.idea_text || meta?.idea;
      if (ideaFromMeta) return ideaFromMeta;
    } catch {
      // Silent fail
    }
  }
  
  // Priority 5: Chat histories
  const chatHistories = [
    'enhancedIdeaChatMessages',
    'chatHistory'
  ];
  
  for (const historyKey of chatHistories) {
    const idea = extractFromChatHistory(historyKey);
    if (idea) return idea;
  }
  
  return null;
}

/**
 * Extract idea from dashboard conversation history
 */
function extractFromConversationHistory(): string | null {
  const historyRaw = localStorage.getItem('dashboardConversationHistory');
  if (!historyRaw) return null;
  
  try {
    const messages = JSON.parse(historyRaw);
    let fallbackUser: string | null = null;
    
    // Find the most recent non-question user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if ((msg.type === 'user' || msg.role === 'user') && typeof msg.content === 'string') {
        const content = msg.content.trim();
        if (!content) continue;
        
        if (content.length > 20) {
          const lower = content.toLowerCase();
          const looksLikeQuestion = /\b(what|how|can you|tell me|explain|why|where|who)\b/.test(lower);
          if (!looksLikeQuestion) return content;
          
          // Keep as fallback if nothing better
          if (!fallbackUser) fallbackUser = content;
        } else if (!fallbackUser && content.length > 8) {
          fallbackUser = content;
        }
      }
    }
    
    return fallbackUser;
  } catch {
    return null;
  }
}

/**
 * Extract idea from a generic chat history
 */
function extractFromChatHistory(historyKey: string): string | null {
  const chatRaw = localStorage.getItem(historyKey);
  if (!chatRaw) return null;
  
  try {
    const msgs = JSON.parse(chatRaw);
    const lastUser = [...msgs]
      .reverse()
      .find((m: any) => 
        (m.type === 'user' || m.role === 'user') && 
        typeof m.content === 'string' && 
        m.content.trim().length > 10
      );
    
    return lastUser?.content?.trim() || null;
  } catch {
    return null;
  }
}
